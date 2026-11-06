import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { isIP, type LookupFunction } from "node:net";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Agent, fetch as undiciFetch } from "undici";
import type { Dispatcher, Response as UndiciResponse } from "undici";
import ipaddr from "ipaddr.js";

const REQUEST_TIMEOUT_MS = 120_000;
const CONNECT_TIMEOUT_MS = 5_000;
const HEADERS_TIMEOUT_MS = 10_000;
const BODY_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;
const MAX_URL_LENGTH = 2_048;
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;
const MAX_GITHUB_API_BYTES = 2 * 1024 * 1024;
const MAX_HEADER_SIZE = 32 * 1024;

type Address = {
  address: string;
  family: 4 | 6;
};

type DownloadResult = {
  bytes: number;
  finalUrl: string;
};

type GitHubAsset = {
  url?: string;
  name?: string;
};

type GitHubRelease = {
  assets?: GitHubAsset[];
};

type DnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<Array<{ address: string; family: number }>>;

type AgentOptions = ConstructorParameters<typeof Agent>[0];

type DownloaderDependencies = {
  lookup: DnsLookup;
  fetch: typeof undiciFetch;
  createAgent: (options: AgentOptions) => Dispatcher;
  timeoutMs: number;
  maxDownloadBytes: number;
  maxGitHubApiBytes: number;
  maxRedirects: number;
};

class PublicDownloadError extends Error {}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 0 || address.includes("%")) {
    return false;
  }

  try {
    const parsed = ipaddr.parse(address);
    if (parsed.kind() === "ipv4") {
      return parsed.range() === "unicast";
    }

    const ipv6 = parsed as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) {
      return isPublicAddress(ipv6.toIPv4Address().toString());
    }

    return (
      ipv6.match(ipaddr.IPv6.parse("2000::"), 3) &&
      ipv6.range() === "unicast"
    );
  } catch {
    return false;
  }
}

function parsePublicHttpsUrl(value: string): URL | null {
  if (
    value.length === 0 ||
    value.length > MAX_URL_LENGTH ||
    value !== value.trim() ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  ) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hostname.endsWith(".") ||
      url.hostname.includes("%")
    ) {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    const unbracketedHostname =
      hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;
    const family = isIP(unbracketedHostname);

    if (family !== 0) {
      if (!isPublicAddress(unbracketedHostname)) {
        return null;
      }
    } else {
      const labels = hostname.split(".");
      if (
        hostname.length > 253 ||
        labels.length < 2 ||
        labels.some(
          (label) =>
            label.length === 0 ||
            label.length > 63 ||
            !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
        ) ||
        /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(
          hostname
        ) ||
        hostname.endsWith(".home.arpa")
      ) {
        return null;
      }
    }

    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function createPinnedLookup(
  expectedHostname: string,
  addresses: readonly Address[]
): LookupFunction {
  const pinnedHostname = expectedHostname.toLowerCase();

  return (hostname, options, callback) => {
    if (hostname.toLowerCase().replace(/\.$/, "") !== pinnedHostname) {
      callback(Object.assign(new Error("Unvalidated host."), { code: "ENOTFOUND" }), "", 0);
      return;
    }

    const requestedFamily =
      typeof options === "number" ? options : options.family ?? 0;
    const candidates = addresses.filter(
      (entry) => requestedFamily === 0 || entry.family === requestedFamily
    );

    if (candidates.length === 0) {
      callback(Object.assign(new Error("No validated address."), { code: "ENOTFOUND" }), "", 0);
      return;
    }

    if (typeof options !== "number" && options.all) {
      callback(
        null,
        candidates.map(({ address, family }) => ({ address, family }))
      );
      return;
    }

    callback(null, candidates[0].address, candidates[0].family);
  };
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new Error("PULSE download timed out."));
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(new Error("PULSE download timed out."));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      }
    );
  });
}

async function resolvePublicAddresses(
  hostname: string,
  signal: AbortSignal,
  lookup: DnsLookup
): Promise<Address[]> {
  const family = isIP(hostname);
  if (family !== 0) {
    if (!isPublicAddress(hostname)) {
      throw new PublicDownloadError("PULSE rejected a non-public build host.");
    }
    return [{ address: hostname, family: family as 4 | 6 }];
  }

  let answers: Array<{ address: string; family: number }>;
  try {
    answers = await withAbort(
      lookup(hostname, { all: true, verbatim: true }),
      signal
    );
  } catch {
    throw new PublicDownloadError(
      "PULSE could not safely resolve the public build host."
    );
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new PublicDownloadError(
      "PULSE could not safely resolve the public build host."
    );
  }

  const addresses = new Map<string, Address>();
  for (const answer of answers) {
    const answerFamily = isIP(answer.address);
    if (
      answerFamily === 0 ||
      answerFamily !== answer.family ||
      !isPublicAddress(answer.address)
    ) {
      throw new PublicDownloadError("PULSE rejected a non-public build host.");
    }

    addresses.set(`${answerFamily}:${answer.address}`, {
      address: answer.address,
      family: answerFamily as 4 | 6,
    });
  }

  return [...addresses.values()];
}

async function cancelResponseBody(response: UndiciResponse): Promise<void> {
  if (response.body && !response.bodyUsed && !response.body.locked) {
    await response.body.cancel();
  }
}

function normaliseDownloadUrl(sourceUrl: URL): URL {
  if (
    sourceUrl.hostname.toLowerCase() !== "github.com" ||
    !sourceUrl.pathname.includes("/blob/")
  ) {
    return sourceUrl;
  }

  const parts = sourceUrl.pathname.split("/").filter(Boolean);
  const blobIndex = parts.indexOf("blob");
  if (blobIndex < 2 || parts.length <= blobIndex + 2) {
    return sourceUrl;
  }

  return new URL(
    `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts
      .slice(blobIndex + 1)
      .join("/")}${sourceUrl.search}`
  );
}

function getGitHubReleaseAsset(
  url: URL
): { owner: string; repo: string; tag: string; assetName: string } | null {
  if (
    url.hostname.toLowerCase() !== "github.com" ||
    !url.pathname.includes("/releases/download/")
  ) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts.length !== 6 ||
    parts[2] !== "releases" ||
    parts[3] !== "download"
  ) {
    throw new PublicDownloadError(
      "PULSE could not parse the GitHub Release asset URL."
    );
  }

  let owner: string;
  let repo: string;
  let tag: string;
  let assetName: string;
  try {
    owner = decodeURIComponent(parts[0]);
    repo = decodeURIComponent(parts[1]);
    tag = decodeURIComponent(parts[4]);
    assetName = decodeURIComponent(parts[5]);
  } catch {
    throw new PublicDownloadError(
      "PULSE could not parse the GitHub Release asset URL."
    );
  }

  if (
    !/^[a-z0-9-]+$/i.test(owner) ||
    !/^[a-z0-9_.-]+$/i.test(repo) ||
    !tag ||
    tag.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(tag) ||
    !assetName ||
    assetName.length > 255 ||
    /[\\/\u0000-\u001f\u007f]/.test(assetName)
  ) {
    throw new PublicDownloadError(
      "PULSE could not parse the GitHub Release asset URL."
    );
  }

  return { owner, repo, tag, assetName };
}

function validateGitHubAssetApiUrl(
  value: unknown,
  owner: string,
  repo: string
): URL {
  if (typeof value !== "string") {
    throw new PublicDownloadError(
      "PULSE could not validate the GitHub Release asset."
    );
  }

  const url = parsePublicHttpsUrl(value);
  const segments = url?.pathname.split("/").filter(Boolean) ?? [];
  if (
    !url ||
    url.hostname.toLowerCase() !== "api.github.com" ||
    url.search ||
    url.hash ||
    segments.length !== 6 ||
    segments[0] !== "repos" ||
    segments[1].toLowerCase() !== owner.toLowerCase() ||
    segments[2].toLowerCase() !== repo.toLowerCase() ||
    segments[3] !== "releases" ||
    segments[4] !== "assets" ||
    !/^\d+$/.test(segments[5])
  ) {
    throw new PublicDownloadError(
      "PULSE could not validate the GitHub Release asset."
    );
  }

  return url;
}

function rejectOversizeContentLength(
  response: UndiciResponse,
  maximumBytes: number
): void {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > maximumBytes
  ) {
    throw new PublicDownloadError(
      "The submitted build is larger than the 500 MB PULSE limit."
    );
  }
}

function createDownloader(
  overrides: Partial<DownloaderDependencies> = {}
): (sourceUrl: string, destination: string) => Promise<DownloadResult> {
  const dependencies: DownloaderDependencies = {
    lookup: dnsLookup,
    fetch: undiciFetch,
    createAgent: (options) => new Agent(options),
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxDownloadBytes: MAX_DOWNLOAD_BYTES,
    maxGitHubApiBytes: MAX_GITHUB_API_BYTES,
    maxRedirects: MAX_REDIRECTS,
    ...overrides,
  };

  async function withPublicResponse<T>(
    startUrl: URL,
    headers: Record<string, string>,
    signal: AbortSignal,
    consume: (response: UndiciResponse, finalUrl: URL) => Promise<T>
  ): Promise<T> {
    let url = startUrl;

    for (let redirects = 0; ; redirects += 1) {
      const validatedUrl = parsePublicHttpsUrl(url.href);
      if (!validatedUrl) {
        throw new PublicDownloadError(
          "PULSE rejected an unsafe or non-HTTPS build destination."
        );
      }

      const hostname = validatedUrl.hostname.startsWith("[")
        ? validatedUrl.hostname.slice(1, -1)
        : validatedUrl.hostname;
      const addresses = await resolvePublicAddresses(
        hostname,
        signal,
        dependencies.lookup
      );
      const dispatcher = dependencies.createAgent({
        connections: 1,
        pipelining: 0,
        maxRedirections: 0,
        headersTimeout: HEADERS_TIMEOUT_MS,
        bodyTimeout: BODY_TIMEOUT_MS,
        maxHeaderSize: MAX_HEADER_SIZE,
        connect: {
          lookup: createPinnedLookup(hostname, addresses),
          timeout: CONNECT_TIMEOUT_MS,
        },
      });

      let response: UndiciResponse | undefined;
      try {
        response = await withAbort(
          dependencies.fetch(validatedUrl.href, {
            method: "GET",
            redirect: "manual",
            credentials: "omit",
            signal,
            dispatcher,
            headers: {
              "User-Agent": "Playtested-PULSE/1.0",
              "Accept-Encoding": "identity",
              ...headers,
            },
          }),
          signal
        );

        const location = response.headers.get("location");
        const isRedirect =
          response.status === 301 ||
          response.status === 302 ||
          response.status === 303 ||
          response.status === 307 ||
          response.status === 308;
        if (isRedirect && location) {
          await cancelResponseBody(response);
          if (redirects >= dependencies.maxRedirects) {
            throw new PublicDownloadError(
              "PULSE stopped after too many build download redirects."
            );
          }
          url = new URL(location, validatedUrl);
          continue;
        }

        return await consume(response, validatedUrl);
      } finally {
        if (response) {
          await cancelResponseBody(response);
        }
        await dispatcher.destroy();
      }
    }
  }

  async function readGitHubRelease(
    releaseApiUrl: URL,
    signal: AbortSignal
  ): Promise<GitHubRelease> {
    return withPublicResponse(
      releaseApiUrl,
      {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal,
      async (response) => {
        if (!response.ok) {
          throw new PublicDownloadError(
            `PULSE could not resolve the GitHub Release through the GitHub API (HTTP ${response.status}).`
          );
        }

        rejectOversizeContentLength(response, dependencies.maxGitHubApiBytes);
        if (!response.body) {
          throw new PublicDownloadError(
            "PULSE received an empty GitHub Release response."
          );
        }

        const reader = response.body.getReader();
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            totalBytes += value.byteLength;
            if (totalBytes > dependencies.maxGitHubApiBytes) {
              await reader.cancel();
              throw new PublicDownloadError(
                "PULSE rejected an oversized GitHub Release response."
              );
            }
            chunks.push(Buffer.from(value));
          }
        } finally {
          reader.releaseLock();
        }

        try {
          return JSON.parse(Buffer.concat(chunks, totalBytes).toString("utf8")) as GitHubRelease;
        } catch {
          throw new PublicDownloadError(
            "PULSE received an invalid GitHub Release response."
          );
        }
      }
    );
  }

  async function resolveGitHubAsset(
    sourceUrl: URL,
    signal: AbortSignal
  ): Promise<URL | null> {
    const release = getGitHubReleaseAsset(sourceUrl);
    if (!release) return null;

    const releaseApiUrl = new URL(
      `https://api.github.com/repos/${encodeURIComponent(release.owner)}/${encodeURIComponent(release.repo)}/releases/tags/${encodeURIComponent(release.tag)}`
    );
    const releaseData = await readGitHubRelease(releaseApiUrl, signal);
    const asset = Array.isArray(releaseData.assets)
      ? releaseData.assets.find((item) => item?.name === release.assetName)
      : undefined;

    if (!asset) {
      throw new PublicDownloadError(
        "PULSE could not find the requested asset in the GitHub Release."
      );
    }

    return validateGitHubAssetApiUrl(asset.url, release.owner, release.repo);
  }

  return async (sourceUrl: string, destination: string) => {
    const initialUrl = parsePublicHttpsUrl(sourceUrl);
    if (!initialUrl) {
      throw new PublicDownloadError(
        "PULSE requires a valid public HTTPS build URL."
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      dependencies.timeoutMs
    );
    let completed = false;

    try {
      const normalisedUrl = normaliseDownloadUrl(initialUrl);
      const downloadUrl =
        (await resolveGitHubAsset(normalisedUrl, controller.signal)) ??
        normalisedUrl;

      const result = await withPublicResponse(
        downloadUrl,
        {
          Accept: "application/zip, application/octet-stream, */*",
        },
        controller.signal,
        async (response, finalUrl) => {
          if (!response.ok) {
            throw new PublicDownloadError(
              `PULSE could not download the submitted build (HTTP ${response.status}).`
            );
          }

          rejectOversizeContentLength(response, dependencies.maxDownloadBytes);
          if (!response.body) {
            throw new PublicDownloadError(
              "The submitted build downloaded as an empty file."
            );
          }

          const stats = { bytes: 0, signature: Buffer.alloc(2), signatureBytes: 0 };
          const limiter = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
              stats.bytes += chunk.byteLength;
              if (stats.bytes > dependencies.maxDownloadBytes) {
                callback(
                  new PublicDownloadError(
                    "The submitted build is larger than the 500 MB PULSE limit."
                  )
                );
                return;
              }

              const remaining = stats.signature.length - stats.signatureBytes;
              if (remaining > 0) {
                const copied = Math.min(remaining, chunk.byteLength);
                chunk.copy(
                  stats.signature,
                  stats.signatureBytes,
                  0,
                  copied
                );
                stats.signatureBytes += copied;
              }
              callback(null, chunk);
            },
          });

          try {
            await pipeline(
              Readable.fromWeb(response.body),
              limiter,
              createWriteStream(destination, { flags: "w" }),
              { signal: controller.signal }
            );

            if (stats.bytes === 0) {
              throw new PublicDownloadError(
                "The submitted build downloaded as an empty file."
              );
            }
            if (
              stats.signatureBytes < 2 ||
              stats.signature[0] !== 0x50 ||
              stats.signature[1] !== 0x4b
            ) {
              const contentType =
                response.headers.get("content-type") ?? "unknown";
              throw new PublicDownloadError(
                `The submitted build response was not a ZIP file (${contentType}).`
              );
            }

            return { bytes: stats.bytes, finalUrl: finalUrl.href };
          } catch (error) {
            await rm(destination, { force: true });
            throw error;
          }
        }
      );

      completed = true;
      return result;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new PublicDownloadError("PULSE build download timed out.");
      }
      if (error instanceof PublicDownloadError) {
        throw error;
      }
      throw new PublicDownloadError(
        "PULSE could not safely download the public build."
      );
    } finally {
      clearTimeout(timeout);
      if (!completed) {
        await rm(destination, { force: true });
      }
    }
  };
}

export const downloadPulseZip = createDownloader();

export const pulseDownloadTestHelpers = {
  createDownloader,
  createPinnedLookup,
  getGitHubReleaseAsset,
  isPublicAddress,
  normaliseDownloadUrl,
  parsePublicHttpsUrl,
  validateGitHubAssetApiUrl,
};

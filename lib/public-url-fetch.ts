import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import type { Dispatcher, Response as UndiciResponse } from "undici";
import ipaddr from "ipaddr.js";

const REQUEST_TIMEOUT_MS = 8_000;
const CONNECT_TIMEOUT_MS = 3_000;
const HEADERS_TIMEOUT_MS = 4_000;
const BODY_TIMEOUT_MS = 1_000;
const MAX_REDIRECTS = 5;
const MAX_URL_LENGTH = 2_048;
const MAX_RESPONSE_SIZE = 1_024;
const MAX_HEADER_SIZE = 16 * 1_024;

type Address = {
  address: string;
  family: 4 | 6;
};

type ReachabilityResult = {
  reachable: boolean;
  status: number | null;
  finalUrl: string | null;
  contentType: string | null;
  durationMs: number;
  error?: string;
};

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

function parsePublicUrl(value: string): URL | null {
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
      (url.protocol !== "https:" && url.protocol !== "http:") ||
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
      const error = Object.assign(new Error("Host does not match the validated destination."), {
        code: "ENOTFOUND",
      });
      callback(error, "", 0);
      return;
    }

    const requestedFamily =
      typeof options === "number" ? options : options.family ?? 0;
    const candidates = addresses.filter(
      (entry) => requestedFamily === 0 || entry.family === requestedFamily
    );

    if (candidates.length === 0) {
      const error = Object.assign(new Error("No validated address is available."), {
        code: "ENOTFOUND",
      });
      callback(error, "", 0);
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
    return Promise.reject(new Error("Request timed out."));
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(new Error("Request timed out."));
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
  signal: AbortSignal
): Promise<Address[]> {
  const family = isIP(hostname);
  if (family !== 0) {
    if (!isPublicAddress(hostname)) {
      throw new Error("Destination is not public.");
    }
    return [{ address: hostname, family: family as 4 | 6 }];
  }

  const answers = await withAbort(
    dnsLookup(hostname, { all: true, verbatim: true }),
    signal
  );
  if (answers.length === 0) {
    throw new Error("Destination did not resolve.");
  }

  const addresses = new Map<string, Address>();
  for (const answer of answers) {
    const answerFamily = isIP(answer.address);
    if (
      answerFamily === 0 ||
      answerFamily !== answer.family ||
      !isPublicAddress(answer.address)
    ) {
      throw new Error("Destination resolved to a prohibited address.");
    }

    addresses.set(`${answerFamily}:${answer.address}`, {
      address: answer.address,
      family: answerFamily as 4 | 6,
    });
  }

  return [...addresses.values()];
}

async function cancelResponseBody(response: UndiciResponse): Promise<void> {
  if (response.body) {
    await response.body.cancel();
  }
}

async function requestFollowingPublicRedirects(
  startUrl: URL,
  method: "HEAD" | "GET",
  signal: AbortSignal
): Promise<{ status: number; finalUrl: string; contentType: string | null }> {
  let url = startUrl;

  for (let redirects = 0; ; redirects += 1) {
    const validatedUrl = parsePublicUrl(url.href);
    if (!validatedUrl) {
      throw new Error("Destination URL is not safe.");
    }

    const hostname = validatedUrl.hostname.startsWith("[")
      ? validatedUrl.hostname.slice(1, -1)
      : validatedUrl.hostname;
    const addresses = await resolvePublicAddresses(hostname, signal);
    const dispatcher: Dispatcher = new Agent({
      connections: 1,
      pipelining: 0,
      maxRedirections: 0,
      headersTimeout: HEADERS_TIMEOUT_MS,
      bodyTimeout: BODY_TIMEOUT_MS,
      maxHeaderSize: MAX_HEADER_SIZE,
      maxResponseSize: MAX_RESPONSE_SIZE,
      connect: {
        lookup: createPinnedLookup(hostname, addresses),
        timeout: CONNECT_TIMEOUT_MS,
      },
    });

    try {
      const response = await withAbort(
        undiciFetch(validatedUrl.href, {
          method,
          redirect: "manual",
          credentials: "omit",
          signal,
          dispatcher,
          headers: {
            "User-Agent": "Playtested-PULSE/1.0",
            ...(method === "GET" ? { Range: "bytes=0-0" } : {}),
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

      await cancelResponseBody(response);
      if (isRedirect && location) {
        if (redirects >= MAX_REDIRECTS) {
          throw new Error("Too many redirects.");
        }

        url = new URL(location, validatedUrl);
        continue;
      }

      return {
        status: response.status,
        finalUrl: validatedUrl.href,
        contentType: response.headers.get("content-type"),
      };
    } finally {
      await dispatcher.destroy();
    }
  }
}

async function requestPublicUrl(
  url: URL,
  method: "HEAD" | "GET",
  signal: AbortSignal
): Promise<{ status: number; finalUrl: string; contentType: string | null }> {
  return requestFollowingPublicRedirects(
    url,
    method,
    signal
  );
}

export async function testPublicUrlReachability(
  value: string
): Promise<ReachabilityResult> {
  const started = Date.now();
  const url = parsePublicUrl(value);
  if (!url) {
    return {
      reachable: false,
      status: null,
      finalUrl: null,
      contentType: null,
      durationMs: Date.now() - started,
      error: "The URL is not a valid public HTTP or HTTPS destination.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    let result = await requestPublicUrl(url, "HEAD", controller.signal);
    if (result.status === 405 || result.status === 501) {
      result = await requestPublicUrl(url, "GET", controller.signal);
    }

    return {
      reachable: result.status >= 200 && result.status < 500,
      status: result.status,
      finalUrl: result.finalUrl,
      contentType: result.contentType,
      durationMs: Date.now() - started,
    };
  } catch {
    return {
      reachable: false,
      status: null,
      finalUrl: null,
      contentType: null,
      durationMs: Date.now() - started,
      error: controller.signal.aborted
        ? "The public URL check timed out."
        : "The public URL could not be checked safely.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const publicUrlFetchTestHelpers = {
  createPinnedLookup,
  isPublicAddress,
  parsePublicUrl,
};

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const workDirectory = await fs.mkdtemp(
  path.join(os.tmpdir(), "playtested-pulse-download-test-")
);
const agents = [];
let resolveDns;
let fetchRequest;

class FixtureAgent {
  constructor(options) {
    this.options = options;
    this.destroyed = false;
    agents.push(this);
  }

  async destroy() {
    this.destroyed = true;
  }
}

function loadTypeScript(filePath, overrides = {}) {
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  const mockRequire = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === "server-only") return {};
    if (name === "node:dns/promises") {
      return { lookup: (...args) => resolveDns(...args) };
    }
    if (name === "undici") {
      return {
        Agent: FixtureAgent,
        fetch: (...args) => fetchRequest(...args),
      };
    }
    return require(name);
  };
  new Function("exports", "require", compiled)(exports, mockRequire);
  return exports;
}

const { downloadPulseZip, pulseDownloadTestHelpers } = loadTypeScript(
  "lib/pulse-public-download.ts"
);
const publicZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02, 0x03]);
const requests = [];
const dnsCalls = [];
let responseForRequest;

function publicAnswer(address = "8.8.8.8") {
  return [{ address, family: address.includes(":") ? 6 : 4 }];
}

function resetFixtures() {
  agents.length = 0;
  requests.length = 0;
  dnsCalls.length = 0;
  resolveDns = async (hostname) => {
    dnsCalls.push(hostname);
    return publicAnswer();
  };
  responseForRequest = async () =>
    new Response(publicZip, {
      status: 200,
      headers: { "content-type": "application/zip" },
    });
  fetchRequest = async (url, init) => {
    const target = new URL(url);
    const hostname = target.hostname.replace(/^\[|\]$/g, "");
    const lookup = init.dispatcher.options.connect.lookup;
    const pinnedAddresses = await new Promise((resolve, reject) => {
      lookup(hostname, { all: true, family: 0 }, (error, addresses) => {
        if (error) reject(error);
        else resolve(addresses);
      });
    });
    const request = { url: target.href, init, pinnedAddresses };
    requests.push(request);
    return responseForRequest(request);
  };
}

function outputPath(name) {
  return path.join(workDirectory, `${name}.zip`);
}

async function assertNoOutput(name) {
  await assert.rejects(fs.access(outputPath(name)));
}

try {
  resetFixtures();

  for (const value of [
    "https://downloads.gamehost.net/build.zip",
    "https://github.com/acme/game/blob/v1/build.zip",
    "https://[2001:4860:4860::8888]/build.zip",
    "https://8.8.8.8/build.zip",
  ]) {
    assert(
      pulseDownloadTestHelpers.parsePublicHttpsUrl(value),
      `Expected a valid public HTTPS URL: ${value}`
    );
  }

  for (const value of [
    "http://downloads.gamehost.net/build.zip",
    "https://localhost/build.zip",
    "https://sub.localhost/build.zip",
    "https://metadata.google.internal/latest/meta-data/",
    "https://169.254.169.254/latest/meta-data/",
    "https://127.0.0.1/build.zip",
    "https://[::1]/build.zip",
    "https://[fe80::1]/build.zip",
    "https://[fc00::1]/build.zip",
    "https://[::ffff:127.0.0.1]/build.zip",
    "https://2130706433/build.zip",
    "https://0x7f000001/build.zip",
    "https://127.1/build.zip",
    "https://%31%32%37.0.0.1/build.zip",
    "https://downloads.gamehost.net./build.zip",
    "https://downloads.gamehost.net:8443/build.zip",
    "https://user@downloads.gamehost.net/build.zip",
  ]) {
    assert.equal(
      pulseDownloadTestHelpers.parsePublicHttpsUrl(value),
      null,
      `Expected unsafe URL to be rejected: ${value}`
    );
  }

  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "240.0.0.1",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "64:ff9b::a00:1",
    "2001:db8::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
  ]) {
    assert.equal(
      pulseDownloadTestHelpers.isPublicAddress(address),
      false,
      `Expected prohibited address to be rejected: ${address}`
    );
  }
  for (const address of [
    "8.8.8.8",
    "1.1.1.1",
    "2001:4860:4860::8888",
  ]) {
    assert.equal(pulseDownloadTestHelpers.isPublicAddress(address), true);
  }

  assert.equal(
    pulseDownloadTestHelpers.normaliseDownloadUrl(
      new URL("https://github.com/acme/game/blob/v1/build.zip")
    ).href,
    "https://raw.githubusercontent.com/acme/game/v1/build.zip"
  );
  assert.deepEqual(
    pulseDownloadTestHelpers.getGitHubReleaseAsset(
      new URL("https://github.com/acme/game/releases/download/v1/build.zip")
    ),
    { owner: "acme", repo: "game", tag: "v1", assetName: "build.zip" }
  );

  resetFixtures();
  const publicResult = await downloadPulseZip(
    "https://downloads.gamehost.net/build.zip",
    outputPath("public")
  );
  assert.equal(publicResult.bytes, publicZip.length);
  assert.equal(publicResult.finalUrl, "https://downloads.gamehost.net/build.zip");
  assert.deepEqual(await fs.readFile(outputPath("public")), publicZip);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.redirect, "manual");
  assert.equal(requests[0].init.credentials, "omit");
  assert.deepEqual(requests[0].pinnedAddresses, [
    { address: "8.8.8.8", family: 4 },
  ]);
  assert.equal(requests[0].init.dispatcher.options.connect.rejectUnauthorized, true);
  assert(agents.every((agent) => agent.destroyed));

  resetFixtures();
  resolveDns = async (hostname) => {
    dnsCalls.push(hostname);
    throw new Error("IP literals do not use DNS.");
  };
  const ipv6Result = await downloadPulseZip(
    "https://[2001:4860:4860::8888]/build.zip",
    outputPath("ipv6")
  );
  assert.equal(ipv6Result.bytes, publicZip.length);
  assert.deepEqual(requests[0].pinnedAddresses, [
    { address: "2001:4860:4860::8888", family: 6 },
  ]);
  assert.equal(dnsCalls.length, 0);

  resetFixtures();
  responseForRequest = async ({ url }) =>
    url === "https://downloads.gamehost.net/build.zip"
      ? new Response(null, {
          status: 302,
          headers: {
            location: "https://cdn.gamehost.net/objects/build.zip",
          },
        })
      : new Response(publicZip, {
          status: 200,
          headers: { "content-type": "application/zip" },
        });
  const redirected = await downloadPulseZip(
    "https://downloads.gamehost.net/build.zip",
    outputPath("redirect")
  );
  assert.equal(requests.length, 2);
  assert.deepEqual(dnsCalls, ["downloads.gamehost.net", "cdn.gamehost.net"]);
  assert.equal(
    redirected.finalUrl,
    "https://cdn.gamehost.net/objects/build.zip"
  );

  resetFixtures();
  responseForRequest = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://169.254.169.254/latest/meta-data/" },
    });
  await assert.rejects(
    downloadPulseZip(
      "https://downloads.gamehost.net/build.zip",
      outputPath("private-redirect")
    ),
    /unsafe|non-HTTPS|public build host/i
  );
  assert.equal(requests.length, 1, "Private redirect target is never fetched.");
  await assertNoOutput("private-redirect");

  resetFixtures();
  const redirectLimitedDownloader = pulseDownloadTestHelpers.createDownloader({
    maxRedirects: 2,
  });
  responseForRequest = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "/next" },
    });
  await assert.rejects(
    redirectLimitedDownloader(
      "https://redirect-loop.gamehost.net/build.zip",
      outputPath("redirect-limit")
    ),
    /too many build download redirects/
  );
  assert.equal(requests.length, 3);

  resetFixtures();
  let answerCount = 0;
  resolveDns = async (hostname) => {
    dnsCalls.push(hostname);
    answerCount += 1;
    return answerCount === 1
      ? publicAnswer("8.8.8.8")
      : publicAnswer("127.0.0.1");
  };
  const rebindingResult = await downloadPulseZip(
    "https://rebind.gamehost.net/build.zip",
    outputPath("rebind")
  );
  assert.equal(rebindingResult.bytes, publicZip.length);
  assert.equal(answerCount, 1, "The connector uses the captured DNS answer.");
  assert.deepEqual(requests[0].pinnedAddresses, [
    { address: "8.8.8.8", family: 4 },
  ]);

  for (const answerSet of [
    [{ address: "127.0.0.1", family: 4 }],
    [
      { address: "8.8.8.8", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ],
  ]) {
    resetFixtures();
    resolveDns = async (hostname) => {
      dnsCalls.push(hostname);
      return answerSet;
    };
    await assert.rejects(
      downloadPulseZip(
        "https://private-dns.gamehost.net/build.zip",
        outputPath(`private-dns-${answerSet.length}`)
      ),
      /non-public/
    );
    assert.equal(requests.length, 0);
  }

  resetFixtures();
  resolveDns = async () => {
    throw new Error("fixture DNS failure");
  };
  await assert.rejects(
    downloadPulseZip(
      "https://dns-error.gamehost.net/build.zip",
      outputPath("dns-error")
    ),
    /could not safely resolve/
  );
  assert.equal(requests.length, 0);

  resetFixtures();
  responseForRequest = async ({ url, init }) => {
    if (url === "https://api.github.com/repos/acme/game/releases/assets/42") {
      assert.equal(init.headers.Accept, "application/zip, application/octet-stream, */*");
      return new Response(null, {
        status: 302,
        headers: {
          location:
            "https://release-assets.githubusercontent.com/acme/game/build.zip?token=fixture",
        },
      });
    }
    if (url === "https://api.github.com/repos/acme/game/releases/tags/v1") {
      return new Response(null, {
        status: 302,
        headers: {
          location:
            "https://api.github.com/repos/acme/game/releases/tags/v1?redirected=1",
        },
      });
    }
    if (url.startsWith("https://api.github.com/")) {
      assert.equal(init.headers.Accept, "application/vnd.github+json");
      return Response.json({
        assets: [
          {
            name: "game-build.zip",
            url: "https://api.github.com/repos/acme/game/releases/assets/42",
          },
        ],
      });
    }
    return new Response(publicZip, {
      status: 200,
      headers: { "content-type": "application/zip" },
    });
  };
  const githubResult = await downloadPulseZip(
    "https://github.com/acme/game/releases/download/v1/game-build.zip",
    outputPath("github")
  );
  assert.equal(requests.length, 4);
  assert.equal(requests[0].url, "https://api.github.com/repos/acme/game/releases/tags/v1");
  assert.equal(
    githubResult.finalUrl,
    "https://release-assets.githubusercontent.com/acme/game/build.zip?token=fixture"
  );
  assert.deepEqual(
    dnsCalls,
    [
      "api.github.com",
      "api.github.com",
      "api.github.com",
      "release-assets.githubusercontent.com",
    ]
  );

  resetFixtures();
  responseForRequest = async ({ url }) =>
    url.startsWith("https://api.github.com/")
      ? new Response(null, {
          status: 302,
          headers: {
            location: "https://[::1]/private-release",
          },
        })
      : Response.json({ assets: [] });
  await assert.rejects(
    downloadPulseZip(
      "https://github.com/acme/game/releases/download/v1/game-build.zip",
      outputPath("github-private-redirect")
    ),
    /unsafe|non-HTTPS|public build host/i
  );
  assert.equal(requests.length, 1, "Private GitHub API redirects are never fetched.");
  await assertNoOutput("github-private-redirect");

  resetFixtures();
  responseForRequest = async ({ url }) =>
    url.startsWith("https://api.github.com/")
      ? Response.json({
          assets: [
            {
              name: "game-build.zip",
              url: "https://attacker.gamehost.net/releases/assets/42",
            },
          ],
        })
      : new Response(publicZip);
  await assert.rejects(
    downloadPulseZip(
      "https://github.com/acme/game/releases/download/v1/game-build.zip",
      outputPath("github-untrusted-asset")
    ),
    /validate the GitHub Release asset/
  );
  assert.equal(requests.length, 1, "Untrusted GitHub API URLs are not fetched.");

  resetFixtures();
  const timedDownloader = pulseDownloadTestHelpers.createDownloader({
    timeoutMs: 20,
  });
  fetchRequest = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener(
        "abort",
        () => reject(new Error("aborted fixture request")),
        { once: true }
      );
    });
  await assert.rejects(
    timedDownloader(
      "https://slow.gamehost.net/build.zip",
      outputPath("timeout")
    ),
    /timed out/
  );
  await assertNoOutput("timeout");

  resetFixtures();
  const stalledBodyDownloader = pulseDownloadTestHelpers.createDownloader({
    timeoutMs: 20,
  });
  let stalledBodyCancelled = false;
  responseForRequest = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(publicZip);
        },
        cancel() {
          stalledBodyCancelled = true;
        },
      }),
      { status: 200 }
    );
  await assert.rejects(
    stalledBodyDownloader(
      "https://stalled-body.gamehost.net/build.zip",
      outputPath("stalled-body")
    ),
    /timed out/
  );
  assert.equal(stalledBodyCancelled, true, "A timed-out download cancels its response stream.");
  await assertNoOutput("stalled-body");

  resetFixtures();
  const limitedDownloader = pulseDownloadTestHelpers.createDownloader({
    maxDownloadBytes: 8,
  });
  responseForRequest = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("PK1234"));
          controller.enqueue(Buffer.from("5678"));
          controller.close();
        },
      }),
      { status: 200 }
    );
  await assert.rejects(
    limitedDownloader(
      "https://large.gamehost.net/build.zip",
      outputPath("too-large")
    ),
    /larger than/
  );
  await assertNoOutput("too-large");

  resetFixtures();
  responseForRequest = async () =>
    new Response(publicZip, {
      status: 200,
      headers: { "content-length": String(publicZip.length - 1) },
    });
  await assert.rejects(
    downloadPulseZip(
      "https://short-content-length.gamehost.net/build.zip",
      outputPath("short-content-length")
    ),
    /incomplete/
  );
  await assertNoOutput("short-content-length");

  resetFixtures();
  responseForRequest = async () =>
    new Response(publicZip, {
      status: 200,
      headers: { "content-length": "not-a-number" },
    });
  await assert.rejects(
    downloadPulseZip(
      "https://malformed-content-length.gamehost.net/build.zip",
      outputPath("malformed-content-length")
    ),
    /invalid Content-Length/
  );
  await assertNoOutput("malformed-content-length");

  resetFixtures();
  responseForRequest = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("PK"));
          controller.error(new Error("fixture stream failure"));
        },
      }),
      { status: 200 }
    );
  await assert.rejects(
    downloadPulseZip(
      "https://broken-stream.gamehost.net/build.zip",
      outputPath("broken-stream")
    ),
    /safely download/
  );
  await assertNoOutput("broken-stream");

  resetFixtures();
  const apiLimitedDownloader = pulseDownloadTestHelpers.createDownloader({
    maxGitHubApiBytes: 16,
  });
  responseForRequest = async () =>
    Response.json({
      assets: [{ name: "build.zip", url: "https://api.github.com/too-large" }],
      padding: "too large for this test limit",
    });
  await assert.rejects(
    apiLimitedDownloader(
      "https://github.com/acme/game/releases/download/v1/build.zip",
      outputPath("api-too-large")
    ),
    /oversized GitHub Release response/
  );
  await assertNoOutput("api-too-large");

  resetFixtures();
  responseForRequest = async () =>
    new Response(
      JSON.stringify({
        assets: [
          {
            name: "build.zip",
            url: "https://api.github.com/repos/acme/game/releases/assets/42",
          },
        ],
      }),
      {
        status: 200,
        headers: { "content-length": "1" },
      }
    );
  await assert.rejects(
    downloadPulseZip(
      "https://github.com/acme/game/releases/download/v1/build.zip",
      outputPath("api-content-length-mismatch")
    ),
    /incomplete GitHub Release response/
  );
  await assertNoOutput("api-content-length-mismatch");

  resetFixtures();
  responseForRequest = async () =>
    new Response("not a zip", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  await assert.rejects(
    downloadPulseZip(
      "https://html.gamehost.net/build.zip",
      outputPath("not-zip")
    ),
    /not a ZIP file/
  );
  await assertNoOutput("not-zip");

  const savedEnvironment = new Map(
    ["PULSE_EXECUTION_ENABLED", "PULSE_RUNNER_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
      .map((key) => [key, process.env[key]])
  );
  process.env.PULSE_EXECUTION_ENABLED = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role";
  delete process.env.PULSE_RUNNER_SECRET;

  let pulseJobLookups = 0;
  let pulseJobDeveloperId = "another-user";
  let pulseJobStatus = "ACQUIRING_BUILD";
  const routeClient = {
    auth: {
      getUser: async (token) => ({
        data: { user: token === "valid-user-token" ? { id: "owner" } : null },
        error: token === "valid-user-token" ? null : new Error("invalid token"),
      }),
    },
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          if (table === "game_submissions") {
            return {
              data: { id: "submission-1", developer_id: "owner", game_link: "https://games.example/build.zip" },
              error: null,
            };
          }
          pulseJobLookups += 1;
          return {
            data: {
              id: "job-1",
              submission_id: "submission-1",
              developer_id: pulseJobDeveloperId,
              status: pulseJobLookups === 1 ? "ACQUIRING_BUILD" : pulseJobStatus,
              build_url: "https://games.example/build.zip",
            },
            error: null,
          };
        },
      };
    },
  };
  class FixtureNextResponse {
    static json(body, options = {}) {
      return { status: options.status ?? 200, json: async () => body };
    }
  }
  const route = loadTypeScript("app/api/pulse/preflight/route.ts", {
    "next/server": { NextResponse: FixtureNextResponse },
    "@supabase/supabase-js": { createClient: () => routeClient },
    "@/lib/pulse-public-download": {
      downloadPulseZip: async () => {
        throw new Error("Download should not be reached in authorization fixtures.");
      },
    },
  });
  const routeRequest = ({ token, runnerSecret, body }) => ({
    headers: new Headers({
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(runnerSecret ? { "x-pulse-runner-secret": runnerSecret } : {}),
    }),
    json: async () => body,
  });

  try {
    assert.equal(
      (await route.POST(routeRequest({ body: { submissionId: "submission-1" } }))).status,
      401,
      "Unauthenticated preflight requests remain rejected."
    );
    assert.equal(
      (await route.POST(routeRequest({ token: "invalid-token", body: { submissionId: "submission-1" } }))).status,
      401,
      "User-token requests remain behind the trusted-runner authentication gate."
    );
    assert.equal(
      (await route.POST(routeRequest({
        token: "valid-user-token",
        body: { submissionId: "submission-1", jobId: "job-1" },
      }))).status,
      401,
      "The execution endpoint continues to require trusted-runner authentication."
    );

    process.env.PULSE_RUNNER_SECRET = "fixture-runner-secret";
    assert.equal(
      (await route.POST(routeRequest({
        runnerSecret: "fixture-runner-secret",
        body: { submissionId: "submission-1" },
      }))).status,
      400,
      "Trusted runner requests still require a queued job ID."
    );
    pulseJobLookups = 0;
    assert.equal(
      (await route.POST(routeRequest({
        runnerSecret: "fixture-runner-secret",
        body: { submissionId: "submission-1", jobId: "job-1" },
      }))).status,
      403,
      "Trusted runner requests still verify job ownership against the submission owner."
    );
    pulseJobDeveloperId = "owner";
    pulseJobStatus = "QUEUED";
    pulseJobLookups = 0;
    assert.equal(
      (await route.POST(routeRequest({
        runnerSecret: "fixture-runner-secret",
        body: { submissionId: "submission-1", jobId: "job-1" },
      }))).status,
      409,
      "Trusted runner jobs retain the existing allowed-start-status guard."
    );
  } finally {
    for (const [key, value] of savedEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log(
    "PASS PULSE ZIP download regressions: URL/IP validation, DNS pinning, redirect-chain validation, GitHub Release API/assets, explicit TLS, strict streaming limits and length checks, timeout/cancellation/partial cleanup, ZIP signature and authentication/ownership gates."
  );
} finally {
  await fs.rm(workDirectory, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
let resolveDns;
let fetchRequest;
const agents = [];

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

const undiciFixture = {
  Agent: FixtureAgent,
  fetch: (...args) => fetchRequest(...args),
};

function loadTypeScript(filePath, resolve = require) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function("exports", "require", compiled)(exports, resolve);
  return exports;
}

const helper = loadTypeScript("lib/public-url-fetch.ts", (name) => {
  if (name === "server-only") return {};
  if (name === "node:dns/promises") return { lookup: (...args) => resolveDns(...args) };
  if (name === "undici") return undiciFixture;
  return require(name);
});

function publicAnswer(address = "8.8.8.8") {
  return [{ address, family: address.includes(":") ? 6 : 4 }];
}

function resetFixtures() {
  agents.length = 0;
  resolveDns = async () => publicAnswer();
  fetchRequest = async () => new Response(null, { status: 200 });
}

resetFixtures();

const validPublicUrls = [
  "https://store.steampowered.com/app/123/",
  "https://www.store.steampowered.com/app/123/",
  "https://itch.io/game",
  "https://studio.itch.io/game",
  "https://downloads.example-game.net/build.zip",
];
for (const value of validPublicUrls) {
  assert(helper.publicUrlFetchTestHelpers.parsePublicUrl(value), value);
}

const invalidUrls = [
  "file:///etc/passwd",
  "https://user:password@public.example/",
  "https://public.example:8443/",
  "https://localhost/",
  "https://app.localhost/",
  "https://printer.local/",
  "https://metadata.internal/",
  "https://name.test/",
  "https://public.example./",
  "https://public.example\\@127.0.0.1/",
  "https://%31%32%37.0.0.1/",
  "https://2130706433/",
  "https://0x7f000001/",
  "https://127.1/",
  "https://[::1]/",
  "https://[fe80::1]/",
  "https://[2001:db8::1]/",
];
for (const value of invalidUrls) {
  assert.equal(
    helper.publicUrlFetchTestHelpers.parsePublicUrl(value),
    null,
    value
  );
}

const prohibitedAddresses = [
  "0.0.0.0",
  "10.1.2.3",
  "100.64.0.1",
  "127.0.0.1",
  "169.254.169.254",
  "172.16.0.1",
  "192.0.2.1",
  "192.168.1.1",
  "198.18.0.1",
  "224.0.0.1",
  "240.0.0.1",
  "255.255.255.255",
  "::",
  "::1",
  "::ffff:127.0.0.1",
  "64:ff9b::a00:1",
  "2001:2::1",
  "2001:db8::1",
  "2001::1",
  "2002::1",
  "fc00::1",
  "fe80::1",
  "ff02::1",
];
for (const address of prohibitedAddresses) {
  assert.equal(
    helper.publicUrlFetchTestHelpers.isPublicAddress(address),
    false,
    address
  );
}
for (const address of ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"]) {
  assert.equal(
    helper.publicUrlFetchTestHelpers.isPublicAddress(address),
    true,
    address
  );
}

const pinnedIpv6Lookup = helper.publicUrlFetchTestHelpers.createPinnedLookup(
  "2001:4860:4860::8888",
  publicAnswer("2001:4860:4860::8888")
);
const pinnedIpv6 = await new Promise((resolve, reject) => {
  pinnedIpv6Lookup(
    "2001:4860:4860::8888",
    { all: true, family: 6 },
    (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    }
  );
});
assert.deepEqual(pinnedIpv6, [
  { address: "2001:4860:4860::8888", family: 6 },
]);
await assert.rejects(
  new Promise((resolve, reject) => {
    pinnedIpv6Lookup("attacker.example", {}, (error, address) => {
      if (error) reject(error);
      else resolve(address);
    });
  }),
  { code: "ENOTFOUND" }
);

resetFixtures();
let requests = [];
fetchRequest = async (url, init) => {
  requests.push({ url, init });
  return new Response(null, {
    status: 200,
    headers: { "content-type": "application/zip" },
  });
};
for (const value of validPublicUrls) {
  const result = await helper.testPublicUrlReachability(value);
  assert.equal(result.reachable, true, value);
  assert.equal(result.status, 200, value);
}
assert.equal(requests.length, validPublicUrls.length);
assert(requests.every(({ init }) => init.redirect === "manual"));
assert(requests.every(({ init }) => init.credentials === "omit"));
assert(agents.every((agent) => agent.destroyed));
assert(
  agents.every(
    (agent) =>
      agent.options.maxResponseSize === 1_024 &&
      agent.options.headersTimeout === 4_000 &&
      agent.options.bodyTimeout === 1_000 &&
      agent.options.connect.timeout === 3_000
  ),
  "Each request enforces response-size and connection/header/body timeouts."
);

resetFixtures();
requests = [];
fetchRequest = async (url, init) => {
  requests.push({ url, init });
  return requests.length === 1
    ? new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      })
    : new Response(null, { status: 200 });
};
const privateRedirect = await helper.testPublicUrlReachability(
  "https://public.example.com/build"
);
assert.equal(privateRedirect.reachable, false);
assert.equal(requests.length, 1, "Private redirect target is never fetched.");

resetFixtures();
let redirectRequests = 0;
fetchRequest = async () => {
  redirectRequests += 1;
  return new Response(null, {
    status: 302,
    headers: { location: "/next" },
  });
};
const redirectLoop = await helper.testPublicUrlReachability(
  "https://public.example.com/build"
);
assert.equal(redirectLoop.reachable, false);
assert.equal(redirectRequests, 6, "Redirects stop after the configured limit.");

resetFixtures();
resolveDns = async () => {
  throw new Error("fixture DNS failure");
};
const dnsFailure = await helper.testPublicUrlReachability(
  "https://dns-error.example.com/build"
);
assert.equal(dnsFailure.reachable, false);
assert.equal(dnsFailure.error, "The public URL could not be checked safely.");

resetFixtures();
requests = [];
fetchRequest = async (url, init) => {
  requests.push({ url, init });
  return requests.length === 1
    ? new Response(null, {
        status: 302,
        headers: { location: "https://downloads.example-game.net/build.zip" },
      })
    : new Response(null, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
};
const publicRedirect = await helper.testPublicUrlReachability(
  "https://store.steampowered.com/app/123/"
);
assert.equal(publicRedirect.reachable, true);
assert.equal(requests.length, 2);
assert.equal(requests[0].init.redirect, "manual");
assert.equal(requests[1].url, "https://downloads.example-game.net/build.zip");

resetFixtures();
requests = [];
let resolutionCount = 0;
resolveDns = async () => {
  resolutionCount += 1;
  return resolutionCount === 1 ? publicAnswer("8.8.8.8") : publicAnswer("127.0.0.1");
};
fetchRequest = async (_url, init) => {
  const lookup = init.dispatcher.options.connect.lookup;
  const lookedUp = await new Promise((resolve, reject) => {
    lookup("rebind.example.com", { all: true, family: 0 }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
  assert.deepEqual(lookedUp, [{ address: "8.8.8.8", family: 4 }]);
  return new Response(null, { status: 200 });
};
const rebinding = await helper.testPublicUrlReachability(
  "https://rebind.example.com/build"
);
assert.equal(rebinding.reachable, true);
assert.equal(resolutionCount, 1, "The connection uses the validated DNS answer.");

for (const answerSet of [
  [{ address: "127.0.0.1", family: 4 }],
  [
    { address: "8.8.8.8", family: 4 },
    { address: "169.254.169.254", family: 4 },
  ],
]) {
  resetFixtures();
  let fetchCalls = 0;
  resolveDns = async () => answerSet;
  fetchRequest = async () => {
    fetchCalls += 1;
    return new Response(null, { status: 200 });
  };
  const blocked = await helper.testPublicUrlReachability(
    "https://dns-target.example.com/build"
  );
  assert.equal(blocked.reachable, false);
  assert.equal(fetchCalls, 0, "Unsafe DNS answers fail closed.");
}

resetFixtures();
requests = [];
fetchRequest = async (url, init) => {
  requests.push({ url, init });
  return requests.length === 1
    ? new Response(null, { status: 405 })
    : new Response("large body fixture", {
        status: 200,
        headers: { "content-type": "application/zip" },
      });
};
const fallback = await helper.testPublicUrlReachability(
  "https://itch.io/game"
);
assert.equal(fallback.reachable, true);
assert.deepEqual(
  requests.map(({ init }) => init.method),
  ["HEAD", "GET"],
  "PULSE retains its HEAD-to-GET fallback."
);
assert.equal(requests[1].init.headers.Range, "bytes=0-0");
assert.equal(requests[1].init.redirect, "manual");

function makeDatabase({ user, profile, submission }) {
  const inserted = { run: null, results: null };
  return {
    inserted,
    auth: {
      getUser: async (token) => ({
        data: { user: token === "valid-token" ? user : null },
        error: token === "valid-token" ? null : new Error("invalid token"),
      }),
    },
    from(table) {
      if (table === "profiles") {
        const query = {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: profile, error: null }),
        };
        return query;
      }
      if (table === "game_submissions") {
        const query = {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: submission, error: null }),
        };
        return query;
      }
      if (table === "pulse_runs") {
        return {
          insert(value) {
            inserted.run = value;
            return this;
          },
          select() { return this; },
          single: async () => ({ data: { id: "fixture-run" }, error: null }),
          update() {
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === "pulse_results") {
        return {
          insert: async (value) => {
            inserted.results = value;
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

let reachabilityCalls = [];
let database = makeDatabase({
  user: { id: "developer-1" },
  profile: { roles: ["developer"] },
  submission: {
    id: "submission-1",
    developer_id: "developer-1",
    title: "Fixture game",
    developer_name: "Fixture studio",
    game_link: "https://itch.io/game",
    steam_url: "https://store.steampowered.com/app/123/",
    steam_app_id: 123,
    release_status: "alpha",
  },
});
const route = loadTypeScript(
  "app/api/admin/pulse/preflight/route.ts",
  (name) => {
    if (name === "next/server") {
      return {
        NextResponse: {
          json: (body, init) => Response.json(body, init),
        },
      };
    }
    if (name === "@supabase/supabase-js") {
      return { createClient: () => database };
    }
    if (name === "@/lib/public-url-fetch") {
      return {
        testPublicUrlReachability: async (url) => {
          reachabilityCalls.push(url);
          return {
            reachable: true,
            status: 200,
            finalUrl: url,
            contentType: "application/zip",
            durationMs: 1,
          };
        },
      };
    }
    return require(name);
  }
);
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role-key";

function request(token = "valid-token") {
  return {
    headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}),
    json: async () => ({ submissionId: "submission-1" }),
  };
}

reachabilityCalls = [];
database = makeDatabase({
  user: { id: "developer-1" },
  profile: { roles: ["developer"] },
  submission: null,
});
assert.equal((await route.POST(request(null))).status, 401);
assert.equal(reachabilityCalls.length, 0);

database = makeDatabase({
  user: { id: "developer-1" },
  profile: { roles: ["tester"] },
  submission: null,
});
assert.equal((await route.POST(request())).status, 403);
assert.equal(reachabilityCalls.length, 0);

database = makeDatabase({
  user: { id: "developer-1" },
  profile: { roles: ["developer"] },
  submission: {
    id: "submission-1",
    developer_id: "another-developer",
    game_link: "https://itch.io/game",
  },
});
assert.equal((await route.POST(request())).status, 403);
assert.equal(reachabilityCalls.length, 0);

reachabilityCalls = [];
database = makeDatabase({
  user: { id: "developer-1" },
  profile: { roles: ["developer"] },
  submission: {
    id: "submission-1",
    developer_id: "developer-1",
    title: "Fixture game",
    developer_name: "Fixture studio",
    game_link: "https://itch.io/game",
    steam_url: "https://store.steampowered.com/app/123/",
    steam_app_id: 123,
    release_status: "alpha",
  },
});
const successResponse = await route.POST(request());
assert.equal(successResponse.status, 200);
const successBody = await successResponse.json();
assert.equal(successBody.success, true);
assert.equal(successBody.pulse.status, "passed");
assert(reachabilityCalls.includes("https://itch.io/game"));
assert(reachabilityCalls.includes("https://store.steampowered.com/app/123/"));
assert(
  successBody.pulse.checks.some(
    (check) => check.check_key === "build_link_reachable" && check.status === "passed"
  )
);
assert(
  successBody.pulse.checks.some(
    (check) =>
      check.check_key === "steam_listing_reachable" && check.status === "passed"
  )
);
assert.equal(database.inserted.run.triggered_by, "developer-1");

console.log(
  "PASS PULSE SSRF regressions: public Steam/itch URLs, public IPv4/IPv6, prohibited IP ranges and hostname forms, private DNS and mixed-answer rejection, manual redirects, public/private redirect handling, DNS pinning against rebinding, HEAD-to-GET compatibility, authenticated developer ownership and PULSE result behavior."
);

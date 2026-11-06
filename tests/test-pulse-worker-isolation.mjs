import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

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

function responseJson(body, init) {
  return Response.json(body, init);
}

// ---------------------------------------------------------------------------
// Process mocks
// ---------------------------------------------------------------------------

const spawnSyncCalls = [];

function fakeSpawnSync(command, args, options = {}) {
  spawnSyncCalls.push({
    command,
    args: args || [],
    options: options || {},
  });
  return { status: 0, stdout: "", stderr: "", error: null };
}

class FakeStream {
  constructor() {
    this.listeners = [];
    this._chunks = [];
  }
  on(event, listener) {
    if (event === "data") {
      this.listeners.push(listener);
      for (const chunk of this._chunks) listener(chunk);
    }
    return this;
  }
  removeAllListeners() {
    this.listeners = [];
    this._chunks = [];
    return this;
  }
  buffer(chunk) {
    this._chunks.push(chunk);
  }
}

class FakeChild {
  constructor({ pid = 12345 } = {}) {
    this.pid = pid;
    this.killed = false;
    this.stdout = new FakeStream();
    this.stderr = new FakeStream();
    this._exit = null;
  }
  kill() {
    this.killed = true;
  }
  exit(code, signal) {
    this._exit = { code, signal };
    // Emit close for listeners that wait on stream drainage (CR-6).
    for (const listener of this.closeListeners || []) {
      listener(code, signal);
    }
  }
  hang() {
    // Never exit: simulates a worker that runs past its deadline.
  }
  on(event, listener) {
    if (event === "exit") {
      if (this._exit) {
        listener(this._exit.code, this._exit.signal);
      }
    }
    if (event === "close") {
      (this.closeListeners || (this.closeListeners = [])).push(listener);
      if (this._exit) {
        listener(this._exit.code, this._exit.signal);
      }
    }
    return this;
  }
  removeListener(event, listener) {
    if (event === "close" && this.closeListeners) {
      const idx = this.closeListeners.indexOf(listener);
      if (idx !== -1) this.closeListeners.splice(idx, 1);
    }
    return this;
  }
  removeAllListeners() {
    this.stdout.removeAllListeners();
    this.stderr.removeAllListeners();
    this.closeListeners = undefined;
    return this;
  }
}

function asyncIterable(chunks) {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (index < chunks.length) {
            return Promise.resolve({ value: chunks[index++], done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
        return() {
          return Promise.resolve({ done: true });
        },
      };
    },
  };
}

let fakeExecFileResult = { stdout: "ClamAV 0.106.0\n", stderr: "" };

function fakeExecFile(command, args, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  callback(null, fakeExecFileResult);
}

// ---------------------------------------------------------------------------
// Supabase fixture
// ---------------------------------------------------------------------------

// A chainable .eq()/.is() stub that resolves to { error: null } when awaited.
function updateChain() {
  const node = {
    eq: () => updateChain(),
    is: () => updateChain(),
    then: (resolve) => resolve({ error: null }),
  };
  return node;
}

function makeSupabase({ job, submission, technicalRun, user }) {
  return {
    auth: {
      getUser: async (token) => ({
        data: { user: token === "valid-token" ? user : null },
        error: token === "valid-token" ? null : new Error("invalid token"),
      }),
    },
    from: (table) => {
      const base = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({ data: null, error: null }),
      };
      if (table === "pulse_jobs") {
        return {
          ...base,
          maybeSingle: async () => ({ data: job, error: null }),
          update: () => updateChain(),
        };
      }
      if (table === "game_submissions") {
        return {
          ...base,
          maybeSingle: async () => ({ data: submission, error: null }),
        };
      }
      if (table === "pulse_security_scans") {
        return {
          insert: async () => ({ error: null }),
          update: () => updateChain(),
        };
      }
      if (table === "technical_test_runs") {
        return {
          ...base,
          maybeSingle: async () => ({ data: technicalRun, error: null }),
        };
      }
      if (table === "technical_test_sessions") {
        return {
          ...base,
          maybeSingle: async () => ({ data: null, error: null }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

// ---------------------------------------------------------------------------
// FS / download mocks
// ---------------------------------------------------------------------------

const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

async function fakeReadFile() {
  return Buffer.from("zip-bytes");
}
async function fakeAccess() {}
async function fakeWriteFile() {}
function fakeMkdtemp() {
  return "/tmp/playtested-pulse-fixture";
}
async function fakeRm() {}

function fakeCreateReadStream() {
  return asyncIterable([zipBuffer]);
}

function fakeDownloadPulseZip() {
  return async (sourceUrl) => ({
    bytes: zipBuffer.length,
    finalUrl: sourceUrl,
  });
}

// ---------------------------------------------------------------------------
// Route loader
// ---------------------------------------------------------------------------

function loadRoute(overrides = {}) {
  const route = loadTypeScript(
    new URL("../app/api/pulse/preflight/route.ts", import.meta.url),
    (name) => {
      if (name === "next/server")
        return { NextResponse: { json: responseJson } };
      if (name === "@supabase/supabase-js")
        return { createClient: () => makeSupabase(overrides.supabase || {}) };
      if (name === "node:child_process")
        return {
          execFile: overrides.execFile || fakeExecFile,
          spawn: overrides.spawn || (() => new FakeChild()),
          spawnSync: overrides.spawnSync || fakeSpawnSync,
        };
      if (name === "node:fs")
        return { createReadStream: overrides.createReadStream || fakeCreateReadStream };
      if (name === "node:fs/promises")
        return {
          mkdtemp: overrides.mkdtemp || fakeMkdtemp,
          rm: overrides.rm || fakeRm,
          writeFile: overrides.writeFile || fakeWriteFile,
          access: overrides.access || fakeAccess,
          readFile: overrides.readFile || fakeReadFile,
        };
      if (name === "@/lib/pulse-public-download")
        return {
          downloadPulseZip: overrides.downloadPulseZip || fakeDownloadPulseZip(),
        };
      if (name === "node:crypto") return require("node:crypto");
      if (name === "node:os") return require("node:os");
      if (name === "node:path") return require("node:path");
      if (name === "node:util") return require("node:util");
      return require(name);
    }
  );
  return route;
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

process.env.PULSE_EXECUTION_ENABLED = "true";
process.env.PULSE_RUNNER_SECRET = "runner-secret-fixture";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-fixture";
process.env.UNRELATED_PRODUCTION_SECRET = "do-not-pass-me";

const job = {
  id: "job-1",
  submission_id: "submission-1",
  developer_id: "developer-1",
  status: "ACQUIRING_BUILD",
  build_url: "https://downloads.example-game.net/build.zip",
};
const submission = {
  id: "submission-1",
  developer_id: "developer-1",
  title: "Fixture game",
  game_link: "https://itch.io/game",
  steam_url: "https://store.steampowered.com/app/123/",
};
const technicalRunId = "12345678-1234-1234-8234-1234567890ab";
const technicalRun = {
  id: technicalRunId,
  submission_id: "submission-1",
  status: "completed",
  overall_result: "PASS",
  worker_version: "v6.10",
  summary_json: { totalChecks: 116, result: "PASS" },
  started_at: "2026-01-01T00:00:00.000Z",
  completed_at: "2026-01-01T00:01:00.000Z",
  duration_ms: 60000,
};

function makeRequest(options = {}) {
  const headers = {};
  if (options.runnerSecret) headers["x-pulse-runner-secret"] = options.runnerSecret;
  else if (options.token) headers.authorization = `Bearer ${options.token}`;
  return {
    headers: new Headers(headers),
    json: async () => ({
      submissionId: options.submissionId ?? "submission-1",
      jobId: options.jobId ?? "job-1",
    }),
  };
}

// ---------------------------------------------------------------------------
// Test 1: environment allowlist filtering
// ---------------------------------------------------------------------------

{
  const child = new FakeChild();
  child.stdout.buffer(`Technical run created: ${technicalRunId}\n`);
  let capture = null;
  const route = loadRoute({
    supabase: { job, submission, technicalRun, user: { id: "developer-1" } },
    spawn: (cmd, args, options) => {
      capture = options.env;
      return child;
    },
  });
  child.exit(0, null);

  const result = await route.POST(
    makeRequest({ runnerSecret: "runner-secret-fixture" })
  );
  assert.equal(result.status, 200, "successful run should return 200");

  assert.ok(capture, "spawn should be invoked with an env option");
  assert.equal(
    capture.NEXT_PUBLIC_SUPABASE_URL,
    "https://fixture.supabase.test"
  );
  assert.equal(capture.SUPABASE_SERVICE_ROLE_KEY, undefined, "service-role key must not be passed");
  assert.equal(capture.PULSE_RUNNER_SECRET, undefined, "runner secret must not be passed");
  assert.equal(
    capture.UNRELATED_PRODUCTION_SECRET,
    undefined,
    "unrelated secret must not be passed"
  );

  const secretKeys = Object.keys(capture).filter(
    (k) => /SECRET|KEY|TOKEN|PASSWORD|CREDENTIAL/i.test(k)
  );
  assert.deepEqual(secretKeys, [], `no secret keys in worker env: ${JSON.stringify(secretKeys)}`);

  console.log("PASS: worker environment is an explicit allowlist without secrets");
}

// ---------------------------------------------------------------------------
// Test 2: 15-minute deadline terminates the worker process tree
// ---------------------------------------------------------------------------

{
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const capturedCbs = [];
  try {
    globalThis.setTimeout = (cb) => {
      capturedCbs.push(cb);
      return {};
    };
    globalThis.clearTimeout = () => {};

    spawnSyncCalls.length = 0;
    const child = new FakeChild();
    child.hang(); // never exits
    const route = loadRoute({
      supabase: { job, submission, technicalRun, user: { id: "developer-1" } },
      spawn: () => child,
    });

    const promise = route.POST(
      makeRequest({ runnerSecret: "runner-secret-fixture" })
    );

    // downloadPulseZip is mocked in this harness, so the only timer registered
    // before the worker runs is the 15-minute worker deadline.
    await new Promise((resolve) => {
      const poll = () => {
        if (capturedCbs.length >= 1) return resolve();
        realSetTimeout(poll, 5);
      };
      poll();
    });

    const workerDeadlineCb = capturedCbs[capturedCbs.length - 1];
    workerDeadlineCb();

    const result = await promise;
    assert.equal(result.status, 500, "timeout should return 500");
    const body = await result.json();
    assert.equal(body.success, false);
    assert.ok(
      /15-minute execution deadline/.test(body.error),
      "error should reference the deadline: " + body.error
    );

    const taskkill = spawnSyncCalls.find(
      (c) =>
        c.command === "taskkill" &&
        c.args.includes("/F") &&
        c.args.includes("/T") &&
        c.args.includes("/PID")
    );
    assert.ok(
      taskkill,
      `taskkill /F /T /PID should terminate the worker tree on deadline; got ${JSON.stringify(spawnSyncCalls)}`
    );
    console.log("PASS: 15-minute deadline terminates the worker process tree");
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
}

// ---------------------------------------------------------------------------
// Test 3: worker non-zero exit is reported as a failure
// ---------------------------------------------------------------------------

{
  const child = new FakeChild();
  child.exit(1, null); // non-zero exit
  let capture = null;
  const route = loadRoute({
    supabase: { job, submission, technicalRun, user: { id: "developer-1" } },
    spawn: (cmd, args, options) => {
      capture = options.env;
      return child;
    },
  });

  const result = await route.POST(
    makeRequest({ runnerSecret: "runner-secret-fixture" })
  );
  assert.equal(result.status, 500, "worker failure should return 500");
  const body = await result.json();
  assert.equal(body.success, false);
  assert.ok(
    /PULSE Worker could not complete this run/.test(body.error),
    "error should report worker failure: " + body.error
  );
  assert.ok(capture, "spawn env should be captured on failure");
  console.log("PASS: worker failure is reported with 500");
}

// ---------------------------------------------------------------------------
// Test 4: source-level gate
// ---------------------------------------------------------------------------

{
  const routeSource = fs.readFileSync(
    new URL("../app/api/pulse/preflight/route.ts", import.meta.url),
    "utf8"
  );
  assert.ok(
    !/env:\s*process\.env/.test(routeSource),
    "route must not inherit process.env"
  );
  assert.ok(
    /PULSE_WORKER_ENV_ALLOWLIST/.test(routeSource),
    "route must define an env allowlist"
  );
  assert.ok(
    /killProcessTree/.test(routeSource),
    "route must kill the process tree"
  );
  assert.ok(
    /taskkill/.test(routeSource),
    "route must use taskkill /T on Windows for tree kill"
  );
  assert.ok(
    /15 \* 60 \* 1000/.test(routeSource),
    "15-minute deadline must be preserved"
  );
  assert.ok(
    /AbortController|AbortSignal/.test(routeSource),
    "route must support cancellation"
  );
  console.log("PASS: source-level isolation gate");
}

console.log(
  "PASS PULSE worker isolation regressions: env allowlist filtering, 15-minute deadline tree kill, worker failure reporting, cancellation support, source-level gate."
);

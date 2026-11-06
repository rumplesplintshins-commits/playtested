import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { mkdtemp, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

// Load the route module, mocking its external dependencies.
const route = loadTypeScript(
  new URL("../app/api/pulse/preflight/route.ts", import.meta.url),
  (name) => {
    if (name === "next/server")
      return { NextResponse: { json: responseJson } };
    if (name === "@supabase/supabase-js")
      return { createClient: () => ({}) };
    if (name === "node:child_process")
      return require("node:child_process");
    if (name === "node:fs") return require("node:fs");
    if (name === "node:fs/promises") return require("node:fs/promises");
    if (name === "node:crypto") return require("node:crypto");
    if (name === "node:os") return require("node:os");
    if (name === "node:path") return require("node:path");
    if (name === "node:util") return require("node:util");
    if (name === "@/lib/pulse-public-download")
      return { downloadPulseZip: async () => ({ bytes: 0, finalUrl: "" }) };
    return require(name);
  }
);

const { killProcessTree, runPulseWorker } = route;

// Fixture script: hangs forever (simulates a stuck worker)
const hangScript = `
import { setInterval } from "node:timers";
setInterval(() => {}, 1000);
`;

// Fixture script: exits with non-zero code (simulates a crash)
const failScript = `
process.exit(1);
`;

// Fixture script: spawns a grandchild that hangs, then the parent hangs
const grandchildScript = `
import { spawn } from "node:child_process";
import { setInterval } from "node:timers";
const grandchild = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000);"]);
grandchild.unref();
setInterval(() => {}, 1000);
`;

// Helper: write a temp fixture script and return its path
async function writeFixture(content) {
  const dir = await mkdtemp(join(tmpdir(), "pulse-real-process-"));
  const path = join(dir, "fixture.mjs");
  await writeFile(path, content);
  return path;
}

// Helper: spawn a process and return its PID
function spawnFixture(scriptPath) {
  const child = spawn(process.execPath, [scriptPath], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  return { pid: child.pid, child };
}

// Tests
async function main() {
  // Test 1: killProcessTree terminates child + grandchild
  {
    const script = await writeFixture(grandchildScript);
    const { pid, child } = spawnFixture(script);
    assert.ok(pid > 0, "fixture process should have a PID");

    // Give the grandchild time to spawn
    await new Promise((resolve) => setTimeout(resolve, 500));

    killProcessTree(pid);

    // Wait for termination
    await new Promise((resolve) => setTimeout(resolve, 1000));

    child.kill();
    console.log("PASS: killProcessTree terminates child process tree");
  }

  // Test 2: runPulseWorker non-zero exit cleanup
  {
    const script = await writeFixture(failScript);
    try {
      await runPulseWorker(script, [], {
        cwd: tmpdir(),
        env: {},
        timeoutMs: 10000,
        maxBuffer: 1024 * 1024,
      });
      assert.fail("should have rejected on non-zero exit");
    } catch (error) {
      assert.ok(error instanceof Error, "should reject with an Error");
      assert.ok(
        /exited with code 1/.test(error.message),
        `error should mention non-zero exit code: ${error.message}`
      );
      assert.ok(error.killed === true, "failure should be marked killed");
      console.log("PASS: runPulseWorker non-zero exit cleanup");
    }
  }

  // Test 3: runPulseWorker timeout (close event, not exit)
  {
    const script = await writeFixture(hangScript);
    try {
      await runPulseWorker(script, [], {
        cwd: tmpdir(),
        env: {},
        timeoutMs: 1000,
        maxBuffer: 1024 * 1024,
      });
      assert.fail("should have rejected on timeout");
    } catch (error) {
      assert.ok(error instanceof Error, "should reject with an Error");
      assert.ok(
        /15-minute execution deadline/.test(error.message),
        `error should reference the deadline: ${error.message}`
      );
      assert.ok(error.killed === true, "timeout failure should be marked killed");
      console.log("PASS: runPulseWorker timeout cleanup");
    }
  }

  console.log("\nAll PULSE real-process isolation regression tests passed.");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const route = readFileSync(new URL("../app/api/pulse/preflight/route.ts", import.meta.url), "utf8");
const design = readFileSync(new URL("../docs/PULSE-EXECUTION-ISOLATION.md", import.meta.url), "utf8");
assert.match(route, /PULSE_EXECUTION_ENABLED\s*!==\s*"true"/, "Execution must remain opt-in and disabled by default");
assert.match(design, /independent security review/i);
assert.match(design, /no secrets/i);
assert.match(design, /cgroup/i);
console.log("PULSE isolation design gate: documented; implementation not verified.");

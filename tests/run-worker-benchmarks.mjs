import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const worker = path.join(ROOT, "scripts", "workers", "technical-test-worker-v6.8.mjs");
const benchmarkDir = path.join(ROOT, "benchmarks-generalisation");
const resultsDir = path.join(ROOT, "technical-test-results");
const profile = process.argv.find((x) => x.startsWith("--profile="))?.split("=")[1] ?? "quick";

const allBenchmarks = [
  {
    id: "01",
    game: "Canvas Platformer",
    zip: path.join(benchmarkDir, "01-canvas-platformer.zip"),
  },
  {
    id: "02",
    game: "DOM Reaction",
    zip: path.join(benchmarkDir, "02-dom-reaction.zip"),
  },
  {
    id: "03",
    game: "Auto Canvas Broken Input",
    zip: path.join(benchmarkDir, "03-auto-canvas-broken-input.zip"),
  },
  {
    id: "04",
    game: "Neon Dodge",
    zip: path.join(
      process.env.USERPROFILE ?? "",
      "Downloads",
      "playtested-neon-dodge-faulty-build-0.1.zip"
    ),
  },
];

const only = process.argv.find((x) => x.startsWith("--only="))?.split("=")[1] ?? null;
const benchmarks = only
  ? allBenchmarks.filter(
      (benchmark) =>
        benchmark.id === only ||
        benchmark.game.toLowerCase().includes(only.toLowerCase())
    )
  : allBenchmarks;

if (benchmarks.length === 0) {
  console.error(`No benchmark matched --only=${only}`);
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, shell: false });
    let output = "";
    child.stdout.on("data", (chunk) => { const text = chunk.toString(); output += text; process.stdout.write(text); });
    child.stderr.on("data", (chunk) => { const text = chunk.toString(); output += text; process.stderr.write(text); });
    child.on("error", (error) => resolve({ code: 1, output: `${output}\n${error.message}` }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

function matchNumber(text, regex, group = 1) {
  const match = text.match(regex);
  return match ? Number(match[group]) : null;
}

function parseSummary(text) {
  const launch = text.match(/Launch\s+(\d+)\/(\d+)/);
  const restart = text.match(/Restart\s+(\d+)\/(\d+)/);
  const interaction = text.match(/Interaction\s+(\d+)\s+confirmed\s+\|\s+(\d+)\s+failed\s+\|\s+(\d+)\s+inconclusive\s+\((\d+)\s+checks\)/);
  const overall = text.match(/OVERALL RESULT:\s*(.+)/);
  const report = text.match(/Full JSON report:\s*(.+\.json)/);
  return {
    launch: launch ? `${launch[1]}/${launch[2]}` : "?",
    restart: restart ? `${restart[1]}/${restart[2]}` : "?",
    interaction: interaction ? `${interaction[1]}C/${interaction[2]}F/${interaction[3]}I` : "?",
    stalls: matchNumber(text, /Sessions with stalls\s+(\d+)/),
    errors: matchNumber(text, /Sessions with errors\s+(\d+)/),
    overall: overall ? overall[1].trim() : "UNKNOWN",
    report: report ? report[1].trim() : null,
  };
}

function pad(value, width) {
  return String(value).slice(0, width - 1).padEnd(width, " ");
}

if (!existsSync(worker)) {
  console.error(`Worker not found: ${worker}`);
  console.error("Put technical-test-worker-v6.8.mjs in .\\scripts\\workers\\ first.");
  process.exit(1);
}

for (const benchmark of benchmarks) {
  if (!existsSync(benchmark.zip)) {
    console.error(`Benchmark ZIP not found: ${benchmark.zip}`);
    process.exit(1);
  }
}

mkdirSync(resultsDir, { recursive: true });
console.log("\nPLAYTESTED AUTOMATED BENCHMARK HARNESS");
console.log("------------------------------------");
console.log(`Worker:  ${path.basename(worker)}`);
console.log(`Profile: ${profile.toUpperCase()}`);
console.log(`Games:   ${benchmarks.length}`);
console.log("Runs are sequential to avoid CPU/timing interference between tests.\n");

const suiteStart = Date.now();
const results = [];

for (let i = 0; i < benchmarks.length; i += 1) {
  const benchmark = benchmarks[i];
  const zip = benchmark.zip;
  console.log("\n============================================================");
  console.log(`[${i + 1}/${benchmarks.length}] ${benchmark.game}`);
  console.log("============================================================\n");
  const started = Date.now();
  const result = await run(process.execPath, [
    worker,
    `--zip=${zip}`,
    `--game=${benchmark.game}`,
    `--build=V6.8 Harness ${benchmark.id}`,
    `--profile=${profile}`,
    "--benchmark",
  ]);
  results.push({
    id: benchmark.id,
    game: benchmark.game,
    exitCode: result.code,
    durationSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    ...parseSummary(result.output),
  });
}

console.log("\n\nPLAYTESTED BENCHMARK SUMMARY");
console.log("----------------------------");
console.log(
  pad("ID", 4) + pad("Benchmark", 27) + pad("Launch", 9) + pad("Restart", 9) +
  pad("Interaction", 17) + pad("Stalls", 8) + pad("Errors", 8) + "Result"
);
console.log("-".repeat(100));
for (const r of results) {
  console.log(
    pad(r.id, 4) + pad(r.game, 27) + pad(r.launch, 9) + pad(r.restart, 9) +
    pad(r.interaction, 17) + pad(r.stalls ?? "?", 8) + pad(r.errors ?? "?", 8) + r.overall
  );
}

const suiteSeconds = Number(((Date.now() - suiteStart) / 1000).toFixed(1));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const harnessReport = path.join(resultsDir, `benchmark-suite-${stamp}.json`);
writeFileSync(harnessReport, JSON.stringify({
  generatedAt: new Date().toISOString(),
  worker: path.basename(worker),
  profile,
  suiteSeconds,
  results,
}, null, 2));

console.log(`\nSuite duration: ${suiteSeconds}s`);
console.log("Interaction: C = confirmed, F = failed, I = inconclusive");
console.log(`Harness JSON: ${harnessReport}`);

if (results.some((r) => r.exitCode !== 0)) process.exitCode = 1;
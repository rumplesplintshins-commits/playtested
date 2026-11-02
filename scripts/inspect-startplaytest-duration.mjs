import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
const source = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const lines = source.split("\n");

const hits = [];
for (let i = 0; i < lines.length; i++) {
  if (
    lines[i].includes("DurationPicker") ||
    lines[i].includes("estimatedMinutes") ||
    lines[i].includes("buildLocked")
  ) hits.push(i);
}

const ranges = [];
for (const hit of hits) {
  const start = Math.max(0, hit - 18);
  const end = Math.min(lines.length - 1, hit + 18);
  if (!ranges.some(([s, e]) => start <= e + 3 && end >= s - 3)) ranges.push([start, end]);
  else ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], end);
}

for (const [start, end] of ranges) {
  console.log(`\n--- lines ${start + 1}-${end + 1} ---`);
  for (let i = start; i <= end; i++) console.log(`${String(i + 1).padStart(4, " ")} | ${lines[i]}`);
}

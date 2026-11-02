import fs from "node:fs";
import { execFileSync } from "node:child_process";

const path = "app/components/StartPlaytest.tsx";
const current = fs.readFileSync(path, "utf8");
const baseline = execFileSync("git", ["show", "origin/v11:app/components/StartPlaytest.tsx"], { encoding: "utf8" });

function between(source, start, end, label) {
  const a = source.indexOf(start);
  if (a < 0) throw new Error(`Could not find ${label} start.`);
  const b = source.indexOf(end, a);
  if (b < 0) throw new Error(`Could not find ${label} end.`);
  return { start: a, end: b, text: source.slice(a, b) };
}

function replaceRange(source, startMarker, endMarker, replacementSource, label) {
  const target = between(source, startMarker, endMarker, label + " target");
  const replacement = between(replacementSource, startMarker, endMarker, label + " baseline");
  return source.slice(0, target.start) + replacement.text + source.slice(target.end);
}

let out = current;

// Restore the complete production Manage Playtest setup form. This puts back
// access method/link, instructions, focus areas, audience controls and places.
out = replaceRange(
  out,
  '              {setupExpanded && (',
  '            </section>\n\n\n          </div>',
  baseline,
  "manage playtest form"
);

// Restore the complete production New Playtest form body, preserving the
// surrounding feature-branch component and logic.
out = replaceRange(
  out,
  '        {shareControls}\n\n',
  '        {message && (',
  baseline,
  "new playtest form"
);

// Replace both restored native duration selects with the tested controlled picker.
const durationSelect = /<label className="block">\s*<span className="text-sm font-medium text-zinc-200">\s*Estimated test time\s*<\/span>\s*<select[\s\S]*?<\/select>\s*<\/label>/g;
let durationCount = 0;
out = out.replace(durationSelect, () => {
  durationCount += 1;
  return `<div className="block">\n                      <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>\n                      <span className="mt-1 block text-xs leading-5 text-zinc-500">\n                        Set an expectation for how long testers should spend on this round.\n                      </span>\n                      <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />\n                    </div>`;
});
if (durationCount !== 2) throw new Error(`Expected 2 duration selects, replaced ${durationCount}.`);

// Keep the requested plain ASCII setup toggle and repair mojibake introduced by
// earlier Windows rewrites without altering ordinary source text.
out = out.replace('{setupExpanded ? "−" : "+"}', '{setupExpanded ? "-" : "+"}');
const repairs = new Map([
  ["âˆ’", "−"],
  ["Â·", "·"],
  ["â€”", "—"],
  ["â†’", "→"],
  ["â—", "●"],
]);
for (const [bad, good] of repairs) out = out.split(bad).join(good);

// Safety checks: these must exist in BOTH restored forms where appropriate.
for (const required of [
  "How will testers access this build?",
  "Tester access link",
  "Testing instructions",
  "What should testers focus on?",
  "Testing audience",
  "Tester Hub places",
]) {
  const count = out.split(required).length - 1;
  if (count < 2) throw new Error(`Safety check failed: ${required} appears only ${count} time(s).`);
}
if ((out.match(/<DurationPicker/g) ?? []).length !== 2) throw new Error("Safety check failed: expected exactly 2 DurationPicker instances.");
if (!out.includes("<FeedbackUsefulness testId={response.test_id}")) throw new Error("Safety check failed: FeedbackUsefulness was lost.");
if (!out.includes("Free campaigns can have an estimated test time of up to 30 minutes.")) throw new Error("Safety check failed: Free duration validation was lost.");

fs.writeFileSync(path, out, "utf8");
console.log("Restored complete Manage + New Playtest forms from origin/v11.");
console.log("Preserved feature additions and replaced both duration controls with DurationPicker.");
console.log("Repaired known encoding corruption and kept Playtest setup as plain - / +.");
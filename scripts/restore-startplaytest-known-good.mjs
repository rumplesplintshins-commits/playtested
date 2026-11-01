import fs from "node:fs";
import { execFileSync } from "node:child_process";

const path = "app/components/StartPlaytest.tsx";
const baseline = "fbb3f43141c11b1831744598e50749b7b12bbcfb";
const backup = "app/components/StartPlaytest.before-duration-repair.tsx.bak";

const current = fs.readFileSync(path, "utf8");
fs.writeFileSync(backup, current, "utf8");

let src = execFileSync("git", ["show", `${baseline}:${path}`], { encoding: "utf8" });

const importAnchor = 'import { CampaignAudienceFields, audienceSelectionKey, type AudienceAvailability } from "./CampaignAudienceFields";';
if (!src.includes(importAnchor)) throw new Error("Known-good baseline import anchor missing. Nothing written.");
src = src.replace(importAnchor, `${importAnchor}\nimport DurationPicker from "./DurationPicker";`);

const oldDuration = `                    <label className="block">
                      <span className="text-sm font-medium text-zinc-200">
                        Estimated test time
                      </span>

                      <select
                        value={estimatedMinutes}
                        onChange={(event) =>
                          setEstimatedMinutes(event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                      >
                        <option value="">Not specified</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1 hour 30 minutes</option>
                        <option value="120">2 hours</option>
                        <option value="180">3+ hours</option>
                      </select>
                    </label>`;

const newDuration = `                    <div className="block">
                      <span className="text-sm font-medium text-zinc-200">Estimated test time</span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        Set an expectation for how long testers should spend on this round.
                      </span>
                      <DurationPicker
                        value={estimatedMinutes}
                        onChange={setEstimatedMinutes}
                        isPro={developerPlan.data?.plan === "pro"}
                      />
                    </div>`;

const occurrences = src.split(oldDuration).length - 1;
if (occurrences !== 2) {
  throw new Error(`Expected exactly 2 original duration controls in known-good baseline, found ${occurrences}. Nothing written.`);
}
src = src.split(oldDuration).join(newDuration);

// Keep the client-side guard aligned with the database rule: anything not confirmed Pro is capped at 30 minutes.
src = src.replaceAll('developerPlan.data?.plan === "free"', 'developerPlan.data?.plan !== "pro"');

// Clamp legacy >30 minute values when a non-Pro developer opens an existing campaign for editing.
const editAnchor = '    setEstimatedMinutes(\n      existingPlaytest.estimatedMinutes\n        ? String(existingPlaytest.estimatedMinutes)\n        : ""\n    );';
if (src.includes(editAnchor)) {
  src = src.replace(editAnchor, `    setEstimatedMinutes(\n      developerPlan.data?.plan !== "pro" && (existingPlaytest.estimatedMinutes ?? 0) > 30\n        ? "30"\n        : existingPlaytest.estimatedMinutes\n          ? String(existingPlaytest.estimatedMinutes)\n          : ""\n    );`);
}

fs.writeFileSync(path, src, "utf8");
console.log("Restored StartPlaytest.tsx from known-good production baseline and applied only the Free/Pro duration control.");
console.log(`Backup of the pre-repair local file: ${backup}`);

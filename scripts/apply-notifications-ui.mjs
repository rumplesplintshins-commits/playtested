import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  return source.replace(before, after);
}

const startPath = "app/components/StartPlaytest.tsx";
let start = fs.readFileSync(startPath, "utf8").replace(/\r\n/g, "\n");

// This script can be run either against the clean branch version or after the
// first UI patch has already been applied locally.
if (!start.includes('import FeedbackUsefulness from "./FeedbackUsefulness";')) {
  start = replaceOnce(
    start,
    'import { FeedbackActions } from "./FeedbackActions";\n',
    'import { FeedbackActions } from "./FeedbackActions";\nimport FeedbackUsefulness from "./FeedbackUsefulness";\n',
    "FeedbackUsefulness import"
  );
}

const validationReturn = '    return {\n      error: "",\n      accessLink: trimmedAccessLink,\n      instructions: trimmedInstructions,\n      target,\n      minutes,\n    };';
if (!start.includes('Free campaigns can have an estimated test time of up to 30 minutes.')) {
  start = replaceOnce(
    start,
    validationReturn,
    '    if (developerPlan.data?.plan !== "pro" && minutes !== null && minutes > 30) {\n      return {\n        error: "Free campaigns can have an estimated test time of up to 30 minutes.",\n        accessLink: "",\n        instructions: "",\n        target: 0,\n        minutes: null as number | null,\n      };\n    }\n\n' + validationReturn,
    "Free duration validation"
  );
}

const durationOptions = `                        <option value="">Not specified</option>\n                        <option value="15">15 minutes</option>\n                        <option value="30">30 minutes</option>\n                        <option value="45">45 minutes</option>\n                        <option value="60">1 hour</option>\n                        <option value="90">1 hour 30 minutes</option>\n                        <option value="120">2 hours</option>\n                        <option value="180">3+ hours</option>`;
const proLabelDurationOptions = `                        <option value="">Not specified</option>\n                        <option value="15">15 minutes</option>\n                        <option value="30">30 minutes</option>\n                        <option value="45" disabled={developerPlan.data?.plan !== "pro"}>45 minutes{developerPlan.data?.plan === "pro" ? "" : " — Pro"}</option>\n                        <option value="60" disabled={developerPlan.data?.plan !== "pro"}>1 hour{developerPlan.data?.plan === "pro" ? "" : " — Pro"}</option>\n                        <option value="90" disabled={developerPlan.data?.plan !== "pro"}>1 hour 30 minutes{developerPlan.data?.plan === "pro" ? "" : " — Pro"}</option>\n                        <option value="120" disabled={developerPlan.data?.plan !== "pro"}>2 hours{developerPlan.data?.plan === "pro" ? "" : " — Pro"}</option>\n                        <option value="180" disabled={developerPlan.data?.plan !== "pro"}>3+ hours{developerPlan.data?.plan === "pro" ? "" : " — Pro"}</option>`;
const lockedDurationOptions = `                        <option value="">Not specified</option>\n                        <option value="15">15 minutes</option>\n                        <option value="30">30 minutes</option>\n                        <option value="45" disabled={developerPlan.data?.plan !== "pro"}>45 minutes</option>\n                        <option value="60" disabled={developerPlan.data?.plan !== "pro"}>1 hour</option>\n                        <option value="90" disabled={developerPlan.data?.plan !== "pro"}>1 hour 30 minutes</option>\n                        <option value="120" disabled={developerPlan.data?.plan !== "pro"}>2 hours</option>\n                        <option value="180" disabled={developerPlan.data?.plan !== "pro"}>3+ hours</option>`;

if (start.includes(proLabelDurationOptions)) {
  start = start.split(proLabelDurationOptions).join(lockedDurationOptions);
} else if (start.includes(durationOptions)) {
  start = start.split(durationOptions).join(lockedDurationOptions);
} else if (!start.includes(lockedDurationOptions)) {
  throw new Error("Estimated duration options not found");
}

const individualEnd = `                {response.feedback?.trim() && (\n                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">\n                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">\n                      Anything else\n                    </p>\n                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">\n                      {response.feedback}\n                    </p>\n                  </div>\n                )}\n              </div>\n            </details>`;
if (!start.includes('<FeedbackUsefulness testId={response.test_id} />')) {
  start = replaceOnce(
    start,
    individualEnd,
    individualEnd.replace('              </div>\n            </details>', '                {!response.test_id.startsWith("preview-") && (\n                  <FeedbackUsefulness testId={response.test_id} />\n                )}\n              </div>\n            </details>'),
    "Individual usefulness control"
  );
}

const historicalTitle = `                                <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-zinc-200">\n                                  Playtested tester {index + 1}\n                                </summary>`;
if (start.includes(historicalTitle)) {
  start = replaceOnce(
    start,
    historicalTitle,
    `                                <summary className="cursor-pointer list-none p-3">\n                                  <p className="text-sm font-semibold text-zinc-200">Playtested tester {index + 1}</p>\n                                  <p className="mt-1 text-xs font-normal text-zinc-500">\n                                    {response.submitted_at ? historyFormatDate(response.submitted_at) : "Submission date unavailable"}\n                                  </p>\n                                </summary>`,
    "Historical response timestamp"
  );
}

fs.writeFileSync(startPath, start);

const headerPath = "app/components/SiteHeader.tsx";
let header = fs.readFileSync(headerPath, "utf8").replace(/\r\n/g, "\n");
if (!header.includes('aria-pressed={notificationsOpen}')) {
  header = replaceOnce(
    header,
    '                  aria-expanded={notificationsOpen}\n',
    '                  aria-expanded={notificationsOpen}\n                  aria-pressed={notificationsOpen}\n',
    "Bell aria pressed"
  );
}
const oldBellClass = '                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-zinc-300 transition hover:border-white/30 hover:bg-white/[0.04] hover:text-white"\n';
if (header.includes(oldBellClass)) {
  header = replaceOnce(
    header,
    oldBellClass,
    '                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${notificationsOpen ? "border-[#77f29b]/60 bg-[#77f29b]/10 text-[#77f29b]" : "border-white/15 text-zinc-300 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"}`}\n',
    "Bell active styling"
  );
}
fs.writeFileSync(headerPath, header);

console.log("Applied notification, feedback usefulness, timestamp and Free duration UI changes.");

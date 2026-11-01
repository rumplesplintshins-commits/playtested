import fs from "node:fs";

const path = "app/components/GameCatalogue.tsx";
let text = fs.readFileSync(path, "utf8");

function replaceRequired(pattern, replacement, label) {
  if (!pattern.test(text)) throw new Error(`Could not find ${label}`);
  text = text.replace(pattern, replacement);
}

// Keep historical approved no-AI declarations readable without changing stored data.
if (!text.includes('"No AI disclosed": "No AI disclosed"')) {
  replaceRequired(
    /(\s*"No AI used": "No AI disclosed",)/,
    '$1\n  "No AI disclosed": "No AI disclosed",',
    "legacy no-AI label mapping"
  );
}

// Only show a positive assessment badge. No badge is shown when an assessment
// has not been published/completed.
replaceRequired(
  /function VerificationBadge\(\{[\s\S]*?\n\}\n\nfunction ReceptionBadge/,
  `function VerificationBadge({\n  status,\n}: {\n  status: VerificationStatus | null;\n}) {\n  if (status !== "Verified" && status !== "Assessed") {\n    return null;\n  }\n\n  return (\n    <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">\n      Assessed\n    </span>\n  );\n}\n\nfunction ReceptionBadge`,
  "verification badge"
);

// Do not publish an unfinished internal assessment state on every catalogue card.
replaceRequired(
  /\{game\.listingNotice\|\|game\.assessmentUnavailable\?<span className="rounded border border-amber-200\/30 px-3 py-1 text-xs text-amber-100">\{game\.listingNotice\|\|"Assessment status unavailable"\}<\/span>:<VerificationBadge status=\{game\.verificationStatus \?\? "Not yet verified"\} \/>\}/,
  '{game.listingNotice?<span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">{game.listingNotice}</span>:<VerificationBadge status={game.verificationStatus} />}',
  "catalogue assessment rendering"
);

// Catalogue cards should stay compact. Detail pages/admin can explain that the
// disclosure is developer supplied.
replaceRequired(
  /\{disclosure === "AI use unknown" \? "AI Use Unknown" : `Developer-declared: \$\{disclosureLabel\}`\}/,
  '{disclosureLabel}',
  "catalogue AI badge wording"
);

fs.writeFileSync(path, text);
console.log("Cleaned catalogue assessment and AI badges.");

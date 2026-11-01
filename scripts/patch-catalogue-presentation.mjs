import fs from "node:fs";

const path = "app/components/GameCatalogue.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  '  "No AI used": "No AI disclosed",\n};',
  '  "No AI used": "No AI disclosed",\n  "No AI disclosed": "No AI disclosed",\n};',
  "legacy no-AI public label"
);

replaceOnce(
  '  if (!status) {\n    return null;\n  }',
  '  if (!status || status === "Not yet verified") {\n    return null;\n  }',
  "hide incomplete assessment badge"
);

replaceOnce(
  '      {assessmentLabel(status)}',
  '      Assessed',
  "published assessment public label"
);

replaceOnce(
  '  const disclosure = AI_CLASSIFICATIONS.includes(game.aiType.trim()) ? game.aiType.trim() : "AI use unknown";',
  '  const rawDisclosure = game.aiType.trim();\n  const disclosure =\n    AI_CLASSIFICATIONS.includes(rawDisclosure) || rawDisclosure === "No AI disclosed"\n      ? rawDisclosure\n      : "AI use unknown";',
  "legacy disclosure compatibility"
);

replaceOnce(
  '{game.listingNotice||game.assessmentUnavailable?<span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">{game.listingNotice||"Assessment status unavailable"}</span>:<VerificationBadge status={game.verificationStatus ?? "Not yet verified"} />}',
  '{game.listingNotice ? (\n            <span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">\n              {game.listingNotice}\n            </span>\n          ) : (\n            <VerificationBadge status={game.verificationStatus} />\n          )}',
  "assessment/listing badge presentation"
);

replaceOnce(
  '{disclosure === "AI use unknown" ? "AI Use Unknown" : `Developer-declared: ${disclosureLabel}`}',
  '{disclosureLabel}',
  "AI disclosure label"
);

fs.writeFileSync(path, source, "utf8");
console.log("Catalogue presentation cleanup applied successfully.");

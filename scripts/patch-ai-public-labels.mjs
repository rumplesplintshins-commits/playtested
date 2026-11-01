import fs from "node:fs";

function replaceOnce(text, pattern, to, label) {
  if (!pattern.test(text)) throw new Error(`Could not find ${label}`);
  return text.replace(pattern, to);
}

const cataloguePath = "app/components/GameCatalogue.tsx";
let catalogue = fs.readFileSync(cataloguePath, "utf8");

catalogue = replaceOnce(
  catalogue,
  /const aiTypes = \[\s*"All AI types",\s*\.\.\.AI_CLASSIFICATIONS,\s*"AI use unknown",\s*\];/,
  `const AI_PUBLIC_LABELS: Record<string, string> = {\n  "AI-assisted: Code only": "AI Code Only",\n  "AI-assisted: Content only": "AI Content Only",\n  "AI-assisted: Code and content": "AI Code & Content",\n  "No AI used": "No AI disclosed",\n};\n\nconst aiTypes = [\n  "All AI types",\n  ...AI_CLASSIFICATIONS,\n  "AI use unknown",\n];\n\nfunction publicAiLabel(value: string) {\n  return AI_PUBLIC_LABELS[value] ?? "AI Use Unknown";\n}`,
  "catalogue AI labels"
);

catalogue = replaceOnce(
  catalogue,
  /  const disclosure = AI_CLASSIFICATIONS\.includes\(game\.aiType\.trim\(\)\) \? game\.aiType\.trim\(\) : "AI use unknown";\s*const disclosureStyle = [^;]+;/,
  `  const disclosure = AI_CLASSIFICATIONS.includes(game.aiType.trim()) ? game.aiType.trim() : "AI use unknown";\n  const disclosureLabel = publicAiLabel(disclosure);\n  const disclosureStyle = disclosure === "AI-assisted: Content only" || disclosure === "AI-assisted: Code and content" ? "border-violet-300/30 bg-violet-300/10 text-violet-200" : disclosure === "AI-assisted: Code only" ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-white/25 bg-white/5 text-slate-200";`,
  "catalogue disclosure mapping"
);

catalogue = replaceOnce(
  catalogue,
  /\{disclosure === "AI use unknown" \? "AI Use Unknown" : `Developer-declared: \$\{disclosure\}`\}/,
  `{disclosure === "AI use unknown" ? "AI Use Unknown" : \`Developer-declared: \${disclosureLabel}\`}`,
  "catalogue disclosure text"
);

fs.writeFileSync(cataloguePath, catalogue);

const correctionPath = "app/components/SubmissionCorrection.tsx";
let correction = fs.readFileSync(correctionPath, "utf8");

correction = replaceOnce(
  correction,
  /setFields\(Object\.fromEntries\(SUBMISSION_FIELDS\.map\(rule=>\[rule\.field,String\(value\.submission\[rule\.field\]\?\?""\)\]\)\)\);/,
  `setFields(Object.fromEntries(SUBMISSION_FIELDS.map(rule=>{const stored=String(value.submission[rule.field]??"");return [rule.field,rule.field==="ai_type"&&!AI_CLASSIFICATIONS.includes(stored)?"":stored];})));`,
  "legacy AI correction reset"
);

correction = replaceOnce(
  correction,
  /\{fields\[rule\.field\]&&!options\.includes\(fields\[rule\.field\]\)&&<option value=\{fields\[rule\.field\]\}>Existing value: \{fields\[rule\.field\]\}<\/option>\}/,
  ``,
  "legacy AI option preservation"
);

fs.writeFileSync(correctionPath, correction);
console.log("Updated public AI labels and legacy correction behaviour successfully.");

import fs from "node:fs";

const path = "app/components/GameCatalogue.tsx";
let text = fs.readFileSync(path, "utf8");

function replaceOnce(from, to, label) {
  if (!text.includes(from)) throw new Error(`Could not find ${label}`);
  text = text.replace(from, to);
}

// Keep historical approved no-AI declarations readable without changing stored data.
if (!text.includes('"No AI disclosed": "No AI disclosed"')) {
  replaceOnce(
    '  "No AI used": "No AI disclosed",',
    '  "No AI used": "No AI disclosed",\n  "No AI disclosed": "No AI disclosed",',
    "legacy no-AI label mapping"
  );
}

const oldBadge = `function VerificationBadge({
  status,
}: {
  status: VerificationStatus | null;
}) {
  if (!status) {
    return null;
  }

  const styles: Record<VerificationStatus, string> = {
    Verified:
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    Assessed: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    "Not yet verified": "border-white/20 bg-white/5 text-white/65",
  };

  return (
    <span
      className={\`inline-flex rounded-full border px-3 py-1 text-xs font-medium \${styles[status]}\`}
    >
      {assessmentLabel(status)}
    </span>
  );
}`;

const newBadge = `function VerificationBadge({
  status,
}: {
  status: VerificationStatus | null;
}) {
  if (status !== "Verified" && status !== "Assessed") {
    return null;
  }

  return (
    <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
      Assessed
    </span>
  );
}`;

replaceOnce(oldBadge, newBadge, "verification badge");

replaceOnce(
  '{game.listingNotice||game.assessmentUnavailable?<span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">{game.listingNotice||"Assessment status unavailable"}</span>:<VerificationBadge status={game.verificationStatus ?? "Not yet verified"} />}',
  '{game.listingNotice?<span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">{game.listingNotice}</span>:<VerificationBadge status={game.verificationStatus} />}',
  "catalogue assessment rendering"
);

replaceOnce(
  '{disclosure === "AI use unknown" ? "AI Use Unknown" : `Developer-declared: ${disclosureLabel}`}',
  '{disclosureLabel}',
  "catalogue AI badge wording"
);

fs.writeFileSync(path, text);
console.log("Cleaned catalogue assessment and AI badges.");

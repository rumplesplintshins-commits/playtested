import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
let source = fs.readFileSync(path, "utf8");

// This repair is intentionally narrow: only the final New Playtest branch.
const newBranchStart = source.lastIndexOf('  return (\n    <div className="mt-5 rounded-xl border border-[#77f29b]/20 bg-black/20 p-5">');
if (newBranchStart < 0) throw new Error("Could not locate New Playtest branch.");

const newBranch = source.slice(newBranchStart);
const targeting = '<CampaignAudienceFields minimumRank={minimumRank} setMinimumRank={setMinimumRank} genre={testingGenre} setGenre={setTestingGenre} restricted={genreRestricted} setRestricted={setGenreRestricted} onAvailability={setAudienceAvailability} enabled={testerHubSelected} />';

if (newBranch.includes(targeting)) {
  console.log("New Playtest already contains the tester targeting controls; no targeting insertion needed.");
} else {
  // Insert directly before the duration grid, after the audience selection area.
  const durationGridMarker = '        <div className="grid gap-4 sm:grid-cols-2">\n          {includesPlaytestedTesters(audience) && (';
  const markerIndex = newBranch.indexOf(durationGridMarker);
  if (markerIndex < 0) {
    throw new Error("Could not locate New Playtest duration/capacity grid. No changes written.");
  }
  const absoluteIndex = newBranchStart + markerIndex;
  source = source.slice(0, absoluteIndex) + `        ${targeting}\n\n` + source.slice(absoluteIndex);
}

// Use ASCII +/- for the setup expander so encoding cannot corrupt the glyph.
source = source
  .replace('{setupExpanded ? "−" : "+"}', '{setupExpanded ? "-" : "+"}')
  .replace('{setupExpanded ? "âˆ’" : "+"}', '{setupExpanded ? "-" : "+"}')
  .replace('{setupExpanded ? "Ã¢â‹†â€™" : "+"}', '{setupExpanded ? "-" : "+"}');

fs.writeFileSync(path, source, "utf8");

const verify = fs.readFileSync(path, "utf8").slice(newBranchStart);
if (!verify.includes(targeting)) {
  throw new Error("Verification failed: New Playtest targeting controls are still absent.");
}

console.log("Verified New Playtest contains Minimum tester rank / Testing genre / Audience targeting controls.");
console.log("Normalised Playtest setup expander to ASCII - / +.");
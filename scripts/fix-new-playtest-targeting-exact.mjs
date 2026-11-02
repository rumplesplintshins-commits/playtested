import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
let source = fs.readFileSync(path, "utf8");

const newPlaytestIndex = source.indexOf("            New playtest");
if (newPlaytestIndex < 0) throw new Error("Could not locate New playtest heading.");

const estimatedIndex = source.indexOf("Estimated testing time", newPlaytestIndex);
if (estimatedIndex < 0) throw new Error("Could not locate New Playtest duration field.");

const existingTargetingIndex = source.lastIndexOf("<CampaignAudienceFields", newPlaytestIndex);
if (existingTargetingIndex < 0) throw new Error("Could not locate working CampaignAudienceFields example.");

const newBranchBeforeDuration = source.slice(newPlaytestIndex, estimatedIndex);
if (!newBranchBeforeDuration.includes("<CampaignAudienceFields")) {
  const durationBlockStart = source.lastIndexOf("        <div className=\"block\">", estimatedIndex);
  if (durationBlockStart < newPlaytestIndex) throw new Error("Could not locate New Playtest duration block start.");

  const targeting = `        <CampaignAudienceFields
          minimumRank={minimumRank}
          setMinimumRank={setMinimumRank}
          genre={testingGenre}
          setGenre={setTestingGenre}
          restricted={genreRestricted}
          setRestricted={setGenreRestricted}
          onAvailability={setAudienceAvailability}
          enabled={testerHubSelected}
        />

`;

  source = source.slice(0, durationBlockStart) + targeting + source.slice(durationBlockStart);
}

// Normalise the setup toggle glyph without relying on a Unicode minus character.
source = source.replace(/\{setupExpanded \? [^\n]* : "\+"\}/g, '{setupExpanded ? "-" : "+"}');
source = source.replace(/\{setupExpanded \? "[^\"]*" : "\+"\}/g, '{setupExpanded ? "-" : "+"}');

fs.writeFileSync(path, source, "utf8");

const verify = fs.readFileSync(path, "utf8");
const verifyNew = verify.indexOf("            New playtest");
const verifyDuration = verify.indexOf("Estimated testing time", verifyNew);
const verifySlice = verify.slice(verifyNew, verifyDuration);
if (!verifySlice.includes("<CampaignAudienceFields")) {
  throw new Error("Verification failed: New Playtest still has no CampaignAudienceFields before duration.");
}

console.log("Added Minimum tester rank / Testing genre / Audience targeting to every New Playtest.");
console.log("Normalised Playtest setup toggle to plain - / +.");

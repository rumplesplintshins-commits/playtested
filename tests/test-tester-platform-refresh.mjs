import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/tester-game-platforms.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const module = {exports: {}};
new Function("require", "module", "exports", compiled)(
  (name) => {
    assert(name.includes("platforms"), "Unexpected dependency " + name);
    return {
      platformOf(value) {
        return ["steam","pc","browser","roblox","android","ios"].includes(value) ? value : null;
      },
    };
  },
  module,
  module.exports,
);
const {preserveTesterGamePlatforms, testerGamePlatformKey} = module.exports;
const game = {submission_id: "campaign-1", title: " Invent a Gadget: Lab ", developer_name: "VoltiX Labs", platform: null, can_claim: true};
const key = testerGamePlatformKey("invent a gadget: lab","voltiX labs");
const lookup = new Map([[key, "roblox"]]);
const loaded = preserveTesterGamePlatforms([game], [], lookup);
assert.equal(loaded[0].platform, "roblox", "First fetch resolves from approved game metadata");
const focused = preserveTesterGamePlatforms([{...game, can_claim: false}], loaded, lookup);
assert.equal(focused[0].platform, "roblox", "Focus/notification refresh must retain Roblox");
assert.equal(focused[0].can_claim, false, "Refresh must update eligibility and other new fields");
const fallback = preserveTesterGamePlatforms([game], loaded, new Map());
assert.equal(fallback[0].platform, "roblox", "Refresh retains previous campaign platform when lookup unavailable");
assert.equal(preserveTesterGamePlatforms([{...game, platform:"browser"}], loaded, lookup)[0].platform, "browser", "A new explicit platform overrides old metadata");
assert.equal(preserveTesterGamePlatforms([{...game,submission_id:"campaign-2",title:"Unrelated",developer_name:"Other"}],loaded,new Map())[0].platform, null, "Missing platform stays missing on unrelated game");

const page = readFileSync(new URL("../app/tester/page.tsx", import.meta.url), "utf8");
assert(page.includes("platformCacheRef.current = knownPlatforms"), "Initial approved-game platform cache saved");
assert(page.includes("setGamesWithPlatforms((gamesData ?? []) as TestGame[])"), "Initial load uses shared enrichment");
assert(page.includes("setGamesWithPlatforms((catalogue.data || []) as TestGame[])"), "Focus/notification refresh uses shared enrichment");
assert(page.includes("setGamesWithPlatforms(catalogue.data as TestGame[])"), "Claim refresh uses shared enrichment");
assert(!page.includes("setGames(catalogue.data"), "No raw catalogue refresh may discard platform");
console.log("PASS: initial load, focus/notification and claim refresh retain Roblox/Web platforms while updating other fields");

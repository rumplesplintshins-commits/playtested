import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const source=fs.readFileSync(new URL("../lib/developer-overall-reception.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function("module","exports",compiled)(mod,mod.exports);
const {overallReceptionAcrossBuilds}=mod.exports;
const rows=[
 {playtest_id:"one",accepted_test_count:1,rated_test_count:1,average_overall_score:"10"},
 {playtest_id:"two",accepted_test_count:9,rated_test_count:9,average_overall_score:"6"},
 {playtest_id:"other",accepted_test_count:15,rated_test_count:15,average_overall_score:"1"},
];
const overall=overallReceptionAcrossBuilds(["one","two"],rows);
assert.equal(overall.overallScore,6.4,"Overall rating must weight accepted tester scores, not rounds");
assert.equal(overall.acceptedTests,10);
assert.equal(overall.rounds,2);
assert.equal(overallReceptionAcrossBuilds(["one"],rows).overallScore,10);
assert.equal(overallReceptionAcrossBuilds(["none"],rows).overallScore,null);
assert.equal(overallReceptionAcrossBuilds(["one","missing"],[
 rows[0],{playtest_id:"missing",accepted_test_count:2,rated_test_count:0,average_overall_score:null}
]).overallScore,10,"Unrated reports never count as zero scores");
const page=fs.readFileSync(new URL("../app/my-submissions/page.tsx",import.meta.url),"utf8");
const catalog=fs.readFileSync(new URL("../supabase/migrations/20261112201921_security_catalogue_read_models.sql",import.meta.url),"utf8");
assert(page.includes('supabase.rpc("get_developer_all_build_receptions")'));
assert(page.includes('studioId ? Promise.resolve({ data: [], error: null })'));
assert(page.includes('overallReceptionAcrossBuilds(game.playtests.map(p=>p.id),rawReceptions)'));
assert(page.includes("Overall · All builds"));
assert(!page.includes("<BuildReceptionSummary"),"Header must not switch to selected round");
console.log("PASS all-build weighting, campaign isolation, unrated reviews and studio/personally owned aggregation");

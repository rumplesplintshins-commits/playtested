import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const platforms={};
new Function('exports','require',ts.transpileModule(fs.readFileSync('lib/platforms.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText)(platforms,require);
for(const platform of ['steam','pc','browser'])assert.equal(platforms.supportsPcRequirements(platform),true,`${platform} supports optional PC specs`);
for(const platform of ['roblox','android','ios'])assert.equal(platforms.supportsPcRequirements(platform),false,`${platform} hides optional PC specs`);
assert.equal(platforms.supportsPcRequirements(null),false);

const pagination={};
new Function('exports',ts.transpileModule(fs.readFileSync('lib/pagination.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(pagination);
for(const count of [0,1,9,10,12,18,19]){
 const games=Array.from({length:count},(_,i)=>`game-${i+1}`),pages=pagination.pageCount(count,9);
 const seen=[];
 for(let page=1;page<=pages;page++){
  const shown=pagination.pagedItems(games,page,9);
  assert(shown.length<=9,`${count} games: page ${page} is at most 9`);
  seen.push(...shown);
 }
 assert.deepEqual(seen,games,`${count} games: no duplicate or missing cards`);
 assert.equal(pagination.pagedItems(games,pages,9).length,count===0?0:((count-1)%9)+1,`${count} games: final page length`);
 assert.equal(pagination.safePage(pages+5,count,9),pages,`${count} games: page boundary clamp`);
}
assert.equal(pagination.pagedItems(Array.from({length:19},(_,i)=>i),2,9)[0],9,'next page starts at the following game');

const submit=fs.readFileSync('app/submit/page.tsx','utf8');
const edit=fs.readFileSync('app/components/SubmissionCorrection.tsx','utf8');
const hub=fs.readFileSync('app/tester/page.tsx','utf8');
const pcCard=fs.readFileSync('app/components/GamePcRequirements.tsx','utf8');
const pcData=fs.readFileSync('lib/game-pc-requirements.ts','utf8');
const editMigration=fs.readFileSync('supabase/migrations/202611230001_optional_pc_requirements_edits.sql','utf8');
assert.match(submit,/supportsPcRequirements\(platform\)&&<div className="mb-6"><GamePcFields/,'new form hides hardware fields for unsupported platforms');
assert.match(submit,/if\(supportsPcRequirements\(platform\)\).*parsePcSpecs/,'new form submits specs only on supported platforms');
assert.match(edit,/supportsPcRequirements\(platform\)\?parsePcSpecs[\s\S]*?:null/,'edit omits hidden specs so existing values are preserved');
assert.match(editMigration,/IF p_minimum IS NOT NULL THEN[\s\S]*save_game_pc_requirements/,'edit RPC skips requirement writes when fields are omitted');
assert.match(pcData,/rpc\('get_game_pc_requirements'/,'Tester Hub retrieves requirements through the batched database RPC');
assert.match(pcCard,/tiers\.map\(tier/,'Tester Hub renders supplied minimum and recommended requirement tiers');
assert.match(pcCard,/if\(!showEmpty&&!tiers\.length&&!error\)return null/,'Tester Hub omits empty optional requirements for every platform');
assert.match(hub,/pagedItems\(availableGames,currentAvailablePage,9\)/,'Tester Hub pages the filtered game order at nine per page');
assert.match(hub,/setAvailablePage\(1\)/,'search and filters return to the first available-game page');
assert.match(hub,/availableSearch\.trim\(\)/,'Tester Hub search is applied before pagination');
assert.match(fs.readFileSync('app/components/PaginationControls.tsx','utf8'),/Page \{current\} of \{pages\}/,'pager identifies the current page and total pages');
console.log('PASS PC platform visibility/submission gates for all six platforms, preserved edit requirements, Tester Hub PC requirement retrieval/rendering, and 0/1/9/10/12/18/19 game pagination boundaries.');

import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Execute the actual pure helpers from the page, without copying their logic
// or requiring authenticated Supabase/browser state.
const source = await readFile('app/tester/page.tsx','utf8');
const ast = ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names = ['emptyFeedbackDraft','feedbackDraftKey','readFeedbackDraft','removeFeedbackDraft',
 'feedbackRequiredAnswers','claimMatchesGame','getTesterGameGroups','resolveTestAccess'];
const functions = ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));
assert.equal(functions.length,names.length);
const storage = new Map();
const context = vm.createContext({URL,window:{localStorage:{removeItem:k=>storage.delete(k),getItem:k=>storage.get(k)??null}}});
vm.runInContext(ts.transpileModule(functions.map(n=>n.getText(ast)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const blank = context.emptyFeedbackDraft();
assert.equal(blank.overallScore,'');assert.equal(blank.gameplayScore,'');assert.equal(blank.performanceScore,'');
assert.equal(context.feedbackRequiredAnswers(blank).filter(Boolean).length,0);
const valid={...blank,overallScore:'1',gameplayScore:'2',performanceScore:'3',continuePlaying:'definitely_not',recommendGame:'probably_not',hoursPlayed:'0',enjoyedMost:'Movement',frustrations:'None',biggestImprovement:'Tutorial'};
assert.equal(context.feedbackRequiredAnswers(valid).length,9);
assert.equal(context.feedbackRequiredAnswers(valid).filter(Boolean).length,9);
assert.equal(context.feedbackRequiredAnswers({...valid,overallScore:''}).filter(Boolean).length,8);
const saved=JSON.stringify({version:1,accountId:'a',testId:'t',values:valid});
assert.equal(context.readFeedbackDraft(saved,'a','t').gameplayScore,'2');
assert.throws(()=>context.readFeedbackDraft(saved,'b','t'));
assert.throws(()=>context.readFeedbackDraft(saved,'a','other'));
assert.notEqual(context.feedbackDraftKey('a','t'),context.feedbackDraftKey('b','t'));
storage.set(context.feedbackDraftKey('a','t'),saved);assert.equal(context.removeFeedbackDraft('a','t'),true);
const games=[{submission_id:'campaign'},{submission_id:'new'}];
const groups=context.getTesterGameGroups(games,[{id:'claim',playtest_id:'campaign',status:'claimed'}]);
assert.equal(groups.activeGames[0].submission_id,'campaign');assert.equal(groups.availableGames[0].submission_id,'new');
assert.equal(context.resolveTestAccess({game_link:'https://example.test/build.zip',access_type:'download_build'}).type,'download_build');
assert.equal(context.resolveTestAccess({game_link:'https://store.steampowered.com/app/1',access_type:'other'}).type,'steam_game');
assert.equal(context.resolveTestAccess({game_link:'javascript:alert(1)',access_type:'other'}).link,null);
console.log('PASS: actual page helpers — blank ratings, nine-answer progress, concise honest feedback, account/test draft isolation, cleanup, active/available separation and build/Steam link handling. Live-service integration remains a staging check.');

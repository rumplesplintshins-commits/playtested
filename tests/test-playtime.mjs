import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const helpers={};
new Function('exports',ts.transpileModule(fs.readFileSync('lib/playtime.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(helpers);
const {summarizePlaytime,comparePlaytime,formatPlaytime}=helpers;
assert.deepEqual(summarizePlaytime([]),{count:0,totalHours:null,averageHours:null,medianHours:null});
assert.deepEqual(summarizePlaytime([null,undefined,NaN,Infinity,-1]),{count:0,totalHours:null,averageHours:null,medianHours:null});
assert.deepEqual(summarizePlaytime([0,null]),{count:1,totalHours:0,averageHours:0,medianHours:0});
const input=[1,0.5,2,null];const stats=summarizePlaytime(input);assert.deepEqual(input,[1,0.5,2,null]);assert.equal(stats.totalHours,3.5);assert.equal(stats.averageHours,3.5/3);assert.equal(stats.medianHours,1);
assert.equal(summarizePlaytime([1,2,3,4]).medianHours,2.5);
assert.deepEqual(comparePlaytime(1.2,15),{percentOfReference:480,percentDifference:380});
assert.deepEqual(comparePlaytime(0,15),{percentOfReference:0,percentDifference:-100});
assert.deepEqual(comparePlaytime(0.25,15),{percentOfReference:100,percentDifference:0});
for(const reference of [null,0,-1,NaN,Infinity])assert.equal(comparePlaytime(1,reference),null);
assert.equal(comparePlaytime(null,15),null);assert.equal(comparePlaytime(NaN,15),null);
assert.equal(formatPlaytime(null),'Not reported');assert.equal(formatPlaytime(0),'0 min');assert.equal(formatPlaytime(0.25),'15 min');assert.equal(formatPlaytime(3.5),'3.5h');
// Adding reports doubles total coverage without changing the per-person comparison.
assert.equal(comparePlaytime(summarizePlaytime([1,1]).averageHours,30).percentOfReference,comparePlaytime(summarizePlaytime([1,1,1,1]).averageHours,30).percentOfReference);
assert.equal(summarizePlaytime([1,1,1,1]).totalHours,4);
console.log('PASS: playtime totals, means/medians, missing versus zero values, invalid durations/references, unrounded percentage calculations and sample-size independence. No database calls.');

const intent={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/intent-counts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(intent);assert.deepEqual(intent.intentCounts(['definitely','probably','maybe','probably_not','definitely_not',null,undefined,'']),{definitely:1,probably:1,answered:5});assert.equal(intent.intentText(intent.intentCounts([])),'No answers yet');assert.equal(intent.intentText(intent.intentCounts(['definitely'])),'1 out of 1 positive');assert.equal(intent.intentText(null),'Responses unavailable');

import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const exports={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/public-catalogue-page.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
for(const code of [null,'PGRST202','42883','42501','57014']){
 const calls=[];const client={rpc:async name=>{calls.push(name);return calls.length===1?{data:code?null:[],error:code?{code}:null}:{data:[],error:null};}};
 const result=await exports.publicCataloguePage(client,{});
 assert.equal(calls.length,['PGRST202','42883'].includes(code)?2:1);
 if(['42501','57014'].includes(code))assert.equal(result.error.code,code);
}
console.log('PASS additive catalogue endpoint, missing-function fallback, permission/timeout propagation');

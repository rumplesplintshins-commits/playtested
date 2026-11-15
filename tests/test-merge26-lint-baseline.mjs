import {ESLint} from 'eslint';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const git=args=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const files=[...new Set([...git(['diff','--name-only','b7d8617','--','app','lib']).split(/\r?\n/),...git(['ls-files','--others','--exclude-standard','app','lib']).split(/\r?\n/)])].filter(p=>/\.tsx?$/.test(p));
const eslint=new ESLint(),results=[];
for(const file of files){
 let baseline;try{baseline=(await eslint.lintText(git(['show','b7d8617:'+file]),{filePath:file}))[0];}catch{baseline={errorCount:0,messages:[]};}
 const current=(await eslint.lintFiles([file]))[0];const counts=x=>x.messages.filter(m=>m.severity===2).reduce((a,m)=>(a[m.ruleId]=(a[m.ruleId]||0)+1,a),{}),before=counts(baseline),after=counts(current);
 results.push({file,baseline_errors:baseline.errorCount,current_errors:current.errorCount,before,after});
 for(const [rule,count] of Object.entries(after))assert(count<=(before[rule]||0),`New lint errors: ${file}: ${rule}`);
}
fs.mkdirSync('technical-test-results/m26-final',{recursive:true});fs.writeFileSync('technical-test-results/m26-final/lint-baseline.json',JSON.stringify(results,null,2));
console.log(`PASS targeted lint: ${files.length} changed TypeScript files checked; no new error-rule counts versus b7d8617. Existing errors: ${results.reduce((sum,r)=>sum+r.current_errors,0)}. New files have no errors.`);

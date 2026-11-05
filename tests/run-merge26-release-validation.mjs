import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const suites=[
 ['privacy-controls',['tests/test-merge26-privacy-controls.mjs']],
 ['privacy-development',['--env-file=.env.local','tests/test-merge26-privacy-development.mjs']],
 ['information-pages',['tests/test-catalogue-browser.mjs','--information']],
 ['os-browser',['tests/test-merge26-os-browser.mjs']],
 ['qa-capacity',['tests/test-merge26-qa-capacity.mjs']],
 ['hardware',['tests/test-merge26-hardware.mjs']],['finalisation-development',['--env-file=.env.local','tests/test-merge26-finalisation-development.mjs']],
 ['plan-policy',['tests/test-developer-launch-limit.mjs','--plans']],['plan-browser',['tests/test-developer-workspace.mjs','--plans-browser']],
 ['pc',['tests/test-merge26-pc.mjs']],['pc-browser',['--env-file=.env.local','tests/test-merge26-pc-browser.mjs']],
 ['48-hours',['tests/test-merge26-48-hours.mjs']],['feedback-approval',['tests/test-merge26-feedback-approval.mjs']],['bell-browser',['tests/test-merge26-bell-browser.mjs']],
 ['steam-development',['--env-file=.env.local','tests/test-merge26-steam-development.mjs']],
 ['steam-sql',['tests/test-merge26-steam-referrals.mjs']],['steam-routes',['tests/test-merge26-steam-routes.mjs']],['steam-browser',['tests/test-merge26-steam-browser.mjs']],
 ['core',['tests/test-merge26.mjs']],['identity',['tests/test-merge26-tester-identity.mjs']],['tester-analytics',['tests/test-merge26-tester-analytics.mjs']],
 ['availability',['tests/test-merge26-availability.mjs']],['concurrency',['tests/test-merge26-concurrency.mjs']],
 ['security',['tests/test-merge26-security.mjs']],['origins',['tests/test-proxy-origin.mjs']],['notifications',['tests/test-notification-routing.mjs']],
 ['build-selection',['tests/test-build-results-selection.mjs']],['workspace',['tests/test-developer-workspace.mjs','--server-only']],
 ['listings',['tests/test-submission-corrections.mjs','--listings']],['legacy-final-fixes',['tests/test-m24-final-fixes.mjs']],
 ['xp-quality',['tests/test-testing-policy.mjs','--graded-quality']],
 ['labels-browser',['tests/test-merge26-label-browser.mjs']],['release-browser',['--env-file=.env.local','tests/test-merge26-release-browser.mjs']],
 ['earlier-browser',['--env-file=.env.local','tests/test-merge26-browser.mjs']],
 ['typescript',['node_modules/typescript/bin/tsc','--noEmit']],['targeted-lint',['tests/test-merge26-lint-baseline.mjs']],
 ['build',['node_modules/next/dist/bin/next','build']],['development-postflight',['tests/test-merge26-development-postflight.mjs']],
];
fs.mkdirSync('technical-test-results/m26-final',{recursive:true});fs.mkdirSync('docs',{recursive:true});
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7).split(',');
const selected=only?suites.filter(([suite])=>only.includes(suite)):suites;
const prior=only&&fs.existsSync('docs/MERGE-26-AUTOMATED-RESULTS.json')?JSON.parse(fs.readFileSync('docs/MERGE-26-AUTOMATED-RESULTS.json','utf8')).suites:[];
const results=prior.filter(result=>!selected.some(([suite])=>suite===result.suite));let executed=0;
for(const [suite,args] of selected){
 const result=spawnSync(process.execPath,args,{encoding:'utf8',timeout:240000,maxBuffer:2000000});
 const redact=s=>s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig,'[redacted-address]').replace(/eyJ[A-Za-z0-9_-]{30,}(?:\.[A-Za-z0-9_-]+){0,2}/g,'[redacted-token]');
 const output=redact((result.stdout||'')+'\n'+(result.stderr||''));const evidence=`technical-test-results/m26-final/${suite}.log`;fs.writeFileSync(evidence,output);
 const status=result.status===0?'Passed':'Failed';results.push({suite,command:'node '+args.join(' '),status,exit_code:result.status,evidence,summary:output.split(/\r?\n/).find(line=>line.startsWith('PASS '))||(status==='Passed'?'Command exited successfully.':output.split(/\r?\n/).find(Boolean)||'Execution failed.')});
 console.log(`${status.toUpperCase()} ${suite}`);
 executed++;
 if(status==='Failed'){console.log(results.at(-1).summary);break;}
}
const document={executed_at:new Date().toISOString(),environment:'localhost and development ktifgybnkdaotdxrvjgq / disposable databases',production_access:false,suites:results};fs.writeFileSync('docs/MERGE-26-AUTOMATED-RESULTS.json',JSON.stringify(document,null,2)+'\n');
if(results.some(r=>r.status==='Failed')||executed!==selected.length)process.exitCode=1;

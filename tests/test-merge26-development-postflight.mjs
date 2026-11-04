import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const env=fs.readFileSync('.env.local','utf8'),url=/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m.exec(env)?.[1];assert.equal(new URL(url.trim()).hostname,'ktifgybnkdaotdxrvjgq.supabase.co');
const cli=process.env.M26_SUPABASE_CLI||'C:/Users/OWNER/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const sql=`select (select bool_and(active) from cron.job where jobname='merge26-tester-availability') scheduler_active,
 (select r.status from cron.job_run_details r join cron.job j using(jobid) where j.jobname='merge26-tester-availability' order by r.runid desc limit 1) last_run_status,
 not has_function_privilege('anon','public.tester_rank(uuid)','execute') private_rank_denied,
 not has_function_privilege('authenticated','public.m26_tester_analytics()','execute') private_analytics_denied,
 (select count(*)=count(distinct public_number) from public.tester_public_identities) numbers_unique;`;
const output=execFileSync(cli,['db','query','--remote=ktifgybnkdaotdxrvjgq','--read-only',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
const result=JSON.parse(output.slice(output.indexOf('{'))).rows[0];assert.equal(result.scheduler_active,true);assert.equal(result.last_run_status,'succeeded');assert(result.private_rank_denied&&result.private_analytics_denied&&result.numbers_unique);
fs.mkdirSync('technical-test-results/m26-final',{recursive:true});fs.writeFileSync('technical-test-results/m26-final/development-postflight.json',JSON.stringify(result,null,2));console.log('PASS development postflight: localhost configuration targets development; active minute scheduler has succeeded; direct private rank and analytics grants denied; allocated numbers unique. Read-only development query.');

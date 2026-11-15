import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const env=fs.readFileSync('.env.local','utf8'),url=/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m.exec(env)?.[1];assert.equal(new URL(url.trim()).hostname,'ktifgybnkdaotdxrvjgq.supabase.co');
const cli=process.env.M26_SUPABASE_CLI||'C:/Users/OWNER/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const sql=`select
 exists(select 1 from pg_trigger where tgrelid='public.community_playtests'::regclass and tgfoid='public.fix_free_target()'::regprocedure and tgenabled='O') capacity_freeze_restored,
 (select places=3 from public.testing_policy where singleton) new_capacity_three,
 (select launch_limit=5 and launch_gap=interval '48 hours' and launch_window=interval '720 hours' from public.developer_plan_policy where plan='pro') accepted_pro_policy,
 (select target_testers=3 from public.community_playtests where id='41a91bb0-6439-423f-ab59-fc1defbe0ec8') qa_capacity_three,
 (select reservation_window=interval '48 hours' from public.testing_policy where singleton) new_reservations_48h,
 not has_table_privilege('anon','public.account_pc_specs','select') anonymous_pc_denied,
 not has_table_privilege('authenticated','public.m26_steam_clicks','select') raw_referrals_denied,
 not has_function_privilege('authenticated','public.record_testing_activity_steam_click(uuid,uuid,uuid)','execute') browser_referral_write_denied,
 not has_function_privilege('authenticated','public.m26_steam_referrals_window(integer,integer,timestamptz)','execute') and not has_function_privilege('authenticated','public.m26_steam_referrals(integer,integer)','execute') private_referral_aggregate_denied,
 exists(select 1 from cron.job where active and command like '%m24_analytics_retention%') retention_job_active, (select bool_and(active) from cron.job where jobname='merge26-tester-availability') scheduler_active,
 (select r.status from cron.job_run_details r join cron.job j using(jobid) where j.jobname='merge26-tester-availability' order by r.runid desc limit 1) last_run_status,
 not has_function_privilege('anon','public.tester_rank(uuid)','execute') private_rank_denied,
 not has_function_privilege('authenticated','public.m26_tester_analytics()','execute') private_analytics_denied,
 pg_get_function_result('public.get_feedback_tester_identities(uuid[])'::regprocedure)='TABLE(test_id uuid, current_rank integer)' rank_only_resolver,
 not exists(select 1 from pg_trigger where tgname='allocate_tester_public_identity' and not tgisinternal) number_allocation_disabled;`;
const output=execFileSync(cli,['db','query','--remote=ktifgybnkdaotdxrvjgq','--read-only',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
const result=JSON.parse(output.slice(output.indexOf('{'))).rows[0];assert(result.capacity_freeze_restored);assert(result.new_capacity_three&&result.accepted_pro_policy&&result.qa_capacity_three);assert.equal(result.scheduler_active,true);assert.equal(result.last_run_status,'succeeded');assert(result.new_reservations_48h&&result.anonymous_pc_denied&&result.raw_referrals_denied&&result.browser_referral_write_denied&&result.private_referral_aggregate_denied&&result.retention_job_active);assert(result.private_rank_denied&&result.private_analytics_denied&&result.rank_only_resolver&&result.number_allocation_disabled);
fs.mkdirSync('technical-test-results/m26-final',{recursive:true});fs.writeFileSync('technical-test-results/m26-final/development-postflight.json',JSON.stringify(result,null,2));console.log('PASS development postflight: localhost configuration targets development; active minute scheduler has succeeded; direct private rank and analytics grants denied; rank-only public resolver and legacy number allocation disabled. Read-only development query.');

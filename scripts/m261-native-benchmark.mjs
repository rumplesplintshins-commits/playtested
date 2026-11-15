// Development ONLY. Every fixture row, index and function change is rolled back.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const cli=process.env.SUPABASE_CLI||'supabase';
const ref='ktifgybnkdaotdxrvjgq';
const migration=name=>fs.readFileSync('supabase/migrations/'+name,'utf8').trim().replace(/^\s*begin;\s*$/im,'').replace(/commit;\s*$/i,'');
const explain="explain(analyze,buffers,format json) select game_id,total_count from public.get_public_catalogue(1,12)";
const measure=label=>`perform set_config('role','anon',true);for iteration in 1..7 loop execute $plan$${explain}$plan$ into p; if iteration>2 then samples:=samples||jsonb_build_array(jsonb_build_object('phase','${label}','plan',p));end if;end loop;perform set_config('role',original_role,true);`;
const sql=`begin;set local statement_timeout='120s';create temp table m261_result(data jsonb);
do $benchmark$
declare samples jsonb:='[]';p jsonb;original_role text:=current_user;iteration integer;rows_before bigint;controls bigint;signature_before text;
begin
 select md5(prosrc) into signature_before from pg_proc where oid='public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'::regprocedure;
 select count(*) into rows_before from public.imported_games;
 select count(*) into controls from public.listing_controls where archived or is_admin_test;
 begin

 execute $step$${migration('202611060128_reconcile_catalogue_fixture_hotfix.sql')}$step$;
 insert into public.imported_games(id,steam_app_id,title,steam_url,developer_name,genre,image_url,description,catalogue_eligible,metadata_backfill_status,imported_at,is_nsfw)
 select md5('m261-rollback-only-'||n)::uuid,(980000000+n)::text,'Synthetic volume fixture '||n,'https://store.steampowered.com/app/'||(980000000+n)||'/','Synthetic studio',case when n%2=0 then 'Action' else 'Puzzle' end,'https://example.invalid/fixture.png','Temporary rollback-only benchmark',n<=9550,case when n<=9550 then 'complete' else 'pending' end,now()-n*interval '1 second',false from generate_series(1,195362)n;
 analyze public.imported_games;
 execute $step$${migration('202611040102_merge26_catalogue.sql')}$step$;
 execute $step$${migration('202611040107_merge26_public_claim_ranking.sql')}$step$;
 drop index if exists public.m261_imported_public_candidates;
 drop index if exists public.m261_approved_steam_identity;
 ${measure('before')}
 execute $step$${migration('202611060129_catalogue_custom_plan.sql')}$step$;
 ${measure('after')}
 raise exception '_m261_rollback_fixture';
 exception when raise_exception then if sqlerrm<>'_m261_rollback_fixture' then raise;end if;
 end;
 if (select md5(prosrc) from pg_proc where oid='public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'::regprocedure)<>signature_before then raise exception 'Function rollback failed';end if;
 if (select count(*) from public.imported_games)<>rows_before then raise exception 'Fixture rollback failed';end if;
 insert into m261_result values(jsonb_build_object('environment','Development PostgreSQL; rollback-only fixture','temporary_imports',195362,'eligible_fixture_imports',9550,'active_existing_controls',controls,'rows_before',rows_before,'rows_after',(select count(*) from public.imported_games),'samples',samples));
end;
$benchmark$;
select data benchmark from m261_result;rollback;`;
fs.mkdirSync('.backup-tools/m261',{recursive:true});const file='.backup-tools/m261/native-benchmark.sql';fs.writeFileSync(file,sql);
const output=execFileSync(cli,['db','query','--remote='+ref,'--file',file,'--yes'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000,maxBuffer:8*1024*1024});
const parsed=JSON.parse(output.slice(output.indexOf('{')));const result=parsed.rows?.[0]?.benchmark;if(!result)throw Error('No benchmark evidence returned');
fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/MERGE-26-1-NATIVE-BENCHMARK.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,samples:result.samples.map(s=>({phase:s.phase,ms:s.plan[0]['Execution Time']}))}));

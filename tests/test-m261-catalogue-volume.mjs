import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>`26110000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sql=file=>fs.readFileSync('supabase/migrations/'+file,'utf8');
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(sql(file));
 await db.exec(sql('202611050127_merge26_catalogue_hidden_fastpath_hotfix.sql'));
 await db.exec(sql('202611060128_reconcile_catalogue_fixture_hotfix.sql'));
 // Reapplying the reconciliation must be a no-op, like the already-hotfixed production database.
 await db.exec(sql('202611060128_reconcile_catalogue_fixture_hotfix.sql'));
 await db.exec(`insert into auth.users values('${id(1)}');insert into profiles(id,role,roles) values('${id(1)}','user',array['developer']);
 insert into imported_games(id,title,developer_name,genre,description,image_url,steam_app_id,imported_at,catalogue_eligible,metadata_backfill_status,is_nsfw)
 select md5('m261-import-'||n)::uuid,'Fixture game '||lpad(n::text,6,'0'),'Fixture studio',case when n%2=0 then 'Action, Adventure' else 'Puzzle' end,'Synthetic benchmark content','https://example.invalid/cover.png',(1000000+n)::text,now()-n*interval '1 second',n<=9550,case when n<=9550 then 'complete' else 'pending' end,n%100=0 from generate_series(1,195362)n;
 insert into game_submissions(id,developer_id,title,genre,image_url,status,steam_app_id,submitted_at) values('${id(10)}','${id(1)}','Playtested first','Action','cover','Approved','1000001',now());`);
 // Mirror existing production indexes; the imported pool/eligible subset ratio matters.
 await db.exec(`create index imported_games_metadata_backfill_idx on imported_games(metadata_backfill_status,id);create unique index imported_games_steam_app_id_key on imported_games(steam_app_id);create index imported_games_is_nsfw_idx on imported_games(is_nsfw);create index idx_game_submissions_steam_app_id on game_submissions(steam_app_id);analyze;set role anon;`);
 const args=[1,12,'','All genres','All verification statuses','All AI types',true,'Featured'];
 const query='select game_id,source_type,title,total_count from get_public_catalogue($1,$2,$3,$4,$5,$6,$7,$8)';
 const run=async values=>(await db.query(query,values)).rows;
 const plan=async()=>(await db.query('explain(analyze,buffers,format json) '+query,args)).rows[0]['QUERY PLAN'][0];
 const beforeSamples=[];for(let n=0;n<5;n++)beforeSamples.push((await plan())['Execution Time']);const before=await plan(),baseline=await run(args);assert.equal(Number(baseline[0].total_count),9550);assert.equal(baseline[0].game_id,id(10));
 await db.exec('reset role');fs.mkdirSync('.backup-tools/m261',{recursive:true});fs.writeFileSync('.backup-tools/m261/fixture-catalogue.sql',(await db.query("select pg_get_functiondef('get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'::regprocedure) definition")).rows[0].definition);await db.exec(sql('202611060129_catalogue_custom_plan.sql'));await db.exec('analyze;set role anon');
 const afterSamples=[];for(let n=0;n<5;n++)afterSamples.push((await plan())['Execution Time']);const after=await plan();assert.deepEqual(await run(args),baseline);
 const seen=new Set();for(let page=1;page<=7;page++){const rows=await run([page,...args.slice(1)]);assert.equal(rows.length,12);for(const row of rows){assert(!seen.has(row.game_id));seen.add(row.game_id);assert.equal(Number(row.total_count),9550);}}
 for(const sort of ['Featured','Recently added','Highest rated','Title A-Z']){const rows=await run([...args.slice(0,7),sort]);assert.equal(rows.length,12);assert.deepEqual(rows,await run([...args.slice(0,7),sort]),'Stable sort/ties');}
 const empty=await run([1,12,'not-a-real-fixture','All genres','All verification statuses','All AI types',false,'Featured']);assert.equal(empty.length,0);
 const filtered=await run([1,12,'Fixture game','Puzzle','Steam listings','All AI types',false,'Title A-Z']);assert(filtered.length>0);assert(filtered.every(r=>r.source_type==='steam'));
 const safe=await run([1,12,'','All genres','All verification statuses','All AI types',false,'Featured']);assert(Number(safe[0].total_count)<9550);
 await db.exec(`reset role;insert into listing_controls(game_kind,source_id,is_admin_test) values('submission','${id(10)}',true);set role anon`);
 assert(!(await run(args)).some(r=>r.game_id===id(10)),'Test/demo remains excluded including shared Steam identity');

 // Capture the catalogue after the Test/Demo exclusion case, then compare later migrations.
 const prePlatformBaseline=await run(args);
 // Recreate the production platform-filter migration sequence, then verify
 // the custom-plan restoration preserves the nine-argument RPC and results.
 await db.exec('reset role');
 await db.exec(sql('202611080001_platform_submissions.sql'));
 await db.exec(sql('202611080003_platform_catalogue.sql'));
 await db.exec(sql('202611090002_platform_catalogue_filter.sql'));
 const platformBeforeMeta=(await db.query(`
  select l.lanname,md5(btrim(replace(p.prosrc,chr(13),''),chr(32)||chr(10)||chr(9))) source_hash
  from pg_proc p join pg_language l on l.oid=p.prolang
  where p.oid='public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text,text)'::regprocedure
 `)).rows[0];
 assert.equal(platformBeforeMeta.lanname,'sql');
 assert.equal(platformBeforeMeta.source_hash,'6c27ad3dfda1bf0472a125fc65f2f505','Platform migration must match the reviewed production SQL definition');
 await db.exec(`update imported_games set platform=case when (steam_app_id::integer)%3=0 then 'steam' when (steam_app_id::integer)%2=0 then 'pc' else 'browser' end;
 update game_submissions set platform='steam'; analyze; set role anon;`);
 const platformArgs=[1,12,'','All genres','All verification statuses','All AI types',true,'Featured','all'];
 const platformQuery='select game_id,source_type,title,total_count,platform from get_public_catalogue($1,$2,$3,$4,$5,$6,$7,$8,$9)';
 const platformBeforePlan=(await db.query('explain(analyze,buffers,format json) '+platformQuery,platformArgs)).rows[0]['QUERY PLAN'][0];
 const platformBaseline=(await db.query(platformQuery,platformArgs)).rows;
 assert.deepEqual(platformBaseline.map(({platform,...row})=>row),prePlatformBaseline,'Nine-argument all-platform results must match the pre-platform catalogue');
 await db.exec('reset role');
 await db.exec(sql('20261125120000_restore_catalogue_custom_plan_with_platform_filter.sql'));
 const platformAfterMeta=(await db.query(`
  select l.lanname,pg_get_function_result(p.oid) result_signature
  from pg_proc p join pg_language l on l.oid=p.prolang
  where p.oid='public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text,text)'::regprocedure
 `)).rows[0];
 assert.equal(platformAfterMeta.lanname,'plpgsql');
 assert.match(platformAfterMeta.result_signature,/platform text\)$/);
 await db.exec('analyze; set role anon');
 const platformAfterPlan=(await db.query('explain(analyze,buffers,format json) '+platformQuery,platformArgs)).rows[0]['QUERY PLAN'][0];
 const platformAfterRows=(await db.query(platformQuery,platformArgs)).rows;
 assert.deepEqual(platformAfterRows,platformBaseline,'Custom planning must not change the public catalogue rows');
 for(const platform of ['pc','browser','steam']){
  const rows=(await db.query(platformQuery, [1,12,'','All genres','All verification statuses','All AI types',true,'Featured',platform])).rows;
  assert(rows.length>0,platform+' filter should return matching games');
  assert(rows.every(row=>row.platform===platform),platform+' filter must not leak other platforms');
  assert(Number(rows[0].total_count)>=rows.length);
 }

 const result={environment:'Isolated PGlite PostgreSQL fixture, no hosted data',imported_rows:195362,eligible_imported_rows:9550,baseline:'Production-equivalent guard reconciliation and existing indexes',before_samples_ms:beforeSamples,after_samples_ms:afterSamples,before_ms:[...beforeSamples].sort((a,b)=>a-b)[2],after_ms:[...afterSamples].sort((a,b)=>a-b)[2],before_plan:before,after_plan:after,production_target_met:false,notes:'Database-only WASM measurements, not hosted/network latency. Pages1–7, all four sorts, search/empty/genre/verification/NSFW/approval priority/Steam dedupe tested.'};
 fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/MERGE-26-1-CATALOGUE-VOLUME.json',JSON.stringify(result,null,2));console.log('PASS realistic catalogue: '+JSON.stringify({rows:195362,eligible:9550,before_ms:result.before_ms,after_ms:result.after_ms}));
}finally{await db.close();}

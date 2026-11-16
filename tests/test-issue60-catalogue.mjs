import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const sql=f=>fs.readFileSync('supabase/migrations/'+f,'utf8');
const signature='integer,integer,text,text,text,text,boolean,text,text';
const query=name=>`select * from ${name}($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
const args=[1,12,'','All genres','All verification statuses','All AI types',false,'Featured','all'];
const cases=[...['Featured','Recently added','Highest rated','Title A-Z'].map(sort=>[...args.slice(0,7),sort,'all']),...['pc','browser','steam'].map(p=>[...args.slice(0,8),p]),[2,...args.slice(1)],[0,100,...args.slice(2)],[...args.slice(0,2),'Fixture','Puzzle',...args.slice(4)],[...args.slice(0,2),'absent',...args.slice(3)],[...args.slice(0,6),true,...args.slice(7)]];
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const f of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(sql(f));
 await db.exec(sql('202611050127_merge26_catalogue_hidden_fastpath_hotfix.sql'));
 await db.exec(sql('202611060128_reconcile_catalogue_fixture_hotfix.sql'));
 const view=(await db.query("select pg_get_viewdef('approved_games'::regclass) definition")).rows[0].definition;
 await db.exec(`alter table imported_games add platform text;alter table game_submissions add platform text;create or replace view approved_games as ${view.replace(/\s+FROM /i,', game_submissions.platform FROM ')};create function normalize_platform(text) returns text language sql immutable as $$select case when $1 in ('steam','pc','browser','roblox','android','ios') then $1 else 'steam' end$$;drop function get_public_catalogue(integer,integer,text,text,text,text,boolean,text);`);
 await db.exec(fs.readFileSync('tests/fixtures/issue-60-production-functions.sql','utf8'));
 await db.exec(`insert into imported_games(id,title,developer_name,genre,description,image_url,steam_app_id,imported_at,catalogue_eligible,metadata_backfill_status,is_nsfw,platform)
 select md5('i'||n)::uuid,'Fixture '||lpad(n::text,6,'0'),'Studio',case when n%2=0 then 'Action, Adventure' else 'Puzzle' end,'Synthetic description','https://example.invalid/a.png',(1000000+n)::text,'2026-11-01'::timestamptz-n*interval '1 second',n<=9550,case when n<=9550 then 'complete' else 'pending' end,n%100=0,case when n%3=0 then 'browser' when n%3=1 then 'pc' else null end from generate_series(1,195362)n;
 insert into game_submissions(id,title,developer_name,genre,image_url,steam_app_id,status,submitted_at) values(md5('approved')::uuid,'Approved priority','Studio','Puzzle','cover','1000001','Approved','2026-11-10');
 insert into game_developer_links(id,imported_game_id,relationship) select md5('link'||n)::uuid,md5('i'||n)::uuid,'owner' from generate_series(1,5000)n;
 insert into community_playtests(id,imported_game_id,title,created_at) select md5('p'||n)::uuid,md5('i'||n)::uuid,'Game '||n,'2026-11-01'::timestamptz from generate_series(1,200)n;
 insert into community_game_tests(id,playtest_id,status,review_outcome,overall_score,recommend_game,continue_playing) select md5('t'||n)::uuid,md5('p'||(1+n%200))::uuid,'reviewed',case when n%10=0 then 'rejected' else 'accepted' end,4+n%7,'probably','definitely' from generate_series(1,3000)n;
 create index imported_games_metadata_backfill_idx on imported_games(metadata_backfill_status,id);create unique index imported_games_steam_app_id_key on imported_games(steam_app_id);create index imported_games_is_nsfw_idx on imported_games(is_nsfw);create index idx_game_submissions_steam_app_id on game_submissions(steam_app_id);create index game_developer_links_one_imported_owner on game_developer_links(imported_game_id) where imported_game_id is not null;create index community_game_tests_playtest_id_idx on community_game_tests(playtest_id);analyze;
 revoke all on function get_public_catalogue(${signature}) from public;grant execute on function get_public_catalogue(${signature}) to anon,authenticated,service_role;set role anon;`);
 const run=async(name,a)=>(await db.query(query(name),a)).rows;
 const baseline=[];for(const a of cases)baseline.push(await run('get_public_catalogue',a));
 const rlsBefore=(await db.query("select tablename,policyname,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname")).rows;
 await db.exec("reset role;insert into listing_controls(game_kind,source_id,archived) values('imported',md5('i2')::uuid,true);set role anon");
 const hiddenBaseline=await run('get_public_catalogue',args);
 await db.exec("reset role;delete from listing_controls where source_id=md5('i2')::uuid;set role anon");
 const measure=async name=>{const samples=[];for(let i=0;i<7;i++){const start=performance.now();await run(name,args);samples.push(performance.now()-start);}return samples;};
 const before=await measure('get_public_catalogue');
 const beforePlan=(await db.query('explain (analyze,buffers,format json) '+query('get_public_catalogue'),args)).rows;
 await db.exec('reset role');await db.exec(sql('20261116085753_issue60_catalogue_page.sql'));
 await db.exec('set role anon');const after=await measure('get_public_catalogue_page');
 const afterPlan=(await db.query('explain (analyze,buffers,format json) '+query('get_public_catalogue_page'),args)).rows;
 for(const role of ['anon','authenticated']){
  await db.exec('reset role;set role '+role);
  for(let i=0;i<cases.length;i++){
   assert.deepEqual(await run('get_public_catalogue',cases[i]),baseline[i]);
   const rows=await run('get_public_catalogue_page',cases[i]);
   assert.deepEqual(rows.map(({community_reception,...row})=>row),baseline[i]);
   const reception=(await db.query('select * from get_game_community_reception()')).rows;
   for(const row of rows){const expected=reception.find(r=>row.source_type==='steam'?r.imported_game_id===row.game_id:r.submission_id===row.game_id||r.approved_game_id===row.game_id);assert.deepEqual(row.community_reception,expected?Object.fromEntries(['accepted_test_count','rated_test_count','average_overall_score','recommend_positive_percent','continue_positive_percent','reception_status'].map(k=>[k,typeof expected[k]==='string'&&k!=='reception_status'?Number(expected[k]):expected[k]])):null);}
  }
 }
 await db.exec('reset role');
 assert.deepEqual((await db.query("select tablename,policyname,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname")).rows,rlsBefore,'RLS policies untouched');
 await db.exec("insert into listing_controls(game_kind,source_id,archived) values('imported',md5('i2')::uuid,true);set role anon");
 assert.deepEqual((await run('get_public_catalogue_page',args)).map(({community_reception,...row})=>row),hiddenBaseline,'Archived visibility unchanged');
 await db.exec('reset role');
 const security=(await db.query(`select proname,prosecdef,proconfig,proacl::text from pg_proc where oid in ('get_public_catalogue(${signature})'::regprocedure,'get_public_catalogue_page(${signature})'::regprocedure)`)).rows;
 assert(security.every(r=>!r.prosecdef&&!/(?:\{|,)=X\//.test(r.proacl)),'Invoker endpoints have no PUBLIC execute grant');
 const median=a=>[...a].sort((a,b)=>a-b)[3];
 const result={environment:'Isolated PGlite PostgreSQL WASM; synthetic 195362 imports, 9550 eligible, 5000 developer links, 200 campaigns, 3000 feedback rows; production function definitions read-only 16 Nov',before_ms:before,after_ms:after,before_median_ms:median(before),after_median_ms:median(after),beforePlan,afterPlan,roles:['anon','authenticated'],cases:cases.length,security,production_latency_proven:false};
 fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/issue-60-catalogue.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await db.close();}

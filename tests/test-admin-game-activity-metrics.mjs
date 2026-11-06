import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>`26120000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration='20261106120000_admin_game_activity_metrics.sql';
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 for(const file of ['202611050127_merge26_catalogue_hidden_fastpath_hotfix.sql','202611060128_reconcile_catalogue_fixture_hotfix.sql','202611060129_catalogue_custom_plan.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`create table public.game_claims(id uuid primary key,status text,claimant_id uuid,imported_game_id uuid,submission_id uuid,approved_game_id uuid);
 insert into auth.users values('${id(1)}'),('${id(2)}');
 insert into profiles(id,role,roles) values('${id(1)}','user',array['developer']),('${id(2)}','admin',array['developer']);
 insert into game_submissions(id,developer_id,title,steam_app_id,status,review_reason) values
 ('${id(10)}','${id(1)}','Published','100','Approved',null),
 ('${id(11)}','${id(1)}','Duplicate published','000100','Approved',null),
 ('${id(12)}','${id(1)}','Historical real rejection','200','Rejected',null),
 ('${id(13)}','${id(1)}','Pending',null,'Pending Review',null),
 ('${id(14)}','${id(2)}','Admin developed game',null,'Approved',null),
 ('${id(15)}','${id(2)}','Historical test',null,'Rejected','Rejected. Test'),
 ('${id(16)}','${id(1)}','Explicit test','1600','Approved',null),
 ('${id(17)}','${id(1)}','Archived','1700','Approved',null),
 ('${id(18)}','${id(1)}','Test in a legitimate title','1800','Approved','Rejected. Test'),
 ('d3100000-0000-4000-8000-000000000001','${id(2)}','Known fixture',null,'Approved',null);
 insert into listing_controls(game_kind,source_id,is_admin_test,archived) values
 ('submission','${id(16)}',true,false),('submission','${id(17)}',false,true);
 insert into imported_games(id,title,developer_name,genre,image_url,steam_app_id,catalogue_eligible,metadata_backfill_status,is_nsfw) values
 ('${id(30)}','Steam overlap','Studio','Action','image','100',true,'complete',false),
 ('${id(31)}','NSFW profile','Studio','Action','image','3100',true,'complete',true),
 ('${id(33)}','Manual association','Studio','Action','image','3300',true,'complete',false),
 ('${id(34)}','Ineligible','Studio','Action','image','3400',false,'complete',false),
 ('${id(35)}','Incomplete','Studio','Action',null,'3500',true,'complete',false),
 ('d3100000-0000-4000-8000-000000000101','Legacy import','Studio','Action','image','3600',true,'complete',false);
 insert into game_developer_links(id,developer_id,imported_game_id) values
 ('${id(50)}','${id(1)}','${id(31)}'),('${id(51)}','${id(1)}','${id(33)}'),
 ('${id(52)}','${id(1)}','${id(33)}'),('${id(53)}','${id(1)}','${id(34)}'),
 ('${id(54)}','${id(1)}','${id(35)}'),('${id(55)}','${id(1)}','d3100000-0000-4000-8000-000000000101');
 insert into game_claims(id,status,claimant_id,imported_game_id,submission_id) values
 ('${id(60)}','Approved','${id(1)}','${id(31)}',null),
 ('${id(61)}','Approved','${id(2)}','${id(31)}',null),
 ('${id(62)}','Pending Review','${id(1)}','${id(33)}',null),
 ('${id(63)}','Rejected','${id(1)}','${id(33)}',null),
 ('${id(64)}','Approved','${id(1)}',null,'${id(17)}'),
 ('${id(65)}','Approved','${id(1)}','d3100000-0000-4000-8000-000000000101',null),
 ('${id(66)}','Approved','${id(1)}',null,'${id(16)}'),
 ('${id(67)}','Approved','${id(1)}',null,'${id(18)}'),
 ('${id(68)}','Approved',null,'${id(33)}',null),
 ('${id(69)}','Approved','${id(1)}',null,null),
 ('${id(70)}','Approved','${id(1)}',null,'d3100000-0000-4000-8000-000000000001'),
 ('${id(71)}','Approved','${id(1)}','${id(34)}',null);`);
 await db.exec(fs.readFileSync('supabase/migrations/202611060130_developer_game_metrics.sql','utf8'));
 const before=await db.query('select id,title,status,review_reason from game_submissions order by id');
 await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 assert.deepEqual((await db.query('select id,title,status,review_reason from game_submissions order by id')).rows,before.rows,'Migration preserves existing data');
 const metrics=async()=>(await db.query('select admin_game_activity_metrics() data')).rows[0].data;
 assert.deepEqual(await metrics(),{published_games:5,approved_claims:5,historical_submission_records:10});
 const catalogueIdentities=async()=>{
  await db.exec('set role anon');
  const rows=(await db.query(`select * from get_public_catalogue(1,100,'','All genres','All verification statuses','All AI types',true,'Featured')`)).rows.filter(r=>r.has_playtested_profile);
  await db.exec('reset role');
  const identities=new Set(rows.map(r=>/^\d+$/.test((r.steam_app_id??'').trim())?'steam:'+((r.steam_app_id.trim().replace(/^0+/,''))||'0'):(r.source_type==='approved'?'submission:':'imported:')+r.game_id));
  return identities.size;
 };
 assert.equal((await metrics()).published_games,await catalogueIdentities(),'Matches actual anonymous catalogue with NSFW included, after identity dedup');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select admin_game_activity_metrics()'),/permission denied/);await db.exec('reset role');}
 await db.exec('set role service_role');assert.equal((await metrics()).published_games,5);await db.exec('reset role');
 // Archived claims remain historical approvals; archived listings leave published inventory.
 await db.exec(`insert into listing_controls(game_kind,source_id,archived) values('submission','${id(14)}',true)`);
 assert.deepEqual(await metrics(),{published_games:4,approved_claims:5,historical_submission_records:10});
 // Explicit Test exclusion follows the same cross-source visibility as the catalogue.
 await db.exec(`insert into listing_controls(game_kind,source_id,is_admin_test) values('imported','${id(31)}',true)`);
 assert.deepEqual(await metrics(),{published_games:3,approved_claims:3,historical_submission_records:10});
 assert.equal((await metrics()).published_games,await catalogueIdentities());
 await db.exec(`update game_submissions set status='Approved' where id='${id(12)}'`);
 assert.equal((await metrics()).published_games,4,'Genuine rejected history can later publish without provenance guesses');
 assert.equal((await metrics()).historical_submission_records,10);
 console.log('PASS activity metrics: actual catalogue parity, rejected/test/legacy/archived/incomplete cases, Steam and link dedup, admin/title/note non-inference, approved/pending/rejected/manual claims, multiple approved requests, preserved rows and service-only permissions.');
}finally{await db.close();}

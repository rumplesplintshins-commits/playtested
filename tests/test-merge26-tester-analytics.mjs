import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>`26200000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 await db.exec(`alter table auth.users add column is_anonymous boolean default false,add column deleted_at timestamptz,add column raw_app_meta_data jsonb default '{}';`);
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040109').sort())await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(fs.readFileSync('tests/fixtures/merge26-tester-rank.sql','utf8'));
 for(const n of [1,2,3,4,6,7]){await db.query('insert into auth.users(id,raw_app_meta_data) values($1,$2)',[id(n),n===7?{is_synthetic:true}:{}]);await db.query('insert into profiles(id,role,roles,tester_xp) values($1,$2,$3,$4)',[id(n),n===3?'admin':'user',n===3?['admin']:['tester'],n===2?500:0]);}
 await db.exec(`insert into game_submissions(id,title,status,developer_id) values('${id(10)}','Genuine','Approved','${id(3)}'),('${id(11)}','Demo','Approved','${id(3)}');insert into community_playtests(id,submission_id,developer_id) values('${id(20)}','${id(10)}','${id(3)}'),('${id(21)}','${id(11)}','${id(3)}');set test.uid='${id(3)}';select set_listing_control('submission','${id(11)}','mark_test','');`);
 const report=async(n,tester,status,outcome,hours,days=0,campaign=20)=>db.query(`insert into community_game_tests(id,tester_id,playtest_id,status,review_outcome,hours_played,submitted_at,xp_awarded,quality_reviewed) values($1,$2,$3,$4,$5,$6,now()-make_interval(days=>$7),true,true)`,[id(n),id(tester),id(campaign),status,outcome,hours,days]);
 await report(30,1,'reviewed','accepted',2);await report(31,1,'reviewed','rejected',1);await report(32,1,'submitted','pending',null);
 for(let n=40;n<45;n++)await report(n,2,'reviewed','accepted',1,40);
 await report(50,6,'reviewed','accepted',null,40);await db.query('delete from profiles where id=$1',[id(6)]);
 await report(51,1,'reviewed','accepted',99,0,21);await report(52,1,'claimed','pending',5);await report(53,7,'reviewed','accepted',10);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select m26_tester_analytics()'),/permission denied/);await db.exec('reset role');}
 const metrics=async()=>(await db.query('select m26_tester_analytics() data')).rows[0].data;
 const data=await metrics();assert.equal(data.registered_testers,3);assert.equal(data.active_30_days,1);assert.equal(data.completed,9);assert.equal(data.accepted,7);assert.equal(data.rejected,1);assert.equal(data.pending,1);assert.equal(data.testing_hours,8);assert.equal(data.duration_reports,7);assert.equal(data.acceptance_rate,87.5);
 assert.equal(data.ranks.length,5);assert.equal(data.ranks.find(r=>r.label==='Silver').completed,5);assert.equal(data.ranks.find(r=>r.label==='Gold').testers,0);assert.equal(data.ranks.find(r=>r.rank===-1).completed,1);assert.equal(data.ranks.reduce((sum,r)=>sum+r.completed,0),data.completed);assert.equal(data.ranks.reduce((sum,r)=>sum+r.testers,0),data.registered_testers);
 await db.query("select set_listing_control('submission',$1,'archive','Genuine')",[id(10)]);assert.deepEqual(await metrics(),data,'Archived genuine history remains');
 await db.exec('delete from community_game_tests;delete from profiles');const empty=await metrics();assert.equal(empty.completed,0);assert.equal(empty.registered_testers,0);assert.equal(empty.acceptance_rate,null);assert(empty.ranks.every(r=>r.testers===0));
 console.log('PASS tester analytics: real rank policy, multiple/zero reports, active window, pending/decided denominator, valid/missing hours, empty tiers, missing profiles, synthetic/demo exclusion, archive history, reconciliation, service-only grants and empty state.');
}finally{await db.close();}

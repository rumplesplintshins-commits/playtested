import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {availabilityFixtureSQL,availabilitySeedSQL,id} from './merge26-availability-fixture.mjs';
const db=new PGlite();
const as=async n=>db.exec(`reset role;set test.uid='${id(n)}'`);
const claim=async n=>{await as(n);return db.query('select claim_community_game_test($1)',[id(20)]);};
const preference=async(n,enabled=true)=>{await as(n);return db.query('select set_tester_availability_preference($1,$2)',[id(20),enabled]);};
const count=async()=>+(await db.query("select count(*) n from notifications where dedupe_key like 'tester:availability:%'")).rows[0].n;
try{
 await db.exec(availabilityFixtureSQL());await db.exec(availabilitySeedSQL());
 await as(2);await assert.rejects(db.query('select set_tester_availability_preference($1,null)',[id(20)]),/explicit availability choice/);
 await claim(1);await preference(2);await preference(3);await preference(2);assert.equal((await db.query('select count(*)::int n from tester_availability_preferences')).rows[0].n,2);
 await assert.rejects(preference(1),/active reservation/);await assert.rejects(preference(4),/not available/);
 await as(1);await db.query('select release_community_game_test($1)',[id(20)]);assert.equal(await count(),2);
 assert((await db.query("select href,message from notifications where dedupe_key like 'tester:availability:%'")).rows.every(r=>r.href==='/tester?campaign='+id(20)&&!r.message.includes(id(1))));
 await db.query('select process_tester_availability()');await db.query('select process_tester_availability()');assert.equal(await count(),2);
 await claim(2);assert.equal((await db.query('select count(*)::int n from tester_availability_preferences where tester_id=$1',[id(2)])).rows[0].n,0,'Successful claim cancels its waiting preference');
 await assert.rejects(claim(3),/full/);await preference(3,false);await as(2);await db.query('select release_community_game_test($1)',[id(20)]);assert.equal(await count(),2,'Opt-out prevents new alerts');
 await claim(1);await preference(3);
 // Controlled disposable-fixture time, never production/development reservations.
 await db.exec("alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_started_at=now()-interval '49 hours',reservation_expires_at=now()-interval '1 hour' where status='claimed';alter table community_game_tests enable trigger aa_testing_reservation;");
 await db.query('select process_tester_availability()');assert.equal(await count(),3,'Expired reservation releases capacity and emits one server-side alert');await db.query('select process_tester_availability()');assert.equal(await count(),3);
 await claim(1);await db.query('select process_tester_availability()');assert.equal(await count(),3,'Fresh/extended deadline is not expired');
 await db.exec('update community_playtests set target_testers=2');assert.equal(await count(),4,'Capacity increase emits a new transition once');
 await as(9);await db.query("select set_listing_control('submission',$1,'archive','Availability QA')",[id(10)]);await db.query('select process_tester_availability()');assert.equal(await count(),4,'Archived campaigns send no alerts');
 await db.exec(`set role authenticated;set test.uid='${id(4)}'`);assert.equal((await db.query('select * from tester_availability_preferences')).rows.length,0);await assert.rejects(db.query('select process_tester_availability()'),/permission denied/);await assert.rejects(db.query('insert into tester_availability_preferences(tester_id,playtest_id) values($1,$2)',[id(4),id(20)]),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select set_tester_availability_preference($1,true)',[id(20)]),/permission denied/);
 await db.exec("reset role;update tester_availability_preferences set expires_at=now()-interval '1 day';update notifications set created_at=now()-interval '91 days' where dedupe_key like 'tester:availability:%'");await db.query('select process_tester_availability()');assert.equal(await count(),0);assert.equal((await db.query('select count(*)::int n from tester_availability_preferences')).rows[0].n,0);
 await as(9);await db.query("select set_listing_control('submission',$1,'restore','')",[id(10)]);
 for(const n of [21,22])await db.query(`insert into community_playtests(id,title,submission_id,developer_id,status,audience,target_testers,minimum_rank,genre_restricted,access_link) values($1,'Eligibility QA',$2,$3,'open','both',1,0,false,'https://example.test/build')`,[id(n),id(10),id(9)]);
 await as(2);await db.query('select claim_community_game_test($1)',[id(22)]);await as(3);await db.query('select set_tester_availability_preference($1,true)',[id(22)]);await db.query('select claim_community_game_test($1)',[id(21)]);
 await as(2);await db.query('select release_community_game_test($1)',[id(22)]);assert.equal(await count(),0,'A waiter holding another reservation is not notified');
 await as(3);await db.query('select release_community_game_test($1)',[id(21)]);await db.query('select process_tester_availability()');assert.equal(await count(),1,'Newly eligible waiter receives the still-open opportunity once');
 const alert=(await db.query("select id from notifications where dedupe_key like 'tester:availability:%'")).rows[0];await db.query('select dismiss_notification($1)',[alert.id]);await db.query('select process_tester_availability()');assert.equal(await count(),0,'Dismissal does not replay the same availability event');
 await as(2);await db.query('select claim_community_game_test($1)',[id(22)]);await db.query("update profiles set roles=array['player'] where id=$1",[id(3)]);await db.query('select release_community_game_test($1)',[id(22)]);assert.equal(await count(),0,'Role-ineligible waiter is omitted');
 await db.query("update profiles set roles=array['tester'] where id=$1",[id(3)]);await db.query('select process_tester_availability()');assert.equal(await count(),1);
 await db.query('select claim_community_game_test($1)',[id(22)]);await db.query("update community_game_tests set status='reviewed',review_outcome='rejected' where playtest_id=$1 and tester_id=$2",[id(22),id(2)]);assert.equal((await db.query('select available from campaign_places($1)',[id(22)])).rows[0].available,0,'Completed/rejected reports still use capacity');await assert.rejects(db.query('select set_tester_availability_preference($1,true)',[id(22)]),/completed report/);
 console.log('PASS availability: opt-in/out/uniqueness, reservation/role exclusions, manual release, genuine server-time expiry, repeat suppression, future deadlines, capacity increase, successful-claim removal, capacity refusal, archived games, private RLS/worker, retention and correct private-free bell links.');
}finally{await db.close();}

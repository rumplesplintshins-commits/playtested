import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {availabilityFixtureSQL,availabilitySeedSQL,id} from './merge26-availability-fixture.mjs';
const db=new PGlite();
try{
 await db.exec(availabilityFixtureSQL({legacy72:true}));await db.exec(availabilitySeedSQL());
 await db.exec(`set test.uid='${id(1)}';select claim_community_game_test('${id(20)}');`);
 const old=(await db.query('select reservation_started_at,reservation_expires_at from community_game_tests where tester_id=$1',[id(1)])).rows[0];assert.equal(Date.parse(old.reservation_expires_at)-Date.parse(old.reservation_started_at),72*3600000);
 await db.exec(fs.readFileSync('supabase/migrations/202611040114_merge26_48_hour_reservations.sql','utf8'));
 assert.deepEqual((await db.query('select reservation_started_at,reservation_expires_at from community_game_tests where tester_id=$1',[id(1)])).rows[0],old,'Cutover must not shorten an issued 72-hour deadline');
 await db.query(`insert into community_playtests(id,title,submission_id,developer_id,status,audience,target_testers,minimum_rank,genre_restricted,access_link) values($1,'48 hour QA',$2,$3,'open','both',1,0,false,'https://example.test/build')`,[id(21),id(10),id(9)]);
 await db.exec(`set test.uid='${id(2)}'`);await db.query('select claim_community_game_test($1)',[id(21)]);
 const current=(await db.query('select reservation_started_at,reservation_expires_at from community_game_tests where tester_id=$1',[id(2)])).rows[0];assert.equal(Date.parse(current.reservation_expires_at)-Date.parse(current.reservation_started_at),48*3600000);
 assert.equal((await db.query('select places from testing_policy')).rows[0].places,1,'Changing duration preserves configured capacity');
 await assert.rejects(db.query('select claim_community_game_test($1)',[id(20)]),/One test at a time/);
 await db.exec("alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=clock_timestamp()+interval '1 hour' where tester_id='"+id(2)+"';alter table community_game_tests enable trigger aa_testing_reservation;");assert.equal((await db.query('select available from campaign_places($1)',[id(21)])).rows[0].available,0,'A future or extended deadline is not expired');
 await db.exec("alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=clock_timestamp() where tester_id='"+id(2)+"';alter table community_game_tests enable trigger aa_testing_reservation;");assert.equal((await db.query('select available from campaign_places($1)',[id(21)])).rows[0].available,1,'At/past expiry capacity is released server-side');
 await db.query('select process_tester_availability()');await db.query('select process_tester_availability()');assert.equal((await db.query('select status from community_game_tests where tester_id=$1',[id(2)])).rows[0].status,'claimed','Processor does not rewrite drafts/reports');
 const active=fs.readFileSync('app/components/TestingPolicy.tsx','utf8');assert(!/72[ -]hour/.test(active),'Active reservation help must not advertise the old duration');
 console.log('PASS 48-hour reservations: new claims use exact server-issued 48-hour deadlines; issued 72-hour deadlines and capacity survive cutover; future/extended deadlines protected; expiry boundary and repeated server processing preserve drafts and one-active enforcement.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}

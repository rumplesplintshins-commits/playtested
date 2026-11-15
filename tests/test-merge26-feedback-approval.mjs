import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {availabilityFixtureSQL,availabilitySeedSQL,id} from './merge26-availability-fixture.mjs';
const db=new PGlite();const count=async()=>+(await db.query("select count(*) n from notifications where kind='developer_feedback_received'")).rows[0].n;
try{
 await db.exec(availabilityFixtureSQL());await db.exec(availabilitySeedSQL());await db.exec(fs.readFileSync('supabase/migrations/202611040115_merge26_immediate_feedback_approval.sql','utf8'));
 await db.exec(`insert into game_developer_links(id,developer_id,submission_id) values('${id(21)}','${id(9)}','${id(10)}');update community_playtests set title='Build label rather than game title' where id='${id(20)}';insert into listing_states(game_key,published) values('game:${id(10)}','{"title":"Current game title"}');set test.uid='${id(9)}';insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome,submitted_at) values('${id(30)}','${id(20)}','${id(2)}','submitted','pending',now());`);
 assert.equal(await count(),0,'Submission alone does not notify');
 const before=(await db.query('select get_my_notifications() data')).rows[0].data.unread_count;
 await db.exec('begin');await db.query("update community_game_tests set status='reviewed',review_outcome='accepted',review_reason='PRIVATE_ADMIN_NOTE' where id=$1",[id(30)]);assert.equal(await count(),1,'Notification persists in approval transaction, before commit or scan');await db.exec('rollback');assert.equal(await count(),0,'Rolled-back/failed approvals produce no persistent alert');
 await db.query("update community_game_tests set status='reviewed',review_outcome='rejected' where id=$1",[id(30)]);assert.equal(await count(),0,'Rejection does not notify');
 await db.query("update community_game_tests set review_outcome='accepted' where id=$1",[id(30)]);assert.equal(await count(),1);
 const notice=(await db.query("select * from notifications where kind='developer_feedback_received'")).rows[0];assert.equal(notice.recipient_id,id(9));assert.equal(notice.title,'New playtest feedback approved');assert(notice.message.includes('Current game title'));assert(!notice.message.includes('PRIVATE_ADMIN_NOTE')&&!notice.message.includes(id(2)));assert.equal(notice.href,`/my-submissions?tab=games&game=${id(21)}&campaign=${id(20)}`);
 assert.equal((await db.query('select get_my_notifications() data')).rows[0].data.unread_count,before+1);
 await db.query("update community_game_tests set status='reviewed',review_outcome='accepted' where id=$1",[id(30)]);assert.equal(await count(),1,'Approval retries are not additional events');
 await db.query('select mark_notification_read($1)',[notice.id]);assert.equal((await db.query('select get_my_notifications() data')).rows[0].data.unread_count,before);
 await db.exec(`set role authenticated;set test.uid='${id(2)}'`);assert.equal((await db.query('select * from notifications where id=$1',[notice.id])).rows.length,0);await assert.rejects(db.query('update community_game_tests set review_outcome=$1 where id=$2',['accepted',id(30)]),/permission denied/);
 await db.exec(`reset role;set test.uid='${id(9)}'`);await db.query('select dismiss_notification($1)',[notice.id]);await db.query("update community_game_tests set review_outcome='rejected' where id=$1",[id(30)]);await db.query("update community_game_tests set review_outcome='accepted' where id=$1",[id(30)]);assert.equal(await count(),0,'Reapproval of the same report is lifetime-deduplicated even after dismissal');
 await db.exec(`delete from game_developer_links;update game_submissions set developer_id='${id(1)}' where id='${id(10)}';insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome) values('${id(31)}','${id(20)}','${id(3)}','reviewed','accepted');`);assert.equal(await count(),0,'Unverified former ownership does not receive new approvals');
 console.log('PASS immediate approval: same-transaction persistence and rollback, no submission/rejection/failed alerts, verified current owner/title/build, unread/read and recipient RLS, retry/reapproval/dismissal dedupe, no private notes/tester IDs or former-owner delivery.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}

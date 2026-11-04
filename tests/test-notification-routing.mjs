import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>`70000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table profiles(id uuid primary key,role text,roles text[]);
 create table game_submissions(id uuid primary key,developer_id uuid,title text,status text,submission_revision int default 0);
 create table community_playtests(id uuid primary key,developer_id uuid,title text,submission_id uuid,approved_game_id uuid,imported_game_id uuid,status text,audience text,genre_restricted bool,testing_genre text);
 create table community_game_tests(id uuid primary key,playtest_id uuid,submission_id uuid,status text,review_outcome text,tester_id uuid);
 create table game_developer_links(id uuid primary key,developer_id uuid,submission_id uuid,approved_game_id uuid,imported_game_id uuid);
 insert into profiles values('${id(1)}','admin',array['player']),('${id(2)}','user',array['developer']),('${id(3)}','user',array['player']),('${id(4)}','user',array['tester']);`);
 for(const migration of ['202611010029_notifications.sql','202611010030_notification_events.sql','202611010033_feedback_useful_notification_kind.sql','202611020035_notification_management.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 await db.exec(`insert into game_submissions values('${id(10)}','${id(2)}','Existing title','Pending Review',0)`);
 const prior=(await db.query('select id,recipient_id,read_at,created_at from notifications')).rows;
 await db.exec(fs.readFileSync('supabase/migrations/202611040013_notification_routing.sql','utf8'));
 assert.deepEqual((await db.query('select id,recipient_id,read_at,created_at from notifications')).rows,prior,'Migration preserves counts, recipients and read state');
 assert.equal((await db.query('select href from notifications')).rows[0].href,`/admin/submissions?submission=${id(10)}`);
 const count=async(where,args=[])=>(await db.query('select count(*)::int n from notifications where '+where,args)).rows[0].n;
 await db.exec(`insert into game_submissions values('${id(11)}','${id(2)}','Developer game','Pending Review',0);insert into game_submissions values('${id(12)}','${id(1)}','Admin own game','Pending Review',0);insert into game_submissions values('${id(13)}','${id(2)}','Incomplete','Needs More Information',0)`);
 assert.equal(await count(`kind='admin_new_submission'`),3);assert.equal(await count(`recipient_id='${id(3)}'`),0);
 for(const [status,revision,kind] of [['Approved',1,'submission_approved'],['Rejected',2,'submission_rejected'],['Needs More Information',3,'submission_needs_info'],['Pending Review',4,'admin_new_submission']]){
  await db.query('update game_submissions set status=$1,submission_revision=$2 where id=$3',[status,revision,id(11)]);
  assert.equal(await count('entity_id=$1 and kind=$2',[id(11),kind]),kind==='admin_new_submission'?2:1);
 }
 assert.equal(await count(`recipient_id='${id(1)}' and kind='submission_approved'`),0,'Admin does not inherit another developer approvals');
 await db.exec(`update game_submissions set status='Approved',submission_revision=1 where id='${id(12)}'`);assert.equal(await count(`recipient_id='${id(1)}' and kind='submission_approved'`),1,'Admin receives their own developer approval');
 await db.exec(`insert into community_playtests values('${id(20)}','${id(2)}','Campaign','${id(11)}',null,null,'draft','both',false,null);insert into game_developer_links values('${id(21)}','${id(2)}','${id(11)}',null,null);insert into community_game_tests values('${id(22)}','${id(20)}',null,'submitted','pending','${id(4)}')`);
 assert.equal(await count(`kind='developer_feedback_received'`),0,'Unreviewed feedback stays private');
 await db.exec(`update community_game_tests set status='reviewed',review_outcome='accepted' where id='${id(22)}'`);
 let feedback=(await db.query("select * from notifications where kind='developer_feedback_received'")).rows[0];assert.equal(feedback.recipient_id,id(2));assert.equal(feedback.href,`/my-submissions?tab=games&game=${id(21)}`);
 await db.exec(`update community_game_tests set status='reviewed',review_outcome='accepted' where id='${id(22)}'`);assert.equal(await count(`kind='developer_feedback_received'`),1);
 await db.exec(`set role authenticated;set test.uid='${id(3)}'`);assert.equal((await db.query('select * from notifications')).rows.length,0);assert.equal((await db.query('select get_my_notifications() p')).rows[0].p.unread_count,0);assert.equal((await db.query('select mark_notification_read($1) ok',[feedback.id])).rows[0].ok,false);assert.equal((await db.query('select dismiss_notification($1) ok',[feedback.id])).rows[0].ok,false);
 await assert.rejects(db.query('select * from notification_delivery_keys'),/permission denied/);
 await db.exec(`set test.uid='${id(2)}'`);
 await assert.rejects(db.query("update notifications set title='Forged'"),/permission denied/);await assert.rejects(db.query("update notifications set recipient_id=$1",[id(3)]),/permission denied/);
 assert((await db.query('select get_my_notifications() p')).rows[0].p.unread_count>0);
 assert.equal((await db.query('select mark_notification_read($1) ok',[feedback.id])).rows[0].ok,true);
 assert.equal((await db.query('select dismiss_notification($1) ok',[feedback.id])).rows[0].ok,true);
 await db.exec(`reset role;update community_game_tests set status='submitted',review_outcome='pending' where id='${id(22)}';update community_game_tests set status='reviewed',review_outcome='accepted' where id='${id(22)}'`);assert.equal(await count(`kind='developer_feedback_received'`),0,'Dismissal retains durable event deduplication');
 await db.exec(`set role authenticated;set test.uid='${id(2)}';select mark_all_notifications_read()`);assert.equal((await db.query('select get_my_notifications() p')).rows[0].p.unread_count,0);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select get_my_notifications()'),/permission denied/);
 console.log('PASS notification migration: expected admin review routing, owner-only decisions/accepted feedback, exact links, resubmissions, durable dedupe, column permissions, recipient RLS, unread counts/read/dismiss and migration preservation.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}

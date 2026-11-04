import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>`26100000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(3)}');insert into profiles(id,role,roles,created_at,tester_xp) values('${id(1)}','user',array['tester'],now(),0),('${id(2)}','admin',array['admin'],now(),0);`);
 await db.exec(fs.readFileSync('supabase/migrations/202611040108_merge26_tester_identity.sql','utf8'));
 // Use the real established rank policy, not a reconstruction from XP alone.
 await db.exec(fs.readFileSync('tests/fixtures/merge26-tester-rank.sql','utf8'));
 const original=(await db.query('select public_number from tester_public_identities where user_id=$1',[id(1)])).rows[0].public_number;
 await db.exec(`insert into profiles(id,role,roles,created_at,tester_xp) values('${id(3)}','user',array['tester'],now(),0);update profiles set roles=array['tester'] where id='${id(1)}';`);
 assert.equal((await db.query('select count(distinct public_number)::int n from tester_public_identities')).rows[0].n,2);
 await db.exec(`insert into game_submissions(id,title,status,developer_id) values('${id(10)}','Public game','Approved','${id(2)}'),('${id(11)}','Other game','Approved','${id(2)}');insert into community_playtests(id,submission_id,developer_id) values('${id(20)}','${id(10)}','${id(2)}'),('${id(21)}','${id(11)}','${id(2)}');`);
 for(let n=0;n<6;n++)await db.query(`insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome,xp_awarded,quality_reviewed) values($1,$2,$3,'reviewed','accepted',true,true)`,[id(30+n),id(n%2?21:20),id(1)]);
 await db.exec(`insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome) values('${id(50)}','${id(20)}','${id(3)}','submitted','pending'),('${id(51)}','${id(20)}','${id(3)}','reviewed','rejected');set role anon;`);
 let rows=(await db.query('select * from get_feedback_tester_identities($1)',[[id(30),id(31),id(50),id(51)]])).rows;
 assert.equal(rows.length,2);assert(rows.every(r=>r.public_number===original&&r.current_rank===0));assert.deepEqual(Object.keys(rows[0]).sort(),['current_rank','public_number','test_id']);await assert.rejects(db.query('select * from tester_public_identities'),/permission denied/);
 await db.exec(`reset role;update profiles set tester_xp=500 where id='${id(1)}';set role anon`);rows=(await db.query('select * from get_feedback_tester_identities($1)',[[id(30),id(31)]])).rows;assert(rows.every(r=>r.current_rank===1&&r.public_number===original),'Promotion changes rank, never number');
 await db.exec(`reset role;update profiles set tester_xp=0 where id='${id(1)}';delete from profiles where id='${id(1)}';set role anon`);assert.equal((await db.query('select * from get_feedback_tester_identities($1)',[[id(30)]])).rows[0].public_number,null);
 await db.exec(`reset role;delete from auth.users where id='${id(1)}'`);assert.equal((await db.query('select user_id from tester_public_identities where public_number=$1',[original])).rows[0].user_id,null,'Deleted-user number remains a tombstone');
 await db.exec(`set role authenticated;set test.uid='${id(2)}'`);assert.equal((await db.query('select * from get_feedback_tester_identities($1)',[[id(50),id(51)]])).rows.length,2,'Admin may resolve ranks for private moderation');
 console.log('PASS tester identity: backfill/allocation, unique stable numbers across games, promotion/demotion, deleted fallback/tombstones, restricted mappings, accepted-only public output, current admin ranks and minimal public fields.');
}finally{await db.close();}

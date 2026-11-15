import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const ordering={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/submission-order.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(ordering);
const rows=[['rejected','Rejected','2026-11-04'],['approved','Approved','2026-11-04'],['pending','Pending Review','2026-11-04'],['action-old','Needs More Information','2026-11-01'],['action-new','Needs More Information','2026-11-04']].map(([id,status,updated_at])=>({id,status,updated_at,submitted_at:'2025-01-01'}));
assert.deepEqual(rows.sort(ordering.compareSubmissions).map(r=>r.id),['action-new','action-old','pending','approved','rejected']);
assert(ordering.compareSubmissions({id:'a',status:'Approved',submitted_at:'2026-11-04'},{id:'b',status:'Approved',submitted_at:'2026-10-04'})<0);
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table profiles(id uuid,roles text[],role text);
 create table developer_plan_policy(plan text primary key,launch_limit integer,launch_window interval,launch_gap interval,rank_targeting boolean,genre_targeting boolean);
 alter table developer_plan_policy enable row level security;
 create function _developer_plan(uuid) returns developer_plan_policy language sql security definer as $$select p from public.developer_plan_policy p where plan='free'$$;
 create function _playtested_developer_launch_window_at(uuid,timestamptz) returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz) language sql as $$select 0,null::timestamptz,null::timestamptz,null::timestamptz$$;
 create table testing_policy(singleton boolean primary key,launch_window interval,launches integer,places integer,base_xp integer,reservation_window interval,reservations_activated_at timestamptz);
 alter table testing_policy enable row level security;
 insert into profiles values('10000000-0000-4000-8000-000000000001',array['developer'],'user'),('10000000-0000-4000-8000-000000000002',array['player'],'admin'),('10000000-0000-4000-8000-000000000003',array['player'],'user');`);
 const plan=fs.readFileSync('supabase/migrations/202611040014_restore_developer_plan_policy.sql','utf8'),capacity=fs.readFileSync('supabase/migrations/202611040016_restore_testing_policy.sql','utf8');
 await db.exec(plan);await db.exec(capacity);
 for(const [suffix,canAssign] of [['1',false],['2',true]]){
  await db.exec(`set test.uid='10000000-0000-4000-8000-00000000000${suffix}'`);
  const p=(await db.query('select get_my_developer_plan() p')).rows[0].p;
  assert.equal(p.plan,'free');assert.equal(p.launch_limit,1);assert.equal(p.window_hours,720);assert.equal(p.can_assign,canAssign);
 }
 await db.exec(`set test.uid='10000000-0000-4000-8000-000000000003'`);await assert.rejects(db.query('select get_my_developer_plan()'),/Developer access/);
 await db.exec(`set test.uid='10000000-0000-4000-8000-000000000001';delete from developer_plan_policy where plan='free';`);
 await assert.rejects(db.query('select get_my_developer_plan()'),/policy is not configured/);
 await db.exec(plan);await db.exec(plan);await db.exec(capacity);
 assert.equal((await db.query('select count(*) n from developer_plan_policy')).rows[0].n,2);
 assert.deepEqual((await db.query('select places,base_xp,reservations_activated_at from testing_policy')).rows[0],{places:4,base_xp:100,reservations_activated_at:null});
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from developer_plan_policy'),/permission denied/);await assert.rejects(db.query('select * from testing_policy'),/permission denied/);
 console.log('PASS final fixes: activity/priority sorting, missing-only policy seed repair, valid developer/admin allowance, ordinary-user denial, explicit missing-policy failure, idempotence and private policy tables.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const id=n=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,created_at timestamptz,is_anonymous boolean default false,deleted_at timestamptz);
 create table profiles(id uuid primary key,roles text[],role text);
 begin;`);
 await db.exec(fs.readFileSync('supabase/migrations/202611040010_platform_user_metrics.sql','utf8').replace(/^begin;/m,'').replace(/^commit;/m,''));
 const fixtures=[
  [1,'0 days',['developer','tester','player']],
  [2,'8 days',['developer','developer','player']],
  [3,'31 days',['tester']],
  [4,'7 days',[]],
  [5,'30 days',null], // Missing profile still counts as a registered account.
  [6,'30 days 1 millisecond',['player']],
  [7,'0 days',['developer','tester','player']], // Anonymous guest excluded.
  [8,'0 days',['developer','tester','player']], // Soft-deleted account excluded.
  [9,'-1 day',null], // Future timestamp cannot inflate registration windows.
  [10,'1 hour',['player']], // Legacy single role must not override roles[].
 ];
 for(const [n,age,roles] of fixtures){
  await db.query(`insert into auth.users values($1,now()-$2::interval,$3,$4)`,[id(n),age,n===7,n===8?new Date().toISOString():null]);
  if(n!==5)await db.query('insert into profiles values($1,$2,$3)',[id(n),roles,n===10?'developer':'user']);
 }
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  await db.exec('savepoint denied_read');
  await assert.rejects(db.query('select m24_platform_user_summary()'),/permission denied/);
  await db.exec('rollback to savepoint denied_read;release savepoint denied_read');
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 assert.deepEqual((await db.query('select m24_platform_user_summary() data')).rows[0].data,{registered_users:8,developers:2,testers:2,players:4,new_7_days:3,new_30_days:5});
 await db.exec('reset role;delete from profiles;delete from auth.users;set role service_role');
 assert.deepEqual((await db.query('select m24_platform_user_summary() data')).rows[0].data,{registered_users:0,developers:0,testers:0,players:0,new_7_days:0,new_30_days:0});
 await db.exec('reset role;commit');
 console.log('PASS platform database: distinct accounts, overlapping/duplicate roles, roles-array source, missing profiles, 7/30-day boundaries, guest/deleted exclusions, empty state and service-only grants.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}

// Exercise the actual shared administrator guard and new route without networking.
let user=null,authError=null,profile=null,serviceAvailable=true,rpcError=null,serviceCalls=0,rpcCalls=0;
const admin={};
new Function('exports','require',compile('lib/admin-server.ts'))(admin,name=>name==='@/lib/supabase-server'?{createClient:async()=>({auth:{getUser:async()=>({data:{user},error:authError})},from:table=>{assert.equal(table,'profiles');return {select:columns=>{assert.equal(columns,'role');return {eq:()=>({single:async()=>({data:profile})})};}}}})}:name==='@supabase/supabase-js'?{createClient(){throw Error('Unexpected live client');}}:require(name));
const route={};
new Function('exports','require',compile('app/api/admin/analytics/platform-users/route.ts'))(route,name=>name==='@/lib/admin-server'?{requireAdmin:admin.requireAdmin,analyticsService(){serviceCalls++;return serviceAvailable?{rpc:async name=>{assert.equal(name,'m24_platform_user_summary');rpcCalls++;return {data:{registered_users:42},error:rpcError};}}:null;}}:require(name));
for(const [identity,role,status] of [[null,null,401],[{id:id(1),app_metadata:{role:'admin'}},'user',403],[{id:id(2)},null,403]]){
 user=identity;profile=role?{role}:null;
 const response=await route.GET();assert.equal(response.status,status);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(serviceCalls,0,'Reject before creating a privileged client');assert.equal((await response.json()).registered_users,undefined);
}
user={id:id(3)};profile={role:'admin'};authError=Error('invalid session');assert.equal((await route.GET()).status,401);assert.equal(serviceCalls,0);
authError=null;let response=await route.GET();assert.equal(response.status,200);assert.deepEqual(await response.json(),{registered_users:42});assert.equal(rpcCalls,1);
serviceAvailable=false;assert.equal((await route.GET()).status,503);
serviceAvailable=true;rpcError={message:'Private server detail'};response=await route.GET();assert.equal(response.status,503);assert(!(await response.text()).includes('Private server detail'));
console.log('PASS platform HTTP: verified admin-only access, anonymous/ordinary/forged-admin denial before privileged reads, private no-store responses and safe unavailable/error states.');

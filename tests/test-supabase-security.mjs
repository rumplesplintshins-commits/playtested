// Isolated SQL/RLS regression; --native uses an ephemeral, network-less PostgreSQL 17 container.
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const native=process.argv.includes('--native'),name='playtested-security-52-'+Date.now();
let started=false;const image='public.ecr.aws/supabase/postgres:17.11.0.006';
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:45000,maxBuffer:8000000});if(r.status!==0)throw Error(r.stderr||r.error?.message||'Isolated Docker command failed');return r.stdout.trim();};
const psql=s=>docker(['exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h','/tmp','-U','postgres','-d','postgres'],s);
let db;const id=n=>'52200000-0000-4000-8000-'+String(n).padStart(12,'0'),hidden='d3100000-0000-4000-8000-000000000002';
const paths=['202611120041_security_search_path.sql','202611120042_security_execute_grants.sql','20261112201921_security_catalogue_read_models.sql'];
const source=p=>fs.readFileSync(p,'utf8');
const jsonQuery=q=>"select coalesce(json_agg(x),'[]'::json) from ("+q.replace(/;\s*$/,'')+') x;';
const roleQuery=async(role,uid,q)=>{
  assert(['anon','authenticated','service_role'].includes(role));
  if(native){const pre="begin; select pg_catalog.set_config('test.uid','"+(uid||'')+"',true);set local role "+role+';';const out=psql(pre+jsonQuery(q)+'commit;');return JSON.parse(out.slice(out.indexOf('[')));}
  return db.transaction(async tx=>{await tx.query("select set_config('test.uid',$1,true)",[uid||'']);await tx.exec('set local role '+role);return(await tx.query(q)).rows;});
};
try{
 if(native){docker(['run','--pull=never','--rm','-d','--name',name,'--label','playtested.issue=52','--network','none','--user','postgres','--tmpfs','/tmp:rw,mode=1777','--entrypoint','sh',image,'-c',"initdb -D /tmp/security-pg -A trust >/tmp/init.log && pg_ctl -D /tmp/security-pg -l /tmp/postgres.log -o \"-k /tmp -c listen_addresses=''\" -w start && touch /tmp/ready && exec sleep infinity"]);started=true;for(let n=0;n<100;n++){try{docker(['exec',name,'test','-f','/tmp/ready']);break;}catch{await new Promise(r=>setTimeout(r,100));}}db={exec:async s=>psql(s),query:async q=>({rows:JSON.parse(psql(jsonQuery(q)))})};}
 else db=new PGlite();
 const sql=s=>db.exec(s),rows=async q=>(await db.query(q)).rows,one=async q=>(await rows(q))[0];
 const baselineFiles=fs.readdirSync('supabase/migrations').filter(f=>!paths.includes(f)).sort();assert(paths.every(f=>f>baselineFiles.at(-1)),'All hardening migrations follow current v11');assert.deepEqual(paths,paths.slice().sort());
 await sql(source('tests/fixtures/merge26-schema.sql'));
 await sql(source('tests/fixtures/supabase-security-functions.sql'));
 await sql(`create table public.developer_xp_awards(id uuid primary key default gen_random_uuid(),developer_id uuid not null references public.profiles(id),xp_amount integer not null check(xp_amount>0),award_type text,source_type text,source_id uuid,description text,created_at timestamptz default now(),unique(developer_id,award_type,source_type,source_id));
 alter table public.game_submissions add column if not exists platform text;
 create or replace view public.approved_games as select id,title,developer_name,genre,description,game_link,image_url,price,ai_type,ai_areas,ai_explanation,evidence_link,submitted_at,steam_app_id,platform from public.game_submissions where status='Approved' and not public.beta_fixture_hidden(id);
 grant select on public.approved_games,public.published_game_verifications to anon,authenticated,service_role;
 revoke all on public.game_submissions,public.game_verifications,public.profiles,public.community_game_tests,public.developer_xp_awards from public,anon,authenticated;
 alter table public.profiles enable row level security;
 alter table public.game_submissions enable row level security;
 alter table public.game_verifications enable row level security;
 alter table public.community_game_tests enable row level security;
 alter table public.developer_xp_awards enable row level security;
 grant select on public.profiles,public.game_submissions,public.game_verifications,public.community_game_tests to authenticated;
 create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
 create policy owned_submissions on public.game_submissions for select to authenticated using(developer_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
 create policy admin_verifications on public.game_verifications for select to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
 create policy own_tests on public.community_game_tests for select to authenticated using(tester_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
 insert into public.profiles(id,role,roles,display_name,developer_xp,tester_xp) values
 ('${id(1)}','user',array['developer'],'Owner',0,0),('${id(2)}','admin',array['player'],'Admin',0,0),('${id(3)}','user',array['tester'],'PRIVATE tester name',0,0),('${id(4)}','user',array['developer'],'Other owner',0,0);
 insert into public.community_playtests(id,developer_id,title,status) values('${id(20)}','${id(1)}','Private campaign','open');
 insert into public.community_game_tests(id,playtest_id,tester_id,status,review_outcome,submitted_at) values('${id(30)}','${id(20)}','${id(3)}','submitted','pending',now());
 `);
 for(const [game,status]of[[id(10),'Approved'],[id(11),'Pending Review'],[id(12),'Approved'],[hidden,'Approved']])await sql(`insert into public.game_submissions(id,developer_id,title,developer_name,status,platform,image_url)values('${game}','${id(1)}','Fixture ${game}','Public studio','${status}','steam','https://example.test/image.png');`);
 for(const [n,game,published]of[[40,id(10),true],[41,id(11),true],[42,id(12),false],[43,hidden,true]])await sql(`insert into public.game_verifications(id,submission_id,public_summary,reviewer_notes,testing_notes,published,updated_at)values('${id(n)}','${game}','Public summary','PRIVATE_ADMIN_NOTES','PRIVATE_TESTING_NOTES',${published},now());`);
 const catalogueBefore=await roleQuery('anon',null,'select * from public.approved_games order by id'),verificationBefore=await roleQuery('anon',null,'select * from public.published_game_verifications order by game_id');
 assert.equal(catalogueBefore.length,2);assert.equal(verificationBefore.length,1);
 const fingerprint=()=>rows("select c.relname,c.relrowsecurity,c.relacl::text from pg_class c where c.oid in('public.profiles'::regclass,'public.game_submissions'::regclass,'public.game_verifications'::regclass,'public.community_game_tests'::regclass,'public.developer_xp_awards'::regclass,'public.approved_games'::regclass,'public.published_game_verifications'::regclass) order by c.relname");
 const policies=()=>rows("select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname");
 const aclBefore=await fingerprint(),policyBefore=await policies();
 const signatures=['public.award_developer_xp(uuid,integer,text,text,uuid,text)','public.get_admin_community_test_reviews()'];
 const bodies=()=>rows("select proname,prosrc from pg_proc where oid in('public.award_developer_xp(uuid,integer,text,text,uuid,text)'::regprocedure,'public.get_admin_community_test_reviews()'::regprocedure) order by proname");const originalBodies=await bodies();
 assert.equal((await one("select has_function_privilege('anon','"+signatures[0]+"','execute') allowed")).allowed,true,'Reproduce inherited PUBLIC exposure before repair');
 for(const p of paths)await sql(source('supabase/migrations/'+p));
 assert.deepEqual(await fingerprint(),aclBefore,'No raw-table/view ACL or RLS changes');assert.deepEqual(await policies(),policyBefore,'No weakened or added raw-table policies');
 const expectedBodies=originalBodies.map(r=>({...r,prosrc:r.prosrc.replace('set developer_xp = developer_xp + p_xp_amount','set developer_xp = profiles.developer_xp + p_xp_amount')}));
 assert.deepEqual(await bodies(),expectedBodies,'Only qualify the ambiguous XP column; preserve all admin gates and review fields');
 for(const p of paths)await sql(source('supabase/migrations/'+p)); // Actual idempotent re-application, not a simulated PASS.
 for(const name of ['normalize_game_identity','set_technical_test_run_updated_at','set_game_build_updated_at'])assert((await one("select proconfig from pg_proc where pronamespace='public'::regnamespace and proname='"+name+"'")).proconfig.includes('search_path=""'));
 await sql("create schema attacker;create function attacker.lower(text)returns text language sql as 'select ''hijacked''::text';");
 if(native){assert.equal(JSON.parse(psql("begin;set local search_path=attacker,pg_catalog,public;"+jsonQuery("select public.normalize_game_identity('  Mixed--CASE  ') value")+'commit;'))[0].value,'mixed case');}
 else{await sql('set search_path=attacker,pg_catalog,public');assert.equal((await one("select public.normalize_game_identity('  Mixed--CASE  ') value")).value,'mixed case');await sql('reset search_path');}
 await sql("create table public.security_trigger_probe(updated_at timestamptz);create trigger technical_updated before insert on public.security_trigger_probe for each row execute function public.set_technical_test_run_updated_at();create trigger build_updated before update on public.security_trigger_probe for each row execute function public.set_game_build_updated_at();insert into public.security_trigger_probe values(null);update public.security_trigger_probe set updated_at=null;");assert((await one('select updated_at is not null valid from public.security_trigger_probe')).valid);
 for(const signature of signatures){const effective=await one("select has_function_privilege('anon','"+signature+"','execute') anon,has_function_privilege('authenticated','"+signature+"','execute') authenticated,has_function_privilege('service_role','"+signature+"','execute') service");assert.deepEqual(effective,{anon:false,authenticated:true,service:true});}
 const award=`select * from public.award_developer_xp('${id(1)}',100,'security_fixture','fixture','${id(90)}','Isolated admin award')`;
 for(const role of ['anon','authenticated'])for(const uid of [null,id(1),id(3),id(4)])for(const q of [award,'select * from public.get_admin_community_test_reviews()'])await assert.rejects(roleQuery(role,uid,q),/permission denied|admin|signed in/i);
 assert.equal((await one(`select developer_xp from public.profiles where id='${id(1)}'`)).developer_xp,0);
 assert.equal((await roleQuery('authenticated',id(2),award))[0].awarded,true);assert.equal((await roleQuery('authenticated',id(2),award))[0].awarded,false);assert.equal((await one(`select developer_xp from public.profiles where id='${id(1)}'`)).developer_xp,100);
 const review=await roleQuery('authenticated',id(2),'select * from public.get_admin_community_test_reviews()');assert.equal(review.length,1);assert.equal(review[0].tester_id,id(3));assert.equal(review[0].tester_name,'PRIVATE tester name');
 for(const [role,uid]of[['anon',null],['authenticated',id(1)],['authenticated',id(2)],['authenticated',id(3)],['authenticated',id(4)],['service_role',null]]){
  assert.deepEqual(await roleQuery(role,uid,'select * from public.approved_games order by id'),catalogueBefore);
  assert.deepEqual(await roleQuery(role,uid,'select * from public.published_game_verifications order by game_id'),verificationBefore);
  assert(!JSON.stringify(await roleQuery(role,uid,'select * from public.published_game_verifications')).includes('PRIVATE_'));
 }
 for(const table of ['game_submissions','game_verifications','profiles','community_game_tests','developer_xp_awards'])await assert.rejects(roleQuery('anon',null,'select * from public.'+table),/permission denied/);
 assert.equal((await roleQuery('authenticated',id(4),'select * from public.game_submissions')).length,0,'Other developer has no raw owner access');assert.equal((await roleQuery('authenticated',id(1),'select * from public.game_submissions')).length,4,'Own approved/pending records remain accessible');assert.equal((await roleQuery('authenticated',id(1),'select * from public.game_verifications')).length,0,'Private verification stays admin-only');
 const options=await rows("select relname,reloptions from pg_class where oid in('public.approved_games'::regclass,'public.published_game_verifications'::regclass)");assert(options.every(r=>r.reloptions.includes('security_invoker=true')&&r.reloptions.includes('security_barrier=true')),'Both definer-view warning predicates removed');
 assert.equal((await one("select has_schema_privilege('authenticated','playtested_catalogue_read','create') allowed")).allowed,false);
 const rejectDrift=async(setup,file,pattern)=>{
   const body=source('supabase/migrations/'+file).replace(/^begin;$/m,'').replace(/^commit;$/m,'');
   try{await assert.rejects(sql('begin;'+setup+body+'rollback;'),pattern);}
   finally{await sql('rollback;');}
 };
 await rejectDrift("create function public.award_developer_xp(uuid,integer) returns void language sql as 'select null::void';",paths[1],/Unexpected audited RPC overloads/);
 assert.equal((await one("select to_regprocedure('public.award_developer_xp(uuid,integer)') is null absent")).absent,true);
 await rejectDrift("create or replace view public.approved_games as select id,title,developer_name,genre,description,game_link,image_url,price,ai_type,ai_areas,ai_explanation,evidence_link,submitted_at,steam_app_id,platform,'PRIVATE'::text as private_token from public.game_submissions where status='Approved' and not public.beta_fixture_hidden(id);",paths[2],/Unreviewed public columns/);
 assert.deepEqual(await roleQuery('anon',null,'select * from public.approved_games order by id'),catalogueBefore,'Drift rejection rolls back without changing public contracts');
 // The helpers freeze the query, not its rows: later moderation still hides data.
 await sql(`update public.game_submissions set status='Pending Review' where id='${id(10)}'`);
 assert.equal((await roleQuery('anon',null,'select * from public.approved_games')).length,1);
 assert.equal((await roleQuery('anon',null,'select * from public.published_game_verifications')).length,0);
 await sql(`update public.game_submissions set status='Approved' where id='${id(10)}';update public.game_verifications set published=false where id='${id(40)}'`);
 assert.equal((await roleQuery('anon',null,'select * from public.approved_games')).length,2);
 assert.equal((await roleQuery('anon',null,'select * from public.published_game_verifications')).length,0);
 console.log('PASS '+(native?'native PostgreSQL 17':'PGlite')+': corrected migration order/replay; named-argument search-path repair/injection/trigger behavior; effective PUBLIC/anon grants denied; authenticated non-admin/foreign owner denied; real admin XP once and PII review preserved; invoker views preserve exact public fields/hidden+publication filters for all roles; unchanged RLS/ACLs; raw identities/private notes protected.');
}catch(error){console.error('FAIL security regression:',error.message,error.where||'');process.exitCode=1;}
finally{if(native&&started){const label=docker(['inspect','--format','{{ index .Config.Labels "playtested.issue" }}',name]);assert.equal(label,'52');docker(['rm','-f',name]);}else if(db)await db.close();}

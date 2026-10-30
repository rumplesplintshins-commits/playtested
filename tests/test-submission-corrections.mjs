import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const model={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/submission-completeness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(model);
const db=new PGlite();const id=n=>`c1000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const run=s=>db.exec(s);const one=async(s,args=[])=>(await db.query(s,args)).rows[0];
const valid={title:'Game',developer_name:'Studio',genre:'Action',description:'A game to test',game_link:'',ai_type:'No AI disclosed',release_status:'Not announced'};
if(process.argv.includes('--pulse')){try{await pulseChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--community-votes')){try{await communityVoteChecks();}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--review')){try{await reviewScopeChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--visibility')){try{await visibilityChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--claims')){try{await ownershipClaimChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--maintenance')){try{await listingChecks(true);}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--listings')){try{await listingChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
async function as(n){await run(`reset role;set test.uid='${id(n)}'`);}
async function visibilityChecks(){
 await run(fs.readFileSync('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of fs.readdirSync('supabase/migrations').filter(f=>/^20261028000[1-9]_/.test(f)).sort())await run(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 for(const f of ['202610280010_submission_corrections.sql','202610280011_share_engagement.sql','202610280012_tester_reservations.sql','202610290015_public_recruitment.sql','202610290016_listing_revisions.sql'])await run(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const intents=fs.readFileSync('supabase/migrations/202610290017_admission_maintenance_intents.sql','utf8');
 await run(intents.slice(intents.indexOf('create function public._intent_counts')));
 const sharing=fs.readFileSync('supabase/migrations/202610290018_campaign_share_results.sql','utf8');
 await run(sharing.slice(sharing.indexOf('create or replace function public._share_link_context'),sharing.indexOf('create or replace function public.get_share_context')));
 await run(`drop table public.approved_games cascade;create table public.published_game_verifications(game_id uuid,verification_status text,quality_score numeric);`);
 await run(fs.readFileSync('supabase/tests/public-visibility-fixture.sql','utf8'));
 // Source grants/policies omitted by the reduced baseline; own history must work
 // with its real policy dependencies, without granting unrelated submission access.
 await run(`grant usage on schema public,auth to authenticated,anon;grant select on public.game_submissions to authenticated;alter table public.game_submissions enable row level security;create policy fixture_owner_submission_read on public.game_submissions for select to authenticated using(developer_id=auth.uid());grant select on public.approved_games,public.imported_games,public.published_game_verifications,public.game_developer_links to anon,authenticated;alter table public.game_developer_links enable row level security;`);
 for(const n of [1,2])await run(`insert into profiles(id,role,roles,preferred_genres)values('${id(n)}','user',array['developer','tester'],array['Action'])`);
 const fixture=n=>`d3100000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 await run(`set session_replication_role=replica`);
 for(const n of [1,2,3,10])await run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,status,game_link,ai_type)values('${n===10?id(10):fixture(n)}','${id(1)}','${n===10?'Test Real Release':'QA Fixture '+n}','Studio','Action','Description','Approved','https://example.test/game','No AI disclosed')`);
 await run(`insert into imported_games(id,title,developer_name,genre,description,image_url,steam_url,steam_app_id,catalogue_eligible,metadata_backfill_status)values('${id(20)}','Genuine Steam','Studio','Action','Description','https://example.test/image','https://store.steampowered.com/app/110/','110',true,'complete')`);
 for(const n of [1,2,3,10])await run(`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,published_at,release_label)values('${n===10?id(40):fixture(n+100)}','${id(1)}','${n===10?id(10):fixture(n)}','Campaign','https://example.test/game','Test controls','${n===10?'open':'paused'}','both',now(),'Build 1')`);
 for(const n of [1,10])await run(`insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome,overall_score,gameplay_score,performance_score,hours_played)values('${id(n+100)}','${n===10?id(40):fixture(101)}','${id(2)}','reviewed','accepted',8,8,8,1)`);
 await run(`set session_replication_role=origin;set test.uid='${id(1)}';insert into engagement_games(id,identity_key)values('${id(200)}',public._share_key('submission','${fixture(1)}'));insert into engagement_links(id,game_id,owner_id,kind,source_id,source,medium,campaign,label,destination,snapshot)values('${id(201)}','${id(200)}','${id(1)}','submission','${fixture(1)}','reddit','social','qa','Fixture','game','{}');`);
 assert.ok((await one(`select public._share_link_context('${id(201)}') result`)).result);
 assert.equal((await one(`select count(*) n from get_public_catalogue(1,100)`)).n,5);
 const snapshot=async()=>(await one(`select jsonb_build_object('games',(select jsonb_agg(to_jsonb(s) order by id) from game_submissions s),'campaigns',(select jsonb_agg(to_jsonb(c) order by id) from community_playtests c),'reports',(select jsonb_agg(to_jsonb(t) order by id) from community_game_tests t),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p),'links',(select jsonb_agg(to_jsonb(l) order by id) from engagement_links l)) data`)).data;
 const before=await snapshot();
 await run(fs.readFileSync('supabase/migrations/202610290020_hide_confirmed_beta_fixtures.sql','utf8'));
 assert.deepEqual(await snapshot(),before,'Visibility DDL preserves all underlying records, history and XP');
 for(const page of [1,2]){const rows=(await db.query(`select * from get_public_catalogue(${page},1,'','All genres','All verification statuses','All AI types',false,'Title A-Z')`)).rows;assert.equal(rows.length,1);assert.equal(Number(rows[0].total_count),2);assert.ok([id(10),id(20)].includes(rows[0].game_id));}
 assert.equal((await one(`select count(*) n from approved_games where id='${fixture(1)}'`)).n,0);
 assert.equal((await one(`select count(*) n from get_public_catalogue(1,12,'QA Fixture')`)).n,0);
 assert.equal((await one(`select count(*) n from get_public_catalogue(1,12,'Test Real')`)).n,1,'Words Test/Demo do not classify real listings');
 assert.equal((await one('select count(*) n from get_game_community_reception()')).n,1);
 assert.equal((await one(`select count(*) n from get_public_submission_playtest_history('${fixture(1)}')`)).n,0);
 assert.equal((await one(`select count(*) n from get_public_submission_playtest_feedback('${fixture(1)}')`)).n,0);
 assert.equal((await one(`select public._share_link_context('${id(201)}') result`)).result,null);
 assert.equal((await one(`select public.campaign_eligible('${fixture(101)}','${id(2)}') result`)).result,false);
 assert.equal((await one(`select public.campaign_eligible('${id(40)}','${id(2)}') result`)).result,true,'Genuine eligibility unchanged');
 for(const rpc of ['get_public_listing_updates','get_public_intent_counts'])assert.deepEqual((await one(`select ${rpc}($1::jsonb) result`,[JSON.stringify([{kind:'submission',id:fixture(1)}])])).result,[]);
 assert.deepEqual((await db.query(`select * from get_public_recruitment($1::jsonb)`,[JSON.stringify([{source_type:'approved',game_id:fixture(1)}])])).rows,[]);
 await run('set role anon');
 assert.equal((await one('select count(*) n from get_public_catalogue(1,100)')).n,2,'Anonymous catalogue uses the same filtered source');
 assert.equal((await one(`select count(*) n from approved_games where id='${fixture(1)}'`)).n,0,'Anonymous direct detail source excludes fixture');
 await run('reset role');
 await as(2);await run('set role authenticated');
 assert.equal((await one(`select count(*) n from community_game_tests where id='${id(101)}'`)).n,1,'Tester retains own fixture history');
 await run(`reset role;create or replace function public.beta_fixture_hidden(p_id uuid) returns boolean language sql immutable set search_path='' as $$select false$$;`);
 assert.equal((await one('select count(*) n from get_public_catalogue(1,100)')).n,5,'Reversible without changing game data');
 assert.deepEqual(await snapshot(),before);
 // Exercise actual reservation RPCs after hiding, including paused campaigns.
 const migration=fs.readFileSync('supabase/migrations/202610290020_hide_confirmed_beta_fixtures.sql','utf8');
 await run(migration.slice(migration.indexOf('create function public.beta_fixture_hidden'),migration.indexOf('-- Filtering')).replace('create function','create or replace function'));
 await run('set session_replication_role=replica');
 for(const n of [3,4,5,6])await run(`insert into profiles(id,role,roles)values('${id(n)}','user',array['tester']);insert into community_game_tests(id,playtest_id,tester_id,status,reservation_expires_at)values('${id(n+300)}','${fixture(n===3?101:n===4?102:103)}','${id(n)}','claimed',${n===6?'null':n===5?"now()-interval '1 hour'":"now()+interval '24 hours'"})`);
 await run('set session_replication_role=origin');
 await as(3);await run('set role authenticated');
 assert.ok((await one('select get_my_test_reservations() result')).result.claims.some(c=>c.id===id(303)));
 assert.equal((await one(`select count(*) n from get_available_community_test_games() where submission_id='${fixture(101)}'`)).n,1,'Owned active fixture stays accessible');
 assert.ok((await one(`select get_campaign_testing_details('${fixture(101)}') result`)).result);
 await run(`select start_community_game_test('${id(303)}')`);
 await run(`select submit_community_game_test('${id(303)}',8,8,'None','Useful observations',1,8,'probably','probably','Responsive movement','No difficulties','Improve guidance','{}')`);
 assert.equal((await one(`select status from community_game_tests where id='${id(303)}'`)).status,'submitted');
 await as(4);await run('set role authenticated');await run(`select release_community_game_test('${fixture(102)}')`);
 assert.equal((await one(`select count(*) n from community_game_tests where id='${id(304)}'`)).n,0);
 await as(5);await run('set role authenticated');
 assert.ok((await one('select get_my_test_reservations() result')).result.claims.some(c=>c.id===id(305)),'Expired history retained');
 await assert.rejects(run(`select start_community_game_test('${id(305)}')`),/Reservation expired/);
 await assert.rejects(run(`select release_community_game_test('${fixture(103)}')`),/Reservation expired/);
 await assert.rejects(run(`select submit_community_game_test('${id(305)}',8,8,'None','Feedback',1)`),/Reservation expired/);
 await as(6);await run('set role authenticated');
 await run(`select start_community_game_test('${id(306)}');select submit_community_game_test('${id(306)}',8,8,'None','Legacy reservation feedback',1)`);
 assert.equal((await one(`select status from community_game_tests where id='${id(306)}'`)).status,'submitted','Legacy null-deadline claim can complete');
 await run('reset role');
 // Verify replacement against a genuinely invoker-secured view, not just defaults.
 const viewDb=new PGlite();try{
  await viewDb.exec(`create role anon;create role authenticated;create role service_role;create table public.game_submissions(id uuid,status text);create view public.approved_games with(security_invoker=true,security_barrier=true,check_option=local) as select id from public.game_submissions where status='Approved';grant usage on schema public to anon;grant select on public.approved_games to anon;`);
  const viewMeta=async()=>(await viewDb.query(`select reloptions,relowner,relacl from pg_class where oid='public.approved_games'::regclass`)).rows[0];
  const optionsBefore=await viewMeta();
  await viewDb.exec(migration.slice(0,migration.indexOf('-- Amend only'))+'commit;');
  assert.deepEqual(await viewMeta(),optionsBefore,'security_invoker, barrier, check option, owner and ACL preserved');
  await viewDb.exec('set role anon');await assert.rejects(viewDb.query('select * from public.approved_games'),/permission denied for table game_submissions/,'Invoker security not silently weakened');
 }finally{await viewDb.close();}
 // Reproduce the exact supplied post-020 wrapper, then run only its view repair.
 const originalView=fs.readFileSync('supabase/tests/public-visibility-fixture.sql','utf8').match(/create view public\.approved_games as ([\s\S]*?);/)[1];
 const wrapper=`select * from (${originalView}) existing_listing where not public.beta_fixture_hidden(id)`;
 await run(`create or replace view public.approved_games as ${wrapper};grant all on public.approved_games to service_role;`);
 const meta=async()=>one(`select relowner,relacl,reloptions from pg_class where oid='public.approved_games'::regclass`);
 const recordsBeforeRepair=await snapshot(),metaBeforeRepair=await meta();
 const functionsBeforeRepair=(await db.query(`select oid,md5(prosrc) body from pg_proc where pronamespace='public'::regnamespace order by oid`)).rows;
 assert.equal((await one(`select is_updatable from information_schema.views where table_schema='public' and table_name='approved_games'`)).is_updatable,'NO');
 const repair=fs.readFileSync('supabase/migrations/202610290021_restore_approved_view_shape.sql','utf8');
 await run(repair);
 assert.deepEqual(await meta(),metaBeforeRepair);
 assert.deepEqual(await snapshot(),recordsBeforeRepair);
 assert.deepEqual((await db.query(`select oid,md5(prosrc) body from pg_proc where pronamespace='public'::regnamespace order by oid`)).rows,functionsBeforeRepair,'View repair leaves helper and all predicates untouched');
 assert.equal((await one(`select is_updatable from information_schema.views where table_schema='public' and table_name='approved_games'`)).is_updatable,'YES');
 await run('set role anon');assert.equal((await one('select count(*) n from public.approved_games')).n,1);await run('reset role');
 await run(`create or replace view public.approved_games with(security_invoker=true,security_barrier=true) as ${wrapper}`);
 const invokerMeta=await meta();await run(repair);assert.deepEqual(await meta(),invokerMeta);
 await run('set role anon');await assert.rejects(run('select * from public.approved_games'),/permission denied for table game_submissions/);await run('reset role');
 if(process.argv.includes('--qa-cleanup'))await qaActivityChecks();
 console.log('PASS view-only 021: exact captured wrapper repaired, updatability restored, null/explicit security options and owner/ACL preserved, fixture filtering retained, records and function bodies unchanged.');
 console.log('PASS existing fixture claims: owned access/history, start, structured/legacy completion and release; expired deadlines still enforced. View security_invoker/barrier/check_option, owner and grants preserved.');
 console.log('PASS isolated public visibility: exact IDs excluded before pagination/counts; real Steam and Test-named listing retained; public feedback/intents/share suppressed; own history and rows/XP preserved; visibility reversible. Supplied public SQL definitions used; no live application.');
}
async function ownershipClaimChecks(){
 await run(fs.readFileSync('supabase/tests/v10-fixture.sql','utf8'));
 for(const n of [1,2,3])await run(`insert into auth.users values('${id(n)}');insert into profiles(id,roles,role) values('${id(n)}',array['developer'],'${n===3?'admin':'user'}')`);
 // Narrow claim fixture reproduces the supplied deployed columns, broad grants and
 // exact INSERT/SELECT/UPDATE RLS predicates. No live credentials/connections.
 await run(`create table public.game_claims(id uuid primary key default gen_random_uuid(),claimant_id uuid not null,status text not null default 'Pending',admin_notes text,reviewed_at timestamptz,reviewed_by uuid,verification_status text default 'Not Submitted');
 alter table public.game_claims enable row level security;
 grant usage on schema public,auth to authenticated,anon;
 grant all on public.game_claims to authenticated,anon;
 create policy "Developers can create their own claims" on public.game_claims for insert to authenticated with check(claimant_id=auth.uid());
 create policy "Developers can view their own claims" on public.game_claims for select to authenticated using(claimant_id=auth.uid());
 create policy "Admins can view all game claims" on public.game_claims for select to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
 create policy "Admins can update game claims" on public.game_claims for update to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));`);
 await as(1);await run('set role authenticated');
 await run(`insert into public.game_claims(id,claimant_id,status,admin_notes) values('${id(10)}','${id(1)}','Approved','Existing row: preserved')`);
 await run('reset role');const before=(await db.query('select * from public.game_claims order by id')).rows;
 const updatePolicy=await one(`select qual,with_check from pg_policies where tablename='game_claims' and cmd='UPDATE'`);
 await run(fs.readFileSync('supabase/migrations/202610290019_ownership_claim_permissions.sql','utf8'));
 assert.deepEqual((await db.query('select * from public.game_claims order by id')).rows,before,'Migration preserves all existing claim fields');
 assert.deepEqual(await one(`select qual,with_check from pg_policies where tablename='game_claims' and cmd='UPDATE'`),updatePolicy,'Existing admin UPDATE policy preserved');
 await as(1);await run('set role authenticated');
 await run(`insert into public.game_claims(id,claimant_id) values('${id(11)}','${id(1)}')`);
 assert.equal((await one(`select status from public.game_claims where id='${id(11)}'`)).status,'Pending');
 await assert.rejects(run(`insert into public.game_claims(claimant_id) values('${id(2)}')`),/row-level security/);
 for(const [column,value] of [['status',"'Approved'"],['status',"'Rejected'"],['admin_notes',"'Forged review'"],['reviewed_by',`'${id(3)}'`],['reviewed_at',"now()"],['verification_status',"'Verified'"]]){
  await assert.rejects(run(`insert into public.game_claims(claimant_id,${column}) values('${id(1)}',${value})`),/row-level security/,`Reject forged ${column}`);
 }
 assert.equal((await db.query(`update public.game_claims set status='Approved',reviewed_by='${id(1)}',reviewed_at=now() where id='${id(11)}' returning id`)).rows.length,0,'Owner cannot self-approve by UPDATE');
 assert.equal((await one(`select status from public.game_claims where id='${id(11)}'`)).status,'Pending');
 assert.equal((await db.query(`update public.game_claims set admin_notes='Forged' where id='${id(11)}' returning id`)).rows.length,0);
 await as(2);await run('set role authenticated');
 assert.equal((await db.query(`update public.game_claims set status='Approved' where id='${id(11)}' returning id`)).rows.length,0,'Unrelated user cannot approve');
 await as(3);await run('set role authenticated');
 assert.equal((await db.query(`update public.game_claims set status='Approved',admin_notes='Reviewed by admin',reviewed_by=auth.uid(),reviewed_at=now(),verification_status='Verified' where id='${id(11)}' returning id`)).rows.length,1);
 assert.equal((await one(`select reviewed_by from public.game_claims where id='${id(11)}'`)).reviewed_by,id(3));
 await run('reset role');assert.deepEqual((await db.query(`select * from public.game_claims where id='${id(10)}'`)).rows,before);
 console.log('PASS isolated PostgreSQL RLS: own Pending INSERT; rejects other owner, forged approval/reviewer/verification fields; owner/unrelated UPDATE cannot approve; authorised admin UPDATE succeeds; historical rows and admin policy preserved. No hosted writes or full campaign integration tested.');
}
async function insert(n,fields){const data={...valid,...fields};return one(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,ai_explanation,evidence_link,release_status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,[id(n),id(1),data.title,data.developer_name,data.genre,data.description,data.game_link,data.ai_type,data.ai_explanation||'',data.evidence_link||'',data.release_status]);}
async function save(n,fields,revision,resubmit){return (await one('select save_my_submission_correction($1,$2::jsonb,$3,$4) result',[id(n),JSON.stringify(fields),revision,resubmit])).result;}
try{
 await run(fs.readFileSync('supabase/tests/v10-fixture.sql','utf8'));
 for(const n of [1,2,3])await run(`insert into auth.users values('${id(n)}');insert into profiles(id,roles,role) values('${id(n)}',array['developer'],'${n===3?'admin':'user'}')`);
 await insert(10,{description:'',ai_type:'AI-assisted'});await run(`update game_submissions set review_reason='Human request: clarify scope' where id='${id(10)}'`);
 await insert(11,{description:''});await run(`update game_submissions set status='Approved' where id='${id(11)}'`);
 await insert(12,{description:''});await run(`update game_submissions set status='Rejected',review_reason='Human rejection' where id='${id(12)}'`);
 const original=(await db.query('select id,status,review_reason from game_submissions order by id')).rows;
 await run(fs.readFileSync('supabase/migrations/202610280010_submission_corrections.sql','utf8'));
 const policy=fs.readFileSync('supabase/migrations/202610290017_admission_maintenance_intents.sql','utf8');await run(policy.slice(policy.indexOf('create or replace function public.submission_completeness'),policy.indexOf('create function public._listing_has_admission')));
 // Reduced fixture omits the source project's existing owner-scoped submission grants.
 await run(`grant usage on schema public,auth to authenticated;grant select on profiles to authenticated;grant select,insert,update on game_submissions to authenticated;alter table game_submissions enable row level security;create policy fixture_source_submission_insert on game_submissions for insert to authenticated with check(developer_id=auth.uid() and status='Pending Review');create policy fixture_submission_owner_read on game_submissions for select to authenticated using(developer_id=auth.uid());create policy fixture_adversarial_update on game_submissions for update to authenticated using(developer_id=auth.uid()) with check(developer_id=auth.uid())`);
 assert.deepEqual((await db.query('select id,status,review_reason from game_submissions order by id')).rows,original,'Migration does not route existing records');
 const cases=[valid,{...valid,game_launched:false,performance_checked:false,evidence_checked:false,testing_notes:'',public_summary:''},{...valid,title:' \n\t '},{...valid,ai_type:'AI-assisted'},{...valid,ai_type:'AI-generated',ai_explanation:'Uses generated art',evidence_link:'https://example.test/evidence'},{...valid,evidence_link:'javascript:alert(1)'},{...valid,game_link:' https://example.test/build '},{...valid,game_link:'https://bad host'},{...valid,game_link:'https://exam\u00a0ple.test'},{...valid,steam_url:'https://example.test'},{...valid,steam_url:'https://store.steampowered.com/app/123?snr=1'},{...valid,release_status:'Released'},{...valid,ai_type:'Unknown'},{...valid,ai_type:' AI-assisted '},{...valid,title:'\u00a0\ufeff\u2009'},{...valid,game_link:'https://example.test:99999/build'},{...valid,release_status:'Released',release_date:'2999-01-01'},{...valid,release_status:'Upcoming',release_date:'2000-01-01'}];
 for(const record of cases){const sql=(await one('select submission_completeness($1::jsonb) result',[JSON.stringify(record)])).result;assert.deepEqual(sql.issues,model.submissionIssues(record));assert.equal(sql.message,model.completenessMessage(sql.issues));}
 await as(1);await run('set role authenticated');
 const incomplete=await insert(20,{ai_type:'AI-assisted'});assert.equal(incomplete.status,'Needs More Information');assert.deepEqual(incomplete.completeness_issues.map(issue=>issue.field),['ai_explanation']);
 const complete=await insert(21,{});assert.equal(complete.status,'Pending Review','No-AI does not require proof or optional build link');
 await assert.rejects(run(`update game_submissions set status='Approved' where id='${id(20)}'`),/authorised submission correction|Please complete these details/);
 await as(1);
 await run(`insert into game_developer_links(developer_id,submission_id,relationship) values('${id(1)}','${id(20)}','Original submitter');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(80)}','${id(1)}','${id(20)}','Existing campaign','https://example.test','Play the game','draft','both');insert into community_game_tests(id,playtest_id,tester_id,status) values('${id(90)}','${id(80)}','${id(2)}','submitted')`);
 const relationships=(await one(`select jsonb_build_object('links',(select jsonb_agg(to_jsonb(l)) from game_developer_links l),'campaigns',(select jsonb_agg(to_jsonb(c)) from community_playtests c),'feedback',(select jsonb_agg(to_jsonb(t)) from community_game_tests t)) data`)).data;
 const rawBefore=(await one(`select count(*) n from submission_review_events where submission_id='${id(20)}'`)).n;
 await run(`select get_my_submission_correction('${id(20)}');select get_my_submission_correction('${id(20)}')`);
 assert.equal((await one(`select count(*) n from submission_review_events where submission_id='${id(20)}'`)).n,rawBefore,'Views do not append messages/events');
 let result=await save(20,{ai_explanation:'Generated background art'},0,false);assert.equal(result.submission.status,'Needs More Information');assert.equal(result.submission.completeness_issues.length,0);
 result=await save(20,{evidence_link:'https://example.test/evidence'},result.submission.submission_revision,false);assert.equal(result.submission.status,'Needs More Information','Save is not resubmit');assert.equal(result.submission.completeness_issues.length,0);
 const revision=result.submission.submission_revision;
 result=await save(20,{evidence_link:'https://example.test/evidence'},revision,true);assert.equal(result.submission.status,'Pending Review');assert.equal(result.submission.id,id(20));
 const eventCount=(await one(`select count(*) n from submission_review_events where submission_id='${id(20)}'`)).n;
 assert.deepEqual((await one(`select jsonb_build_object('links',(select jsonb_agg(to_jsonb(l)) from game_developer_links l),'campaigns',(select jsonb_agg(to_jsonb(c)) from community_playtests c),'feedback',(select jsonb_agg(to_jsonb(t)) from community_game_tests t)) data`)).data,relationships,'Correction/resubmission preserves relationships, campaign and feedback byte-for-byte');
 await save(20,{evidence_link:'https://example.test/evidence'},revision,true);
 assert.equal((await one(`select count(*) n from submission_review_events where submission_id='${id(20)}'`)).n,eventCount,'Identical stale retry is idempotent');
 await assert.rejects(save(20,{description:'A conflicting new edit'},0,false),/changed elsewhere/);
 await assert.rejects(save(20,{status:'Approved'},result.submission.submission_revision,true),/Only developer submission fields/);
 await assert.rejects(save(20,{review_reason:'Forged note'},result.submission.submission_revision,true),/Only developer submission fields/);
 await assert.rejects(save(20,{game_launched:true},result.submission.submission_revision,true),/Only developer submission fields/);
 await as(2);await assert.rejects(save(20,{title:'Stolen'},0,true),/not found/);await assert.rejects(run(`select get_my_submission_correction('${id(20)}')`),/not found/);await assert.rejects(run('select preview_submission_completeness()'),/Admin access/);
 await as(3);const preview=(await one('select preview_submission_completeness() records')).records;assert.equal(preview.length,1);assert.equal(preview[0].id,id(10));assert.equal((await one(`select status from game_submissions where id='${id(10)}'`)).status,'Pending Review');
 const batch=preview.map(row=>({id:row.id,revision:row.revision}));assert.equal((await one('select route_incomplete_submissions($1::jsonb) n',[JSON.stringify(batch)])).n,1);assert.equal((await one('select route_incomplete_submissions($1::jsonb) n',[JSON.stringify(batch)])).n,0);
 assert.equal((await one(`select review_reason from game_submissions where id='${id(10)}'`)).review_reason,'Human request: clarify scope');
 assert.equal((await one(`select status from game_submissions where id='${id(11)}'`)).status,'Approved');assert.equal((await one(`select status from game_submissions where id='${id(12)}'`)).status,'Rejected');
 await assert.rejects(run(`update game_submissions set status='Approved' where id='${id(10)}'`),/Please complete these details/);
 await assert.rejects(run(`update game_submissions set status='Approved' where id='${id(11)}'`),/Please complete these details/);
 // Existing approval RPC creates links/XP before its final status UPDATE.
 // A late trigger rejection must roll back all statement side effects.
 await run(`create table fixture_approval_effects(id uuid);create function fixture_approval_attempt(p uuid) returns void language plpgsql as $$begin insert into fixture_approval_effects values(p);update game_submissions set status='Approved' where id=p;end;$$`);
 await assert.rejects(run(`select fixture_approval_attempt('${id(10)}')`),/Please complete these details/);
 assert.equal((await one('select count(*) n from fixture_approval_effects')).n,0);
 await run(`update game_submissions set status='Approved' where id='${id(21)}'`);
 assert.equal((await one(`select status from game_submissions where id='${id(21)}'`)).status,'Approved','Missing reviewer assessment work must not prevent a complete listing decision');
 await as(1);await assert.rejects(save(11,{description:'Change'},0,true),/Approved listings/);
 const legacy=await save(10,{description:'Corrected description',ai_type:'No AI disclosed'},1,true);assert.equal(legacy.submission.status,'Pending Review');assert.equal(legacy.submission.review_reason,'Human request: clarify scope');
 assert.equal((await one("select has_function_privilege('anon','public.save_my_submission_correction(uuid,jsonb,integer,boolean)','execute') ok")).ok,false);
 await as(2);await run('set role authenticated');assert.equal((await one('select count(*) n from submission_review_events')).n,0,'Other developers cannot read history');
 console.log('PASS: SQL/client parity; conditional/no-AI requirements; complete/incomplete routing; save vs resubmit; idempotency/conflicts; ownership and reviewer-field protection; read-only preview/explicit batch; approval guard; existing approved/rejected/notes preserved. No live SQL.');
}catch(error){console.error(error.message,error.where||'');process.exitCode=1;}finally{await db.close();}

async function listingChecks(maintenance=false){
 await run(fs.readFileSync('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of fs.readdirSync('supabase/migrations').filter(f=>/^20261028000[1-9]_/.test(f)).sort())await run(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 for(const n of[1,2,3])await run(`insert into profiles(id,roles,role)values('${id(n)}',array['developer'],'${n===3?'admin':'user'}')`);
 await insert(10,{});await run(`update game_submissions set status='Approved' where id='${id(10)}';insert into game_developer_links(developer_id,submission_id,relationship)values('${id(1)}','${id(10)}','Original submitter');`);
 for(const f of ['202610280010_submission_corrections.sql','202610280011_share_engagement.sql','202610290016_listing_revisions.sql'])await run(fs.readFileSync('supabase/migrations/'+f,'utf8'));

 await run(`update profiles set roles=array['tester','developer'],preferred_genres=array['Action'] where id='${id(2)}';insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,release_label)values('${id(40)}','${id(1)}','${id(10)}','Existing campaign','https://example.test/locked-build','Testing','open','both','Locked build')`);
 await as(2);const report=(await one('select claim_community_game_test($1) id',[id(40)])).id;await one('select submit_community_game_test($1,7,7,$2,$3,1,8,$4,$4,$5,$6,$7,$8::jsonb)',[report,'No issues','Specific feedback','probably','Movement','None','Controls','{}']);await as(3);await one('select review_test_quality($1,$2,$3,$4::jsonb)',[report,'accepted','Useful observations',JSON.stringify({specific:true,examples:true,useful:true,relevant:true,original:true})]);
 const preservedActivity=async()=>(await one(`select jsonb_build_object('campaigns',(select jsonb_agg(to_jsonb(c)) from community_playtests c),'reports',(select jsonb_agg(to_jsonb(t)) from community_game_tests t),'locks',(select jsonb_agg(to_jsonb(l)) from campaign_build_locks l),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p)) snapshot`)).snapshot;
 const activityBefore=await preservedActivity();
 const get=async()=> (await one('select get_my_listing_edit($1,$2) result',['submission',id(10)])).result;
 const edit=async(fields,version,resubmit=false,disputed=false)=>(await one('select save_my_listing_edit($1,$2,$3::jsonb,$4,$5,$6) result',['submission',id(10),JSON.stringify(fields),version,resubmit,disputed])).result;
 const pub=async()=> (await one('select get_public_listing_updates($1::jsonb) result',[JSON.stringify([{kind:'submission',id:id(10)}])])).result;
 await as(2);await assert.rejects(one('select review_listing_revision(0,0,true,$1)',['unauthorised']),/Admin/);await assert.rejects(get(),/access/);await assert.rejects(edit({description:'Wrong account'},0),/access/);await assert.rejects(one('select get_listing_revision_queue()'),/Admin/);
 await as(1);assert.equal((await get()).submission.title,'Game');await assert.rejects(edit({status:'Approved'},0),/Only developer/);await assert.rejects(edit({title:{bad:'object'}},0),/must contain text/);await assert.rejects(edit({ai_areas:[{}]},0),/text values/);
 const preserved=(await one('select to_jsonb(s) row from game_submissions s where id=$1',[id(10)])).row;
 let result=await edit({description:'Improved description'},0);assert.equal(result.submission.status,'Published');assert.equal((await pub())[0].fields.description,'Improved description');assert.equal((await get()).submission.submission_revision,1);
 result=await edit({ai_type:'AI-assisted'},1,true,true);assert.equal(result.submission.status,'Needs More Information');assert.equal((await pub())[0].fields.ai_type,'No AI disclosed');
 const proposal={ai_type:'AI-assisted',ai_explanation:'Tools helped with textures',evidence_link:'https://example.test/private-evidence'};
 result=await edit(proposal,2,true,true);assert.equal(result.submission.status,'Pending Review');assert.equal((await pub())[0].disputed,true);assert.equal((await pub())[0].pending,true);assert(!JSON.stringify(await pub()).includes('private-evidence'));
 const count=(await one('select count(*) n from listing_revisions')).n;await edit(proposal,2,true,true);assert.equal((await one('select count(*) n from listing_revisions')).n,count,'Retry is idempotent');
 await as(3);let queue=(await one('select get_listing_revision_queue() q')).q.filter(r=>r.status==='Pending Review');assert.deepEqual(queue[0].changed_fields,['ai_explanation','ai_type','evidence_link']);assert.equal(queue[0].before_fields.ai_type,'No AI disclosed');
 await one('select review_listing_revision($1,$2,true,$3)',[queue[0].id,queue[0].state_version,'Disclosure correction reviewed']);assert.equal((await pub())[0].fields.ai_type,'AI-assisted');assert.equal((await pub())[0].reassessment,true);assert.equal((await pub())[0].disputed,false);await assert.rejects(one('select review_listing_revision($1,$2,true,$3)',[queue[0].id,queue[0].state_version,'repeat']),/Stale/);
 await as(1);result=await edit({ai_type:'No AI disclosed',ai_explanation:'',evidence_link:''},3,true,true);assert.equal(result.submission.status,'Pending Review');await as(3);queue=(await one('select get_listing_revision_queue() q')).q.filter(r=>r.status==='Pending Review');await assert.rejects(one('select review_listing_revision($1,$2,false,$3)',[queue[0].id,queue[0].state_version,'']),/reason/);await one('select review_listing_revision($1,$2,false,$3)',[queue[0].id,queue[0].state_version,'Please clarify the changed disclosure']);assert.equal((await pub())[0].fields.ai_type,'AI-assisted');await as(1);assert.equal((await get()).submission.review_reason,'Please clarify the changed disclosure');
 result=await edit({ai_type:'No AI disclosed',ai_explanation:'',evidence_link:''},4,true,true);await as(3);queue=(await one('select get_listing_revision_queue() q')).q.filter(r=>r.status==='Pending Review');const stale=queue[0];await as(1);result=await edit({ai_type:'No AI disclosed',ai_explanation:'',evidence_link:'',title:'New title'},5,true,true);await as(3);await assert.rejects(one('select review_listing_revision($1,$2,true,$3)',[stale.id,stale.state_version,'old']),/Stale/);queue=(await one('select get_listing_revision_queue() q')).q.filter(r=>r.status==='Pending Review');await one('select review_listing_revision($1,$2,true,$3)',[queue[0].id,queue[0].state_version,'Reviewed current revision']);assert.equal((await pub())[0].fields.ai_type,'No AI disclosed');
 assert.deepEqual((await one('select to_jsonb(s) row from game_submissions s where id=$1',[id(10)])).row,preserved,'Source identity, relationships and existing assessment fields are not rewritten');
 await run(`insert into imported_games(id,title,steam_app_id,steam_url,catalogue_eligible)values('${id(20)}','Imported game','123','https://store.steampowered.com/app/123/',true);insert into game_developer_links(developer_id,imported_game_id,relationship)values('${id(1)}','${id(20)}','Developer')`);await as(1);await assert.rejects(one('select save_my_listing_edit($1,$2,$3::jsonb,0,true,false)',['imported',id(20),JSON.stringify({steam_url:'https://store.steampowered.com/app/999/'})]),/identity/);

 await as(3);const reassess=(await one('select get_listing_revision_queue() q')).q.find(r=>r.status==='Approved');assert(reassess);await assert.rejects(one('select confirm_listing_reassessment($1,$2,$3)',[reassess.id,reassess.state_version,'Reviewed']),/fresh assessment/);
 await run(`create table public.assessment_fixture(game_id uuid,updated_at timestamptz,ai_claims_checked boolean,reviewer_notes text);create view public.published_game_verifications as select * from public.assessment_fixture;insert into assessment_fixture values('${id(10)}',clock_timestamp(),true,'PRIVATE ADMIN NOTES')`);
 await one('select confirm_listing_reassessment($1,$2,$3)',[reassess.id,reassess.state_version,'New assessment completed']);assert.equal((await pub())[0].reassessment,false);assert(!JSON.stringify(await pub()).includes('PRIVATE ADMIN NOTES'));assert.equal((await one('select assessment_after from listing_revisions where id=$1',[reassess.id])).assessment_after.reviewer_notes,'PRIVATE ADMIN NOTES');
 assert.deepEqual(await preservedActivity(),activityBefore,'Campaigns, accepted feedback, build locks and XP/profile data preserved');
 assert.equal((await one("select has_table_privilege('authenticated','public.listing_revisions','select') ok")).ok,false);await run('set role anon');await assert.rejects(one('select get_listing_revision_queue()'),/permission/);assert.equal((await pub()).length,1);await run('reset role');
 if(maintenance)await maintenanceChecks();
 console.log('PASS listing SQL: approved ownership, denied unrelated developer, field allowlist, ordinary edits, conditional completeness, private evidence, pending/current content, both AI directions, idempotent save, approval/rejection/reasons/stale reviews, reassessment flag, canonical identity and source preservation. Disposable database only.');
}

async function maintenanceChecks(){
 await run(`create table public.game_claims(id uuid primary key,claimant_id uuid,imported_game_id uuid,status text);`);
 const existing=(await one(`select jsonb_build_object('campaigns',(select jsonb_agg(to_jsonb(c)) from community_playtests c),'reports',(select jsonb_agg(to_jsonb(t)) from community_game_tests t),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p)) snapshot`)).snapshot;
 await run(fs.readFileSync('supabase/migrations/202610290017_admission_maintenance_intents.sql','utf8'));
 assert.deepEqual((await one(`select jsonb_build_object('campaigns',(select jsonb_agg(to_jsonb(c)) from community_playtests c),'reports',(select jsonb_agg(to_jsonb(t)) from community_game_tests t),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p)) snapshot`)).snapshot,existing,'Migration does not rewrite live-style records');
 const issues=async f=>(await one('select submission_completeness($1::jsonb) r',[JSON.stringify(f)])).r.issues;
 assert.deepEqual(await issues({...valid,ai_type:'AI-assisted',ai_explanation:'Texture assistance',evidence_link:''}),[]);assert((await issues({...valid,evidence_link:'javascript:alert(1)'})).some(i=>i.field==='evidence_link'));
 await as(1);let state=(await one('select get_my_listing_edit($1,$2) r',['submission',id(10)])).r;let revision=state.submission.submission_revision;
 const direct=async(fields,version=revision)=>(await one('select save_my_listing_edit($1,$2,$3::jsonb,$4,false,false) r',['submission',id(10),JSON.stringify(fields),version])).r;
 state=await direct({ai_type:'AI-assisted',ai_explanation:'Updated texture assistance',evidence_link:''});revision=state.submission.submission_revision;assert.equal(state.submission.status,'Approved');assert.equal(state.pending,null);assert.equal((await one(`select count(*) n from listing_revisions where status='Pending Review'`)).n,0);assert.equal((await one('select get_public_listing_updates($1::jsonb) r',[JSON.stringify([{kind:'submission',id:id(10)}])])).r[0].fields.ai_type,'AI-assisted');
 const beforeFailure=state;await assert.rejects(direct({ai_explanation:''}),/AI-use explanation/);await assert.rejects(direct({game_link:'javascript:bad'}),/link/);assert.deepEqual((await one('select get_my_listing_edit($1,$2) r',['submission',id(10)])).r,beforeFailure);
 await assert.rejects(direct({title:'   '}),/title/i);await assert.rejects(direct({reviewer_notes:'forge'}),/Only developer/);
 await as(2);await assert.rejects(direct({description:'stolen'}),/access/);
 // Imported presence and a pending/rejected claim are not admission proof.
 await as(1);await assert.rejects(one('select save_my_listing_edit($1,$2,$3::jsonb,0,false,false)',['imported',id(20),JSON.stringify({description:'Description only'})]),/admission/);await run(`insert into game_claims values('${id(70)}','${id(1)}','${id(20)}','Pending Review');update game_developer_links set source_claim_id='${id(70)}' where imported_game_id='${id(20)}'`);await assert.rejects(one('select save_my_listing_edit($1,$2,$3::jsonb,0,false,false)',['imported',id(20),JSON.stringify({description:'Description only'})]),/admission/);await run(`update game_claims set status='Rejected' where id='${id(70)}'`);await assert.rejects(one('select save_my_listing_edit($1,$2,$3::jsonb,0,false,false)',['imported',id(20),JSON.stringify({description:'Description only'})]),/admission/);await run(`update game_claims set status='Approved' where id='${id(70)}'`);
 const imported=(await one('select save_my_listing_edit($1,$2,$3::jsonb,0,false,false) r',['imported',id(20),JSON.stringify({description:'Description only'})])).r;assert.equal(imported.submission.status,'Approved');assert.equal(imported.submission.ai_type,'','Unchanged legacy missing AI disclosure remains');
 // Initial admission still routes to review, never direct approval.
 const pending=await insert(30,{ai_type:'AI-assisted',ai_explanation:'Assistance',evidence_link:''});assert.equal(pending.status,'Pending Review');const incomplete=await insert(31,{description:''});assert.equal(incomplete.status,'Needs More Information');
 await run(`insert into game_developer_links(developer_id,submission_id,relationship)values('${id(1)}','${id(30)}','Original submitter');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience)values('${id(60)}','${id(1)}','${id(30)}','Draft','https://example.test/build','Test','draft','both')`);
 await assert.rejects(run(`update community_playtests set status='open' where id='${id(60)}'`),/admission|Approved/);assert.equal((await one(`select tester_hub_started_at t from community_playtests where id='${id(60)}'`)).t,null);
 // Reviewed repair requires actual Approved -> Needs Information history.
 await as(3);await run(`update game_submissions set status='Approved' where id='${id(30)}';update game_submissions set status='Needs More Information',description='' where id='${id(30)}'`);const repairs=(await one('select preview_listing_admission_repairs() r')).r;assert(repairs.some(r=>r.id===id(30)));assert(!repairs.some(r=>r.id===id(31)));await one('select repair_listing_admissions($1::jsonb,$2)',[JSON.stringify(repairs.filter(r=>r.id===id(30))),'Reviewed historical admission']);assert.equal((await one(`select status from game_submissions where id='${id(30)}'`)).status,'Approved');

 for(const n of[4,5,6,7])await run(`insert into profiles(id,roles,preferred_genres)values('${id(n)}',array['tester','developer'],array['Action'])`);
 await as(7);const unreviewed=(await one('select claim_community_game_test($1) id',[id(40)])).id;await one('select submit_community_game_test($1,7,7,$2,$3,1,8,$4,$4,$5,$6,$7,$8::jsonb)',[unreviewed,'No issues','Unreviewed feedback','definitely','Movement','None','Controls','{}']);await run(`update community_playtests set status='closed' where id='${id(40)}'`);
 await run(`insert into game_developer_links(developer_id,submission_id,relationship)values('${id(4)}','${id(10)}','Developer');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,release_label)values('${id(50)}','${id(4)}','${id(10)}','Second build','https://example.test','Test','open','both','Build 2')`);
 for(const [n,answer]of[[5,'definitely'],[6,'maybe']]){await as(n);const report=(await one('select claim_community_game_test($1) id',[id(n===7?40:50)])).id;await one('select submit_community_game_test($1,7,7,$2,$3,1,8,$4,$5,$6,$7,$8,$9::jsonb)',[report,'No issues','Feedback','probably_not',answer,'Movement','None','Controls','{}']);if(n!==7){await as(3);await one('select review_test_quality($1,$2,$3,$4::jsonb)',[report,'accepted','Useful report',JSON.stringify({specific:true,examples:true,useful:true,relevant:true,original:true})]);}}

 await as(6);await run(`insert into game_claims values('${id(71)}','${id(6)}','${id(20)}','Approved');insert into game_developer_links(developer_id,imported_game_id,source_claim_id,relationship)values('${id(6)}','${id(20)}','${id(71)}','Developer');insert into community_playtests(id,developer_id,imported_game_id,title,access_link,instructions,status,audience)values('${id(80)}','${id(6)}','${id(20)}','Approved legacy import','https://example.test/build','Testing','draft','both')`);
 const eligibility=(await one('select * from get_playtest_eligibility($1,null,null)',[id(20)]));assert(eligibility.tester_hub_eligible,'Admitted draft can publish with available account quota despite legacy disclosure omission');await run(`update community_playtests set status='open' where id='${id(80)}'`);assert((await one(`select tester_hub_started_at from community_playtests where id='${id(80)}'`)).tester_hub_started_at);
 await run(`update game_claims set status='Rejected' where id='${id(71)}'`);await assert.rejects(one('select get_my_listing_edit($1,$2)',['imported',id(20)]),/admission/);
 const counts=(await one(`select _intent_counts(array['definitely','probably','maybe','probably_not','definitely_not',null,'']) c`)).c;assert.deepEqual(counts,{definitely:1,probably:1,answered:5});
 const summaries=(await one('select get_public_intent_counts($1::jsonb) r',[JSON.stringify([{kind:'submission',id:id(10)}])])).r;assert.equal(summaries[0].lifetime.recommend.answered,3);assert.equal(summaries[0].lifetime.recommend.definitely,1);assert.equal(summaries[0].lifetime.recommend.probably,1);assert.equal(summaries[0].builds.find(b=>b.playtest_id===id(50)).recommend.answered,2);assert.equal(summaries[0].builds.find(b=>b.playtest_id===id(40)).recommend.answered,1);assert.deepEqual((await one("select _intent_counts(array[null,'']) c")).c,{definitely:0,probably:0,answered:0});assert(!JSON.stringify(summaries).includes('Specific feedback'));
 console.log('PASS maintenance policy: optional evidence, direct approved saves, admission retained, legacy omissions, conditional validation/failed-save status, protected fields/ownership, imported claim proof, initial routing, draft publication and allowance rollback, reviewed repair, actual intent denominators/build IDs, no record rewrites.');
}

async function qaActivityChecks(){
 const fakeImports=[['b307eac5-4b9e-46fc-b673-178014c3fd9a','PLAYTESTED_TEST_STARFALL'],['052165b0-15b4-4b2e-a1cb-c3be363df97f','PLAYTESTED_TEST_TINY'],['f7f9808b-2d97-45ea-9bd5-428c42e4f018','PLAYTESTED_TEST_ASHEN']];
 const realImports=[['00004d38-7672-473c-9628-b554c579d9e9','3762240'],['d11243eb-54fe-4d25-ab51-e48a9bba611f','3666410'],['aaa80937-4949-4d34-8826-93daa8e995a5','3008910']];
 const neon='3dc1adfe-8e19-4c37-aef7-b9c16ad5433f',rail=realImports[0][0];
 const campaigns=[["7e69d169-c79c-40e8-83e5-545f85736f31","b307eac5-4b9e-46fc-b673-178014c3fd9a","closed"],["04771f87-5f59-4cf8-9f35-07c80c77537f","052165b0-15b4-4b2e-a1cb-c3be363df97f","closed"],["b8754c76-2f38-42b8-9348-240ef5aaed7f","f7f9808b-2d97-45ea-9bd5-428c42e4f018","closed"],["3d09699f-f0b0-4d4e-bb06-1da7f1180778","00004d38-7672-473c-9628-b554c579d9e9","closed"],["41e47b6d-8f1c-4c06-b929-72169c7f0e6b","3dc1adfe-8e19-4c37-aef7-b9c16ad5433f","closed"],["5218a866-f597-4fc1-bfae-84e1dc172dfe","3dc1adfe-8e19-4c37-aef7-b9c16ad5433f","open"],["a2fe9b0b-f556-4517-86c5-9687c33c8f40","00004d38-7672-473c-9628-b554c579d9e9","open"],["2092dc5a-6404-42d1-a5db-544858565808","f7f9808b-2d97-45ea-9bd5-428c42e4f018","open"],["abc3ae2e-aea3-4293-af66-3130fbd6292a","b307eac5-4b9e-46fc-b673-178014c3fd9a","open"],["5b5a9d16-adf6-4cab-b67f-db393d00483f","052165b0-15b4-4b2e-a1cb-c3be363df97f","open"]];
 const reports=[["9addefaf-24f0-4b31-a0ef-9eab8e290654","a2fe9b0b-f556-4517-86c5-9687c33c8f40","accepted",100],["d75d813f-056d-4522-bc34-64769daace13","a2fe9b0b-f556-4517-86c5-9687c33c8f40","accepted",100],["b4ec4994-a67e-4e5d-9b6a-fac3d692f6f3","abc3ae2e-aea3-4293-af66-3130fbd6292a","accepted",100],["adffbf46-e4ec-485c-aa97-0742cd3ba8e4","3d09699f-f0b0-4d4e-bb06-1da7f1180778","accepted",100],["b157a13c-d60a-4517-8d75-a16be538d2ee","abc3ae2e-aea3-4293-af66-3130fbd6292a","accepted",0],["82f43a02-04bf-44c6-aa59-69e947c3d0cd","5b5a9d16-adf6-4cab-b67f-db393d00483f","accepted",0],["16e76543-7781-4699-abac-f905ec310b2b","5b5a9d16-adf6-4cab-b67f-db393d00483f","accepted",0],["2444d895-882b-469b-b627-1335e5acf3f0","5b5a9d16-adf6-4cab-b67f-db393d00483f","accepted",0],["675c8857-0dab-4e3b-9289-2678d3523954","2092dc5a-6404-42d1-a5db-544858565808","accepted",0],["4ba7daeb-f7d3-4073-8d8a-34fc94dcc35e","2092dc5a-6404-42d1-a5db-544858565808","accepted",0],["4868be47-920e-4255-a64f-7947f62add01","2092dc5a-6404-42d1-a5db-544858565808","accepted",0],["0f5bbdcf-617c-496d-8f98-3474adb16a7e","41e47b6d-8f1c-4c06-b929-72169c7f0e6b","accepted",0],["568dbcad-9667-4719-9cd3-5b92319b95af","41e47b6d-8f1c-4c06-b929-72169c7f0e6b","accepted",0],["4a0a5c94-5a02-42be-ac28-67fe17b5073e","41e47b6d-8f1c-4c06-b929-72169c7f0e6b","accepted",0],["c34faacc-5877-4ec6-93b4-b0ff67b62e80","7e69d169-c79c-40e8-83e5-545f85736f31","accepted",0],["193a01b6-7781-4698-ae93-a8fb9742c6d8","7e69d169-c79c-40e8-83e5-545f85736f31","accepted",0],["78692812-ff9a-4499-b59f-2c7f7e6f4b93","7e69d169-c79c-40e8-83e5-545f85736f31","accepted",0],["a8d40708-9621-4062-ab51-c7740ed68aa2","04771f87-5f59-4cf8-9f35-07c80c77537f","accepted",0],["54e94ff9-41e3-4325-9b0f-15d4f61a1c9b","04771f87-5f59-4cf8-9f35-07c80c77537f","accepted",0],["cd5327db-fada-4e24-b4d8-8a5d3d97908d","04771f87-5f59-4cf8-9f35-07c80c77537f","accepted",0],["8297c6b4-233e-427e-96d4-eaf28016e2aa","b8754c76-2f38-42b8-9348-240ef5aaed7f","accepted",0],["cf92325c-2378-4c41-a0fc-8f09794b0806","b8754c76-2f38-42b8-9348-240ef5aaed7f","accepted",0],["088476a9-0609-41cb-aee4-a7496324e402","b8754c76-2f38-42b8-9348-240ef5aaed7f","accepted",0],["e74501d2-5876-47eb-88e2-bdecb53c8c8e","5218a866-f597-4fc1-bfae-84e1dc172dfe","accepted",0],["3d477355-2dfc-44c0-b618-8f85aa50058f","5218a866-f597-4fc1-bfae-84e1dc172dfe","accepted",0],["deda0e6b-0adf-40d7-8f04-19355c735ce1","5218a866-f597-4fc1-bfae-84e1dc172dfe","accepted",0],["957caceb-408a-4aad-ba4a-a1c22d14970e","5218a866-f597-4fc1-bfae-84e1dc172dfe","accepted",0],["7748d1cd-781f-4b8c-8ab4-66d50b4b3a00","5218a866-f597-4fc1-bfae-84e1dc172dfe","accepted",0],["d2ad9079-9e11-45b7-aaad-b6b1a7c325d1","abc3ae2e-aea3-4293-af66-3130fbd6292a","rejected",0]];
 await run('alter view public.approved_games reset(security_invoker,security_barrier);set session_replication_role=replica');
 for(const [gid,steam]of [...fakeImports,...realImports])await run(`insert into imported_games(id,steam_app_id,title,developer_name,genre,description,image_url,steam_url,catalogue_eligible,catalogue_review_status,catalogue_review_reason,metadata_backfill_status)values('${gid}','${steam}','Game ${steam}','Studio','Action','Description','https://example.test/image','https://example.test/game',true,'eligible',${steam.startsWith('PLAYTESTED_TEST_')?"'Playtested V10 controlled catalogue test game.'":"null"},'complete')`);
 await run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,status,ai_type,game_link)values('${neon}','${id(1)}','Neon QA','Studio','Action','QA build','Approved','No AI disclosed','https://example.test/qa');insert into profiles(id,role,roles,tester_xp)values('${id(50)}','user',array['tester'],400);`);
 for(const [cid,gid,status]of campaigns)await run(`insert into community_playtests(id,developer_id,submission_id,imported_game_id,title,access_link,instructions,status,audience,published_at,tester_hub_started_at,release_label,testing_genre)values('${cid}','${id(1)}',${gid===neon?"'"+gid+"'":"null"},${gid!==neon?"'"+gid+"'":"null"},'QA round','https://example.test/qa','QA','${status}','both',now(),now(),'QA build',null)`);
 for(const [index,[rid,cid,outcome,xp]]of reports.entries())await run(`insert into profiles(id,role,roles,tester_xp)values('${id(500+index)}','user',array['tester'],${xp});insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome,base_xp_amount,xp_awarded,overall_score,recommend_game,continue_playing)values('${rid}','${cid}','${id(500+index)}','reviewed','${outcome}',${xp},${xp>0},8,'definitely','probably')`);
 await run(`create table public.community_playtest_feedback(id uuid,playtest_id uuid,tester_id uuid,overall_score integer);insert into community_playtest_feedback values('867fe05f-4ddc-472a-bf1d-7b1f12c4a229','3d09699f-f0b0-4d4e-bb06-1da7f1180778','${id(50)}',8);set session_replication_role=origin;`);
 const state=async()=>(await one(`select jsonb_build_object('reports',(select jsonb_agg(to_jsonb(t)order by id)from community_game_tests t),'community',(select jsonb_agg(to_jsonb(t))from community_playtest_feedback t),'profiles',(select jsonb_agg(to_jsonb(p)order by id)from profiles p),'submissions',(select jsonb_agg(to_jsonb(s)order by id)from game_submissions s),'campaigns',(select jsonb_agg(to_jsonb(c) order by id)from community_playtests c),'imports',(select jsonb_agg(to_jsonb(i)-'catalogue_eligible'-'catalogue_review_status' order by id)from imported_games i)) data`)).data;
 const before=await state();const viewBefore=await one(`select reloptions,relowner,relacl from pg_class where oid='public.approved_games'::regclass`);
 const helperMeta=async()=>one(`select proowner,proacl,proconfig,provolatile,prosecdef from pg_proc where oid='public.beta_fixture_hidden(uuid)'::regprocedure`);
 const helperBefore=await helperMeta();
 const countBefore=Number((await one('select count(*) n from get_public_catalogue(1,100)')).n);
 await run(fs.readFileSync('supabase/migrations/202610290022_exclude_approved_qa_activity.sql','utf8'));
 assert.deepEqual(await state(),before,'Only approved visibility/status changes; all reports, history, XP, relationships and metadata preserved');
 assert.deepEqual(await helperMeta(),helperBefore,'Existing helper owner/grants/security attributes preserved');
 assert.deepEqual(await one(`select reloptions,relowner,relacl from pg_class where oid='public.approved_games'::regclass`),viewBefore);
 assert.equal(Number((await one('select count(*) n from get_public_catalogue(1,100)')).n),countBefore-4);
 for(const [gid]of realImports){assert.equal((await one(`select catalogue_eligible from imported_games where id='${gid}'`)).catalogue_eligible,true);assert.ok((await db.query('select * from get_public_catalogue(1,100)')).rows.some(r=>r.game_id===gid));}
 for(const [gid]of fakeImports)assert.equal((await one(`select catalogue_eligible from imported_games where id='${gid}'`)).catalogue_eligible,false);
 assert.equal((await one(`select count(*) n from get_game_community_reception()where imported_game_id='${rail}'`)).n,0);
 const publicCounts=(await one('select get_public_intent_counts($1::jsonb) result',[JSON.stringify([{kind:'imported',id:rail}])])).result[0];
 assert.deepEqual(publicCounts.builds,[]);assert.equal(publicCounts.lifetime.recommend.answered,0);assert.equal(publicCounts.lifetime.continue.answered,0);
 assert.equal((await db.query('select * from get_public_recruitment($1::jsonb)',[JSON.stringify([{source_type:'steam',game_id:rail}])])).rows[0].recruiting,false);
 for(const[cid,,status]of campaigns){assert.equal((await one(`select status from community_playtests where id='${cid}'`)).status,status);assert.equal((await one(`select public.campaign_eligible('${cid}','${id(50)}') eligible`)).eligible,false);}
 await as(500);await run('set role authenticated');assert.equal(Number((await one(`select count(*) n from community_game_tests where tester_id=auth.uid()`)).n),1);await run('reset role');

 // 023 extends the existing mechanism: exercise both submission and approved aliases.
 const workflow=['0a954463-811a-42b7-98d6-8793e3c9b756','226cf8e7-4606-44f5-b7be-e0f46ce38dc3','38f54814-859c-461f-8602-8b6ba84f1e99','94483bd5-99e5-4126-bd01-c1a770a7f7b3'];
 await run('set session_replication_role=replica');
 for(const [i,gid]of workflow.entries())await run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,status,game_link,ai_type)values('${gid}','${id(1)}','Confirmed QA ${i}','Studio','Action','QA description','Approved','https://example.test/build','No AI disclosed');insert into community_playtests(id,developer_id,${i%2?'approved_game_id':'submission_id'},title,access_link,instructions,status,audience,published_at,release_label)values('${id(800+i)}','${id(1)}','${gid}','QA campaign','https://example.test/build','Test','open','both',now(),'QA build');insert into community_game_tests(id,playtest_id,tester_id,status,review_outcome,base_xp_amount,xp_awarded,overall_score)values('${id(900+i)}','${id(800+i)}','${id(2)}','reviewed','accepted',60,true,8)`);
 await run('set session_replication_role=origin');
 const workflowBefore=await state(),countWorkflow=Number((await one('select count(*) n from get_public_catalogue(1,100)')).n);
 const oldDefinition=(await one(`select pg_get_functiondef('public.beta_fixture_hidden(uuid)'::regprocedure) definition`)).definition;
 const workflowMeta=await helperMeta();
 await run(fs.readFileSync('supabase/migrations/202610300023_hide_confirmed_workflow_fixtures.sql','utf8'));
 assert.deepEqual(await state(),workflowBefore,'023 preserves all private rows, histories, campaign statuses, relationships and XP');assert.deepEqual(await helperMeta(),workflowMeta);assert.deepEqual(await one(`select reloptions,relowner,relacl from pg_class where oid='public.approved_games'::regclass`),viewBefore);
 assert.equal(Number((await one('select count(*) n from get_public_catalogue(1,100)')).n),countWorkflow-4);
 for(const [i,gid]of workflow.entries()){
  assert.equal(Number((await one('select count(*) n from approved_games where id=$1',[gid])).n),0,'Public profile/sitemap source excludes exact ID');
  assert.equal(Number((await one('select count(*) n from get_game_community_reception()where submission_id=$1 or approved_game_id=$1',[gid])).n),0);
  assert.equal(Number((await one('select count(*) n from get_public_submission_playtest_history($1)',[gid])).n),0);
  assert.equal(Number((await one('select count(*) n from get_public_submission_playtest_feedback($1)',[gid])).n),0);
  assert.deepEqual((await one('select get_public_intent_counts($1::jsonb) result',[JSON.stringify([{kind:'approved',id:gid}])])).result,[]);
  assert.deepEqual((await db.query('select * from get_public_recruitment($1::jsonb)',[JSON.stringify([{source_type:'approved',game_id:gid}])])).rows,[]);
  assert.equal((await one('select campaign_eligible($1,$2) eligible',[id(800+i),id(2)])).eligible,false);
  const token=(await one('select share_token from community_playtests where id=$1',[id(800+i)])).share_token;
  assert.equal(Number((await one('select count(*) n from get_public_community_playtest($1)',[token])).n),0);
 }
 await as(2);await run('set role authenticated');assert.equal(Number((await one('select count(*) n from community_game_tests where id=any($1::uuid[])',[workflow.map((_,i)=>id(900+i))])).n),4,'Private tester history retained');await run('reset role');
 await run(oldDefinition);assert.equal(Number((await one('select count(*) n from approved_games where id=any($1::uuid[])',[workflow])).n),4,'Helper-only reversal restores just these profiles');assert.equal((await one('select beta_fixture_hidden($1) hidden',[neon])).hidden,true,'Previous fixture exclusions survive reversal');
 console.log('PASS 023 isolated extension: four exact QA profiles/catalogue/reception/history/recruitment/invitations excluded; genuine listings and all private data/XP, helper/view metadata preserved; helper-only reversal verified. No live SQL.');
 console.log('PASS 022 isolated exact-ID cleanup: four QA listings excluded; three genuine Steam entries retained; both Rail QA rounds, recommendations, rating/build reception and recruitment excluded; all 29 reports/community feedback/history/recorded XP preserved; view security unchanged. No live application.');
}

async function reviewScopeChecks(){
 await run(fs.readFileSync('supabase/tests/v10-fixture.sql','utf8'));
 await run(fs.readFileSync('supabase/migrations/202610280010_submission_corrections.sql','utf8'));
 const latest=fs.readFileSync('supabase/migrations/202610290017_admission_maintenance_intents.sql','utf8');
 await run(latest.slice(latest.indexOf('create or replace function public.submission_completeness'),latest.indexOf('create function public._listing_has_admission')));
 await run(`drop table approved_games cascade;create view approved_games as select id,title,developer_name from game_submissions where status='Approved';create table developer_xp_awards(id uuid default gen_random_uuid(),developer_id uuid,xp_amount integer,award_type text,source_type text,source_id uuid,description text,unique(developer_id,award_type,source_type,source_id));`);
 await run(fs.readFileSync('supabase/tests/submission-review-fixture.sql','utf8'));
 for(const n of [1,2,3])await run(`insert into auth.users values('${id(n)}');insert into profiles(id,roles,role)values('${id(n)}',array['developer'],'${n===3?'admin':'user'}')`);
 await as(1);await insert(30,{ai_type:'AI-assisted',ai_explanation:'Edited generated artwork',evidence_link:''});await insert(31,{description:''});
 await assert.rejects(one('select review_game_submission($1,$2,$3)',[id(30),'Approved',null]),/Admin access/);
 await as(3);await one('select review_game_submission($1,$2,$3)',[id(30),'Approved',null]);
 assert.equal((await one('select status from game_submissions where id=$1',[id(30)])).status,'Approved');assert.equal((await one('select count(*) n from game_verifications')).n,0);
 const xp=(await one('select developer_xp from profiles where id=$1',[id(1)])).developer_xp;
 await assert.rejects(one('select review_game_submission($1,$2,$3)',[id(31),'Approved',null]),/Please complete/);assert.equal((await one('select developer_xp from profiles where id=$1',[id(1)])).developer_xp,xp);
 await assert.rejects(one('select review_game_submission($1,$2,$3)',[id(31),'Needs More Information','']),/reason is required/);
 await one('select review_game_submission($1,$2,$3)',[id(31),'Needs More Information','Clarify disclosure']);
 await run('grant select on profiles to authenticated;set role authenticated');
 await one(`insert into game_verifications(submission_id,reviewer_notes)values($1,'Private review only')on conflict(submission_id)do update set reviewer_notes=excluded.reviewer_notes returning submission_id`,[id(30)]);
 const before=await one('select * from game_verifications where submission_id=$1',[id(30)]);assert.equal(before.published,false);assert.equal(before.quality_status,'Not Tested');
 await assert.rejects(one('update game_verifications set published=true where submission_id=$1',[id(30)]),/check constraint/);
 await assert.rejects(one('update game_verifications set quality_score=8 where submission_id=$1',[id(30)]),/check constraint/);
 await one(`update game_verifications set reviewer_notes='Changed private note' where submission_id=$1`,[id(30)]);
 const after=await one('select * from game_verifications where submission_id=$1',[id(30)]);delete before.reviewer_notes;delete after.reviewer_notes;assert.deepEqual(after,before);
 await as(1);await run('set role authenticated');assert.equal((await one('select count(*) n from game_verifications')).n,0);assert.equal((await db.query('update game_verifications set reviewer_notes=$1 returning id',['forge'])).rows.length,0);
 await assert.rejects(one('select reviewer_notes from published_game_verifications'),/does not exist/);
 console.log('PASS isolated review scope: actual archived approval RPC plus current completeness guards permit complete no-evidence/no-assessment approval; incomplete approval rolls back XP side effects; admin/reason guards, private-note RLS/exposure and note-only preservation, assessment publishing/score constraints retained. Not a fresh live-schema inspection.');
}

async function communityVoteChecks(){
 // Reduced real PostgreSQL fixture reproduces the captured vote constraints/RLS.
 await run(`create role anon;create role authenticated;create schema auth;create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create table community_posts(id bigint primary key);insert into community_posts values(99);create table community_votes(id bigint generated always as identity primary key,post_id bigint references community_posts(id)on delete cascade,user_id uuid not null,value smallint not null check(value in(-1,1)),unique(post_id,user_id));alter table community_votes enable row level security;grant usage on schema auth to anon,authenticated;grant select on community_votes to anon,authenticated;grant all on community_votes to anon,authenticated;grant usage on sequence community_votes_id_seq to anon,authenticated;create policy vote_read on community_votes for select to anon,authenticated using(true);create policy vote_insert on community_votes for insert to authenticated with check(user_id=auth.uid());create policy vote_update on community_votes for update to authenticated using(user_id=auth.uid())with check(user_id=auth.uid());create policy vote_delete on community_votes for delete to authenticated using(user_id=auth.uid());`);
 await as(1);await run('set role authenticated');let current=0,score=0;
 for(const [direction,expected]of[[1,1],[1,0],[-1,-1],[-1,0],[-1,-1],[1,1],[-1,-1]]){
  if(current===direction)await one('delete from community_votes where post_id=99 and user_id=auth.uid() returning value');else await one('insert into community_votes(post_id,user_id,value)values(99,auth.uid(),$1)on conflict(post_id,user_id)do update set value=excluded.value returning value',[direction]);
  current=current===direction?0:direction;score=Number((await one('select coalesce(sum(value),0)n from community_votes where post_id=99')).n);assert.equal(score,expected);
 }
 await assert.rejects(one('insert into community_votes(post_id,user_id,value)values(99,auth.uid(),1)'),/unique/);
 await assert.rejects(one('update community_votes set value=0 where user_id=auth.uid()'),/check constraint/);
 await assert.rejects(one('insert into community_votes(post_id,user_id,value)values(99,$1,1)',[id(2)]),/row-level security/);
 await as(2);await run('set role authenticated');assert.equal((await db.query('delete from community_votes where post_id=99 returning id')).rows.length,0);assert.equal((await db.query('update community_votes set value=1 where post_id=99 returning id')).rows.length,0);
 await run('reset role;set role anon');assert.equal(Number((await one('select sum(value)n from community_votes')).n),-1);await assert.rejects(one('insert into community_votes(post_id,user_id,value)values(99,$1,1)',[id(2)]),/row-level security/);
 console.log('PASS isolated vote constraints: all six toggle/switch transitions, unique account/post vote, -1/+1 check, own-write RLS and anonymous read-only access. Captured schema fixture; no live votes.');
}

async function pulseChecks(){
 await run(`create role anon;create role authenticated;create role service_role bypassrls;create table game_submissions(id uuid primary key,developer_id uuid,title text,game_link text);create table profiles(id uuid,tester_xp integer);insert into profiles values('${id(1)}',100);
 create table pulse_jobs(id uuid primary key default gen_random_uuid(),submission_id uuid not null,developer_id uuid not null,technical_run_id uuid,status text not null default 'QUEUED',engine_version text default 'PULSE v1',worker_version text default 'v6.10',test_suite_version text default 'v6.10',build_url text,build_sha256 text,error_message text,created_at timestamptz default now(),updated_at timestamptz default now(),started_at timestamptz,completed_at timestamptz,report_json jsonb);
 create function public.claim_next_pulse_job()returns setof public.pulse_jobs language sql as $$select * from public.pulse_jobs where false$$;grant usage on schema public to anon,authenticated,service_role;grant all on pulse_jobs to anon,authenticated,service_role;`);
 for(const n of[1,2,3,4])await run(`insert into game_submissions values('${id(10+n)}','${id(1)}','Saved submission','https://example.test/build${n}.zip')`);
 await run(`insert into pulse_jobs(submission_id,developer_id,status,build_url,report_json)values('${id(99)}','${id(1)}','COMPLETE','https://example.test/history.zip','{"history":true}')`);
 const historical=(await one('select to_jsonb(j) row from pulse_jobs j')).row;
 await run(fs.readFileSync('supabase/migrations/202610300024_pulse_availability.sql','utf8'));
 assert.deepEqual((await one("select to_jsonb(j)-'input_key'-'retry_of' row from pulse_jobs j")).row,historical);
 assert.equal((await one('select get_pulse_availability() state')).state,'unavailable');
 const queue=async(n,actor=id(1),retryOf=null)=>(await one('select enqueue_available_pulse_job($1,$2,$3) result',[id(10+n),actor,retryOf])).result;
 assert.equal((await queue(1)).state,'unavailable');assert.equal(Number((await one('select count(*) n from game_submissions')).n),4,'Unavailable preserves saved submissions');
 await run(`select record_pulse_worker_heartbeat('${id(70)}',true,false)`);
 assert.equal((await one('select get_pulse_availability() state')).state,'available');const first=await queue(1);assert.equal(first.state,'queued');assert.equal((await queue(1)).job.id,first.job.id);
 await run(`select record_pulse_worker_heartbeat('${id(70)}',true,true,'${first.job.id}')`);assert.equal((await one('select get_pulse_availability() state')).state,'busy');assert.equal((await one('select pulse_job_worker_alive($1) alive',[first.job.id])).alive,true);assert.equal((await queue(2)).state,'queued');
 await run("update pulse_worker_heartbeats set received_at=clock_timestamp()-interval '91 seconds'");assert.equal((await queue(3)).state,'unavailable');assert.equal((await one('select pulse_job_worker_alive($1) alive',[first.job.id])).alive,false);
 await run(`update game_submissions set game_link='https://store.steampowered.com/app/123' where id='${id(14)}'`);assert.equal((await queue(4)).state,'unsupported');
 await run(`select record_pulse_worker_heartbeat('${id(70)}',true,false)`);assert.equal((await queue(3)).state,'queued','Worker return permits new request');await run(`insert into game_submissions values('${id(15)}','${id(1)}','Concurrent fixture','https://example.test/other.zip')`);const raced=await Promise.all([queue(5),queue(5)]);assert.equal(raced[0].job.id,raced[1].job.id);assert.equal(Number((await one('select count(*) n from pulse_jobs where submission_id=$1',[id(15)])).n),1);
 await assert.rejects(queue(1,id(2)),/access denied/);await run('set role authenticated');await assert.rejects(run(`select record_pulse_worker_heartbeat('${id(70)}',true,false)`),/permission denied/);await assert.rejects(run(`select enqueue_available_pulse_job('${id(11)}','${id(1)}')`),/permission denied/);await assert.rejects(run(`insert into pulse_jobs(submission_id,developer_id)values('${id(11)}','${id(1)}')`),/permission denied/);await run('reset role;set role anon');assert.equal((await one('select get_pulse_availability() state')).state,'available');await assert.rejects(run('select * from pulse_worker_heartbeats'),/permission denied/);await run('reset role');assert.equal((await one('select tester_xp from profiles')).tester_xp,100);

 // Explicit retries preserve the failed parent and provide durable retry-intent idempotency.
 await run(`update pulse_jobs set status='FAILED',report_json='{"failedEvidence":true}',error_message='Original failure',technical_run_id='${id(88)}' where id='${first.job.id}'`);
 const parentBefore=(await one('select to_jsonb(j) row from pulse_jobs j where id=$1',[first.job.id])).row;
 assert.equal((await queue(1)).job.status,'FAILED','Automatic submission never retries failure');
 await run(`select record_pulse_worker_heartbeat('${id(70)}',false,false)`);assert.equal((await queue(1,id(1),first.job.id)).state,'unavailable');
 assert.equal(Number((await one('select count(*) n from pulse_jobs where submission_id=$1',[id(11)])).n),1);
 await run(`select record_pulse_worker_heartbeat('${id(70)}',true,true)`);
 const retryPair=await Promise.all([queue(1,id(1),first.job.id),queue(1,id(1),first.job.id)]);const child=retryPair[0].job;
 assert.notEqual(child.id,first.job.id);assert.equal(child.retry_of,first.job.id);assert.equal(retryPair[1].job.id,child.id);assert.equal(child.report_json,null);assert.equal(child.technical_run_id,null);
 assert.deepEqual((await one('select to_jsonb(j) row from pulse_jobs j where id=$1',[first.job.id])).row,parentBefore,'Failed parent/report unchanged');
 assert.equal((await queue(1)).job.id,child.id,'Automatic request reuses active retry');await db.query('update pulse_jobs set status=$1 where id=$2',['TESTING',child.id]);assert.equal((await queue(1)).job.id,child.id,'Running equivalent is reused');
 await assert.rejects(run(`insert into pulse_jobs(submission_id,developer_id,build_url,input_key)values('${id(11)}','${id(1)}','https://example.test/build1.zip','${child.input_key}')`),/unique/);
 await run(`insert into pulse_jobs(id,submission_id,developer_id,build_url,input_key,status)values('${id(777)}','${id(11)}','${id(1)}','https://example.test/build1.zip','${child.input_key}','FAILED')`);
 assert.equal((await queue(1,id(1),id(777))).job.id,child.id,'Different failed target coalesces into active equivalent');
 await run(`update pulse_jobs set status='FAILED',report_json='{"secondFailure":true}' where id='${child.id}'`);const childBefore=(await one('select to_jsonb(j) row from pulse_jobs j where id=$1',[child.id])).row;
 assert.equal((await queue(1,id(1),first.job.id)).job.id,child.id,'Lost response replay returns same child even after it fails');
 assert.equal((await queue(1,id(1),id(777))).job.id,child.id,'Coalesced lost response replays the same child after failure');assert.equal(Number((await one('select count(*) n from pulse_jobs where submission_id=$1',[id(11)])).n),3);
 const later=await queue(1,id(1),child.id);assert.equal(later.state,'queued');assert.equal(later.job.retry_of,child.id);assert.equal((await queue(1,id(1),id(777))).job.id,child.id,'Coalesced retry never silently advances to a later attempt');assert.notEqual(later.job.id,child.id);
 assert.deepEqual((await one('select to_jsonb(j) row from pulse_jobs j where id=$1',[child.id])).row,childBefore);
 await assert.rejects(queue(2,id(1),child.id),/owned failed/);await assert.rejects(queue(1,id(2),child.id),/access denied/);await assert.rejects(queue(1,id(1),later.job.id),/owned failed/);
 await run(`update pulse_jobs set status='COMPLETE' where id='${later.job.id}'`);assert.equal((await queue(1)).job.id,later.job.id,'Successful result reused');
 assert.equal((await queue(1,id(1),child.id)).job.id,later.job.id,'Repeated later retry returns its same successful child');
 await run(`update game_submissions set game_link='https://example.test/new-version.zip' where id='${id(11)}'`);assert.equal((await queue(1,id(1),first.job.id)).state,'input_changed','Cannot retry old input as current build');
 assert.deepEqual((await one('select to_jsonb(j) row from pulse_jobs j where id=$1',[first.job.id])).row,parentBefore);
 console.log('PASS PULSE SQL: explicit retry chains, automatic failure reuse, lost/coalesced-response replay, concurrent retry dedup/active uniqueness, preserved parent reports, fresh/busy/stale/missing/return availability, equivalent input reuse, unsupported/foreign rejection, service-only heartbeat/enqueue/claim permissions, public status privacy, saved submissions/history/XP preserved. Isolated PostgreSQL only.');
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const model={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/submission-completeness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(model);
const db=new PGlite();const id=n=>`c1000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const run=s=>db.exec(s);const one=async(s,args=[])=>(await db.query(s,args)).rows[0];
const valid={title:'Game',developer_name:'Studio',genre:'Action',description:'A game to test',game_link:'',ai_type:'No AI disclosed',release_status:'Not announced'};
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

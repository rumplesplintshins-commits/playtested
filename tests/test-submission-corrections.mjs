import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const model={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/submission-completeness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(model);
const db=new PGlite();const id=n=>`c1000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const run=s=>db.exec(s);const one=async(s,args=[])=>(await db.query(s,args)).rows[0];
const valid={title:'Game',developer_name:'Studio',genre:'Action',description:'A game to test',game_link:'',ai_type:'No AI disclosed',release_status:'Not announced'};
async function as(n){await run(`reset role;set test.uid='${id(n)}'`);}
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
 // Reduced fixture omits the source project's existing owner-scoped submission grants.
 await run(`grant usage on schema public,auth to authenticated;grant select on profiles to authenticated;grant select,insert,update on game_submissions to authenticated;alter table game_submissions enable row level security;create policy fixture_source_submission_insert on game_submissions for insert to authenticated with check(developer_id=auth.uid() and status='Pending Review');create policy fixture_submission_owner_read on game_submissions for select to authenticated using(developer_id=auth.uid());create policy fixture_adversarial_update on game_submissions for update to authenticated using(developer_id=auth.uid()) with check(developer_id=auth.uid())`);
 assert.deepEqual((await db.query('select id,status,review_reason from game_submissions order by id')).rows,original,'Migration does not route existing records');
 const cases=[valid,{...valid,game_launched:false,performance_checked:false,evidence_checked:false,testing_notes:'',public_summary:''},{...valid,title:' \n\t '},{...valid,ai_type:'AI-assisted'},{...valid,ai_type:'AI-generated',ai_explanation:'Uses generated art',evidence_link:'https://example.test/evidence'},{...valid,evidence_link:'javascript:alert(1)'},{...valid,game_link:' https://example.test/build '},{...valid,game_link:'https://bad host'},{...valid,game_link:'https://exam\u00a0ple.test'},{...valid,steam_url:'https://example.test'},{...valid,steam_url:'https://store.steampowered.com/app/123?snr=1'},{...valid,release_status:'Released'},{...valid,ai_type:'Unknown'},{...valid,ai_type:' AI-assisted '},{...valid,title:'\u00a0\ufeff\u2009'},{...valid,game_link:'https://example.test:99999/build'},{...valid,release_status:'Released',release_date:'2999-01-01'},{...valid,release_status:'Upcoming',release_date:'2000-01-01'}];
 for(const record of cases){const sql=(await one('select submission_completeness($1::jsonb) result',[JSON.stringify(record)])).result;assert.deepEqual(sql.issues,model.submissionIssues(record));assert.equal(sql.message,model.completenessMessage(sql.issues));}
 await as(1);await run('set role authenticated');
 const incomplete=await insert(20,{ai_type:'AI-assisted'});assert.equal(incomplete.status,'Needs More Information');assert.deepEqual(incomplete.completeness_issues.map(issue=>issue.field),['ai_explanation','evidence_link']);
 const complete=await insert(21,{});assert.equal(complete.status,'Pending Review','No-AI does not require proof or optional build link');
 await assert.rejects(run(`update game_submissions set status='Approved' where id='${id(20)}'`),/authorised submission correction|Please complete these details/);
 await as(1);
 await run(`insert into game_developer_links(developer_id,submission_id,relationship) values('${id(1)}','${id(20)}','Original submitter');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(80)}','${id(1)}','${id(20)}','Existing campaign','https://example.test','Play the game','draft','both');insert into community_game_tests(id,playtest_id,tester_id,status) values('${id(90)}','${id(80)}','${id(2)}','submitted')`);
 const relationships=(await one(`select jsonb_build_object('links',(select jsonb_agg(to_jsonb(l)) from game_developer_links l),'campaigns',(select jsonb_agg(to_jsonb(c)) from community_playtests c),'feedback',(select jsonb_agg(to_jsonb(t)) from community_game_tests t)) data`)).data;
 const rawBefore=(await one(`select count(*) n from submission_review_events where submission_id='${id(20)}'`)).n;
 await run(`select get_my_submission_correction('${id(20)}');select get_my_submission_correction('${id(20)}')`);
 assert.equal((await one(`select count(*) n from submission_review_events where submission_id='${id(20)}'`)).n,rawBefore,'Views do not append messages/events');
 let result=await save(20,{ai_explanation:'Generated background art'},0,false);assert.equal(result.submission.status,'Needs More Information');assert.equal(result.submission.completeness_issues.length,1);
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

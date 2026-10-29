import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const id=n=>`f3100000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const run=s=>db.exec(s);
const one=async s=>(await db.query(s)).rows[0];
const insert=(campaign,game,owner,status='open',audience='both')=>`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(campaign)}','${id(owner)}','${id(game)}','Limit fixture','https://example.test','Test movement','${status}','${audience}')`;
if(process.argv.includes('--plans')){try{await planChecks();}catch(e){console.error(e.message,e.where||'',e.position?e.query?.slice(Math.max(0,Number(e.position)-120),Number(e.position)+100):'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
try{
 await run(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 const files=(await readdir('supabase/migrations')).sort();
 for(const f of files.filter(f=>!f.includes('0007_')&&f<'202610280012_'))await run(await readFile(`supabase/migrations/${f}`,'utf8'));
 for(const n of [1,2])await run(`insert into profiles(id,roles) values('${id(n)}',array['developer','tester'])`);
 for(let n=10;n<15;n++)await run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${id(n)}','${id(n===14?2:1)}','Game','Dev','Action','Fixture','https://example.test','Unknown','Approved');insert into game_developer_links(developer_id,submission_id,relationship) values('${id(n===14?2:1)}','${id(n)}','Original submitter')`);
 // Two historical launches under the former per-game rule must survive unchanged.
 await run(insert(20,10,1));await run(insert(21,11,1));
 const before=await one('select jsonb_agg(to_jsonb(c) order by id) rows from community_playtests c');
 await run(await readFile('supabase/migrations/202610280007_developer_launch_allowance.sql','utf8'));
 assert.deepEqual(await one('select jsonb_agg(to_jsonb(c) order by id) rows from community_playtests c'),before);
 await assert.rejects(run(insert(22,12,1)),/across all your games/);
 await run(insert(23,12,1,'draft'));
 await assert.rejects(run(`update community_playtests set status='open' where id='${id(23)}'`),/across all your games/);
 await run(`update community_playtests set status='paused' where id='${id(20)}';update community_playtests set status='open' where id='${id(20)}'`);
 await run(`update community_playtests set status='closed' where id='${id(21)}'`);
 await assert.rejects(run(`update community_playtests set status='open' where id='${id(23)}'`),/across all your games/);
 await run(insert(24,13,1,'open','own_community'));
 await assert.rejects(run(`update community_playtests set audience='both' where id='${id(24)}'`),/across all your games/);
 await run(insert(25,14,2));
 await run(`set test.uid='${id(1)}'`);
 const eligibility=await one(`select * from get_playtest_eligibility(null,null,'${id(12)}')`);
 assert.equal(eligibility.tester_hub_eligible,false);assert.equal(eligibility.tester_hub_rounds_last_30_days,2);
 const at=`(select max(tester_hub_started_at) from community_playtests where developer_id='${id(1)}')`;
 assert.equal((await one(`select rounds_used n from _playtested_developer_launch_window_at('${id(1)}',${at}+interval '720 hours'-interval '1 microsecond')`)).n>=1,true);
 assert.equal((await one(`select rounds_used n from _playtested_developer_launch_window_at('${id(1)}',${at}+interval '720 hours')`)).n,0);
 assert.equal((await one(`select has_function_privilege('authenticated','public._playtested_developer_launch_window_at(uuid,timestamptz)','execute') allowed`)).allowed,false);
 console.log('PASS: developer-wide block across games, draft publication, closed history, community exemption/conversion, resume, separate developer, exact 720-hour boundary, eligibility, private helper and unchanged historical data.');
}finally{await db.close();}

async function planChecks(){
 await run(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of(await readdir('supabase/migrations')).filter(f=>f<'202610280014_').sort())await run(await readFile('supabase/migrations/'+f,'utf8'));
 for(const n of[1,2,3,4,5,20,99])await run(`insert into profiles(id,roles,role,preferred_genres,tester_xp)values('${id(n)}',array['developer','tester'],'${n===99?'admin':'user'}',array['Action'],${n===20?500:0})`);
 for(let n=400;n<405;n++)await run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status)values('${id(n)}','${id(20)}','Rank history','Dev','Action','Fixture','https://example.test','Unknown','Approved');insert into community_game_tests(submission_id,tester_id,status,review_outcome,xp_awarded,base_xp_amount,quality_reviewed)values('${id(n)}','${id(20)}','reviewed','accepted',true,100,true)`);
 const source=async(n,owner)=>run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status)values('${id(n+1000)}','${id(owner)}','Game','Dev','Action','Fixture','https://example.test','Unknown','Approved');insert into game_developer_links(developer_id,submission_id,relationship)values('${id(owner)}','${id(n+1000)}','Developer')`);
 for(let n=10;n<=50;n++)await source(n,n<20?1:n<30?2:n<40?3:4);
 const now=(await one('select clock_timestamp() t')).t;const at=`'${new Date(now).toISOString()}'::timestamptz`;
 await run('alter table community_playtests disable trigger playtested_guard_launch');
 for(const [n,owner,hours]of[[10,1,480],[20,2,49],...Array.from({length:16},(_,i)=>[30+i,3,1+i*30])])await run(`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,published_at,tester_hub_started_at,minimum_rank,testing_genre,genre_restricted)values('${id(n)}','${id(owner)}','${id(n+1000)}','Historical','https://example.test','Test controls','closed','both',${at}-interval '${hours} hours',${at}-interval '${hours} hours',0,'Action',false)`);
 await run(`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,published_at,tester_hub_started_at,minimum_rank,testing_genre,genre_restricted)values('${id(49)}','${id(4)}','${id(1049)}','Grandfathered','https://example.test','Test controls','open','both',${at}-interval '100 hours',${at}-interval '100 hours',1,'Action',true)`);
 await run('alter table community_playtests enable trigger playtested_guard_launch');const before=(await one('select jsonb_agg(to_jsonb(c) order by id) rows from community_playtests c')).rows;
 await run(await readFile('supabase/migrations/202610280014_developer_entitlements.sql','utf8'));assert.deepEqual((await one('select jsonb_agg(to_jsonb(c) order by id) rows from community_playtests c')).rows,before,'No history, capacity or targeting rewrite');
 const assign=async(owner,plan)=>{await run(`set test.uid='${id(99)}'`);return one(`select admin_assign_developer_plan('${id(owner)}','${plan}','Manual test grant') result`)};
 const window=(owner,time=at)=>one(`select * from _playtested_developer_launch_window_at('${id(owner)}',${time})`);
 await run(`set test.uid='${id(1)}';set request.jwt.claims='{"user_metadata":{"plan":"pro"},"app_metadata":{"plan":"pro"}}';update profiles set tester_xp=999999,developer_xp=999999 where id='${id(1)}'`);assert.equal((await one('select get_my_developer_plan() p')).p.plan,'free');await assert.rejects(run(`select admin_assign_developer_plan('${id(1)}','pro','Self upgrade')`),/Admin/);
 assert.equal((await one("select has_table_privilege('authenticated','developer_entitlements','update') ok")).ok,false);assert.equal((await one("select has_table_privilege('authenticated','developer_plan_policy','insert') ok")).ok,false);assert.equal((await one("select has_function_privilege('authenticated','_developer_plan(uuid)','execute') ok")).ok,false);
 const free=await window(1);assert.equal(free.rounds_used,1);assert.equal(new Date(free.next_at)-new Date(now),240*3600000);assert.equal((await window(1,at+"+interval '240 hours'")).next_at,null);
 await assign(2,'pro');assert.equal((await window(2)).next_at,null);const latest=`${at}-interval '49 hours'`;assert((await window(2,latest+"+interval '48 hours'-interval '1 microsecond'")).cooldown_until);assert.equal((await window(2,latest+"+interval '48 hours'")).next_at,null);
 await assign(3,'pro');const excess=await window(3);assert.equal(excess.rounds_used,16);assert.equal(new Date(excess.quota_until)-new Date(now),299*3600000);assert.equal(new Date(excess.cooldown_until)-new Date(now),47*3600000);assert.equal(new Date(excess.next_at)-new Date(now),299*3600000);assert.equal((await window(3,at+"+interval '299 hours'-interval '1 microsecond'")).rounds_used,15);assert.equal((await window(3,at+"+interval '299 hours'")).next_at,null);
 // Unpublished Free drafts cannot request Pro targeting, including direct inserts.
 await run(`set test.uid='${id(1)}'`); // Source existence is checked by the normal architecture; use explicit fixtures below.
 const draft=(n,game,owner=1,rank=0,restricted=false)=>`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,minimum_rank,testing_genre,genre_restricted)values('${id(n)}','${id(owner)}','${id(game)}','Draft','https://example.test','Test controls','draft','both',${rank},'Action',${restricted})`;
 await assert.rejects(run(draft(60,1011,1,1)),/require Pro/);await assert.rejects(run(draft(60,1011,1,0,true)),/needs Pro/);await run(draft(60,1011));await assert.rejects(run(`update community_playtests set status='open' where id='${id(60)}'`),/launch unavailable/);
 await assign(1,'pro');await run(`update community_playtests set status='open',minimum_rank=1,genre_restricted=true where id='${id(60)}'`);await assert.rejects(run(draft(61,1012)+`;update community_playtests set status='open' where id='${id(61)}'`),/launch unavailable/);
 await run(draft(61,1012,1,1,true));await assert.rejects(run(draft(69,1011)),/unique|active/);
 await assign(1,'free');assert.equal((await window(1)).rounds_used,2,'Downgrade never resets launch history');await assert.rejects(run(`update community_playtests set instructions='Unpublished Pro draft edit' where id='${id(61)}'`),/require Pro|needs Pro/);await run(`update community_playtests set minimum_rank=0,genre_restricted=false where id='${id(61)}'`);await run(`update community_playtests set instructions='Normal edit after downgrade',status='paused' where id='${id(60)}';update community_playtests set status='open' where id='${id(60)}'`);await assert.rejects(run(`update community_playtests set minimum_rank=2 where id='${id(60)}'`),/require Pro|No registered/);await run(`update community_playtests set minimum_rank=0,genre_restricted=false where id='${id(60)}'`);await assert.rejects(run(`update community_playtests set genre_restricted=true where id='${id(60)}'`),/needs Pro/);await run(`update community_playtests set status='closed' where id='${id(60)}'`);
 // Published Free grandfathering survives without an entitlement and cannot strengthen.
 await run(`update community_playtests set instructions='Grandfather normal edit' where id='${id(49)}'`);await assert.rejects(run(`update community_playtests set testing_genre='Strategy' where id='${id(49)}'`),/No registered|needs Pro/);
 await run(draft(62,1048,4));await run(`update community_playtests set audience='own_community',status='open' where id='${id(62)}'`);const usage=(await window(4)).rounds_used;await assert.rejects(run(`update community_playtests set audience='both' where id='${id(62)}'`),/launch unavailable/);assert.equal((await window(4)).rounds_used,usage);
 await assign(4,'pro');await run(`update community_playtests set audience='both' where id='${id(62)}'`);const published=(await one(`select tester_hub_started_at t from community_playtests where id='${id(62)}'`)).t;await run(`update community_playtests set audience='own_community' where id='${id(62)}';update community_playtests set audience='both',status='paused' where id='${id(62)}';update community_playtests set status='open' where id='${id(62)}';update community_playtests set status='closed' where id='${id(62)}'`);assert.equal((await window(4)).rounds_used,2,'Mixed audience first publication counts once and closing does not erase it');assert.equal(new Date((await one(`select tester_hub_started_at t from community_playtests where id='${id(62)}'`)).t).getTime(),new Date(published).getTime());await assign(4,'free');
 await assert.rejects(run(`update community_playtests set tester_hub_started_at=null where id='${id(49)}'`),/history/);assert.equal((await one(`select target_testers n from community_playtests where id='${id(49)}'`)).n,4);
 await run(`set test.uid='${id(20)}'`);const claim=(await one(`select claim_community_game_test('${id(49)}') id`)).id;await run(`select start_community_game_test('${claim}')`);assert.equal((await one(`select status s from community_game_tests where id='${claim}'`)).s,'in_progress');
 await run(`set test.uid='${id(4)}'`);assert(Array.isArray((await one(`select get_developer_quality_reports('${id(49)}') reports`)).reports));assert((await one('select count(*) n from developer_entitlement_events')).n>=4);
 console.log('PASS isolated plans: Free default/private entitlements/admin audit, exact Free/Pro time boundaries, 16-launch excess quota deadline, shared account history, upgrade/downgrade, targeting enforcement/grandfathering, drafts/community conversion/resume, immutable publication, unchanged capacity/claims/feedback permissions.');
}

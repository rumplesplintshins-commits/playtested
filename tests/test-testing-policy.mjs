import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const sql = async s => db.exec(s);
const one = async s => (await db.query(s)).rows[0];
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const as = async n => sql(`set test.uid='${id(n)}'`);
const fail = async (s,pattern) => assert.rejects(sql(s),pattern);
if(process.argv.includes('--recruitment-only')){try{await recruitmentChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--graded-quality')){try{await gradedQualityChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
if(process.argv.includes('--plan-concurrency')){await db.close();try{await reservationConcurrency(false,true);}catch(e){console.error(e.message);process.exitCode=1;}process.exit(process.exitCode||0);}
if(process.argv.includes('--quality-concurrency')){await db.close();try{await reservationConcurrency(true);}catch(e){console.error(e.message);process.exitCode=1;}process.exit(process.exitCode||0);}
if(process.argv.includes('--reservations-concurrency')){await db.close();try{await reservationConcurrency();}catch(e){console.error(e.message);process.exitCode=1;}process.exit(process.exitCode||0);}
if(process.argv.includes('--reservations-only')){try{await reservationChecks();}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}process.exit(process.exitCode||0);}
try {
 await sql(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 // Pre-migration excess participation must survive; this is a local fixture only.
 for(let n=91;n<=94;n++) await sql(`insert into profiles(id,roles,tester_xp) values('${id(n)}',array['tester'],200)`);
 await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type) values('${id(89)}','Legacy game','Approved','Action','${id(94)}','Dev','Description','https://example.test','Unknown');
 insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(90)}','${id(94)}','${id(89)}','Legacy excess','https://example.test/build','Test movement','open','both');
 insert into community_game_tests(playtest_id,tester_id,status) select '${id(90)}',id,'claimed' from profiles where id in ('${id(91)}','${id(92)}','${id(93)}');`);
 await sql(`insert into profiles(id,roles) values('${id(95)}',array['tester']);
 insert into community_game_tests(submission_id,tester_id,status) values('${id(89)}','${id(95)}','claimed')`);
 for(const f of (await readdir('supabase/migrations')).filter(f=>f<'202610280012_').sort()) {
   await sql(await readFile(`supabase/migrations/${f}`,'utf8')); console.log(`Applied locally: ${f}`);
 }
 assert.equal((await one(`select tester_xp from profiles where id='${id(91)}'`)).tester_xp,200,'legacy XP unchanged');
 assert.equal((await one(`select count(*) n from community_game_tests where playtest_id='${id(90)}'`)).n,3,'excess claims preserved');
 await as(95);
 assert.equal((await db.query('select * from get_available_community_test_games()')).rows.some(r=>r.submission_id===id(89)),true,'existing legacy claim remains visible beside its campaign');
 const legacyReport=(await one(`select id from community_game_tests where tester_id='${id(95)}'`)).id;
 await sql(`select start_community_game_test('${legacyReport}');select submit_community_game_test('${legacyReport}',8,8,'No bugs','',0,8,'probably','probably','Movement','None','Tutorial','{}')`);
 await as(94);await fail(`select claim_community_game_test('${id(90)}')`,/full/);
 await as(91);const oldReport=(await one(`select id from community_game_tests where tester_id='${id(91)}'`)).id;
 await sql(`select submit_community_game_test('${oldReport}',8,8,'No bugs','',0,8,'probably','probably','Movement','None','Tutorial','{}')`);
 const launch=`(select tester_hub_started_at from community_playtests where id='${id(90)}')`;
 assert.equal((await one(`select rounds_used n from _playtested_launch_window_at(null,null,'${id(89)}',${launch}+interval '720 hours'-interval '1 microsecond')`)).n,1,'just before boundary');
 assert.equal((await one(`select rounds_used n from _playtested_launch_window_at(null,null,'${id(89)}',${launch}+interval '720 hours')`)).n,0,'exact boundary');
 for(let n=1;n<=6;n++) await sql(`insert into auth.users values('${id(n)}');insert into profiles(id,roles,role) values('${id(n)}',array['tester','developer'],'${n===6?'admin':'user'}');`);
 await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type) values('${id(10)}','Test game','Approved','Action','${id(5)}','Dev','Description','https://example.test','AI use unknown')`);
 await sql(`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(20)}','${id(5)}','${id(10)}','Campaign','https://example.test/build','Test the movement','open','both')`);
 await as(1);await sql(`select claim_community_game_test('${id(20)}')`);
 await fail(`select claim_community_game_test('${id(20)}')`,/already/);
 await as(2);await sql(`select claim_community_game_test('${id(20)}')`);
 await as(3);await fail(`select claim_community_game_test('${id(20)}')`,/full/);
 await fail(`select claim_community_game_test('${id(10)}')`,/published Tester Hub campaign/);
 await as(1);await sql(`select release_community_game_test('${id(20)}')`);
 assert.equal((await one(`select * from campaign_places('${id(20)}')`)).available,1);
 await as(3);await sql(`select claim_community_game_test('${id(20)}')`);
 const report=(await one(`select id from community_game_tests where tester_id='${id(3)}'`)).id;
 await sql(`select submit_community_game_test('${report}',1,2,'None found','',0,1,'definitely_not','definitely_not','Movement','None','Clear tutorial','{}')`);
 await fail(`select release_community_game_test('${id(20)}')`,/No active/);
 await as(6);
 const rubric=`'{"specific":true,"examples":true,"useful":true,"relevant":true,"original":true}'::jsonb`;
 const review=outcome=>`select review_test_quality('${report}','${outcome}','Specific, relevant build observations',${rubric})`;
 await sql(review('accepted'));await sql(review('accepted'));
 assert.equal((await one(`select tester_xp from profiles where id='${id(3)}'`)).tester_xp,100);
 await sql(`select review_test_quality('${oldReport}','accepted','Useful positive observations',${rubric})`);
 assert.equal((await one(`select tester_xp from profiles where id='${id(91)}'`)).tester_xp,300,'positive feedback earns the same 100 XP as negative');
 await sql(review('rejected'));await sql(review('rejected'));
 assert.equal((await one(`select tester_xp from profiles where id='${id(3)}'`)).tester_xp,0);
 assert.equal((await one(`select * from campaign_places('${id(20)}')`)).available,0);
 await as(5);await fail(`select update_community_playtest('${id(20)}','https://different.test','other','Test the movement and tutorial',array['Movement'],'both',2,null,null,'open')`,/locked/);
 await as(6);
 assert.equal((await one(`select (get_campaign_testing_details('${id(20)}')->>'build_locked')::boolean locked`)).locked,true,'build lock survives quality reversal');
 await as(3);await sql(`select request_test_reconsideration('${report}','Please reconsider these examples')`);
 await fail(`select request_test_reconsideration('${report}','Retry')`,/already pending/);
 await as(6);await sql(review('rejected'));
 assert.equal((await one(`select tester_xp from profiles where id='${id(3)}'`)).tester_xp,0,'upholding reconsideration does not alter XP');
 await as(3);await sql(`select request_test_reconsideration('${report}','New evidence for the next decision')`);
 await as(6);await sql(review('accepted'));
 await as(5);await sql(`select signal_test_feedback('${report}','helpful','Useful concrete observations');select signal_test_feedback('${report}','concern','Please check relevance of one observation')`);
 assert.equal((await one(`select tester_xp from profiles where id='${id(3)}'`)).tester_xp,100,'developer signals do not change XP');
 assert.equal((await one(`select * from campaign_places('${id(20)}')`)).available,0,'developer concern does not restore capacity');
 await as(6);
 // Simulate inconsistent legacy balances only inside this disposable database.
 // A failed reversal must not partially change the report or append an event.
 const eventsBeforeFailure=(await one(`select count(*) n from test_review_events where test_id='${report}'`)).n;
 await sql(`update profiles set tester_xp=0 where id='${id(3)}'`);
 await fail(review('rejected'),/check constraint/);
 assert.equal((await one(`select xp_awarded from community_game_tests where id='${report}'`)).xp_awarded,true,'failed reversal preserves the report award');
 assert.equal((await one(`select count(*) n from test_review_events where test_id='${report}'`)).n,eventsBeforeFailure,'failed reversal appends no audit event');
 await sql(`update profiles set tester_xp=100 where id='${id(3)}'`);
 await sql(`select replace_unusable_test('${report}','Documented unusable evidence exception')`);
 assert.equal((await one(`select * from campaign_places('${id(20)}')`)).available,1);
 await as(2);await sql(`update community_playtests set minimum_rank=3,genre_restricted=true,testing_genre='Action' where id='${id(20)}'`);
 assert.equal((await db.query('select * from get_available_community_test_games()')).rows.some(r=>r.submission_id===id(20)),true,'existing active claim stays visible');
 const existing=(await one(`select id from community_game_tests where tester_id='${id(2)}'`)).id;
 await sql(`select start_community_game_test('${existing}');select submit_community_game_test('${existing}',8,8,'No bugs','',0,8,'probably','probably','Movement','None','Tutorial','{}')`);
 await as(4);assert.equal((await db.query('select * from get_available_community_test_games()')).rows.some(r=>r.submission_id===id(20)),false,'rank restricted campaign absent');
 await fail(`select claim_community_game_test('${id(20)}')`,/rank or required genre/);
 await sql(`update community_playtests set minimum_rank=0 where id='${id(20)}'`);
 await fail(`select claim_community_game_test('${id(20)}')`,/rank or required genre/);
 await sql(`select update_my_testing_genres(array[' Action '])`);
 await sql(`select claim_community_game_test('${id(20)}')`);
 const firstLaunch=(await one(`select tester_hub_started_at at from community_playtests where id='${id(20)}'`)).at.toISOString();
 await sql(`update community_playtests set status='paused' where id='${id(20)}';
 update community_playtests set status='open',audience='own_community' where id='${id(20)}';
 update community_playtests set audience='both' where id='${id(20)}'`);
 assert.equal((await one(`select tester_hub_started_at at from community_playtests where id='${id(20)}'`)).at.toISOString(),firstLaunch,'resume and audience changes preserve launch history');
 await sql(`update community_playtests set status='closed' where id='${id(20)}'`);
 await fail(`insert into community_playtests(developer_id,submission_id,title,access_link,instructions,status) values('${id(5)}','${id(10)}','New','https://example.test','Instructions','open')`,/One Tester Hub launch/);
 await sql(`insert into community_playtests(developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(5)}','${id(10)}','Community','https://example.test','Instructions','open','own_community')`);
 await sql(`insert into community_playtest_participants(playtest_id,tester_id) select id,'${id(1)}' from community_playtests where submission_id='${id(10)}' and status='open'`);
 assert.equal((await one(`select testing+submitted used from campaign_places((select id from community_playtests where submission_id='${id(10)}' and status='open'))`)).used,0,'external community participation uses no Hub place');
 await sql(`update community_playtests set status='closed' where submission_id='${id(10)}' and status='open';
 insert into community_playtests(developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(5)}','${id(10)}','Draft','https://example.test','Instructions','draft','both')`);
 assert.equal((await one(`select rounds_used n from _playtested_launch_window(null,null,'${id(10)}')`)).n,1,'draft and community publication do not consume allowance');
 await fail(`update community_playtests set status='open' where submission_id='${id(10)}' and status='draft'`,/One Tester Hub launch/);
 // Legacy rank mapping uses awarded tests, without fabricating rubric scores.
 await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type)
 select md5('rank-source-'||n)::uuid,'Rank fixture','Approved','Action','${id(5)}','Dev','Description','https://example.test','Unknown' from generate_series(1,60) n;
 insert into community_game_tests(submission_id,tester_id,status,review_outcome,xp_awarded)
 select md5('rank-source-'||n)::uuid,'${id(1)}','reviewed','accepted',true from generate_series(1,60) n`);
 for(const [xp,rank] of [[0,0],[499,0],[500,1],[1999,1],[2000,2],[4999,2],[5000,3]]) {
   await sql(`update profiles set tester_xp=${xp} where id='${id(1)}'`);
   assert.equal((await one(`select tester_rank('${id(1)}') rank`)).rank,rank,`XP boundary ${xp}`);
 }
 await sql(`update profiles set tester_xp=500 where id='${id(4)}';
 insert into community_game_tests(submission_id,tester_id,status,review_outcome,xp_awarded)
 select md5('rank-source-'||n)::uuid,'${id(4)}','reviewed','accepted',true from generate_series(1,4) n`);
 assert.equal((await one(`select tester_rank('${id(4)}') rank`)).rank,0,'four accepted tests do not qualify for Silver');
 await sql(`insert into community_game_tests(submission_id,tester_id,status,review_outcome,xp_awarded) values(md5('rank-source-5')::uuid,'${id(4)}','reviewed','accepted',true)`);
 assert.equal((await one(`select tester_rank('${id(4)}') rank`)).rank,1,'five accepted tests and 500 XP qualify');
 await sql(`update community_game_tests set quality_reviewed=true where tester_id='${id(1)}';
 update community_game_tests set review_outcome='rejected',xp_awarded=false where id in (select id from community_game_tests where tester_id='${id(1)}' order by id limit 13)`);
 assert.equal((await one(`select tester_rank('${id(1)}') rank`)).rank,0,'poor assessed quality history blocks promotion');
 await sql(`update community_game_tests set review_outcome='accepted',xp_awarded=true where id in (select id from community_game_tests where tester_id='${id(1)}' and review_outcome='rejected' order by id limit 1)`);
 assert.equal((await one(`select tester_rank('${id(1)}') rank`)).rank,2,'80% boundary passes history but 48 accepted is below Platinum');
 await as(5); await fail(`select replace_unusable_test('${report}','developer request')`,/Moderator/);
 await as(6);assert.ok((await one('select get_quality_review_queue() queue')).queue.length>0);
 assert.equal((await one(`select has_function_privilege('authenticated','public.campaign_places(uuid)','EXECUTE') allowed`)).allowed,false);
 assert.equal((await one(`select has_table_privilege('authenticated','public.testing_policy','UPDATE') allowed`)).allowed,false);
 await as(4);await sql('set role authenticated');
 assert.equal((await one('select get_my_testing_progress() p')).p.genres[0],'Action');
 assert.equal((await db.query('select * from profiles')).rows.length,1,'profile RLS limits reads to self');
 await fail(`select campaign_places('${id(20)}')`,/permission denied/);
 await fail('update profiles set tester_xp=9000',/permission denied/);
 await fail('select get_quality_review_queue()',/Admin/);
 await sql('reset role');
 await as(6);
 await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type) values('${id(80)}','RPC fixture','Approved','Action','${id(6)}','Dev','Description','https://example.test','Unknown');
 insert into game_developer_links(developer_id,submission_id,relationship) values('${id(6)}','${id(80)}','developer')`);
 const created=(await one(`select create_community_playtest(null,null,'${id(80)}','https://example.test/build','other','Test movement and tutorial',array['Movement'],'both',99,30,'Build 1',false,2,'Action',true) id`)).id;
 const createdSettings=await one(`select target_testers,minimum_rank,genre_restricted from community_playtests where id='${created}'`);
 assert.deepEqual(createdSettings,{target_testers:2,minimum_rank:2,genre_restricted:true},'create RPC persists eligibility; server ignores client target size');
 await sql(`select update_community_playtest('${created}','https://example.test/build','other','Test movement and tutorial',array['Movement'],'both',99,30,'Build 1','open',1,'Action',true)`);
 assert.equal((await one(`select minimum_rank rank from community_playtests where id='${created}'`)).rank,1,'update RPC persists minimum rank');
 await fail(`select create_community_playtest(null,null,'${id(80)}','https://example.test/build','other','Test movement and tutorial',array['Movement'],'both',2,30,'Build 2',false)`,/active playtest/);
 await sql(`update community_game_tests set review_outcome='accepted',xp_awarded=true where tester_id='${id(1)}'`);
 await as(1);await sql(`select update_my_testing_genres(array[]::text[])`);
 assert.equal((await one(`select campaign_eligible('${created}','${id(1)}') ok`)).ok,false,'Platinum does not override missing genre preferences');
 await sql(`select update_my_testing_genres(array['Action'])`);
 for(let minimum=0;minimum<4;minimum++){
   await sql(`update community_playtests set minimum_rank=${minimum} where id='${created}'`);
   assert.equal((await db.query('select * from get_available_community_test_games()')).rows.some(r=>r.submission_id===created),true,'Platinum browses every minimum rank');
   assert.equal((await one(`select campaign_eligible('${created}','${id(4)}') ok`)).ok,minimum<=1,'Silver qualifies only for Bronze/Silver');
 }
 // PGlite queues these transactions: retry simulations, NOT independent connections.
 for(let n=71;n<=74;n++) await sql(`insert into profiles(id,roles) values('${id(n)}',array['tester'])`);
 for(let n=71;n<=73;n++) await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type) values('${id(n)}','Queue fixture','Approved','Action','${id(n)}','Dev','Description','https://example.test','Unknown');
 insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status) values('${id(n+100)}','${id(n)}','${id(n)}','Queue fixture','https://example.test','Instructions','open')`);
 const queuedClaim=(user,campaign)=>db.transaction(async tx=>{
   await tx.exec(`set local test.uid='${id(user)}';select claim_community_game_test('${id(campaign)}')`);
 });
 await queuedClaim(71,171);
 const finalPlace=await Promise.allSettled([queuedClaim(72,171),queuedClaim(73,171)]);
 assert.equal(finalPlace.filter(r=>r.status==='fulfilled').length,1,'one of the queued final-place requests succeeds');
 assert.equal((await one(`select * from campaign_places('${id(171)}')`)).available,0);
 const twoTabs=await Promise.allSettled([queuedClaim(74,172),queuedClaim(74,173)]);
 assert.equal(twoTabs.filter(r=>r.status==='fulfilled').length,1,'one of the queued same-tester requests succeeds');
 console.log('PASS: queued retry simulations (single embedded connection; not a multi-connection lock test).');
 console.log('PASS: migration compilation, capacity, release, submission, duplicate review, reversals, reconsideration, moderator replacement, visibility, strict genres, legacy active access, launch allowance, community exemption, rank boundaries and private helper permissions.');
} catch(error) { console.error(error.message, error.detail || "", error.where || ""); process.exitCode=1; } finally { await db.close(); }

async function reservationChecks(){
 await sql(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of(await readdir('supabase/migrations')).filter(f=>f<'202610280012_').sort())await sql(await readFile('supabase/migrations/'+f,'utf8'));
 for(let n=1;n<=20;n++)await sql(`insert into profiles(id,roles,role,preferred_genres) values('${id(n)}',array['tester','developer'],'${n===20?'admin':'user'}',array['Action'])`);
 const campaign=async(n,owner=n)=>{await sql(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status)values('${id(n+100)}','${id(owner)}','Reservation fixture','Dev','Action','Fixture','https://example.test','Unknown','Approved');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience)values('${id(n)}','${id(owner)}','${id(n+100)}','Fixture','https://example.test','Test movement','open','both')`)};
 await campaign(21,1);await as(2);const historical=(await one(`select claim_community_game_test('${id(21)}') id`)).id;
 const preserved=(await one(`select jsonb_agg(to_jsonb(t)) rows from community_game_tests t`)).rows;
 await sql(await readFile('supabase/migrations/202610280012_tester_reservations.sql','utf8'));
 assert.equal((await one(`select target_testers n from community_playtests where id='${id(21)}'`)).n,2);assert.equal((await one(`select reservation_expires_at e from community_game_tests where id='${historical}'`)).e,null);
 assert.equal((await one('select reservations_activated_at a from testing_policy')).a,null);
 assert.equal((await one('select tester_xp n from profiles where id=\''+id(2)+'\'')).n,0);
 await campaign(22,3);assert.equal((await one(`select target_testers n from community_playtests where id='${id(22)}'`)).n,4);
 await sql(`update community_playtests set instructions='Updated instructions' where id='${id(21)}'`);assert.equal((await one(`select target_testers n from community_playtests where id='${id(21)}'`)).n,2);
 const activation=(await one('select activate_testing_reservations() a')).a;const legacy=(await one(`select reservation_started_at s,reservation_expires_at e from community_game_tests where id='${historical}'`));assert.equal(new Date(legacy.e)-new Date(legacy.s),72*3600000);assert.equal(new Date(legacy.s).getTime(),new Date(activation).getTime());assert.equal(new Date((await one('select activate_testing_reservations() a')).a).getTime(),new Date(activation).getTime());
 const claim=async(n,c=22)=>{await as(n);return(await one(`select claim_community_game_test('${id(c)}') id`)).id};
 const submit=async test=>sql(`select submit_community_game_test('${test}',7,7,'No issues','Useful feedback',1,8,'probably','probably','Movement','None','Controls','{}')`);
 const expire=async test=>sql(`alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=clock_timestamp() where id='${test}';alter table community_game_tests enable trigger aa_testing_reservation;`);
 const claims=[];for(const n of[4,5,6,7])claims.push(await claim(n));assert.deepEqual(await one(`select * from campaign_places('${id(22)}')`),{submitted:0,testing:4,available:0});await as(8);await fail(`select claim_community_game_test('${id(22)}')`,/full/);
 await as(4);const deadline=(await one(`select reservation_expires_at e from community_game_tests where id='${claims[0]}'`)).e;await sql(`select start_community_game_test('${claims[0]}')`);assert.equal(new Date((await one(`select reservation_expires_at e from community_game_tests where id='${claims[0]}'`)).e).getTime(),new Date(deadline).getTime());
 for(let i=0;i<3;i++){await as(4+i);await submit(claims[i]);}assert.deepEqual(await one(`select * from campaign_places('${id(22)}')`),{submitted:3,testing:1,available:0});
 await expire(claims[3]);assert.deepEqual(await one(`select * from campaign_places('${id(22)}')`),{submitted:3,testing:0,available:1});await as(7);await fail(`select start_community_game_test('${claims[3]}')`,/expired/);await fail(`select submit_community_game_test('${claims[3]}',7,7,'None','Feedback',1,8,'probably','probably','Movement','None','Controls','{}')`,/expired/);
 await sql(`update community_game_tests set reservation_expires_at=clock_timestamp()-interval '1 day' where id in('${claims[0]}','${claims[1]}','${claims[2]}')`);assert.equal((await one(`select submitted from campaign_places('${id(22)}')`)).submitted,3,'Submitted places never expire');
 const reclaimed=await claim(7);assert.equal(reclaimed,claims[3],'Same ID preserves draft association');await fail(`select claim_community_game_test('${id(22)}')`,/One test|already/);assert.equal((await one(`select reservation_round n from community_game_tests where id='${reclaimed}'`)).n,2);await submit(reclaimed);assert.deepEqual(await one(`select * from campaign_places('${id(22)}')`),{submitted:4,testing:0,available:0});await as(8);await fail(`select claim_community_game_test('${id(22)}')`,/full/);
 await as(20);await sql(`select review_test_quality('${claims[0]}','rejected','Quality decision','{"specific":false,"examples":true,"useful":true,"relevant":true,"original":true}')`);assert.equal((await one(`select available from campaign_places('${id(22)}')`)).available,0);await sql(`select replace_unusable_test('${claims[0]}','Audited unusable report')`);assert.equal((await one(`select available from campaign_places('${id(22)}')`)).available,1);
 await campaign(23,9);const release=await claim(10,23);await as(10);await sql(`select release_community_game_test('${id(23)}')`);assert.equal((await one(`select available from campaign_places('${id(23)}')`)).available,4);
 await sql(`alter table community_game_tests disable trigger legacy_campaign_claim;alter table community_game_tests disable trigger aa_testing_reservation;insert into community_game_tests(id,submission_id,tester_id,status)values('${id(501)}','${id(123)}','${id(14)}','in_progress');alter table community_game_tests enable trigger legacy_campaign_claim;alter table community_game_tests enable trigger aa_testing_reservation;`);await expire(id(501));assert.equal(await claim(14,23),id(501));assert.equal((await one(`select legacy_submission_id origin from community_game_tests where id='${id(501)}'`)).origin,id(123),'Legacy source relationship retained during explicit same-ID reclaim');await as(14);await sql(`select release_community_game_test('${id(23)}')`);
 const old=await claim(11,23);await expire(old);await campaign(24,12);const fresh=await claim(11,24);await as(11);await fail(`select claim_community_game_test('${id(23)}')`,/One test/);await sql(`select release_community_game_test('${id(24)}')`);await sql(`update profiles set preferred_genres='{}' where id='${id(11)}';update community_playtests set genre_restricted=true,testing_genre='Action' where id='${id(23)}'`);await fail(`select claim_community_game_test('${id(23)}')`,/rank/);await sql(`update community_playtests set genre_restricted=false where id='${id(23)}'`);assert.equal(await claim(11,23),old);
 await as(12);await fail(`select start_community_game_test('${old}')`,/not owned/);assert.equal((await one("select has_function_privilege('authenticated','activate_testing_reservations()','execute') ok")).ok,false);assert.equal((await one("select has_function_privilege('authenticated','_start_reserved_test(uuid)','execute') ok")).ok,false);
 // Queued engine requests simulate competing final-place attempts; this is NOT multi-connection locking evidence.
 await as(8);const final=await claim(8,22);await as(13);await fail(`select claim_community_game_test('${id(22)}')`,/full/);
 await as(20);await sql(`select review_test_quality('${claims[1]}','accepted','Useful evidence','{"specific":true,"examples":true,"useful":true,"relevant":true,"original":true}')`);assert.equal((await one(`select tester_xp n from profiles where id='${id(5)}'`)).n,100);await as(3);await fail(`select update_community_playtest('${id(22)}','https://example.test/changed','other','Updated testing instructions.',array['Gameplay'],'both',4,30,'Changed build','open',0,'Action',false)`,/locked|accepted|evidence|build/i);
 assert.equal(preserved.length,1);assert(release&&fresh&&final);
 console.log('PASS isolated reservations: old capacities/claims/XP preserved, explicit idempotent 72h activation, new capacity four, 3 submitted + 1 reserved/full, four submitted/full, release, exact expiry boundary without cleanup, start cannot extend, expired submission blocked, same-ID reclaim, current eligibility, one-active slot, owner/private permissions and moderator replacement. Final-place requests here are queued simulation, not real concurrency.');
}

async function reservationConcurrency(graded=false,plans=false){
 const {spawnSync,spawn}=await import('node:child_process');const docker=process.env.REHEARSAL_DOCKER||'C:/Users/OWNER/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe',name='playtested-reservation-test-'+Date.now(),image='public.ecr.aws/supabase/postgres:17.11.0.006';
 const command=(args,input)=>{const result=spawnSync(docker,args,{input,encoding:'utf8',timeout:40000,maxBuffer:8000000});if(result.status!==0)throw Error(result.stderr||result.error?.message||'Isolated Docker command failed');return result.stdout.trim()};
 const psql=['exec','-i',name,'psql','-h','/tmp','-U','postgres','-d','postgres','-X','-qAt','--set=ON_ERROR_STOP=1'];
 const session=(sqlText,held=false)=>{const child=spawn(docker,psql,{stdio:['pipe','pipe','pipe']});let out='',err='',resolveHeld;const ready=new Promise(resolve=>{resolveHeld=resolve});child.stdout.on('data',chunk=>{out+=chunk;if(out.includes('HELD'))resolveHeld()});child.stderr.on('data',chunk=>{err+=chunk});child.stdin.end(sqlText);const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{resolveHeld();resolve({code,out,err})})});return {ready:held?ready:Promise.resolve(),done};};
 let started=false;
 try{
  command(['run','--pull=never','--rm','-d','--name',name,'--network','none','--user','postgres','--tmpfs','/tmp:rw,mode=1777','--entrypoint','sh',image,'-c',`initdb -D /tmp/reservation-pg -A trust >/tmp/init.log && pg_ctl -D /tmp/reservation-pg -l /tmp/postgres.log -o "-k /tmp -c listen_addresses=''" -w start && touch /tmp/ready && exec sleep infinity`]);started=true;
  command(['exec',name,'sh','-c','n=0; while ! test -f /tmp/ready; do n=$((n+1)); test "$n" -lt 200 || exit 1; sleep .1; done']);
  let setup=await readFile('supabase/tests/v10-fixture.sql','utf8');for(const f of(await readdir('supabase/migrations')).filter(f=>f<='202610280012_tester_reservations.sql').sort())setup+='\n'+await readFile('supabase/migrations/'+f,'utf8');
  for(let n=1;n<=18;n++)setup+=`insert into profiles(id,roles,preferred_genres)values('${id(n)}',array['tester','developer'],array['Action']);`;
  for(const c of[30,31,32])setup+=`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status)values('${id(c+100)}','${id(c-29)}','Fixture','Dev','Action','Test','https://example.test','Unknown','Approved');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience)values('${id(c)}','${id(c-29)}','${id(c+100)}','Fixture','https://example.test','Test movement','open','both');`;
  const submit=test=>`select submit_community_game_test(${test},7,7,'None','Feedback',1,8,'probably','probably','Movement','None','Controls','{}');`;
  for(const c of[30,31])for(let n=4;n<=6;n++)setup+=`set test.uid='${id(n)}';${submit(`claim_community_game_test('${id(c)}')`)}`;
  if(graded)setup+='\n'+await readFile('supabase/migrations/202610280013_graded_feedback_quality.sql','utf8');
  command(psql,setup);
  if(plans){
   let history=`update profiles set role='admin' where id='${id(1)}';alter table community_playtests disable trigger playtested_guard_launch;update community_playtests set tester_hub_started_at=clock_timestamp()-interval '49 hours' where id='${id(30)}';`;
   for(let n=60;n<=76;n++){history+=`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status)values('${id(n+100)}','${id(n<75?1:14)}','Plan fixture','Dev','Action','Test','https://example.test','Unknown','Approved');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,published_at,tester_hub_started_at)values('${id(n)}','${id(n<75?1:14)}','${id(n+100)}','Plan fixture','https://example.test','Test movement','${n<73?'closed':'draft'}','both',${n<73?`clock_timestamp()-interval '${97+(n-60)*48} hours'`:'null'},${n<73?`clock_timestamp()-interval '${97+(n-60)*48} hours'`:'null'});`;}
   history+='alter table community_playtests enable trigger playtested_guard_launch;';history+=await readFile('supabase/migrations/202610280014_developer_entitlements.sql','utf8');history+=`set test.uid='${id(1)}';select admin_assign_developer_plan('${id(1)}','pro','Concurrency fixture');`;command(psql,history);
   const a=session(`begin;update community_playtests set status='open' where id='${id(73)}';select 'HELD';select pg_sleep(1);commit;`,true);await a.ready;const b=session(`update community_playtests set status='open' where id='${id(74)}';`);assert.equal((await a.done).code,0);const blocked=await b.done;assert.notEqual(blocked.code,0);assert.match(blocked.err,/launch unavailable/);assert.equal(command(psql,`select rounds_used from _playtested_developer_launch_window_at('${id(1)}',clock_timestamp());`),'15');
   const rollback=session(`begin;update community_playtests set status='open' where id='${id(75)}';select 'HELD';select pg_sleep(.5);rollback;`,true);await rollback.ready;const next=session(`update community_playtests set status='open' where id='${id(76)}';`);assert.equal((await rollback.done).code,0);assert.equal((await next.done).code,0);assert.equal(command(psql,`select rounds_used from _playtested_developer_launch_window_at('${id(14)}',clock_timestamp());`),'1');
   const downgrade=session(`begin;set test.uid='${id(1)}';select admin_assign_developer_plan('${id(1)}','free','Concurrent downgrade');select 'HELD';select pg_sleep(.5);commit;`,true);await downgrade.ready;const launch=session(`update community_playtests set status='open' where id='${id(74)}';`);assert.equal((await downgrade.done).code,0);assert.notEqual((await launch.done).code,0);assert.equal(command(psql,`select status from community_playtests where id='${id(73)}';`),'open');
   console.log('PASS real PostgreSQL multi-connection plans: two account-wide publications competing for Pro launch 15 produce one winner; Free rollback leaves one launch; concurrent downgrade serializes with publication and preserves the running round. Disposable no-network container only.');return;
  }
  if(graded){
   command(psql,`update profiles set role='admin' where id in('${id(1)}','${id(2)}');`);
   const report=command(psql,`select id from community_game_tests where tester_id='${id(4)}' and playtest_id='${id(30)}';`);
   const envelope=count=>JSON.stringify({rubric_version:2,eligibility:{original:true,relevant:true},scores:Object.fromEntries(['specific','examples','impact','focus','takeaway'].map((key,i)=>[key,i<count]))});
   const review=(n,count,outcome='accepted',reason='Concurrent assessment')=>`set test.uid='${id(n)}';select review_test_quality('${report}','${outcome}','${reason}','${envelope(count)}');`;
   const first=session('begin;'+review(1,5)+"select 'HELD';select pg_sleep(1);commit;",true);await first.ready;const second=session(review(2,3));assert.equal((await first.done).code,0);assert.equal((await second.done).code,0);assert.equal(command(psql,`select tester_xp||':'||completed_tests from profiles where id='${id(4)}';`),'60:1');assert.equal(command(psql,`select string_agg(xp_delta::text,',' order by id) from test_review_events where test_id='${report}';`),'100,-40');
   const duplicate=session('begin;'+review(1,3)+"select 'HELD';select pg_sleep(.5);commit;",true);await duplicate.ready;const duplicate2=session(review(2,3));assert.equal((await duplicate.done).code,0);assert.equal((await duplicate2.done).code,0);assert.equal(command(psql,`select count(*) from test_review_events where test_id='${report}';`),'2');
   const reverse=session('begin;'+review(1,3,'rejected','Reverse')+"select 'HELD';select pg_sleep(.5);commit;",true);await reverse.ready;const restore=session(review(2,4,'accepted','Restore'));assert.equal((await reverse.done).code,0);assert.equal((await restore.done).code,0);assert.equal(command(psql,`select tester_xp||':'||completed_tests from profiles where id='${id(4)}';`),'80:1');
   const rollback=session('begin;'+review(1,5,'accepted','Rollback')+"select 'HELD';select pg_sleep(.5);rollback;",true);await rollback.ready;const afterRollback=session(review(2,3,'accepted','After rollback'));assert.equal((await rollback.done).code,0);assert.equal((await afterRollback.done).code,0);assert.equal(command(psql,`select tester_xp||':'||completed_tests from profiles where id='${id(4)}';`),'60:1');assert.equal(command(psql,`select xp_delta from test_review_events where test_id='${report}' order by id desc limit 1;`),'-20');assert.equal(command(psql,`select submitted from campaign_places('${id(30)}');`),'3');
   console.log('PASS real PostgreSQL 17 multi-connection graded review: 100->60 serialized deltas, duplicate no-op, actual reversal/restoration, rollback consistency, one completed report and unchanged submitted capacity. Disposable no-network container; no live/source/recovery connections.');return;
  }
  const expiredReclaim=command(psql,`set test.uid='${id(7)}';select claim_community_game_test('${id(30)}');`).split('\n').at(-1);
  command(psql,`alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=clock_timestamp() where id='${expiredReclaim}';alter table community_game_tests enable trigger aa_testing_reservation;`);
  const a=session(`begin;set test.uid='${id(7)}';select claim_community_game_test('${id(30)}');select 'HELD';select pg_sleep(1);commit;`,true);await a.ready;
  const b=session(`set test.uid='${id(8)}';select claim_community_game_test('${id(30)}');`);assert.equal((await a.done).code,0);const blocked=await b.done;assert.notEqual(blocked.code,0);assert.match(blocked.err,/full/);assert.equal(command(psql,`select submitted+testing from campaign_places('${id(30)}');`),'4');
  // An abandoned final-place transaction must not consume a place.
  const rollback=session(`begin;set test.uid='${id(9)}';select claim_community_game_test('${id(31)}');select 'HELD';select pg_sleep(1);rollback;`,true);await rollback.ready;const afterRollback=session(`set test.uid='${id(10)}';select claim_community_game_test('${id(31)}');`);assert.equal((await rollback.done).code,0);assert.equal((await afterRollback.done).code,0);
  // The deadline is tested after waiting for the capacity lock, not at request start.
  const expiring=command(psql,`set test.uid='${id(11)}';select claim_community_game_test('${id(32)}');`).split('\n').at(-1);
  command(psql,`alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=clock_timestamp()+interval '500 milliseconds' where id='${expiring}';alter table community_game_tests enable trigger aa_testing_reservation;`);
  const lock=session(`begin;select pg_advisory_xact_lock(hashtextextended('playtested:capacity:${id(32)}',0));select 'HELD';select pg_sleep(1);commit;`,true);await lock.ready;
  const atDeadline=session(`set test.uid='${id(11)}';${submit(`'${expiring}'`)}`),next=session(`set test.uid='${id(12)}';select claim_community_game_test('${id(32)}');`);assert.equal((await lock.done).code,0);const expired=await atDeadline.done;assert.notEqual(expired.code,0);assert.match(expired.err,/expired/);assert.equal((await next.done).code,0);assert.equal(command(psql,`select count(*) from community_game_tests where id='${expiring}' and submitted_at is null;`),'1');assert.equal(command(psql,`select submitted+testing from campaign_places('${id(32)}');`),'1');
  // Same tester in two tabs must retain only one current reservation.
  const sameA=session(`begin;set test.uid='${id(13)}';select claim_community_game_test('${id(32)}');select 'HELD';select pg_sleep(1);commit;`,true);await sameA.ready;const sameB=session(`set test.uid='${id(13)}';select claim_community_game_test('${id(30)}');`);assert.equal((await sameA.done).code,0);const duplicate=await sameB.done;assert.notEqual(duplicate.code,0);assert.match(duplicate.err,/One test/);
  console.log('PASS real PostgreSQL 17 multi-connection: final-place reclaim permits one winner; rollback frees the place; submission waiting across expiry is rejected while a new tester succeeds; expired row remains; two-tab one-active guard holds. Disposable container: no network, ports, source credentials, recovery containers or live data.');
 }finally{if(started)command(['stop','-t','2',name]);}
}

async function gradedQualityChecks(){
 await sql(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of(await readdir('supabase/migrations')).filter(f=>f<'202610280013_').sort())await sql(await readFile('supabase/migrations/'+f,'utf8'));
 for(let n=1;n<=12;n++)await sql(`insert into profiles(id,roles,role,preferred_genres)values('${id(n)}',array['tester','developer'],'${n===1?'admin':'user'}',array['Action'])`);
 for(const c of[30,31])await sql(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status)values('${id(c+100)}','${id(c-28)}','Fixture','Dev','Action','Test','https://example.test','Unknown','Approved');insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience)values('${id(c)}','${id(c-28)}','${id(c+100)}','Fixture','https://example.test','Test movement','open','both')`);
 const submit=async(n,c=30)=>{await as(n);const test=(await one(`select claim_community_game_test('${id(c)}') id`)).id;await sql(`select submit_community_game_test('${test}',8,8,'No bugs','Useful praise',1,8,'probably','probably','Good movement','None','Preserve controls','{}')`);return test};
 const tests=[];for(const n of[4,5,6,7])tests.push(await submit(n));for(const n of[4,5,8,9])tests.push(await submit(n,31));
 await as(1);await sql(`select review_test_quality('${tests[0]}','accepted','Historical award','{"specific":true,"examples":true,"useful":true,"relevant":true,"original":true}')`);
 const old=(await one(`select to_jsonb(t) r from community_game_tests t where id='${tests[0]}'`)).r,xp=(await one(`select tester_xp n from profiles where id='${id(4)}'`)).n;
 await sql(await readFile('supabase/migrations/202610280013_graded_feedback_quality.sql','utf8'));
 const historical=(await one(`select to_jsonb(t) r from community_game_tests t where id='${tests[0]}'`)).r;for(const key of Object.keys(old))assert.deepEqual(historical[key],old[key]);assert.equal(historical.quality_rubric_version,null);assert.equal(historical.feedback_quality_score,null);assert.equal((await one(`select tester_xp n from profiles where id='${id(4)}'`)).n,xp);
 const keys=['specific','examples','impact','focus','takeaway'];const envelope=(count,original=true,relevant=true)=>({rubric_version:2,eligibility:{original,relevant},scores:Object.fromEntries(keys.map((key,i)=>[key,i<count]))});const review=async(test,count,outcome='accepted',original=true,relevant=true,reason='Admin usefulness assessment')=>sql(`select review_test_quality('${test}','${outcome}','${reason}','${JSON.stringify(envelope(count,original,relevant))}'::jsonb)`);
 for(let count=0;count<=5;count++){
  await review(tests[1],count);const t=await one(`select base_xp_amount xp,feedback_quality_score score,review_outcome outcome,quality_rubric_version version from community_game_tests where id='${tests[1]}'`);assert.deepEqual(t,{xp:count*20,score:count*20,outcome:'accepted',version:2});assert.equal((await one(`select completed_tests n from profiles where id='${id(5)}'`)).n,count>0?1:0,'One partial report never counts as multiple awards');
 }
 const {default:ts}=await import('typescript');const helper={};new Function('exports',ts.transpileModule(await readFile('lib/feedback-review.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(helper);const storedRubric=(await one('select get_feedback_quality_rubric() r')).r;assert.deepEqual(storedRubric.criteria,helper.FEEDBACK_QUALITY_CRITERIA,'Client guidance matches the stored rubric');assert(helper.feedbackQualityLabel(historical).includes('quality score not recorded'));
 await review(tests[1],3);assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[1]}' order by id desc limit 1`)).n,-40);await review(tests[1],4);assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[1]}' order by id desc limit 1`)).n,20);
 await as(5);await sql(`select request_test_reconsideration('${tests[1]}','Please reconsider the partial award')`);await fail(`select request_test_reconsideration('${tests[1]}','Duplicate appeal')`,/already pending/);await as(1);await review(tests[1],4);assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[1]}' order by id desc limit 1`)).n,0,'Same assessment closes reconsideration without duplicate XP');
 const events=(await one(`select count(*) n from test_review_events where test_id='${tests[1]}'`)).n;await review(tests[1],4);assert.equal((await one(`select count(*) n from test_review_events where test_id='${tests[1]}'`)).n,events);
 await review(tests[1],4,'rejected');assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[1]}' order by id desc limit 1`)).n,-80);await review(tests[1],4);assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[1]}' order by id desc limit 1`)).n,80);
 for(const eligibility of[[false,true],[true,false],[false,false]]){await review(tests[2],5,'accepted',...eligibility);assert.deepEqual(await one(`select base_xp_amount xp,feedback_quality_score score,review_outcome outcome from community_game_tests where id='${tests[2]}'`),{xp:0,score:0,outcome:'rejected'});}
 await sql(`update community_game_tests set feedback=case when id='${tests[3]}' then 'The responsive controls made this build enjoyable; preserve the quick restart.' else 'The slow controls made this build frustrating; improve the restart delay.' end where id in('${tests[3]}','${tests[6]}')`);
 await review(tests[3],3,'accepted',true,true,'Useful positive observations');await review(tests[6],3,'accepted',true,true,'Useful negative observations');assert.equal((await one(`select base_xp_amount n from community_game_tests where id='${tests[3]}'`)).n,(await one(`select base_xp_amount n from community_game_tests where id='${tests[6]}'`)).n,'Sentiment-neutral scoring');
 assert.equal((await one(`select submitted from campaign_places('${id(30)}')`)).submitted,4);assert.equal((await one(`select available from campaign_places('${id(30)}')`)).available,0,'Partial and rejected reports retain capacity');
 // Client XP/percentage claims are ignored, and old/invalid rubric payloads are refused.
 await sql(`select review_test_quality('${tests[4]}','accepted','Server calculation','${JSON.stringify({...envelope(1),xp:100,quality_percentage:100})}')`);assert.equal((await one(`select base_xp_amount n from community_game_tests where id='${tests[4]}'`)).n,20);
 await fail(`select review_test_quality('${tests[4]}','accepted','Old rubric','{"specific":true,"original":true}')`,/rubric changed/);await fail(`select review_test_quality('${tests[4]}','accepted','Bad eligibility','${JSON.stringify({...envelope(5),eligibility:{original:null,relevant:true}})}')`,/Explicitly/);
 await as(2);await fail(`select review_test_quality('${tests[4]}','accepted','No permission','${JSON.stringify(envelope(5))}')`,/admin/);assert.equal((await one("select has_table_privilege('authenticated','feedback_quality_rubrics','update') ok")).ok,false);
 await as(6);await sql(`select request_test_reconsideration('${tests[2]}','Please reconsider these observations')`);await as(1);await review(tests[2],2);assert.equal((await one(`select base_xp_amount n from community_game_tests where id='${tests[2]}'`)).n,40);
 // A failed reversal cannot append an event or partially change the award.
 await sql(`update profiles set tester_xp=0 where id='${id(6)}'`);const prior=(await one(`select count(*) n from test_review_events where test_id='${tests[2]}'`)).n;await fail(`select review_test_quality('${tests[2]}','rejected','Reverse','${JSON.stringify(envelope(2))}')`,/constraint|tester_xp/);assert.equal((await one(`select base_xp_amount n from community_game_tests where id='${tests[2]}'`)).n,40);assert.equal((await one(`select count(*) n from test_review_events where test_id='${tests[2]}'`)).n,prior);
 await review(tests[5],0);await review(tests[7],1);const alternate=envelope(1);alternate.scores.specific=false;alternate.scores.examples=true;await sql(`select review_test_quality('${tests[7]}','accepted','Changed criterion, same award','${JSON.stringify(alternate)}')`);assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[7]}' order by id desc limit 1`)).n,0);
 await review(tests[0],3);assert.equal((await one(`select xp_delta n from test_review_events where test_id='${tests[0]}' order by id desc limit 1`)).n,-40,'Explicit legacy re-review adjusts the known actual award');assert.equal((await one(`select rubric_version v from test_review_events where test_id='${tests[0]}' order by id limit 1`)).v,null,'Historical audit score remains unrecorded');
 const progress=(await one(`select get_my_testing_progress() p`)).p;assert(progress&&typeof progress.xp==='number');await as(5);const own=(await one('select get_my_testing_progress() p')).p;assert.equal(own.accepted,1);assert.equal(own.passed,2,'Zero-XP accepted report participates in acceptance rate');assert.equal(own.xp,80);assert.equal(own.rank,0,'Unchanged XP and accepted-test requirements');
 console.log('PASS isolated graded quality: six scores, eligibility override, partial/zero acceptance, 100->60->80 deltas, duplicate no-op, actual reversal/restoration, legacy preservation, sentiment neutrality, capacity, permissions, tamper rejection, reconsideration, failed-reversal atomicity and unchanged rank rules. No source database used.');
}

async function recruitmentChecks(){
 await sql(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of(await readdir('supabase/migrations')).filter(f=>/^20261028000[1-9]_/.test(f)).sort())await sql(await readFile('supabase/migrations/'+f,'utf8'));
 await sql(await readFile('supabase/migrations/202610280012_tester_reservations.sql','utf8'));
 await sql(await readFile('supabase/migrations/202610290015_public_recruitment.sql','utf8'));
 for(let n=1;n<=8;n++)await sql(`insert into profiles(id,roles,preferred_genres) values('${id(n)}',array['tester','developer'],array['Action'])`);
 await sql(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status,steam_app_id) values
 ('${id(101)}','${id(1)}','Same title','Dev','Action','Fixture','https://example.test','Unknown','Approved','12345'),
 ('${id(102)}','${id(2)}','Same title','Dev','Action','Fixture','https://example.test','Unknown','Approved',null),
 ('${id(103)}','${id(2)}','Same title','Dev','Action','Fixture','https://example.test','Unknown','Pending Review',null);
 insert into imported_games(id,title,steam_app_id,catalogue_eligible,steam_url)values('${id(201)}','Different title','12345',true,'https://example.test'),('${id(202)}','Same title','12346',false,'https://example.test');
 insert into approved_games(id,title,steam_app_id)values('${id(301)}','Alias title','12345');
 insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience)values('${id(501)}','${id(1)}','${id(101)}','Campaign','https://example.test/private','Test','open','playtested_testers'),('${id(502)}','${id(2)}','${id(102)}','Draft','https://example.test/private','Test','draft','both');`);
 const games=[{source_type:'approved',game_id:id(101)},{source_type:'approved',game_id:id(102)},{source_type:'approved',game_id:id(103)},{source_type:'steam',game_id:id(201)},{source_type:'steam',game_id:id(202)},{source_type:'approved',game_id:id(301)}];
 const summary=async()=> (await db.query('select * from public.get_public_recruitment($1::jsonb)',[JSON.stringify(games)])).rows;
 const recruiting=async()=> (await summary()).find(r=>r.game_id===id(101)).recruiting;
 let rows=await summary();assert.equal(rows.length,4,'Non-public records excluded');assert(rows.find(r=>r.game_id===id(201)).recruiting);assert(rows.find(r=>r.game_id===id(301)).recruiting);assert.equal(rows.find(r=>r.game_id===id(102)).recruiting,false,'No title matching or draft badge');
 assert(rows.every(row=>Object.keys(row).sort().join(',')==='game_id,recruiting,source_type'),'Only public booleans/IDs');
 await sql(`alter table community_playtests disable trigger check_testing_audience_availability;update community_playtests set minimum_rank=3,genre_restricted=true,testing_genre='Horror' where id='${id(501)}';alter table community_playtests enable trigger check_testing_audience_availability`);await as(3);assert.equal((await one(`select campaign_eligible('${id(501)}','${id(3)}') ok`)).ok,false);assert(await recruiting(),'Recruitment does not promise eligibility');
 await sql(`update community_playtests set minimum_rank=0,genre_restricted=false,audience='both' where id='${id(501)}'`);assert(await recruiting(),'Mixed audience');
 await sql(`update community_playtests set audience='own_community' where id='${id(501)}'`);assert.equal(await recruiting(),false);await sql(`update community_playtests set audience='both',status='paused' where id='${id(501)}'`);assert.equal(await recruiting(),false);await sql(`update community_playtests set status='open' where id='${id(501)}'`);
 const claims=[];for(const n of[3,4,5,6]){await as(n);claims.push((await one(`select claim_community_game_test('${id(501)}') id`)).id);}assert.equal(await recruiting(),false,'All places reserved');
 for(let i=0;i<3;i++){await as(i+3);await sql(`select submit_community_game_test('${claims[i]}',7,7,'No issues','Useful feedback',1,8,'probably','probably','Movement','None','Controls','{}')`);}assert.equal(await recruiting(),false,'Three submitted plus one reserved');
 // Boundary simulation in this disposable DB only; production uses server time without cleanup.
 await sql(`alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=clock_timestamp() where id='${claims[3]}';alter table community_game_tests enable trigger aa_testing_reservation`);assert(await recruiting(),'Expired unsubmitted reservation reopens capacity');assert.equal((await one(`select status from community_game_tests where id='${claims[3]}'`)).status,'claimed','No cleanup job required');
 await as(6);await one(`select claim_community_game_test('${id(501)}')`);await sql(`select submit_community_game_test('${claims[3]}',7,7,'No issues','Useful feedback',1,8,'probably','probably','Movement','None','Controls','{}')`);assert.equal(await recruiting(),false,'Four submitted');
 await sql(`update community_game_tests set reservation_expires_at=clock_timestamp()-interval '1 day' where playtest_id='${id(501)}'`);assert.equal(await recruiting(),false,'Submitted places never expire');await sql(`update community_playtests set status='closed' where id='${id(501)}'`);assert.equal(await recruiting(),false);
 await assert.rejects(db.query('select * from get_public_recruitment($1::jsonb)',[JSON.stringify(Array(13).fill(games[0]))]),/At most 12/);
 assert((await one("select has_function_privilege('anon','public.get_public_recruitment(jsonb)','execute') ok")).ok);await sql('set role anon');assert.equal((await summary()).length,4);await sql('reset role');
 console.log('PASS public recruitment SQL: open/mixed/draft/paused/closed/community-only, canonical aliases/no title match, private records excluded, rank-independent summary, reserved/submitted/full/expiry boundary/reclaim, anon permission and batch bound. Disposable PGlite; expiry is simulated, no live writes.');
}

export function finalQaSql(){
const id=n=>'95000000-0000-4000-8000-'+String(n).padStart(12,'0');
const q=s=>"'"+s.replaceAll("'","''")+"'";
const as=n=>`reset role;select set_config('request.jwt.claim.sub',${q(n?id(n):'')},true);select set_config('request.jwt.claims',${q(JSON.stringify({sub:n?id(n):null,role:n?'authenticated':'anon'}))},true);set local role ${n?'authenticated':'anon'};`;
const check=(cond,label)=>`do $check$ begin if (${cond}) is not true then raise exception '${label}';end if;end $check$;`;
const denied=sql=>`do $denied$ begin begin ${sql.replace(/^select /,'perform ')};raise exception 'EXPECTED_DENIAL_MISSING';exception when insufficient_privilege then null;end;end $denied$;`;
let sql='begin;';
for(const [n,role,roles]of [[1,'user','tester'],[2,'user','developer'],[3,'user','developer'],[4,'admin','player']])sql+=`insert into auth.users(id) values('${id(n)}');insert into profiles(id,role,roles,tester_xp) values('${id(n)}','${role}',array['${roles}'],0) on conflict(id) do update set role='${role}',roles=array['${roles}'],tester_xp=0;`;
// Clone only required listing shape into a NEW synthetic row; never update the source.
sql+=`insert into game_submissions select (jsonb_populate_record(null::public.game_submissions,to_jsonb(s)||jsonb_build_object('id','${id(10)}','developer_id','${id(2)}','title','Final QA synthetic game','status','Approved'))).* from public.game_submissions s order by id limit 1;`;
sql+=`update game_submissions set status='Approved' where id='${id(10)}';insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,genre_restricted,target_testers) values('${id(11)}','${id(2)}','${id(10)}','Final QA campaign','https://example.test/game','Synthetic test','open','playtested_testers',false,4);insert into community_game_tests(id,playtest_id,tester_id,status) values('${id(12)}','${id(11)}','${id(1)}','in_progress');`;
sql+=as(1)+`select submit_community_game_test_with_evidence('${id(12)}',7,8,'None','The movement was clear; tutorial text could explain the jump earlier.',0.25,8,'probably','probably','Movement','None','Tutorial','{}'::jsonb,null,null);`;
const rubric=score=>q(JSON.stringify({rubric_version:2,scores:{specific:score>0,examples:score>1,impact:score>2,focus:score>3,takeaway:score>4},eligibility:{original:true,relevant:true}}))+'::jsonb';
const review=(outcome,score)=>`select review_test_quality('${id(12)}','${outcome}','Synthetic final QA assessment',${rubric(score)});`;
const correct=(outcome,score)=>`select admin_correct_test_quality('${id(12)}','${outcome}','Synthetic final QA assessment',${rubric(score)},'Explicit synthetic regression correction');`;
sql+=check(`not exists(select 1 from jsonb_array_elements(get_my_notifications(100)->'notifications') n where n->>'kind'='tester_feedback_accepted')`,'Pending notified');
sql+=as(4)+review('rejected',3)+'reset role;'+check(`not exists(select 1 from notifications where recipient_id='${id(1)}' and kind='tester_feedback_accepted')`,'Rejected notified');
sql+=as(1)+`select request_test_reconsideration('${id(12)}','Fictional written clarification within the rejection window');`+as(4)+review('accepted',3)+review('accepted',3)+'reset role;';
sql+=check(`(select tester_xp=60 from profiles where id='${id(1)}')`,'Actual partial XP or retry incorrect');
sql+=check(`(select count(*)=1 from notifications where recipient_id='${id(1)}' and kind='tester_feedback_accepted' and title='Your playtest feedback was accepted!' and message='Your feedback for Final QA synthetic game has been approved. You earned 60 XP.' and href='/tester#testing-activity-${id(12)}')`,'Acceptance content/dedupe incorrect');
sql+=check(`exists(select 1 from notifications where recipient_id='${id(2)}' and kind='developer_feedback_received')`,'Developer approval notification lost');
sql+=as(1)+check(`exists(select 1 from jsonb_array_elements(get_my_notifications(8)->'notifications') n where n->>'kind'='tester_feedback_accepted')`,'Bell acceptance delivery missing')+check(`exists(select 1 from jsonb_array_elements(get_my_notifications(100)->'notifications') n where n->>'kind'='tester_feedback_accepted')`,'History acceptance delivery missing');
sql+=`select dismiss_notification((select id from notifications where kind='tester_feedback_accepted' limit 1));`;
sql+=as(4)+review('accepted',3)+'reset role;'+check(`not exists(select 1 from notifications where recipient_id='${id(1)}' and kind='tester_feedback_accepted')`,'Dismissed acceptance recreated on retry');
sql+=as(4)+correct('accepted',5)+'reset role;'+check(`(select tester_xp=100 from profiles where id='${id(1)}')`,'Reassessment XP incorrect')+check(`(select count(*)=1 from notifications where recipient_id='${id(1)}' and kind='tester_feedback_accepted' and message like '%100 XP.')`,'New assessment notification missing');
sql+=as(2)+`select mark_test_feedback_usefulness('${id(12)}','useful');select mark_test_feedback_usefulness('${id(12)}','useful');`+'reset role;'+check(`(select tester_xp=105 from profiles where id='${id(1)}')`,'Useful bonus duplicated or missing')+check(`(select count(*)=1 from notifications where recipient_id='${id(1)}' and kind='tester_feedback_useful')`,'Separate Useful notification missing');
sql+=as(4)+correct('accepted',0)+review('accepted',0)+'reset role;'+check(`exists(select 1 from notifications where recipient_id='${id(1)}' and kind='tester_feedback_accepted' and message='Your feedback for Final QA synthetic game has been approved. You earned 0 XP.')`,'Accepted zero-XP notification incorrect');
// Own saved genres only; optional empty/single/multiple preferences use the established setter.
sql+=as(1)+check(`get_my_testing_progress()->'genres'='[]'::jsonb`,'Empty genres incorrect');
for(const genres of [[],['RPG'],['Action','RPG','Strategy']]){sql+=`select update_my_testing_genres(array[${genres.map(q).join(',')}]::text[]);`+check(`get_my_testing_progress()->'genres'=${q(JSON.stringify(genres))}::jsonb`,'Saved genres incorrect');}
sql+=as(2)+check(`get_my_testing_progress()->'genres'='[]'::jsonb`,'Other account genres leaked');
// Compare against the real QA baseline: existing intentional browser clicks are preserved.
sql+=as(4)+'reset role;create temporary table qa_pro_baseline as select get_admin_pro_interest() v;grant select on qa_pro_baseline to authenticated;';
// Rate limits, permission, consent and exact rolling time windows.
sql+=as(1)+denied('select record_developer_pro_interest(true)')+denied('select get_admin_pro_interest()')+denied('select count(*) from developer_pro_interest');
sql+=as(2)+check(`not record_developer_pro_interest(false)`,'Consent ignored')+check(`record_developer_pro_interest(true)`,'First click lost')+check(`not record_developer_pro_interest(true)`,'Rapid duplicate allowed')+denied('select get_admin_pro_interest()')+denied('select count(*) from developer_pro_interest');
sql+=as(3)+check(`record_developer_pro_interest(true)`,'Other developer suppressed');
sql+='reset role;';
sql+=`insert into developer_pro_interest(developer_id,created_at) values('${id(2)}',now()-interval '8 days'),('${id(2)}',now()-interval '31 days'),('${id(3)}',now()-interval '91 days');`;
sql+=as(4)+check(`(select bool_and((get_admin_pro_interest()->>key)::int=(v->>key)::int+delta) from qa_pro_baseline cross join (values('total_clicks',4),('unique_developers',2),('clicks_7d',2),('clicks_30d',3),('developers_7d',2),('developers_30d',2)) expected(key,delta))`,'Windows or uniques incorrect')+check(`get_admin_pro_interest()->>'latest_at' is not null`,'Latest interest missing');
sql+='reset role;'+check(`not exists(select 1 from developer_pro_interest where created_at<now()-interval '90 days')`,'Retention failed');
sql+=`insert into developer_pro_interest(developer_id,created_at) select '${id(2)}',now()-interval '2 minutes'-n*interval '2 minutes' from generate_series(1,9)n;`;
sql+=as(2)+check(`not record_developer_pro_interest(true)`,'Daily cap ignored');
sql+=as(null)+denied('select record_developer_pro_interest(true)')+denied('select get_admin_pro_interest()')+denied('select count(*) from developer_pro_interest');
sql+='rollback;';
return sql;
}

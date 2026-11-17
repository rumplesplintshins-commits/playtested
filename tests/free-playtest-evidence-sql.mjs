// Portable SQL matrix: PGlite and the fingerprinted, isolated PostgreSQL QA stack.
const id=n=>'94000000-0000-4000-8000-'+String(n).padStart(12,'0');
export function freeEvidenceSuite({uidSetting='test.uid',game=id(900),developer=id(800),seedGame=true,finalDecisions=false,appealWorkflow=false}={}) {
 const doc='https://docs.google.com/document/d/LOCAL_RANK_DOC/edit',video='https://drive.google.com/file/d/LOCAL_RANK_VIDEO/view';
 const quote=s=>s===null?'null':"'"+s.replaceAll("'","''")+"'";
 const check=(condition,label)=>`do $check$ begin if (${condition}) is not true then raise exception '${label}'; end if; end $check$;`;
 const denied=(statement,pattern)=>`do $denied$ begin begin ${statement.replace(/^select /,'perform ')}; raise exception 'EXPECTED_REJECTION_MISSING'; exception when others then if SQLERRM !~* '${pattern}' then raise; end if; end; end $denied$;`;
 const as=user=>`reset role;select set_config('${uidSetting}',${quote(user||'')},true);select set_config('request.jwt.claims',${quote(JSON.stringify({sub:user||null,role:user?'authenticated':'anon',user_metadata:{rank:0,tester_rank:0}}))},true);set local role ${user?'authenticated':'anon'};`;
 let s='begin;\n';
 // Synthetic fixtures only; every fixture and change is rolled back.
 s+=`insert into auth.users(id) values('${developer}') on conflict do nothing;
 insert into profiles(id,role,roles,tester_xp) values('${developer}','user',array['developer'],0) on conflict(id) do update set roles=array['developer'];\n`;
 s+=`insert into auth.users(id) values('${id(801)}');insert into profiles(id,role,roles,tester_xp) values('${id(801)}','admin',array['player'],0) on conflict(id) do update set role='admin';\n`;
 if(seedGame)s+=`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${game}','${developer}','Rank evidence fixture','QA only','Action','Synthetic rank fixture','https://example.test/game','Unknown','Approved');\n`;
 for(let rank=0;rank<4;rank++) {
  s+='savepoint rank_fixture;';
  const user=id(rank+1),campaign=id(100+rank),test=id(200+rank),accepted=[0,5,20,50][rank],xp=[0,500,2000,5000][rank];
  s+=`insert into auth.users(id) values('${user}');insert into profiles(id,role,roles,tester_xp) values('${user}','user',array['tester'],${xp}) on conflict(id) do update set role='user',roles=array['tester'],tester_xp=${xp};\n`;
  for(let h=0;h<accepted;h++) {
   const historyGame=id(1000+rank*100+h);
   s+=`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${historyGame}','${developer}','Synthetic rank history','QA only','Action','Synthetic rank history only','https://example.test/game','Unknown','Pending Review');
   insert into community_game_tests(id,submission_id,tester_id,status,review_outcome,xp_awarded,quality_reviewed,feedback) values('${id(3000+rank*100+h)}','${historyGame}','${user}','reviewed','accepted',true,true,'Synthetic historical report');\n`;
  }
  s+=check(`public.tester_rank('${user}')=${rank}`,'Authoritative historical rank mismatch');
  s+=`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,genre_restricted,target_testers) values('${campaign}','${developer}','${game}','Rank fixture ${rank}','https://example.test/game','Test the local synthetic fixture','open','playtested_testers',false,1);
  insert into community_game_tests(id,playtest_id,tester_id,status) values('${test}','${campaign}','${user}','in_progress');\n`;
  const args=`'${test}',7,8,'None','Synthetic written feedback',0.25,8,'probably','probably','Movement','None','Tutorial','{}'::jsonb`;
  const submit=(d,v)=>`select public.submit_community_game_test_with_evidence(${args},${quote(d)},${quote(v)})`;
  const legacy=`select public.submit_community_game_test(${args})`;
  const oldest=`select public.submit_community_game_test('${test}',7,8,'None','Synthetic written feedback',0.25)`;
  s+=as(user);
  for(const d of[null,doc])for(const v of[null,video]) {
   s+='savepoint attempt;\n';
   s+=submit(d,v)+';'+check(`(select status='submitted' from community_game_tests where id='${test}')`,'Free submission did not commit');
   if(d||v)s+=check(`(select document_url is not distinct from ${quote(d)} and recording_url is not distinct from ${quote(v)} from get_my_private_playtest_evidence('${test}'))`,'Own evidence missing');
   if(d && v) {
    s+=as(developer)+check(`not exists(select 1 from get_developer_private_playtest_evidence('${campaign}'))`,'Developer evidence exposed before acceptance');
    const rubric="(select jsonb_build_object('rubric_version',r->'version','scores',(select jsonb_object_agg(k,true) from jsonb_object_keys(r->'criteria') k),'eligibility',(select jsonb_object_agg(k,true) from jsonb_object_keys(r->'eligibility') k)) from (select public.get_feedback_quality_rubric() r) q)";
    const review=outcome=>`select public.review_test_quality('${test}','${outcome}','Synthetic rank regression moderation',${rubric});`;
    if(appealWorkflow)s+='savepoint before_acceptance;';
    s+=as(id(801))+review('accepted')+review('accepted');
    s+=`reset role;`+check(`(select tester_xp=${xp}+100 from profiles where id='${user}')`,'Moderation XP was not awarded exactly once');
    s+=as(developer)+check(`exists(select 1 from get_developer_private_playtest_evidence('${campaign}'))`,'Accepted evidence inaccessible');
    if(appealWorkflow){
     s+='rollback to before_acceptance;'+as(id(801))+review('rejected')+as(user)+`select public.request_test_reconsideration('${test}','Fictional clarification for private evidence review');`+as(id(801))+review('rejected')+as(developer)+check(`not exists(select 1 from get_developer_private_playtest_evidence('${campaign}'))`,'Final rejected evidence exposed');
     s+='rollback to before_acceptance;'+as(id(801))+review('accepted');
    }else{
    s+=(finalDecisions?'savepoint accepted_evidence;':'')+as(id(801))+(finalDecisions?`select public.admin_correct_test_quality('${test}','rejected','Synthetic rank regression moderation',${rubric},'Explicit synthetic privacy regression correction');`:review('rejected'))+as(developer)+check(`not exists(select 1 from get_developer_private_playtest_evidence('${campaign}'))`,'Rejected evidence exposed to developer');
    s+=finalDecisions?'rollback to accepted_evidence;':as(id(801))+review('accepted');
    }
    s+=as(developer)+check(`(select document_url=${quote(doc)} and recording_url=${quote(video)} from get_developer_private_playtest_evidence('${campaign}'))`,'Accepted developer evidence missing');
    s+=as(id(800))+check(`not exists(select 1 from get_my_private_playtest_evidence('${test}'))`,'Other user read private evidence');
   }
   s+='rollback to attempt;\n';
  }
  for(const call of[legacy,oldest]) {
   s+='savepoint legacy;';
   s+=call+';'+check(`(select status='submitted' from community_game_tests where id='${test}')`,'Free legacy submission without evidence failed');
   s+='rollback to legacy;';
  }
  for(const bad of['http://example.test/report.docx','https://user:pass@example.test/report.docx','https://example.test/report.exe','javascript:alert(1)'])s+=denied(submit(bad,video),'HTTPS|Document evidence');
  for(const bad of['http://example.test/movie.mp4','https://example.test/movie.exe','https://example.test/my movie.mp4'])s+=denied(submit(doc,bad),'HTTPS|Recording evidence');
  s+=denied(submit(doc,video).replace("7,8,'None'","0,8,'None'"),'Gameplay score')+check(`not exists(select 1 from get_my_private_playtest_evidence('${test}'))`,'Invalid ordinary answers left evidence');
  s+=as(null)+denied(submit(doc,video),'permission denied|Sign in')+denied(legacy,'permission denied|signed in|not owned');
  s+='reset role;';
  // Existing Tester-role authorization remains enforced, independent of rank.
  s+=`savepoint missing_profile;delete from profiles where id='${user}';`+as(user)+denied(submit(doc,video),'Tester|rank|profile')+'rollback to missing_profile;reset role;';
  s+=check(`(select count(*)=${accepted} from community_game_tests where tester_id='${user}' and status='reviewed' and review_outcome='accepted')`,'Historical reports changed')+'rollback to rank_fixture;';
 }
 // Old accepted reports are not retroactively required to have links.
 s+=check(`(select count(*)=0 from community_game_tests where tester_id in ('${id(2)}','${id(3)}','${id(4)}') and status='reviewed' and review_outcome='accepted')`,'Historical reports changed');
 s+='rollback;';return s;
}

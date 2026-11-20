-- Local development fixture. Run only after the local Auth seed has completed.
begin;
do $$
declare owner_id uuid; tester_id uuid;
begin
 select id into strict owner_id from auth.users where email='studio-owner@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true';
 select id into strict tester_id from auth.users where email='devtest5@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true';
 insert into public.game_submissions(id,developer_id,title,developer_name,genre,description,game_link,image_url,release_status,ai_type,status)
 values
 ('6f001900-0000-4000-8000-000000000001',owner_id,'Ashen Hollow (local fixture)','Local Studio Owner','Action','A fictional browser game for local team testing.','http://localhost:3118/demo-games/neon-courier','http://127.0.0.1:3118/demo-assets/neon-courier.svg','Not announced','No AI used','Approved'),
 ('6f001900-0000-4000-8000-000000000002',owner_id,'Personal game (local fixture)','Local Studio Owner','Action','An unshared game for local access tests.','http://localhost:3118/demo-games/neon-courier','http://127.0.0.1:3118/demo-assets/neon-courier.svg','Not announced','No AI used','Approved')
 on conflict(id) do update set title=excluded.title,image_url=excluded.image_url,release_status=excluded.release_status where game_submissions.developer_id=excluded.developer_id;
 update public.game_submissions set status='Approved'
 where developer_id=owner_id and id in ('6f001900-0000-4000-8000-000000000001','6f001900-0000-4000-8000-000000000002')
 and status<>'Approved';
 insert into public.game_developer_links(developer_id,submission_id,relationship)
 select owner_id,g.id,'Original submitter' from public.game_submissions g
 where g.developer_id=owner_id and g.id in ('6f001900-0000-4000-8000-000000000001','6f001900-0000-4000-8000-000000000002')
 and not exists(select 1 from public.game_developer_links l where l.developer_id=owner_id and l.submission_id=g.id);
 insert into public.community_playtests(id,developer_id,submission_id,title,access_link,access_type,instructions,focus_areas,audience,target_testers,estimated_minutes,release_label,status,created_at)
 values
 ('6f001900-0000-4000-8000-000000000011',owner_id,'6f001900-0000-4000-8000-000000000001','Ashen Hollow (local fixture)','http://localhost:3118/demo-games/neon-courier','browser_game','Play the local demo and report your experience.','{Controls}','own_community',3,30,'Alpha 0.4','closed',now()-interval '7 days'),
 ('6f001900-0000-4000-8000-000000000012',owner_id,'6f001900-0000-4000-8000-000000000001','Ashen Hollow (local fixture)','http://localhost:3118/demo-games/neon-courier','browser_game','Play the local demo and report your experience.','{Performance}','own_community',3,30,'Alpha 0.5','draft',now())
 on conflict(id) do nothing;
 insert into public.community_game_tests(id,playtest_id,tester_id,status,review_outcome,overall_score,gameplay_score,performance_score,continue_playing,recommend_game,feedback,bugs_found,hours_played,submitted_at)
 values
 ('6f001900-0000-4000-8000-000000000021','6f001900-0000-4000-8000-000000000011',tester_id,'reviewed','accepted',4,5,6,'maybe','probably_not','Historical build fixture report.','Jump occasionally missed an input.',1,now()-interval '6 days'),
 ('6f001900-0000-4000-8000-000000000022','6f001900-0000-4000-8000-000000000012',tester_id,'reviewed','accepted',8,9,7,'definitely','probably','Current build fixture report.','A loading screen flashed twice.',2,now()-interval '1 day')
 on conflict(id) do nothing;
end $$;
commit;

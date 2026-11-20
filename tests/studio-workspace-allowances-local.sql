\set ON_ERROR_STOP on
begin;
select id as owner from auth.users where email='studio-owner@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true' \gset
select id as editor from auth.users where email='devtest1@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true' \gset
select id as editor2 from auth.users where email='devtest2@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true' \gset
select id as viewer from auth.users where email='devtest3@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true' \gset
select id as admin from public.profiles where role='admin' order by id limit 1 \gset
select id as primary_studio from playtested_studios.studios where owner_id=:'owner' and name='Power Spike Local QA' \gset
select id as legacy from playtested_studios.studios where owner_id=:'owner' and name='Playtested 123' \gset
select id as viewer_legacy from playtested_studios.studios where owner_id=:'viewer' and name='Test 1' \gset
-- Real manual launches can occupy these fixture windows. Age them only inside this test.
update playtested_studios.launches set launched_at=launched_at-interval '30 days'
where scope in ('studio:'||:'primary_studio','personal:'||:'owner','personal:'||:'editor2')
  and launched_at>now()-interval '30 days';
select g.link_id as original_shared_link
from playtested_studios.games g
join public.game_developer_links l on l.id=g.link_id
where g.studio_id=:'primary_studio' and l.submission_id='6f001900-0000-4000-8000-000000000001' \gset
insert into public.game_submissions(id,developer_id,title,developer_name,genre,description,game_link,image_url,release_status,ai_type,status)
values
 ('6f001900-0000-4000-8000-000000000081',:'owner','Allowance S Fixture','Fixture','Action','Disposable local studio game.','https://fixture.invalid/allowance-s','https://fixture.invalid/s.png','Not announced','No AI used','Pending Review'),
 ('6f001900-0000-4000-8000-000000000082',:'owner','Allowance P Fixture','Fixture','Action','Disposable local personal game.','https://fixture.invalid/allowance-p','https://fixture.invalid/p.png','Not announced','No AI used','Pending Review'),
 ('6f001900-0000-4000-8000-000000000083',:'editor2','Allowance D Fixture','Fixture','Action','Disposable independent personal game.','https://fixture.invalid/allowance-d','https://fixture.invalid/d.png','Not announced','No AI used','Pending Review'),
 ('6f001900-0000-4000-8000-000000000084',:'owner','Allowance Next Fixture','Fixture','Action','Disposable local second studio game.','https://fixture.invalid/allowance-next','https://fixture.invalid/next.png','Not announced','No AI used','Pending Review');
update public.game_submissions set status='Approved' where id::text between '6f001900-0000-4000-8000-000000000081' and '6f001900-0000-4000-8000-000000000084';
insert into public.game_developer_links(developer_id,submission_id,relationship)
 select developer_id,id,'Original submitter' from public.game_submissions where id::text between '6f001900-0000-4000-8000-000000000081' and '6f001900-0000-4000-8000-000000000084'
 and not exists(select 1 from public.game_developer_links where submission_id=game_submissions.id and developer_id=game_submissions.developer_id);
select id as s_link from public.game_developer_links where submission_id='6f001900-0000-4000-8000-000000000081' and developer_id=:'owner' limit 1 \gset
select id as next_link from public.game_developer_links where submission_id='6f001900-0000-4000-8000-000000000084' and developer_id=:'owner' limit 1 \gset
create function pg_temp.expect_denial(command text, message_pattern text) returns void language plpgsql as $$
begin
 begin
  execute command;
  raise exception 'Unexpected success: %',command using errcode='ZX001';
 exception when others then
  if sqlstate='ZX001' or sqlerrm !~* message_pattern then raise;end if;
 end;
end $$;
create function pg_temp.create_draft(game uuid) returns uuid language sql as $$
 select public.create_community_playtest(null,null,game,'http://127.0.0.1:3118/demo-games/neon-courier','browser_game',
  'Play the fixture and report controls and performance.',array['Controls'],'playtested_testers',1,15,'Allowance test',false)
$$;
create function pg_temp.change_status(campaign uuid,status text) returns void language sql as $$
 select public.update_community_playtest(campaign,'http://127.0.0.1:3118/demo-games/neon-courier','browser_game',
  'Play the fixture and report controls and performance.',array['Controls'],'playtested_testers',1,15,'Allowance test',status)
$$;
-- Set only the roles exercised by this transaction. Local manual role changes survive rollback.
update playtested_studios.members
set role=case when user_id=:'viewer' then 'viewer' else 'editor' end
where studio_id=:'primary_studio' and user_id in (:'viewer',:'editor',:'editor2');
set local role authenticated;
select set_config('request.jwt.claim.sub',:'owner',true);
select pg_temp.expect_denial($q$select public.change_studio('create',p_name=>'Excess Free studio')$q$,'membership limit');
select (public.get_my_developer_plan()->>'free_campaigns_used')::integer as personal_before \gset
select (public.get_studio_developer_plan(:'primary_studio')->>'studio_enabled')::boolean as primary_enabled \gset
select (public.get_studio_developer_plan(:'legacy')->>'studio_enabled')::boolean as legacy_enabled \gset
\if :primary_enabled
\else
select 1/0;
\endif
\if :legacy_enabled
select 1/0;
\endif
select pg_temp.expect_denial(format('select public.get_pro_feedback_export(%L,%L)','6f001900-0000-4000-8000-000000000011',:'primary_studio'),'unavailable');
select public.change_studio('assign',p_studio=>:'primary_studio',p_target=>:'s_link');
select public.change_studio('assign',p_studio=>:'primary_studio',p_target=>:'next_link');
select pg_temp.expect_denial(format('select public.change_studio(''assign'',p_studio=>%L,p_target=>%L)',:'legacy',:'s_link'),'duplicate');
select set_config('request.jwt.claim.sub',:'viewer',true);
select pg_temp.expect_denial($q$select public.change_studio('create',p_name=>'Excess Viewer studio')$q$,'membership limit');
select ((public.get_studio_developer_plan(:'viewer_legacy')->>'available_launches')::int=0) as viewer_legacy_frozen \gset
\if :viewer_legacy_frozen
\else
select 1/0;
\endif
select pg_temp.expect_denial($q$select pg_temp.create_draft('6f001900-0000-4000-8000-000000000081')$q$,'relationship|access|permission');
select set_config('request.jwt.claim.sub',:'editor',true);
select pg_temp.create_draft('6f001900-0000-4000-8000-000000000081') as studio_campaign \gset
select pg_temp.change_status(:'studio_campaign','open');
select set_config('request.jwt.claim.sub',:'editor2',true);
select pg_temp.expect_denial($q$select public.create_game_with_pc_requirements(
 jsonb_build_object('title','Renamed clone','developer_name','Other studio','genre','Action','description','Disposable clone',
 'game_link','http://FIXTURE.invalid/allowance-s?utm_source=duplicate#details','image_url','https://fixture.invalid/s.png',
 'release_status','Not announced','ai_type','No AI used','platform','browser'))$q$,'already has a listing');
select pg_temp.create_draft('6f001900-0000-4000-8000-000000000084') as second_campaign \gset
select pg_temp.expect_denial(format('select pg_temp.change_status(%L,''open'')',:'second_campaign'),'workspace allowance');
select (public.get_studio_developer_plan(:'primary_studio')->>'rounds_used')::int=1 as editor_sees_one \gset
\if :editor_sees_one
\else
select 1/0;
\endif
select pg_temp.create_draft('6f001900-0000-4000-8000-000000000083') as independent_campaign \gset
select pg_temp.change_status(:'independent_campaign','open');
select set_config('request.jwt.claim.sub',:'owner',true);
select (public.get_my_developer_plan()->>'free_campaigns_used')::int=(:'personal_before')::int
   and (public.get_studio_developer_plan(:'primary_studio')->>'rounds_used')::int=1 as separate \gset
\if :separate
\else
select 1/0;
\endif
select pg_temp.change_status(:'studio_campaign','closed');
select public.change_studio('unassign',p_studio=>:'primary_studio',p_target=>:'s_link');
select pg_temp.create_draft('6f001900-0000-4000-8000-000000000081') as moved \gset
select pg_temp.expect_denial(format('select pg_temp.change_status(%L,''open'')',:'moved'),'game has a free launch cooldown');
select pg_temp.create_draft('6f001900-0000-4000-8000-000000000082') as personal_campaign \gset
select pg_temp.change_status(:'personal_campaign','open');
select public.change_studio('unassign',p_studio=>:'primary_studio',p_target=>:'next_link');
select pg_temp.expect_denial(format('select pg_temp.change_status(%L,''open'')',:'second_campaign'),'workspace allowance');
select public.change_studio('assign',p_studio=>:'legacy',p_target=>:'s_link');
select pg_temp.expect_denial(format('select pg_temp.change_status(%L,''open'')',:'moved'),'legacy studio');
select set_config('request.jwt.claim.sub',:'admin',true);
select public.admin_assign_developer_plan(:'owner','pro','Rollback-only allowance verification');
select public.admin_assign_studio_plan(:'primary_studio','pro','Rollback-only Pro report verification');
select set_config('request.jwt.claim.sub',:'owner',true);
select pg_temp.expect_denial(format('select pg_temp.change_status(%L,''open'')',:'moved'),'game has a free launch cooldown');
select pg_temp.expect_denial($q$select public.change_studio('create',p_name=>'Excess Pro studio')$q$,'membership limit');
select (public.get_pro_feedback_export('6f001900-0000-4000-8000-000000000011',:'primary_studio')->0->>'feedback')='Historical build fixture report.' as studio_report \gset
\if :studio_report
\else
select 1/0;
\endif
select public.change_studio('unassign',p_studio=>:'primary_studio',p_target=>:'original_shared_link');
select (public.get_pro_feedback_export('6f001900-0000-4000-8000-000000000011',null)->0->>'feedback')='Historical build fixture report.' as personal_report \gset
\if :personal_report
\else
select 1/0;
\endif
select pg_temp.expect_denial(format('select public.get_pro_feedback_export(%L,%L)','6f001900-0000-4000-8000-000000000011',:'legacy'),'workspace');
rollback;
\echo 'PASS localhost workspace allowances, game cooldown across moves, role/access guards, legacy limits, and separately authorised Pro studio and personal reports.'

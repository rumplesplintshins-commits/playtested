-- Run in the disposable local test database as postgres. All data changes roll back.
\set ON_ERROR_STOP on
begin;
select id as owner_id from auth.users where email='studio-owner@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true' \gset
select id as editor_id from auth.users where email='devtest1@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true' \gset
select id as link_id from public.game_developer_links where developer_id=:'owner_id' and submission_id='6f001900-0000-4000-8000-000000000002' \gset
set local role authenticated;
select set_config('request.jwt.claim.sub',:'owner_id',true);
select public.change_studio('create',p_name=>'Allowance Local Transaction')->>'id' as studio_id \gset
select public.change_studio('assign',p_studio=>:'studio_id',p_target=>:'link_id');
select public.change_studio('invite',p_studio=>:'studio_id',p_email=>'devtest1@playtested.local',p_role=>'editor');
select public.get_studio_developer_plan(:'studio_id')->>'free_campaigns_used' as used_before \gset
reset role;
select id as invitation_id from playtested_studios.invites where studio_id=:'studio_id' and user_id=:'editor_id' and status='pending' \gset
set local role authenticated;
select set_config('request.jwt.claim.sub',:'editor_id',true);
select public.change_studio('accept',p_target=>:'invitation_id');
select public.create_community_playtest(
 null,null,'6f001900-0000-4000-8000-000000000002','http://127.0.0.1:3118/demo-games/neon-courier',
 'browser_game','Play the fixture and note any controls or performance issues.',array['Controls'],
 'playtested_testers',1,15,'Test allowance',false
) as campaign_id \gset
select public.update_community_playtest(
 :'campaign_id','http://127.0.0.1:3118/demo-games/neon-courier','browser_game',
 'Play the fixture and note any controls or performance issues.',array['Controls'],
 'playtested_testers',1,15,'Test allowance','open');
select (public.get_studio_developer_plan(:'studio_id')->>'free_campaigns_used')::int = (:'used_before')::int+1 as editor_charged_owner \gset
\if :editor_charged_owner
\else
 \echo 'Editor launch failed to consume the studio owner allowance'
 select 1/0;
\endif
select set_config('request.jwt.claim.sub',:'owner_id',true);
select (public.get_studio_developer_plan(:'studio_id')->>'free_campaigns_used')::int = (:'used_before')::int+1 as owner_sees_same_usage \gset
\if :owner_sees_same_usage
\else
 \echo 'Owner sees a different studio allowance'
 select 1/0;
\endif
rollback;
\echo 'PASS Editor launch consumes the same existing Free campaign allowance as the Owner.'

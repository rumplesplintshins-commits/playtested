-- Run only in the fresh, network-disabled production restore used for this hotfix.
-- Copy the migration to /tmp/steam-storefront-hotfix.sql in that container first.
\set ON_ERROR_STOP on
select current_database()='developer_teams_gate' and
 current_setting('cron.launch_active_jobs',true)='off' as isolated \gset
\if :isolated
\else
select 1/0;
\endif

select l.developer_id as owner,l.imported_game_id as ashen from public.game_developer_links l
where l.id='283bc306-0315-49b0-9e36-0426b570132a' \gset
select imported_game_id as starfall from public.game_developer_links where id='b8f7c1fa-1cad-4bb2-88c0-13b0df95a7aa' \gset
select imported_game_id as tiny from public.game_developer_links where id='be8ff3a7-2e78-4ff1-800c-2b47afcbeb73' \gset

create function pg_temp.assert_true(condition boolean, message text) returns void language plpgsql as $$
begin
 if condition is distinct from true then raise exception '%',message; end if;
end $$;

create function pg_temp.expect_collision(studio uuid,link uuid) returns void language plpgsql as $$
declare violated text;
begin
 begin
  perform public.change_studio('assign',p_studio=>studio,p_target=>link);
  raise exception 'Expected the old assignment collision';
 exception when unique_violation then
  get stacked diagnostics violated=constraint_name;
  perform pg_temp.assert_true(violated='studio_allowance_game','Unexpected constraint: '||violated);
 end;
end $$;

create function pg_temp.expect_error(command text, message_fragment text) returns void language plpgsql as $$
begin
 begin
  execute command;
  raise exception 'Expected the operation to fail';
 exception when others then
  if position(message_fragment in sqlerrm)=0 then raise; end if;
 end;
end $$;

create temp table ledger_before as select * from playtested_studios.launches;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub',:'owner',true);
select public.change_studio('create',p_name=>'Offline Storefront QA')->>'id' as studio \gset
select public.change_studio('assign',p_studio=>:'studio',p_target=>'283bc306-0315-49b0-9e36-0426b570132a');
select pg_temp.expect_collision(:'studio','b8f7c1fa-1cad-4bb2-88c0-13b0df95a7aa');
select pg_temp.assert_true((public.get_studio_workspace(null)->'personal_exclusions') ? 'b8f7c1fa-1cad-4bb2-88c0-13b0df95a7aa',
 'Old behavior did not exclude a personal game');
commit;

\i /tmp/steam-storefront-hotfix.sql

select pg_temp.assert_true(not exists(
 (select * from ledger_before except select * from playtested_studios.launches)
 union all (select * from playtested_studios.launches except select * from ledger_before)
),'Historical ledger rows changed');
select pg_temp.assert_true(count(*)=6 and count(distinct game_key)=3,'Expected six corrected launches split across three games')
from playtested_studios.launch_identity_corrections;
select pg_temp.assert_true(count(distinct playtested_studios.identity(id,null,null))=3,'Distinct imported games still collide')
from public.imported_games where id in (:'ashen',:'starfall',:'tiny');
select pg_temp.assert_true(
 playtested_studios.raw_identity('000123','https://store.steampowered.com/')='steam:123'
 and playtested_studios.raw_identity(null,'https://store.steampowered.com/app/123/Slug/?utm_source=test')='steam:123'
 and playtested_studios.raw_identity(null,'https://steamcommunity.com/app/000123')='steam:123'
 and playtested_studios.raw_identity(null,'https://store.steampowered.com/?utm_source=test') is null,
 'Steam app IDs must deduplicate without treating the storefront as a game');
select steam_app_id as steam_duplicate
from public.imported_games where steam_app_id ~ '^[1-9][0-9]*$'
 and playtested_studios.raw_identity(steam_app_id,steam_url)='steam:'||steam_app_id
order by steam_app_id limit 1 \gset

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub',:'owner',true);
select pg_temp.assert_true(
 (public.get_studio_workspace(null)->'personal_exclusions') ? '283bc306-0315-49b0-9e36-0426b570132a'
 and not ((public.get_studio_workspace(null)->'personal_exclusions') ? 'b8f7c1fa-1cad-4bb2-88c0-13b0df95a7aa')
 and not ((public.get_studio_workspace(null)->'personal_exclusions') ? 'be8ff3a7-2e78-4ff1-800c-2b47afcbeb73'),
 'Personal Games exclusions are incorrect after the fix');
select pg_temp.assert_true(jsonb_array_length(public.get_studio_workspace(:'studio')->'campaigns')=2,
 'Another game’s campaigns appeared under Ashen Hollow');
select public.change_studio('assign',p_studio=>:'studio',p_target=>'b8f7c1fa-1cad-4bb2-88c0-13b0df95a7aa');
select public.change_studio('assign',p_studio=>:'studio',p_target=>'be8ff3a7-2e78-4ff1-800c-2b47afcbeb73');
select pg_temp.expect_error(format($q$select public.create_game_with_pc_requirements(
 jsonb_build_object('title','Offline Steam duplicate','developer_name','Offline QA','genre','Action',
 'description','Offline fixture','game_link',%L,
 'image_url','https://fixture.invalid/icon','release_status','Not announced','ai_type','No AI used','platform','steam'))$q$,
 'https://steamcommunity.com/app/'||:'steam_duplicate'),
 'already has a listing');
select pg_temp.expect_error($q$select public.create_game_with_pc_requirements(
 jsonb_build_object('title','Offline Storefront listing','developer_name','Offline QA','genre','Action',
 'description','Offline fixture','game_link','https://store.steampowered.com/',
 'image_url','https://fixture.invalid/icon','release_status','Not announced','ai_type','No AI used','platform','steam'))$q$,
 'Use the individual Steam app page');
reset role;

-- Model a recent Starfall launch and expired Tiny Kingdoms launches only inside
-- this rollback transaction, then exercise the publishing trigger's quota
-- helper. The historic imported fixtures lack the approved claims required to
-- publish a new round, and this test must not create invented ownership.
update playtested_studios.launches l set launched_at=clock_timestamp() -
 case when c.imported_game_id=:'starfall' then interval '1 day' else interval '31 days' end
from public.community_playtests c where c.id=l.campaign_id;
update public.community_playtests set status='closed'
where imported_game_id in (:'starfall',:'tiny') and status in ('open','paused');
set local role authenticated;
select set_config('request.jwt.claim.sub',:'owner',true);
select public.create_community_playtest(:'starfall',null,null,'https://fixture.invalid/build','browser_game',
 'Run the offline fixture and report any issues with movement.',array['Controls'],'playtested_testers',1,15,'Offline test',false) as star_draft \gset
select public.create_community_playtest(:'tiny',null,null,'https://fixture.invalid/build','browser_game',
 'Run the offline fixture and report any issues with movement.',array['Controls'],'playtested_testers',1,15,'Offline test',false) as tiny_draft \gset
reset role;
select pg_temp.expect_error(format($q$select playtested_studios.first_launch(c,clock_timestamp())
 from public.community_playtests c where c.id=%L$q$,:'star_draft'),'Free launch cooldown');
select playtested_studios.first_launch(c,clock_timestamp()) from public.community_playtests c where c.id=:'tiny_draft';
select pg_temp.expect_error(format($q$select playtested_studios.first_launch(c,clock_timestamp())
 from public.community_playtests c where c.id=%L$q$,:'star_draft'),'Workspace allowance');
set local role authenticated;
select pg_temp.assert_true((public.get_studio_developer_plan(:'studio')->>'rounds_used')::int=1,
 'Publishing did not consume exactly one studio allowance');
rollback;
\echo PASS: live-data collision reproduced; personal exclusions, independent assignments, Steam duplicates, history preservation and allowance checks passed.

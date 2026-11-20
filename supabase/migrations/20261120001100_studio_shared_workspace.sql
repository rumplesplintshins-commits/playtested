begin;
create function playtested_studios.shared_owner(p_kind text,p_id uuid,p_edit boolean default false)
returns uuid language sql stable security definer set search_path='' as $$
 select s.owner_id
 from playtested_studios.games g
 join playtested_studios.studios s on s.id=g.studio_id
 join public.game_developer_links l on l.id=g.link_id and l.developer_id=s.owner_id
 where playtested_studios.my_role(s.id)=any(case when p_edit then array['owner','editor'] else array['owner','editor','viewer'] end)
 and ((p_kind='imported' and l.imported_game_id=p_id) or(p_kind='approved' and l.approved_game_id=p_id)
   or(p_kind='submission' and l.submission_id=p_id and exists(select 1 from public.game_submissions a where a.id=p_id and a.status='Approved' and a.developer_id=s.owner_id)))
 order by s.id limit 1
$$;
create function playtested_studios.can_campaign(p_id uuid,p_edit boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_playtests c where c.id=p_id and
  (c.developer_id=auth.uid() or exists(
   select 1 from playtested_studios.games g join playtested_studios.studios s on s.id=g.studio_id and s.owner_id=c.developer_id
   join public.game_developer_links l on l.id=g.link_id and l.developer_id=s.owner_id
   where playtested_studios.my_role(s.id)=any(case when p_edit then array['owner','editor'] else array['owner','editor','viewer'] end)
   and (l.imported_game_id=c.imported_game_id or l.approved_game_id=c.approved_game_id or(l.submission_id=c.submission_id
    and exists(select 1 from public.game_submissions a where a.id=l.submission_id and a.status='Approved' and a.developer_id=s.owner_id)))
  )))
$$;

-- Campaign access is gained only through this studio's explicit game link and the
-- campaign's original developer. No ownership links or private table grants change.
create function public.get_studio_workspace(p_studio uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text:=playtested_studios.my_role(p_studio);
begin
 if p_studio is not null and r is null then raise exception 'Studio unavailable.' using errcode='42501'; end if;
 return (
 with links as (
  select l.* from playtested_studios.games g
   join playtested_studios.studios s on s.id=g.studio_id
   join public.game_developer_links l on l.id=g.link_id and l.developer_id=s.owner_id
   where g.studio_id=p_studio and (l.submission_id is null or exists(select 1 from public.game_submissions a where a.id=l.submission_id and a.status='Approved' and a.developer_id=s.owner_id))
 ), campaigns as (
  select distinct c.* from public.community_playtests c join links l on c.developer_id=l.developer_id
    and (c.imported_game_id=l.imported_game_id or c.approved_game_id=l.approved_game_id or c.submission_id=l.submission_id)
 ), feedback as (
  select c.id playtest_id,c.imported_game_id,c.approved_game_id,c.submission_id,c.release_label,c.status playtest_status,c.target_testers,c.created_at,
   count(t.id) accepted_test_count,count(t.overall_score) rated_test_count, avg(t.overall_score) average_overall_score,
   avg(t.gameplay_score) average_gameplay_score,avg(t.performance_score) average_performance_score,avg(t.hours_played) average_hours_played,
   100*avg(case when t.recommend_game in ('definitely','probably') then 1 when t.recommend_game in ('maybe','probably_not','definitely_not') then 0 end) recommend_positive_percent,
   100*avg(case when t.continue_playing in ('definitely','probably') then 1 when t.continue_playing in ('maybe','probably_not','definitely_not') then 0 end) continue_positive_percent,
   count(*) filter(where nullif(btrim(t.bugs_found),'') is not null) technical_feedback_count
  from campaigns c left join public.community_game_tests t on t.playtest_id=c.id and t.status='reviewed' and t.review_outcome='accepted' and t.replacement_at is null
  group by c.id,c.imported_game_id,c.approved_game_id,c.submission_id,c.release_label,c.status,c.target_testers,c.created_at
 )
 select jsonb_build_object('role',r,'studios',public.get_my_studios(),
  'personal_exclusions',coalesce((select jsonb_agg(g.link_id) from playtested_studios.games g join playtested_studios.studios s on s.id=g.studio_id where s.owner_id=auth.uid()),'[]'::jsonb),
  'links',coalesce((select jsonb_agg(to_jsonb(l)) from links l),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from campaigns c),'[]'::jsonb),
  'receptions',coalesce((select jsonb_agg(to_jsonb(f)) from feedback f),'[]'::jsonb),
  'listings',coalesce((select jsonb_agg(jsonb_build_object('kind',case when l.imported_game_id is not null then 'imported' when l.approved_game_id is not null then 'approved' else 'submission' end,
   'id',coalesce(l.imported_game_id,l.approved_game_id,l.submission_id),'title',coalesce(i.title,a.title,g.title),'developer_name',coalesce(i.developer_name,a.developer_name,g.developer_name),
   'genre',coalesce(i.genre,a.genre,g.genre),'image_url',coalesce(i.image_url,a.image_url,g.image_url),'steam_app_id',coalesce(i.steam_app_id::text,a.steam_app_id::text,g.steam_app_id::text)))
   from links l left join public.imported_games i on i.id=l.imported_game_id left join public.approved_games a on a.id=l.approved_game_id
   left join public.game_submissions g on g.id=l.submission_id),'[]'::jsonb)
 ));
end $$;
revoke all on function public.get_studio_workspace(uuid) from public,anon,authenticated;
grant execute on function public.get_studio_workspace(uuid) to authenticated;

-- Reuse installed campaign validation and launch triggers. The effective developer
-- for a delegated launch is the original owner, so the existing ledger consumes
-- the same plan quota for both callers. Never substitute the request's identity.
do $$
declare f record; definition text; revised text; needle text; replacement text;
begin
 for f in select p.oid,p.proname from pg_proc p where p.pronamespace='public'::regnamespace
  and p.proname in ('get_developer_accepted_playtest_feedback','get_developer_community_playtest_results',
   'get_developer_playtested_test_progress','get_developer_feedback_genres','get_campaign_testing_details',
   'create_community_playtest','update_community_playtest')
 loop
  definition:=pg_get_functiondef(f.oid);
  if f.proname='create_community_playtest' then
   needle:='select count(*)';
   replacement:=$sql$v_user_id := coalesce(playtested_studios.shared_owner(
    case when p_imported_game_id is not null then 'imported' when p_approved_game_id is not null then 'approved' else 'submission' end,
    coalesce(p_imported_game_id,p_approved_game_id,p_submission_id),true),v_user_id);
  select count(*)$sql$;
  elsif f.proname='get_developer_feedback_genres' then
   needle:='c.developer_id=auth.uid()';replacement:='playtested_studios.can_campaign(c.id)';
  elsif f.proname='get_campaign_testing_details' then
   needle:='c.developer_id=auth.uid()';replacement:='playtested_studios.can_campaign(c.id)';
  elsif f.proname='update_community_playtest' then
   needle:='cp.developer_id = v_user_id';replacement:='playtested_studios.can_campaign(cp.id,true)';
  else
   needle:='cp.developer_id = v_user_id';replacement:='playtested_studios.can_campaign(cp.id)';
  end if;
  revised:=replace(definition,needle,replacement);
  if revised=definition then
   -- Some baselines use the compact auth.uid() predicate.
   revised:=replace(definition,'cp.developer_id=auth.uid()',case when f.proname='update_community_playtest' then 'playtested_studios.can_campaign(cp.id,true)' else 'playtested_studios.can_campaign(cp.id)' end);
  end if;
  if revised=definition then raise exception 'Review authorization predicate for % before applying studio support.',f.proname; end if;
  if f.proname='update_community_playtest' then
   if position('and developer_id = v_user_id' in revised)=0 then raise exception 'Review campaign update owner predicate.';end if;
   revised:=replace(revised,'and developer_id = v_user_id','and playtested_studios.can_campaign(p_playtest_id,true)');
  end if;
  execute revised;
 end loop;
end $$;
commit;

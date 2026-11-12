-- Narrow read models for existing private feedback/profile tables.
-- No table grants, RLS changes, identity exposure, or rank-rule changes.
begin;

create function public.get_developer_feedback_genres(p_playtest_id uuid)
returns table(test_id uuid, preferred_genres text[])
language sql stable security definer set search_path='' as $$
 select t.id,
   case when coalesce(r.restricted,false) then '{}'::text[]
        else coalesce(p.preferred_genres,'{}'::text[]) end
 from public.community_game_tests t
 join public.community_playtests c on c.id=t.playtest_id
 left join public.profiles p on p.id=t.tester_id
 left join public.tester_privacy_restrictions r on r.tester_id=t.tester_id
 where auth.uid() is not null and c.developer_id=auth.uid()
   and c.id=p_playtest_id and t.status='reviewed'
   and t.review_outcome='accepted' and t.replacement_at is null;
$$;
revoke all on function public.get_developer_feedback_genres(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_developer_feedback_genres(uuid) to authenticated;

create function public.get_public_imported_playtest_feedback(p_imported_game_id uuid)
returns table(
 id uuid, playtest_id uuid, overall_score integer, gameplay_score integer,
 performance_score integer, recommend_game text, continue_playing text,
 hours_played numeric, enjoyed_most text, frustrations text, bugs_found text,
 biggest_improvement text, feedback text, submitted_at timestamptz,
 current_rank integer
)
language sql stable security definer set search_path='' as $$
 with publishable as materialized (
   select t.*
   from public.community_game_tests t
   join public.community_playtests c on c.id=t.playtest_id
   join public.imported_games g on g.id=c.imported_game_id
   where g.id=p_imported_game_id and g.catalogue_eligible
     and coalesce(g.catalogue_review_status,'eligible')='eligible'
     and exists(select 1 from public.m26_public_imported_profiles(array[g.id]))
     and not public.beta_fixture_hidden(g.id)
     and not public.beta_fixture_hidden(c.id)
     and not public.beta_fixture_hidden(c.submission_id)
     and not public.beta_fixture_hidden(c.approved_game_id)
     and c.published_at is not null and c.status in ('open','paused','closed')
     and t.status='reviewed' and t.review_outcome='accepted'
     and t.replacement_at is null
 ), numbered as (
   select p.id, (row_number() over(order by p.id)-1)/500 as batch
   from publishable p
 ), batches as (
   select array_agg(n.id) as ids from numbered n group by n.batch
 ), ranks as materialized (
   -- Reuse the existing rank-only authorisation and privacy guard, within its
   -- 500-ID limit even for games with more than 500 historical reports.
   select r.* from batches b
   cross join lateral public.get_feedback_tester_identities(b.ids) r
 )
 select p.id,p.playtest_id,p.overall_score,p.gameplay_score,p.performance_score,
   p.recommend_game,p.continue_playing,p.hours_played,p.enjoyed_most,
   p.frustrations,p.bugs_found,p.biggest_improvement,p.feedback,p.submitted_at,
   r.current_rank
 from publishable p left join ranks r on r.test_id=p.id
 order by p.reviewed_at asc nulls last,p.id;
$$;
revoke all on function public.get_public_imported_playtest_feedback(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_public_imported_playtest_feedback(uuid) to anon,authenticated;

notify pgrst,'reload schema';
commit;

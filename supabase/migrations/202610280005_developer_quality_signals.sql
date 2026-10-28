begin;
create function public.get_developer_quality_reports(p_playtest_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.community_playtests c where c.id=p_playtest_id and c.developer_id=auth.uid()) then
   raise exception 'Developer access required.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'outcome',t.review_outcome,
   'overall',t.overall_score,'enjoyed',t.enjoyed_most,'frustrations',t.frustrations,
   'improvement',t.biggest_improvement,'bugs',t.bugs_found,'feedback',t.feedback,
   'submitted_at',t.submitted_at) order by t.submitted_at),'[]')
 from public.community_game_tests t where t.playtest_id=p_playtest_id and t.status in ('submitted','reviewed'));
end;
$$;
revoke all on function public.get_developer_quality_reports(uuid) from public,anon;
grant execute on function public.get_developer_quality_reports(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;

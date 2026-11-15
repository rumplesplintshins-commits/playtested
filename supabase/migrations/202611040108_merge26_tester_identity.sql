-- Rank-only public feedback: no permanent public tester numbers or identity mapping.
begin;
create function public.get_feedback_tester_identities(p_test_ids uuid[])
returns table(test_id uuid,current_rank integer)
language sql stable security definer set search_path='' as $$
 select t.id, public.tester_rank(p.id)
 from public.community_game_tests t
 left join public.community_playtests c on c.id=t.playtest_id
 left join public.profiles p on p.id=t.tester_id
 where t.id=any(p_test_ids) and cardinality(p_test_ids)<=500 and (
 exists(select 1 from public.profiles a where a.id=auth.uid() and a.role='admin')
 or (t.status='reviewed' and t.review_outcome='accepted' and (
  c.developer_id=auth.uid() or exists(select 1 from public.game_submissions own where own.id=t.submission_id and own.developer_id=auth.uid())
  or (not public.beta_fixture_hidden(coalesce(c.id,t.submission_id)) and
   (exists(select 1 from public.approved_games g where g.id in(c.submission_id,c.approved_game_id,t.submission_id))
    or exists(select 1 from public.m26_public_imported_profiles(array[c.imported_game_id]))))
 )));
$$;
revoke all on function public.get_feedback_tester_identities(uuid[]) from public;
grant execute on function public.get_feedback_tester_identities(uuid[]) to anon,authenticated;
commit;

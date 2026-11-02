begin;

create or replace function public.get_developer_test_rank(p_test_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select public.tester_rank(t.tester_id)
  from public.community_game_tests t
  join public.community_playtests c on c.id = t.playtest_id
  where t.id = p_test_id
    and t.review_outcome = 'accepted'
    and c.developer_id = auth.uid();
$$;

revoke all on function public.get_developer_test_rank(uuid) from public, anon;
grant execute on function public.get_developer_test_rank(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

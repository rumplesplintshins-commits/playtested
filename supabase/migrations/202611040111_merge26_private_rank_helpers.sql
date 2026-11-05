-- Public callers resolve identities only through authorised feedback, never by
-- probing a private profile UUID. Definer-owned service RPCs retain rank access.
begin;
revoke all on function public.tester_rank(uuid) from public,anon,authenticated;
grant execute on function public.tester_rank(uuid) to service_role;
revoke all on function public.get_developer_test_rank(uuid) from public,anon;
grant execute on function public.get_developer_test_rank(uuid) to authenticated;
commit;

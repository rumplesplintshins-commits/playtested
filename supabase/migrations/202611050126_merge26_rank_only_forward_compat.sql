-- Forward-only reconciliation for hosted development databases which already
-- applied the earlier permanent-number design. Fresh production installations
-- from migrations 108 and 124 already return rank-only data.
begin;
do $m26$
declare result_type text;
begin
 select pg_get_function_result('public.get_feedback_tester_identities(uuid[])'::regprocedure)
 into result_type;
 if result_type like '%public_number%' then
   -- Preserve the old implementation only as an inaccessible migration-era
   -- function. Do not delete historical mappings during this migration.
   alter function public.get_feedback_tester_identities(uuid[])
     rename to _m26_legacy_numbered_feedback_identities;
   revoke all on function public._m26_legacy_numbered_feedback_identities(uuid[])
     from public,anon,authenticated,service_role;
   execute $sql$
     create function public.get_feedback_tester_identities(p_test_ids uuid[])
     returns table(test_id uuid,current_rank integer)
     language sql stable security definer set search_path='' as $body$
       select f.test_id,
              case when coalesce(r.restricted,false) then null else f.current_rank end
       from public._m26_unrestricted_feedback_identities(p_test_ids) f
       left join public.community_game_tests t on t.id=f.test_id
       left join public.tester_privacy_restrictions r on r.tester_id=t.tester_id
     $body$
   $sql$;
   revoke all on function public.get_feedback_tester_identities(uuid[]) from public;
   grant execute on function public.get_feedback_tester_identities(uuid[]) to anon,authenticated;
 elsif result_type <> 'TABLE(test_id uuid, current_rank integer)' then
   raise exception 'Unexpected feedback identity resolver result type: %',result_type;
 end if;
end
$m26$;
-- Old development installations also installed a profile trigger which
-- allocates numbers whenever tester roles are added or updated. Stop it.
-- Retain historical mappings for controlled review; do not silently erase them.
drop trigger if exists allocate_tester_public_identity on public.profiles;
-- The old allocator function remains inaccessible to anon/authenticated.
revoke all on function public._allocate_tester_public_identity() from public,anon,authenticated,service_role;
commit;

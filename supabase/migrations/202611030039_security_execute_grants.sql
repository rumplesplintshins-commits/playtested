-- Security hardening: narrow EXECUTE grants on admin-only SECURITY DEFINER functions.
--
-- award_developer_xp and get_admin_community_test_reviews internally require an
-- admin via auth.uid() in their function bodies. No public caller requires anon
-- or authenticated EXECUTE on them; granting EXECUTE to anon/authenticated is
-- unnecessary attack surface if a future change weakens the internal admin check.
-- Revoke EXECUTE from anon and authenticated; service_role retains access via
-- server-side SDK calls. Idempotent: no-ops if a function is absent.

begin;

do $$
declare
  target text;
begin
  target := 'public.award_developer_xp';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'award_developer_xp'
  ) then
    execute format('revoke execute on function %s from anon, authenticated', target);
  end if;

  target := 'public.get_admin_community_test_reviews';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_admin_community_test_reviews'
  ) then
    execute format('revoke execute on function %s from anon, authenticated', target);
  end if;
end $$;

commit;
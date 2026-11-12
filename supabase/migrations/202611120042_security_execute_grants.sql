-- Security hardening: narrow EXECUTE grants on admin-only SECURITY DEFINER functions.
--
-- Supabase Security Advisor reported:
--   - award_developer_xp: executable by anon + authenticated + PUBLIC
--   - get_admin_community_test_reviews: executable by anon + authenticated + PUBLIC
--
-- Both functions internally require an admin via auth.uid() in their bodies.
-- No public caller requires anon/authenticated/PUBLIC EXECUTE on them.
--
-- Caller analysis for award_developer_xp (finding #2):
--   Grep of the entire repository found NO application code, migration, or
--   test that calls award_developer_xp. It is a standalone admin RPC that is
--   only reachable through direct invocation (e.g. admin dashboard). Revoking
--   EXECUTE from PUBLIC/anon/authenticated does not break any existing caller.
--   service_role retains EXECUTE via server-side SDK calls.
--
-- Revoke EXECUTE from PUBLIC, anon, and authenticated. Idempotent: no-ops if
-- a function is absent.

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
    execute format('revoke execute on function %s from public, anon, authenticated', target);
  end if;

  target := 'public.get_admin_community_test_reviews';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_admin_community_test_reviews'
  ) then
    execute format('revoke execute on function %s from public, anon, authenticated', target);
  end if;
end $$;

commit;
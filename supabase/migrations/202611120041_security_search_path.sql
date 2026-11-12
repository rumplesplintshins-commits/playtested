-- Security hardening: fix mutable search_path on privileged functions.
--
-- Supabase Security Advisor flagged 3 functions with mutable search_path:
--   normalize_game_identity(text), set_technical_test_run_updated_at(),
--   set_game_build_updated_at()
--
-- Functions without SET search_path = '' are vulnerable to search-path
-- injection: an attacker can place a same-named function in an earlier
-- schema and hijack execution when the function is called through a
-- SECURITY DEFINER path with an uncontrolled search_path.
--
-- This migration sets search_path = '' on each function if it exists.
-- Idempotent: ALTER FUNCTION ... SET search_path is a no-op if already set.
-- No-ops if a function is absent (e.g. not yet applied to a target env).

begin;

do $$
declare
  target text;
begin
  -- normalize_game_identity(text): used by find_possible_game_duplicates (027)
  -- and by catalogue duplicate discovery. Must already exist in target DB.
  target := 'public.normalize_game_identity(text)';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'normalize_game_identity'
      and pg_get_function_identity_arguments(p.oid) = 'text'
  ) then
    execute format('alter function %s set search_path = ''''', target);
  end if;

  -- set_technical_test_run_updated_at(): trigger/helper flagged by Advisor.
  target := 'public.set_technical_test_run_updated_at()';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_technical_test_run_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute format('alter function %s set search_path = ''''', target);
  end if;

  -- set_game_build_updated_at(): trigger/helper flagged by Advisor.
  target := 'public.set_game_build_updated_at()';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_game_build_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute format('alter function %s set search_path = ''''', target);
  end if;
end $$;

commit;
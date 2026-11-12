-- Security hardening: fix mutable search_path on privileged functions.
-- Functions without SET search_path = '' are vulnerable to search-path injection:
-- an attacker can place a same-named function in an earlier schema and hijack execution.
-- All three functions exist in production; this migration is idempotent and no-ops
-- if any function is absent (e.g. not yet applied to a target environment).

begin;

do $$
declare
  target text;
begin
  -- normalize_game_identity(text) is used by find_possible_game_duplicates (027)
  -- and by catalogue duplicate discovery. It is referenced but not defined in
  -- any applied migration, so it must already exist in the target database.
  target := 'public.normalize_game_identity(text)';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'normalize_game_identity'
      and pg_get_function_identity_arguments(p.oid) = 'text'
  ) then
    execute format('alter function %s set search_path = ''''', target);
  end if;

  -- set_technical_test_run_updated_at() is a trigger/helper function flagged
  -- by Supabase Security Advisor for a mutable search path.
  target := 'public.set_technical_test_run_updated_at()';
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_technical_test_run_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute format('alter function %s set search_path = ''''', target);
  end if;

  -- set_game_build_updated_at() is a trigger/helper function flagged
  -- by Supabase Security Advisor for a mutable search path.
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
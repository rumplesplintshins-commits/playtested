-- Security hardening: add security_barrier to flagged security_definer views.
--
-- Supabase Security Advisor reports public.approved_games and
-- public.published_game_verifications as security_definer views readable by
-- anon + authenticated. Both currently expose only public data (approved
-- catalogue rows and published verification summaries), and their underlying
-- tables (game_submissions, game_verifications) are RLS-protected so anon
-- cannot read them directly. The views are the intended public read model.
--
-- Do NOT switch to security_invoker: that would bypass the view owner's
-- bypass-rls privilege and the catalogue would disappear for anon.
-- Instead add security_barrier = true as defence in depth. This prevents the
-- planner from pushing outer-query qualifications into the view, which could
-- otherwise expose underlying-table rows that the view is designed to filter.
--
-- Idempotent: ALTER TABLE ... SET (...) is a no-op if the option is already set.
-- Each statement is guarded: if the view is absent the statement is skipped.

begin;

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'approved_games' and c.relkind = 'v'
  ) then
    execute 'alter table public.approved_games set (security_barrier = true)';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'published_game_verifications' and c.relkind = 'v'
  ) then
    execute 'alter table public.published_game_verifications set (security_barrier = true)';
  end if;
end $$;

commit;
-- Multi-platform submissions (v11 feature branch).
-- Forward-only migration. Do NOT apply to production without a separate
-- review and a production maintenance window. Existing rows keep NULL and are
-- treated as legacy Steam (platform "steam") by the shared helpers.
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='game_submissions' and column_name='platform'
  ) then
    alter table public.game_submissions add column platform text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='game_submissions' and column_name='platform'
  ) then
    alter table public.game_submissions
      add constraint game_submissions_platform_check
      check (platform is null or platform in ('steam','pc','browser','roblox','android','ios'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='imported_games' and column_name='platform'
  ) then
    alter table public.imported_games add column platform text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='imported_games' and column_name='platform'
  ) then
    alter table public.imported_games
      add constraint imported_games_platform_check
      check (platform is null or platform in ('steam','pc','browser','roblox','android','ios'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='approved_games' and column_name='platform'
  ) then
    alter table public.approved_games add column platform text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='approved_games' and column_name='platform'
  ) then
    alter table public.approved_games
      add constraint approved_games_platform_check
      check (platform is null or platform in ('steam','pc','browser','roblox','android','ios'));
  end if;
end $$;

-- Helper: normalise stored platform (NULL = legacy Steam) to a canonical value.
create or replace function public.normalize_platform(p text) returns text
language sql immutable set search_path='' as $$
  select case
    when p in ('steam','pc','browser','roblox','android','ios') then p
    else 'steam'
  end
$$;

-- Badge exposed by the catalogue/Tester Hub contract.
-- Browser -> Web, Roblox -> Roblox, Android/iOS -> Mobile, Steam/PC -> none.
create or replace function public.platform_badge(p text) returns text
language sql immutable set search_path='' as $$
  select case
    when p = 'browser' then 'Web'
    when p = 'roblox' then 'Roblox'
    when p in ('android','ios') then 'Mobile'
    else null
  end
$$;

revoke all on function public.normalize_platform(text), public.platform_badge(text) from public, anon, authenticated;
grant execute on function public.normalize_platform(text), public.platform_badge(text) to anon, authenticated;

commit;

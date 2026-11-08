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

-- approved_games is a VIEW over game_submissions in the production-derived
-- schema, so "alter table" fails there. Integration fix (merge of three
-- feature branches): replace the view definition with the platform column
-- appended; fall back to a plain column add if it is a real table. The check
-- constraint is skipped for views (Postgres 15 does not support them there);
-- value safety for views is provided by the game_submissions check above and
-- the normalize_platform helper.
do $$
declare
  v_relkind char;
begin
  select c.relkind into v_relkind
  from pg_class c
  where c.oid = 'public.approved_games'::regclass;
  if v_relkind is null then
    return;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='approved_games' and column_name='platform'
  ) then
    return;
  end if;
  if v_relkind = 'v' then
    execute 'create or replace view public.approved_games as
      select id, title, developer_name, genre, description, game_link, image_url,
             price, ai_type, ai_areas, ai_explanation, evidence_link, submitted_at,
             steam_app_id, platform
      from public.game_submissions
      where status = ''Approved'' and not beta_fixture_hidden(id)';
  else
    alter table public.approved_games add column platform text;
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

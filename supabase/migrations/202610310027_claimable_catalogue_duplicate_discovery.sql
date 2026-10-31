begin;

-- Duplicate discovery drives the developer "Claim this game" journey on the
-- submission page. Imported Steam rows are returned only when they satisfy the
-- same core displayability rules as the public catalogue. Internal/incomplete
-- Steam records therefore cannot surface as claim targets.
create or replace function public.find_possible_game_duplicates(
  p_title text,
  p_developer_name text
)
returns table(
  source text,
  record_id uuid,
  title text,
  developer_name text,
  status text
)
language sql
set search_path to 'public'
as $function$
  select
    'submission'::text as source,
    gs.id as record_id,
    gs.title,
    gs.developer_name,
    gs.status
  from public.game_submissions gs
  where
    public.normalize_game_identity(gs.title)
      = public.normalize_game_identity(p_title)
    and
    public.normalize_game_identity(gs.developer_name)
      = public.normalize_game_identity(p_developer_name)
    and gs.status not in ('Rejected', 'Needs More Information')

  union all

  select
    'approved'::text as source,
    ag.id as record_id,
    ag.title,
    ag.developer_name,
    'Approved'::text as status
  from public.approved_games ag
  where
    public.normalize_game_identity(ag.title)
      = public.normalize_game_identity(p_title)
    and
    public.normalize_game_identity(ag.developer_name)
      = public.normalize_game_identity(p_developer_name)

  union all

  select
    'imported'::text as source,
    ig.id as record_id,
    ig.title,
    ig.developer_name,
    'Catalogue listing'::text as status
  from public.imported_games ig
  where
    public.normalize_game_identity(ig.title)
      = public.normalize_game_identity(p_title)
    and
    public.normalize_game_identity(ig.developer_name)
      = public.normalize_game_identity(p_developer_name)
    and ig.catalogue_eligible = true
    and ig.metadata_backfill_status = 'complete'
    and ig.title is not null
    and ig.developer_name is not null
    and ig.genre is not null
    and ig.image_url is not null
    and not exists (
      select 1
      from public.approved_games duplicate_ag
      where nullif(trim(duplicate_ag.steam_app_id::text), '') =
            trim(ig.steam_app_id::text)
    );
$function$;

commit;

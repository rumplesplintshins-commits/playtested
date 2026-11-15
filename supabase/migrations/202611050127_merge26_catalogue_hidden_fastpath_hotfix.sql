-- Production hotfix: avoid per-game hidden-listing joins when no listing controls are active.
-- Applied to production as merge26_catalogue_hidden_fastpath_plpgsql after a SQL-language fastpath still timed out.
-- Preserve the full hidden-listing evaluation for sites with archived/test controls.
create or replace function public.m26_listing_hidden(p_id uuid,p_include_tests boolean default true) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_hidden boolean;
begin
 if not exists(select 1 from public.listing_controls where archived or (p_include_tests and is_admin_test)) then return false; end if;
 with targets as (
  select p_id id union select unnest(array[c.submission_id,c.approved_game_id,c.imported_game_id]) from public.community_playtests c where c.id=p_id
 )
 select exists(select 1 from public.listing_controls l where (l.archived or(p_include_tests and l.is_admin_test)) and
 (l.source_id in(select id from targets)
  or(l.game_kind='submission' and exists(select 1 from public.game_submissions s join public.imported_games i
    on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where s.id=l.source_id and i.id in(select id from targets)))
  or(l.game_kind='imported' and exists(select 1 from public.imported_games i join public.game_submissions s
    on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where i.id=l.source_id and s.id in(select id from targets)))))
 into v_hidden;
 return v_hidden;
end; $$;

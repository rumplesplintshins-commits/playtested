begin;
-- Additive RPC; retain the legacy RPC for old clients and application rollback.
create function public.admin_game_activity_metrics() returns jsonb
language sql stable security definer set search_path='' as $$
 with published as (
  -- Catalogue-approved view and imported profile/eligibility/dedup rules.
  -- No user search, genre, NSFW filter or pagination is applied to this total.
  select public._m261_game_identity(a.steam_app_id::text,'submission',a.id) identity
  from public.approved_games a
  union
  select public._m261_game_identity(i.steam_app_id::text,'imported',i.id)
  from public.imported_games i
  where not public.beta_fixture_hidden(i.id) and i.catalogue_eligible
    and i.metadata_backfill_status='complete'
    and i.title is not null and i.developer_name is not null
    and i.genre is not null and i.image_url is not null
    and exists(select 1 from public.m26_public_imported_profiles() p where p.imported_game_id=i.id)
    and not exists(select 1 from public.approved_games a
      where nullif(btrim(a.steam_app_id::text),'')=btrim(i.steam_app_id::text))
 ), approved_claims as (
  -- Approved requests, not unverified/manual ownership links. Retain archives.
  select c.id from public.game_claims c
  where c.status='Approved' and c.claimant_id is not null
    and (c.imported_game_id is not null or c.submission_id is not null or c.approved_game_id is not null)
    and not exists(
      select 1 from unnest(array[c.imported_game_id,c.submission_id,c.approved_game_id]) target(id)
      where target.id is not null and (
        public._m26_legacy_fixture_hidden(target.id)
        or exists(select 1 from public.listing_controls l where l.is_admin_test
          and (l.source_id=target.id
            or (l.game_kind='submission' and exists(
              select 1 from public.game_submissions s join public.imported_games i
              on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where s.id=l.source_id and i.id=target.id))
            or (l.game_kind='imported' and exists(
              select 1 from public.imported_games i join public.game_submissions s
              on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where i.id=l.source_id and s.id=target.id))))
      )
    )
 )
 select jsonb_build_object(
  'published_games',(select count(*) from published),
  'approved_claims',(select count(*) from approved_claims),
  'historical_submission_records',(select count(*) from public.game_submissions)
 );
$$;
revoke all on function public.admin_game_activity_metrics() from public,anon,authenticated;
grant execute on function public.admin_game_activity_metrics() to service_role;
comment on function public.admin_game_activity_metrics() is 'Unique published catalogue identities with Playtested profiles, all NSFW categories; approved non-fixture claim requests including archived approvals; raw all-status submission records including fixtures. No original-submission provenance or organic-growth inference.';
notify pgrst,'reload schema';
commit;

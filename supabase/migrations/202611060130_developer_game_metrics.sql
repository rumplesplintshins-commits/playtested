begin;
create function public._m261_game_identity(p_steam text,p_kind text,p_id uuid) returns text
language sql immutable set search_path='' as $$
 select case when btrim(p_steam) ~ '^[0-9]+$' then 'steam:'||coalesce(nullif(regexp_replace(btrim(p_steam),'^0+',''),''),'0') else p_kind||':'||p_id::text end;
$$;
revoke all on function public._m261_game_identity(text,text,uuid) from public,anon,authenticated;
create function public.m261_developer_game_metrics() returns jsonb
language sql stable security definer set search_path='' as $$
 with flagged as (
  select public._m261_game_identity(case when l.game_kind='submission' then s.steam_app_id::text else i.steam_app_id::text end,l.game_kind,l.source_id) identity
  from public.listing_controls l left join public.game_submissions s on l.game_kind='submission' and s.id=l.source_id
  left join public.imported_games i on l.game_kind='imported' and i.id=l.source_id where l.is_admin_test
 ), submitted as (
  select s.id,public._m261_game_identity(s.steam_app_id::text,'submission',s.id) identity
  from public.game_submissions s where s.developer_id is not null and not public._m26_legacy_fixture_hidden(s.id)
  and not exists(select 1 from flagged f where f.identity=public._m261_game_identity(s.steam_app_id::text,'submission',s.id))
 ), claimed as (
  select distinct i.id,public._m261_game_identity(i.steam_app_id::text,'imported',i.id) identity
  from public.game_developer_links l join public.imported_games i on i.id=l.imported_game_id
  left join public.game_claims c on c.id=l.source_claim_id
  where l.developer_id is not null and(l.source_claim_id is null or c.status='Approved')
  and not public._m26_legacy_fixture_hidden(i.id)
  and not exists(select 1 from flagged f where f.identity=public._m261_game_identity(i.steam_app_id::text,'imported',i.id))
 ), combined as (select identity from submitted union select identity from claimed)
 select jsonb_build_object('submitted',(select count(*) from submitted),'claimed',(select count(*) from claimed),'combined',(select count(*) from combined));
$$;
revoke all on function public.m261_developer_game_metrics() from public,anon,authenticated;
grant execute on function public.m261_developer_game_metrics() to service_role;
comment on function public.m261_developer_game_metrics() is 'All-time distinct submitted records and current approved imported ownership records; union deduplicated by normalized Steam ID, otherwise source UUID. Excludes legacy fixtures and Test/Demo identities; genuine archived history retained. No optional visitor analytics or tester identities.';
notify pgrst,'reload schema';
commit;

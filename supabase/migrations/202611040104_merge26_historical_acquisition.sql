-- Archiving a genuine game must not erase its historical acquisition activity.
begin;
create function public.m26_test_listing(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.listing_controls l where l.is_admin_test and
 (l.source_id=p_id or(l.game_kind='imported' and exists(
  select 1 from public.imported_games i join public.game_submissions s
   on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where i.id=l.source_id and s.id=p_id))));
$$;
revoke all on function public.m26_test_listing(uuid) from public;
grant execute on function public.m26_test_listing(uuid) to service_role;
do $$declare definition text;begin
 select pg_get_functiondef('public.m24_analytics_summary()'::regprocedure) into definition;
 if position('not public.beta_fixture_hidden(g.id)' in definition)=0 then raise exception 'Unexpected acquisition summary definition.';end if;
 execute replace(definition,'not public.beta_fixture_hidden(g.id)',
  'not public._m26_legacy_fixture_hidden(g.id) and not public.m26_test_listing(g.id)');
end;$$;
commit;

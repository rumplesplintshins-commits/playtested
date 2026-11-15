-- Admins use authenticated JWTs, not a separate database admin role.
-- Preserve both audited function bodies and admin access; PUBLIC is inherited.
begin;
do $$
declare signature text; target regprocedure;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('award_developer_xp','get_admin_community_test_reviews')) <> 2 then
    raise exception 'Unexpected audited RPC overloads: review signatures before applying.';
  end if;
  foreach signature in array array[
    'public.award_developer_xp(uuid,integer,text,text,uuid,text)',
    'public.get_admin_community_test_reviews()'
  ] loop
    target := pg_catalog.to_regprocedure(signature);
    if target is null then raise exception 'Missing audited dependency: %', signature; end if;
    -- Ordinary authenticated users still fail the existing auth.uid()/admin guard.
    execute pg_catalog.format('revoke execute on function %s from public, anon', target);
    execute pg_catalog.format('grant execute on function %s to authenticated, service_role', target);
  end loop;
end $$;

-- The audited XP RPC has an OUT parameter named developer_xp. With PostgreSQL's
-- default variable_conflict=error, its unqualified balance expression is ambiguous.
-- Patch only that exact expression; preserve signature, owner, ACLs and admin gate.
do $$
declare definition text;
begin
  definition := pg_catalog.pg_get_functiondef(
    'public.award_developer_xp(uuid,integer,text,text,uuid,text)'::regprocedure);
  if pg_catalog.strpos(definition,'set developer_xp = developer_xp + p_xp_amount') > 0 then
    execute pg_catalog.replace(definition,
      'set developer_xp = developer_xp + p_xp_amount',
      'set developer_xp = profiles.developer_xp + p_xp_amount');
  elsif pg_catalog.strpos(definition,'set developer_xp = profiles.developer_xp + p_xp_amount') = 0 then
    raise exception 'Unexpected XP balance expression: manual body review required.';
  end if;
end $$;
notify pgrst, 'reload schema';
commit;

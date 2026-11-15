-- Run in the Supabase SQL Editor and export the result as JSON.
-- Inspection only: no schema changes, writes, feedback text or user identifiers.
begin transaction read only;

with relations as (
  select c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity,
         c.relforcerowsecurity, c.relacl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
), functions as (
  select p.oid, p.proname, p.prosecdef, p.proconfig, p.proacl,
         pg_get_function_identity_arguments(p.oid) as arguments,
         pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
)
select jsonb_pretty(jsonb_build_object(
  'relations', (select jsonb_agg(jsonb_build_object(
    'name', r.relname, 'kind', r.relkind,
    'rls', r.relrowsecurity, 'force_rls', r.relforcerowsecurity,
    'acl', r.relacl,
    'columns', (select jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'default', pg_get_expr(d.adbin, d.adrelid)
    ) order by a.attnum)
      from pg_attribute a left join pg_attrdef d
      on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped),
    'constraints', (select jsonb_agg(pg_get_constraintdef(c.oid))
      from pg_constraint c where c.conrelid = r.oid),
    'indexes', (select jsonb_agg(indexdef) from pg_indexes i
      where i.schemaname = r.nspname and i.tablename = r.relname),
    'triggers', (select jsonb_agg(pg_get_triggerdef(t.oid))
      from pg_trigger t where t.tgrelid = r.oid and not t.tgisinternal),
    'view_definition', case when r.relkind in ('v', 'm')
      then pg_get_viewdef(r.oid, true) else null end
  ) order by r.relname) from relations r),
  'functions', (select jsonb_agg(to_jsonb(f) - 'oid' order by f.proname, f.arguments)
    from functions f),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p
    where p.schemaname = 'public'),
  'table_grants', (select jsonb_agg(to_jsonb(g))
    from information_schema.role_table_grants g where g.table_schema = 'public'),
  'column_grants', (select jsonb_agg(to_jsonb(g))
    from information_schema.role_column_grants g where g.table_schema = 'public'),
  'enums', (select jsonb_agg(to_jsonb(e)) from (
    select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as values
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname
  ) e),
  'xp_distribution', (select jsonb_build_object(
    'profile_count', count(*),
    'positive_xp_count', count(*) filter (where tester_xp > 0),
    'min', min(tester_xp), 'max', max(tester_xp),
    'percentiles', percentile_disc(array[0.25, 0.5, 0.75, 0.9, 0.95])
      within group (order by tester_xp) filter (where tester_xp > 0),
    'completed_tests_max', max(completed_tests)
  ) from public.profiles),
  'review_distribution', (select jsonb_agg(to_jsonb(s)) from (
    select status, review_outcome, xp_awarded, count(*) as tests
    from public.community_game_tests group by status, review_outcome, xp_awarded
  ) s)
)) as policy_audit;

commit;

-- security_barrier controls predicate ordering, not view-owner/RLS privileges.
-- Keep the same public relation names/types/columns/filters, without raw-table grants.
-- Parameterless, scoped definer reads live in a new non-API schema; wrappers are invoker views.
begin;
set local search_path = '';
create schema if not exists playtested_catalogue_read;
revoke all on schema playtested_catalogue_read from public;
grant usage on schema playtested_catalogue_read to anon, authenticated, service_role;

do $$
declare
  view_name text; helper_name text; definition text; allowed text[]; view_oid oid;
begin
  foreach view_name in array array['approved_games','published_game_verifications'] loop
    view_oid := pg_catalog.to_regclass('public.' || view_name);
    if view_oid is null or not exists(select 1 from pg_catalog.pg_class where oid=view_oid and relkind='v') then
      raise exception 'Missing audited catalogue view: %', view_name;
    end if;
    if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_roles r on r.oid=c.relowner
      where c.oid=view_oid and r.rolname=current_user) then
      raise exception 'Install as the existing view owner to preserve read privileges: %', view_name;
    end if;
    helper_name := 'read_' || view_name;
    allowed := case view_name when 'approved_games' then array[
      'id','title','developer_name','genre','description','game_link','image_url','price',
      'ai_type','ai_areas','ai_explanation','evidence_link','submitted_at','steam_app_id','platform'
    ] else array[
      'game_id','title','developer_name','ai_status','quality_status','quality_score','public_summary',
      'evidence_summary','ai_claims_checked','evidence_checked','game_launched','core_gameplay_tested',
      'bugs_recorded','performance_checked','limitations','updated_at','verification_status'
    ] end;
    if exists(select 1 from pg_catalog.pg_attribute where attrelid=view_oid and attnum>0
      and not attisdropped and not(attname=any(allowed))) then
      raise exception 'Unreviewed public columns in %: review projection before applying.', view_name;
    end if;
    -- Empty search_path makes pg_get_viewdef fully qualify application references.
    definition := pg_catalog.pg_get_viewdef(view_oid, true);
    if pg_catalog.strpos(definition,'playtested_catalogue_read.' || helper_name || '()') = 0 then
      if (view_name='approved_games' and (pg_catalog.strpos(definition,'public.game_submissions')=0
          or pg_catalog.strpos(definition,'''Approved''')=0 or pg_catalog.strpos(definition,'beta_fixture_hidden')=0))
        or (view_name='published_game_verifications' and (pg_catalog.strpos(definition,'public.game_verifications')=0
          or pg_catalog.strpos(definition,'public.approved_games')=0 or pg_catalog.strpos(definition,'published')=0)) then
        raise exception 'Unexpected visibility definition for %: manual review required.', view_name;
      end if;
      -- Freeze the already-reviewed public projection, never SELECT * from a raw table.
      -- The return type is the existing view row type, preserving its exact contract.
      execute pg_catalog.format(
        'create or replace function playtested_catalogue_read.%I() returns setof public.%I language sql stable security definer set search_path = '''' as %L',
        helper_name,view_name,definition);
      execute pg_catalog.format(
        'create or replace view public.%I with (security_invoker=true,security_barrier=true) as select * from playtested_catalogue_read.%I()',
        view_name,helper_name);
    elsif pg_catalog.to_regprocedure('playtested_catalogue_read.' || helper_name || '()') is null then
      raise exception 'Missing catalogue helper for %', view_name;
    end if;
    execute pg_catalog.format('alter view public.%I set (security_invoker=true,security_barrier=true)', view_name);
    execute pg_catalog.format('revoke all on function playtested_catalogue_read.%I() from public', helper_name);
    execute pg_catalog.format('grant execute on function playtested_catalogue_read.%I() to anon, authenticated, service_role', helper_name);
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;

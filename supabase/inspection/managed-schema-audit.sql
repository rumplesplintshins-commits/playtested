-- Source inspection only: no application functions or DDL are executed.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT jsonb_build_object(
  'captured_at_utc', clock_timestamp(),
  'server_version', current_setting('server_version'),
  'server_version_num', current_setting('server_version_num'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'reconciliation_table_counts', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,
      'rows', ((xpath('/table/row/n/text()', query_to_xml(
        format('SELECT count(*) AS n FROM %I.%I',n.nspname,c.relname),false,false,'')))[1]::text)::bigint)
      ORDER BY n.nspname,c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND (
      (n.nspname='auth' AND c.relname='schema_migrations') OR
      (n.nspname='storage' AND c.relname IN ('migrations','buckets_vectors','vector_indexes','iceberg_namespaces','iceberg_tables')))
  ), '[]'::jsonb),
  'triggers', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
      'definition', pg_get_triggerdef(t.oid, false),
      'enabled', t.tgenabled, 'function_schema', fn.nspname,
      'function_name', p.proname, 'function_arguments', pg_get_function_identity_arguments(p.oid),
      'function_definition', pg_get_functiondef(p.oid),
      'function_owner', pg_get_userbyid(p.proowner),
      'extension_member', EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_trigger'::regclass AND d.objid=t.oid AND d.deptype='e')
    ) ORDER BY n.nspname,c.relname,t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=p.pronamespace
    WHERE n.nspname IN ('auth','storage') AND NOT t.tgisinternal
  ), '[]'::jsonb),
  'functions', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'definition', pg_get_functiondef(p.oid),
      'owner', pg_get_userbyid(p.proowner), 'security_definer', p.prosecdef,
      'extension_member', EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    ) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.prokind IN ('f','p') AND (n.nspname IN ('auth','storage') OR p.oid IN (
      SELECT t.tgfoid FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace tn ON tn.oid=c.relnamespace
      WHERE tn.nspname IN ('auth','storage') AND NOT t.tgisinternal
    ))
  ), '[]'::jsonb),
  'policies', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'name', p.polname,
      'permissive', p.polpermissive, 'command', p.polcmd,
      'roles', ARRAY(SELECT CASE WHEN r=0 THEN 'public' ELSE pg_get_userbyid(r) END FROM unnest(p.polroles) r),
      'using', pg_get_expr(p.polqual,p.polrelid),
      'with_check', pg_get_expr(p.polwithcheck,p.polrelid)
    ) ORDER BY n.nspname,c.relname,p.polname)
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('auth','storage')
  ), '[]'::jsonb),
  'relations', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,
      'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity)
      ORDER BY n.nspname,c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('auth','storage') AND c.relkind IN ('r','p','v','m','f')
  ), '[]'::jsonb)
);
COMMIT;

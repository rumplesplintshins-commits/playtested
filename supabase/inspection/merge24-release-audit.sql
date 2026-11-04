-- Read-only release audit: metadata/configuration only, no user records.
select jsonb_build_object(
 'read_only',current_setting('transaction_read_only'),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'acl',c.relacl::text,'definition',case when c.relkind='v' then pg_get_viewdef(c.oid,true) end) order by c.relname),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v')),
 'columns',(select coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl::text) order by c.relname,a.attnum),'[]') from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relkind in ('r','p','v') and a.attnum>0 and not a.attisdropped),
 'constraints',(select coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',con.conname,'definition',pg_get_constraintdef(con.oid),'validated',con.convalidated) order by c.relname,con.conname),'[]') from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('key',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')','definition',pg_get_functiondef(p.oid),'acl',p.proacl::text,'owner',pg_get_userbyid(p.proowner)) order by p.proname,pg_get_function_identity_arguments(p.oid)),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p')),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') from pg_policies p where schemaname in ('public','storage')),
 'triggers',(select coalesce(jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) order by n.nspname,c.relname,t.tgname),'[]') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage','auth') and not t.tgisinternal),
 'indexes',(select coalesce(jsonb_agg(to_jsonb(i) order by tablename,indexname),'[]') from pg_indexes i where schemaname='public'),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname) from pg_extension),
 'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) order by id) from storage.buckets),
 'migration_history',to_regclass('supabase_migrations.schema_migrations') is not null,
 'plan_policy',(select coalesce(jsonb_agg(to_jsonb(p) order by plan),'[]') from public.developer_plan_policy p),
 'testing_policy',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.testing_policy p)
) snapshot;

-- Metadata and aggregate counts only; no source data/schema mutation.
select jsonb_build_object(
 'captured_at',now(),'server_version',current_setting('server_version_num'),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'version',extversion)) from pg_extension),
 'counts',jsonb_build_object('auth.users',(select count(*) from auth.users),'auth.identities',(select count(*) from auth.identities),
 'public.profiles',(select count(*) from public.profiles),'public.imported_games',(select count(*) from public.imported_games),
 'public.game_submissions',(select count(*) from public.game_submissions),'public.community_game_tests',(select count(*) from public.community_game_tests),
 'storage.objects',(select count(*) from storage.objects),'supabase_migrations.schema_migrations',(select count(*) from supabase_migrations.schema_migrations)),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'signature',p.oid::regprocedure::text,'body',p.prosrc,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl))
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in('f','p')
 and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),
 'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'owner',pg_get_userbyid(c.relowner)))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','auth','storage','supabase_migrations') and c.relkind in('r','p')
 and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')),
 'policies',(select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'command',cmd,'roles',roles)) from pg_policies where schemaname in('public','auth','storage')),
 'migrations',(select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version) from supabase_migrations.schema_migrations),
 'storage',(select jsonb_agg(jsonb_build_object('id',id,'bucket_id',bucket_id,'name',name,'updated_at',updated_at,'version',to_jsonb(o)->>'version','size',metadata->>'size') order by bucket_id,name) from storage.objects o)
) assessment;

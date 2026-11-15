-- SELECT only. Production qtcmzckdhgahuqqilmzj. No row-level user data.
select jsonb_build_object(
 'captured_at',now(),'server_version',current_setting('server_version'),
 'migrations',(select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version) from supabase_migrations.schema_migrations),
 'counts',jsonb_build_object('imports',(select count(*) from public.imported_games),
  'eligible_imports',(select count(*) from public.imported_games where catalogue_eligible and metadata_backfill_status='complete'),
  'submissions',(select count(*) from public.game_submissions),'approved_submissions',(select count(*) from public.game_submissions where status='Approved'),
  'profiles',(select count(*) from public.profiles),'reports',(select count(*) from public.community_game_tests),
  'storage_objects',(select count(*) from storage.objects),'active_controls',(select count(*) from public.listing_controls where archived or is_admin_test)),
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'language',l.lanname,'owner',pg_get_userbyid(p.proowner),
  'definer',p.prosecdef,'acl',p.proacl,'config',p.proconfig,
  'hash',md5(btrim(replace(p.prosrc,chr(13),''),chr(32)||chr(10)||chr(9))),'definition',pg_get_functiondef(p.oid)))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where n.nspname='public' and p.proname in('beta_fixture_hidden','m26_listing_hidden','get_public_catalogue','_m26_legacy_fixture_hidden',
   'm261_developer_game_metrics','m261_validate_game_title','m261_validate_revision_title')),
 'indexes',(select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef)) from pg_indexes
  where schemaname='public' and tablename in('imported_games','game_submissions','listing_controls','listing_revisions')),
 'rls',(select jsonb_agg(jsonb_build_object('table',relname,'enabled',relrowsecurity,'forced',relforcerowsecurity)) from pg_class c
  join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relname in('game_submissions','imported_games','listing_controls','listing_revisions','game_developer_links')),
 'policies',(select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'permissive',permissive,'using',qual,'check',with_check))
  from pg_policies where schemaname='public' and tablename in('game_submissions','imported_games','listing_controls','listing_revisions','game_developer_links')),
 'triggers',(select jsonb_agg(jsonb_build_object('name',tgname,'table',tgrelid::regclass::text,'enabled',tgenabled,'definition',pg_get_triggerdef(oid)))
  from pg_trigger where not tgisinternal and tgrelid in('public.game_submissions'::regclass,'public.listing_revisions'::regclass)),
 'columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type)) from information_schema.columns
  where table_schema='public' and table_name in('game_submissions','imported_games','listing_revisions','game_developer_links','game_claims','listing_controls'))
) assessment;

-- SELECT only. Use authenticated/service integration tests for custom RPC execution.
select jsonb_build_object(
'checks',(select to_jsonb(checks) from (select current_setting('transaction_read_only') read_only,
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('game_submission_contacts','gameplay_footage','m24_page_views','m24_submission_acquisition','game_screenshots','game_screenshot_cleanup','notification_delivery_keys','contact_email_policy') and c.relrowsecurity) rls_tables_expected_8,
 not has_table_privilege('anon','public.game_submission_contacts','SELECT') contacts_anon_denied,
 not has_table_privilege('authenticated','public.game_screenshot_cleanup','SELECT') cleanup_private,
 not has_table_privilege('authenticated','public.notification_delivery_keys','SELECT') delivery_keys_private,
 not has_table_privilege('authenticated','public.contact_email_policy','UPDATE') policy_client_updates_denied,
 not has_column_privilege('authenticated','public.notifications','href','UPDATE') notification_rewrite_denied,
 has_column_privilege('authenticated','public.notifications','read_at','UPDATE') notification_read_state_allowed,
 not has_function_privilege('anon','public.get_my_developer_plan()','EXECUTE') anonymous_plan_denied,
 not has_function_privilege('authenticated','public.m24_platform_user_summary()','EXECUTE') platform_aggregate_client_denied,
 not has_function_privilege('authenticated','public.m24_analytics_summary()','EXECUTE') visitor_aggregate_client_denied,
 not has_function_privilege('authenticated','public.set_game_screenshot(uuid,smallint,text)','EXECUTE') screenshot_mutation_rpc_private,
 (select 'games'=any(allowed_suffixes) and 'studio'=any(allowed_suffixes) and 'gg'=any(allowed_suffixes) and 'de'=any(allowed_suffixes) and 'uk'=any(allowed_suffixes) and not('cock'=any(allowed_suffixes)) and 'yopmail.com'=any(blocked_providers) from public.contact_email_policy where singleton) contact_policy_configuration_matches) checks),
'plan_policy',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select plan,launch_limit,launch_window,launch_gap,rank_targeting,genre_targeting from public.developer_plan_policy order by plan) r),
'testing_policy',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select places,launches,reservation_window,reservations_activated_at from public.testing_policy) r),
'buckets',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('game-thumbnails','game-screenshots')) r),
'storage_policy',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='storage' and policyname='screenshot_storage_gateway_only') r),
'retention_job',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select jobname,schedule,active,command from cron.job where jobname='m24-analytics-retention') r)
) postflight;

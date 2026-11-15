-- SELECT only; run with --read-only. Every readiness boolean must be true.
with expected(signature,definition_md5) as (values ('_create_notification(p_recipient uuid, p_kind text, p_title text, p_message text, p_href text, p_entity_type text, p_entity_id uuid, p_dedupe_key text)','7bc4f757b095ff2e67cda2d548a5fe67'),
('get_my_developer_plan()','3537ecb6794946dbce13c1f7e745db26'),
('notify_submission_lifecycle()','7f8330267249e2cb02eca2365ad98b4b'),
('submission_completeness(p jsonb)','dd4d95683defba84197cd2643f24f524')), actual as (
 select p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' signature,md5(pg_get_functiondef(p.oid)) definition_md5
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p'))
select current_setting('transaction_read_only')='on' read_only,
 not exists(select 1 from expected e left join actual a using(signature) where a.definition_md5 is distinct from e.definition_md5) baseline_functions_unchanged,
 not exists(select 1 from unnest(array['contact_email_policy','game_screenshot_cleanup','game_screenshots','game_submission_contacts','gameplay_footage','m24_page_views','m24_submission_acquisition','notification_delivery_keys']) name where to_regclass('public.'||name) is not null) all_merge24_relations_absent,
 (select count(*)=2 and bool_and((plan='free' and launch_limit=1 and launch_gap=interval '0 hours' and not rank_targeting and not genre_targeting) or (plan='pro' and launch_limit=15 and launch_gap=interval '48 hours' and rank_targeting and genre_targeting)) and bool_and(launch_window=interval '720 hours') from public.developer_plan_policy) existing_plan_policy_matches,
 (select count(*)=1 and bool_and(places=3 and launches=1 and base_xp=100 and reservation_window=interval '72 hours' and reservations_activated_at is not null) from public.testing_policy) preserve_existing_testing_policy,
 exists(select 1 from pg_available_extensions where name='pg_cron') cron_available,
 exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity) storage_rls_enabled,
 to_regclass('supabase_migrations.schema_migrations') is null history_still_absent;

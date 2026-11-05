-- Merge 26: read-only production preflight. Run against the LIVE project before
-- any migration. This script makes no data/schema changes.
-- Expected baseline: all dependencies_present=true, merge26_absent=true.
select
 current_setting('server_version') as postgres_version,
 (select count(*) from public.profiles) as profiles_before,
 (select count(*) from public.community_game_tests) as feedback_before,
 (select count(*) from public.game_submissions) as submissions_before,
 (select count(*) from public.imported_games) as imported_before,
 (select count(*) from public.community_playtests) as campaigns_before,
 (select count(*) from public.testing_policy where singleton) as policy_rows,
 (select reservation_window::text from public.testing_policy where singleton) as reservation_window_before,
 (
  to_regclass('public.game_developer_links') is not null
  and to_regclass('public.game_screenshots') is not null
  and to_regclass('public.gameplay_footage') is not null
  and to_regclass('public.game_submission_contacts') is not null
  and to_regclass('public.m24_submission_acquisition') is not null
  and to_regclass('public.listing_revisions') is not null
  and to_regclass('public.submission_review_events') is not null
  and to_regclass('public.approved_games') is not null
  and to_regclass('public.published_game_verifications') is not null
  and to_regprocedure('public.beta_fixture_hidden(uuid)') is not null
  and to_regprocedure('public.get_game_community_reception()') is not null
 ) as dependencies_present,
 (
  to_regclass('public.listing_controls') is null
  and to_regclass('public.tester_privacy_restrictions') is null
  and to_regprocedure('public.get_feedback_tester_identities(uuid[])') is null
 ) as merge26_absent;
-- Keep before-counts and compare with a separately reviewed post-release
-- query. Do not assume counts must remain identical if live activity continues.

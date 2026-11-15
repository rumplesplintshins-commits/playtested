-- Preview seed for the campaign lifecycle + notification milestone.
-- Local-only data for 127.0.0.1:54341 (see supabase/config.toml ports).
-- Runs as the database superuser so RLS policies never block seeding.
-- Idempotent: fixed UUIDs, guarded by on-conflict clauses and existence checks.
-- session_replication_role=replica bypasses user-space guard triggers during the
-- seed itself (listing admission + launch allowances are production guards that
-- preview data deliberately bypasses); notification rows are then created through
-- _create_notification so the bell renders exactly the states the trigger flow
-- would produce in real usage.

begin;
set local session_replication_role = replica;

-- Wipe any previous copy of this preview dataset (fixed ID range 02900000-…).
delete from notifications where entity_id in (
  '02900000-0000-4000-8000-000000000081','02900000-0000-4000-8000-000000000082',
  '02900000-0000-4000-8000-000000000083','02900000-0000-4000-8000-000000000084',
  '02900000-0000-4000-8000-000000000085');
delete from notifications where dedupe_key like 'campaign:completed:02900000-0000-4000-8000-000000000083'
  or dedupe_key like 'feedback:moderation:preview-camp82-admin21'
  or dedupe_key like 'developer:feedback:preview-camp83-accepted';
delete from notification_delivery_keys where dedupe_key like 'campaign:%02900000-0000-4000-8000-000000000083'
  or dedupe_key like 'feedback:moderation:preview-camp82%'
  or dedupe_key like 'developer:feedback:preview-camp83%'
  or dedupe_key like 'campaign:test-direct';
delete from community_game_tests where playtest_id in (
  '02900000-0000-4000-8000-000000000081','02900000-0000-4000-8000-000000000082',
  '02900000-0000-4000-8000-000000000083','02900000-0000-4000-8000-000000000084',
  '02900000-0000-4000-8000-000000000085');
delete from community_playtests where id in (
  '02900000-0000-4000-8000-000000000081','02900000-0000-4000-8000-000000000082',
  '02900000-0000-4000-8000-000000000083','02900000-0000-4000-8000-000000000084',
  '02900000-0000-4000-8000-000000000085');
delete from game_submissions where id in (
  '02900000-0000-4000-8000-000000000071','02900000-0000-4000-8000-000000000072',
  '02900000-0000-4000-8000-000000000073','02900000-0000-4000-8000-000000000074',
  '02900000-0000-4000-8000-000000000075');

-- People.
--   dev1 = Preview Developer One (11), admin = Preview Admin (21),
--   tester1 = Preview Tester One (31), tester2 = Preview Tester Two (32).
insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
values
  ('02900000-0000-4000-8000-000000000011', 'dev1@preview.playtested', 'x', '{"display_name":"Preview Developer One"}'),
  ('02900000-0000-4000-8000-000000000012', 'dev2@preview.playtested', 'x', '{"display_name":"Preview Developer Two"}'),
  ('02900000-0000-4000-8000-000000000021', 'admin@preview.playtested', 'x', '{"display_name":"Preview Admin"}'),
  ('02900000-0000-4000-8000-000000000031', 'tester1@preview.playtested', 'x', '{"display_name":"Preview Tester One"}'),
  ('02900000-0000-4000-8000-000000000032', 'tester2@preview.playtested', 'x', '{"display_name":"Preview Tester Two"}')
on conflict do nothing;

insert into profiles (id, display_name, role, roles)
values
  ('02900000-0000-4000-8000-000000000011', 'Preview Developer One', 'user', array['developer','player']),
  ('02900000-0000-4000-8000-000000000012', 'Preview Developer Two', 'user', array['developer','player']),
  ('02900000-0000-4000-8000-000000000021', 'Preview Admin', 'admin', array['admin','player']),
  ('02900000-0000-4000-8000-000000000031', 'Preview Tester One', 'user', array['tester']),
  ('02900000-0000-4000-8000-000000000032', 'Preview Tester Two', 'user', array['tester'])
on conflict (id) do nothing;

-- Approved, completeness-valid games.
--   71 partial progress campaign (dev1)
--   72 pending moderation campaign (dev1)
--   73 completing-immediately campaign (dev1)
--   74 paused target nearly met (dev2)
--   75 rejected feedback campaign (dev2)
insert into game_submissions
  (id, title, status, genre, developer_id, developer_name, description, game_link, ai_type, release_status, submitted_at)
values
  ('02900000-0000-4000-8000-000000000071', 'Preview Game A', 'Approved', 'Puzzle',
   '02900000-0000-4000-8000-000000000011', 'Preview Developer One',
   'A small puzzle sandbox for testing the preview seed.', 'https://example.test/preview-a',
   'No AI disclosed', 'Not announced', now()),
  ('02900000-0000-4000-8000-000000000072', 'Preview Game B', 'Approved', 'Puzzle',
   '02900000-0000-4000-8000-000000000011', 'Preview Developer One',
   'A second puzzle sandbox campaign slot for the preview seed.', 'https://example.test/preview-b',
   'No AI disclosed', 'Not announced', now()),
  ('02900000-0000-4000-8000-000000000073', 'Preview Game C', 'Approved', 'Puzzle',
   '02900000-0000-4000-8000-000000000011', 'Preview Developer One',
   'A third puzzle sandbox campaign slot for the completed-system check.', 'https://example.test/preview-c',
   'No AI disclosed', 'Not announced', now()),
  ('02900000-0000-4000-8000-000000000074', 'Preview Game D', 'Approved', 'Action',
   '02900000-0000-4000-8000-000000000012', 'Preview Developer Two',
   'An arena action demo for the preview seed (paused, nearly complete).', 'https://example.test/preview-d',
   'No AI disclosed', 'Not announced', now()),
  ('02900000-0000-4000-8000-000000000075', 'Preview Game E', 'Approved', 'Action',
   '02900000-0000-4000-8000-000000000012', 'Preview Developer Two',
   'An arena action demo for the rejected-feedback preview path.', 'https://example.test/preview-e',
   'No AI disclosed', 'Not announced', now())
on conflict (id) do nothing;

-- camp 81: dev1, open, partial progress (claim + one submitted report, target 3).
-- camp 82: dev1, open, submitted feedback awaiting the admin moderation bell.
-- camp 83: dev1, completes during the seed (two accepted at target 2).
-- camp 84: dev2, paused with an accepted report (one decision short of target 2).
-- camp 85: dev2, open with a rejected report (never counts) plus an active claim.
insert into community_playtests
  (id, developer_id, submission_id, title, access_link, instructions, audience, target_testers, status, published_at, tester_hub_started_at)
values
  ('02900000-0000-4000-8000-000000000081', '02900000-0000-4000-8000-000000000011',
   '02900000-0000-4000-8000-000000000071', 'Preview Campaign (partial progress)',
   'https://example.test/preview-a', 'Test the movement speed and report control feel.',
   'both', 3, 'open', now(), now()),
  ('02900000-0000-4000-8000-000000000082', '02900000-0000-4000-8000-000000000011',
   '02900000-0000-4000-8000-000000000072', 'Preview Campaign (pending moderation)',
   'https://example.test/preview-b', 'Test the pause menu and report anything odd.',
   'both', 2, 'open', now(), now()),
  ('02900000-0000-4000-8000-000000000083', '02900000-0000-4000-8000-000000000011',
   '02900000-0000-4000-8000-000000000073', 'Preview Campaign (recently completed)',
   'https://example.test/preview-c', 'General playability pass.',
   'both', 2, 'open', now(), now()),
  ('02900000-0000-4000-8000-000000000084', '02900000-0000-4000-8000-000000000012',
   '02900000-0000-4000-8000-000000000074', 'Preview Campaign (paused, target nearly met)',
   'https://example.test/preview-d', 'Test the pause menu paths.',
   'both', 2, 'open', now(), now()),
  ('02900000-0000-4000-8000-000000000085', '02900000-0000-4000-8000-000000000012',
   '02900000-0000-4000-8000-000000000075', 'Preview Campaign (rejected feedback)',
   'https://example.test/preview-e', 'Test the tutorial flow and report friction.',
   'both', 2, 'open', now(), now())
on conflict (id) do nothing;

-- camp 81: one active claim, one submitted report (admin moderation alert per report).
insert into community_game_tests (playtest_id, tester_id, status, claimed_at)
values ('02900000-0000-4000-8000-000000000081', '02900000-0000-4000-8000-000000000031', 'claimed', now());
insert into community_game_tests
  (playtest_id, tester_id, status, claimed_at, submitted_at, gameplay_score, performance_score, bugs_found, feedback, hours_played, overall_score, continue_playing, recommend_game, enjoyed_most, frustrations, biggest_improvement, focus_responses)
values
   ('02900000-0000-4000-8000-000000000081', '02900000-0000-4000-8000-000000000032', 'submitted',
   now(), now(), 8, 8, 'None found', 'Controls feel responsive on the tutorial loop.',
   1.5, 8, 'definitely', 'definitely', 'Movement', 'None', 'None', '{}');

-- camp 82: one submitted report awaiting admin moderation.
insert into community_game_tests
  (playtest_id, tester_id, status, claimed_at, submitted_at, gameplay_score, performance_score, bugs_found, feedback, hours_played, overall_score, continue_playing, recommend_game, enjoyed_most, frustrations, biggest_improvement, focus_responses)
values
   ('02900000-0000-4000-8000-000000000082', '02900000-0000-4000-8000-000000000031', 'submitted',
   now(), now(), 7, 7, 'Minor overlap', 'Pause menu layout needs clearer spacing.',
   1.0, 7, 'probably', 'probably', 'Pause flow', 'Minor overlap', 'Tutorial', '{}');

-- camp 83: two accepted reports (target met).
insert into community_game_tests
  (playtest_id, tester_id, status, claimed_at, submitted_at, reviewed_at, review_outcome, review_reason, gameplay_score, performance_score, bugs_found, feedback, hours_played, overall_score, continue_playing, recommend_game, enjoyed_most, frustrations, biggest_improvement, focus_responses)
values
  ('02900000-0000-4000-8000-000000000083', '02900000-0000-4000-8000-000000000031', 'reviewed',
   now(), now(), now(), 'accepted', 'Useful beat-by-beat tutorial route observations.',
   9, 9, 'None', 'Accepted beat-by-beat observations from the tutorial route.',
   2.0, 9, 'definitely', 'definitely', 'Tutorial clarity', 'None', 'None', '{}'),
  ('02900000-0000-4000-8000-000000000083', '02900000-0000-4000-8000-000000000032', 'reviewed',
   now(), now(), now(), 'accepted', 'Concrete, useful improvement suggestions.',
   8, 8, 'None', 'Concrete, useful improvement suggestions.',
   1.5, 8, 'definitely', 'definitely', 'Suggestions', 'None', 'None', '{}');

-- camp 84: one accepted report; the campaign is paused one decision short of target 2.
insert into community_game_tests
  (playtest_id, tester_id, status, claimed_at, submitted_at, reviewed_at, review_outcome, review_reason, gameplay_score, performance_score, bugs_found, feedback, hours_played, overall_score, continue_playing, recommend_game, enjoyed_most, frustrations, biggest_improvement, focus_responses)
values
  ('02900000-0000-4000-8000-000000000084', '02900000-0000-4000-8000-000000000031', 'reviewed',
   now(), now(), now(), 'accepted', 'Readable pause overlays; solid movement.',
   8, 8, 'None', 'Readable pause overlays; solid movement.',
   1.0, 8, 'definitely', 'probably', 'Readability', 'None', 'None', '{}');
update community_playtests set status = 'paused'
where id = '02900000-0000-4000-8000-000000000084';

-- camp 85: a rejected report (never counts) and an active claim.
insert into community_game_tests
  (playtest_id, tester_id, status, claimed_at, submitted_at, reviewed_at, review_outcome, review_reason, gameplay_score, performance_score, bugs_found, feedback, hours_played, overall_score, continue_playing, recommend_game, enjoyed_most, frustrations, biggest_improvement, focus_responses)
values
  ('02900000-0000-4000-8000-000000000085', '02900000-0000-4000-8000-000000000031', 'reviewed',
   now(), now(), now(), 'rejected', 'Not yet a usable read of the tutorial flow.',
   4, 4, 'Blockers', 'Some difficulties with the tutorial flow.',
   1.0, 4, 'probably_not', 'maybe', 'Tutorial flow', 'Blockers', 'Tutorial', '{}');
insert into community_game_tests (playtest_id, tester_id, status, claimed_at)
values ('02900000-0000-4000-8000-000000000085', '02900000-0000-4000-8000-000000000032', 'claimed', now());

-- Compose the notification states the trigger flow has produced for camp 83 and
-- the pending moderation report; the bell must render exactly these surfaces.
select public._create_notification(
  '02900000-0000-4000-8000-000000000011', 'campaign_completed',
  'Campaign complete: Preview Campaign (recently completed)',
  'Target reached. Your playtest is closed. Review the accepted feedback in My Games.',
  '/my-submissions?tab=games&game=02900000-0000-4000-8000-000000000073&campaign=02900000-0000-4000-8000-000000000083',
  'playtest', '02900000-0000-4000-8000-000000000083',
  'campaign:completed:02900000-0000-4000-8000-000000000083');

select public._create_notification(
  '02900000-0000-4000-8000-000000000021', 'admin_feedback_moderation',
  'Feedback awaiting moderation: Preview Game B',
  'A tester submitted feedback that needs a quality decision.',
  '/admin/submissions', 'playtest',
  '02900000-0000-4000-8000-000000000082',
  'feedback:moderation:preview-camp82-admin21');

select public._create_notification(
  '02900000-0000-4000-8000-000000000011', 'developer_feedback_received',
  'New feedback for your game',
  'Preview Game C has new accepted tester feedback.',
  '/my-submissions?tab=games&game=02900000-0000-4000-8000-000000000073&campaign=02900000-0000-4000-8000-000000000083',
  'playtest', '02900000-0000-4000-8000-000000000083',
  'developer:feedback:preview-camp83-accepted');

-- Keep camp 83 in the visibly completed state.
update community_playtests
set status = 'closed', completed_at = now()
where id = '02900000-0000-4000-8000-000000000083';

commit;

import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Campaign completion lifecycle regression test:
// - claims and submitted (unreviewed) feedback never complete a campaign
// - rejected feedback never counts toward the target
// - admin-approved accepted reports are the only completion currency
// - completion is idempotent, exactly-once notified, works from 'paused' and
//   deep-links to the correct game/campaign in My Games
// - feedback moderation still alerts admins without duplicates; reconsiderations alert once
// - existing notification kinds (game approval/Needs Info) are untouched
// - developer target/allowance preservation (fix_free_target) is unchanged

const db = new PGlite();
const sql = async s => db.exec(s);
const one = async s => (await db.query(s)).rows[0];
const rows = async s => (await db.query(s)).rows;
const id = n => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rubric = version => JSON.stringify({
  rubric_version: version,
  scores: { specific: true, examples: true, impact: true, focus: true, takeaway: true },
  eligibility: { original: true, relevant: true },
}).replace(/'/g, "''");
const rubricVersion = async () => (await one(`select version from feedback_quality_rubrics where active`)).version;
const reviewAs = async (admin, testId, outcome, reason) => {
  await as(admin);
  await sql(`select review_test_quality('${testId}','${outcome}','${reason}','${rubric(await rubricVersion())}'::jsonb)`);
};
const as = async uid => sql(`set test.uid='${id(uid)}'`);

try {
  // v10-fixture.sql provides the sandbox roles, auth schema and auth.uid().

  await sql(await readFile('supabase/tests/v10-fixture.sql', 'utf8'));
  // Workflow floor through reservations/graded-quality/entitlements (the games
  // older than the admission era are not in scope here).
  const files = (await readdir('supabase/migrations')).sort();
  for (const f of files.filter(f => f < '202610280015_')) {
    await sql(await readFile(`supabase/migrations/${f}`, 'utf8'));
  }
  // Notification floor (game approval/Needs Info/tester kinds preserved verbatim).
  for (const f of ['202611010029_notifications.sql','202611010030_notification_events.sql','202611010031_feedback_usefulness.sql','202611010033_feedback_useful_notification_kind.sql','202611010034_feedback_notification_deeplink.sql','202611020035_notification_management.sql','202611020037_free_places_and_build_label.sql','202611040013_notification_routing.sql']) {
    await sql(await readFile(`supabase/migrations/${f}`, 'utf8'));
  }
  // Minimal stubs for the production-only listing catalogue lookups (presentational).
  await sql(`create table public.listing_states(game_key text primary key, published jsonb not null default '{}'::jsonb);`);
  await sql(await readFile('supabase/migrations/202611040115_merge26_immediate_feedback_approval.sql', 'utf8'));
  // The feature under test.
  await sql(await readFile('supabase/migrations/202611080100_campaign_completion_notifications.sql', 'utf8'));
  // Campaign capacity era: current policy places apply to fresh launches.
  await sql(await readFile('supabase/migrations/202611050121_merge26_new_campaign_capacity.sql', 'utf8'));

  // People: two developers, two admins, four testers.
  await sql(`insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(8)}'),('${id(9)}'),('${id(11)}'),('${id(12)}'),('${id(13)}'),('${id(14)}');`);
  await sql(`insert into profiles(id,role,roles,tester_xp) values
   ('${id(1)}','user',array['developer'],0),('${id(2)}','user',array['developer'],0),
   ('${id(8)}','admin',array['admin'],0),('${id(9)}','admin',array['admin'],0),
   ('${id(11)}','user',array['tester'],0),('${id(12)}','user',array['tester'],0),
   ('${id(13)}','user',array['tester'],0),('${id(14)}','user',array['tester'],0)`);
  const adminCount = (await one(`select count(*)::int n from profiles where role='admin'`)).n;

  // Games (one per developer) and campaigns:
  // A: launched under the current policy (3 places) - driven through moderation to completion.
  // B: launched during a smaller-capacity window - proves a previously granted target keeps completing.
  const DEFAULT_PLACES = (await one(`select places from testing_policy`)).places;
  await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type,release_status) values
   ('${id(30)}','Progress campaign','Approved','Puzzle','${id(1)}','Dev One','Description','https://example.test/a','No AI disclosed','Not announced'),
   ('${id(31)}','Preserved target','Approved','Action','${id(2)}','Dev Two','Description','https://example.test/b','No AI disclosed','Not announced')`);
  await sql(`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,target_testers) values
   ('${id(40)}','${id(1)}','${id(30)}','Progress campaign','https://example.test/a','Test the movement','draft','both',99)`);
  assert.equal((await one(`select target_testers from community_playtests where id='${id(40)}'`)).target_testers, DEFAULT_PLACES, 'fresh insert takes the policy places at launch time');
  await sql(`update testing_policy set places=2`);
  await sql(`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,target_testers) values
   ('${id(41)}','${id(2)}','${id(31)}','Preserved target','https://example.test/b','Test the movement','draft','both',33)`);
  await sql(`update testing_policy set places=${DEFAULT_PLACES}`);
  assert.equal((await one(`select target_testers from community_playtests where id='${id(41)}'`)).target_testers, 2, 'fresh insert under a smaller window takes that places value');
  // Developer updates keep the previously saved target (fix_free_target).
  await sql(`update community_playtests set target_testers=${DEFAULT_PLACES + 4} where id='${id(41)}'`);
  assert.equal((await one(`select target_testers from community_playtests where id='${id(41)}'`)).target_testers, 2, 'saved target survives updates and later policy changes');
  await sql(`update community_playtests set status='open' where id in ('${id(40)}','${id(41)}')`);

  const counts = async where => (await db.query(`select count(*)::int n from notifications where ${where}`)).rows[0].n;

  // ---- Campaign A: three testers claim, then submit. Claims/submissions never complete. ----
  const aTests = {};
  for (const t of [11, 12, 13]) {
    await as(t);
    aTests[t] = (await one(`select claim_community_game_test('${id(40)}') r`)).r;
  }
  for (const t of [11, 12, 13]) {
    await as(t);
    await sql(`select start_community_game_test('${aTests[t]}');select submit_community_game_test('${aTests[t]}',8,8,'No bugs','',0,8,'definitely','definitely','Puzzles','None','None','{}')`);
  }
  assert.equal(await counts("kind='campaign_completed'"), 0, 'claims and submissions never complete a campaign');
  assert.equal((await one(`select status from community_playtests where id='${id(40)}'`)).status, 'open', 'campaign stays open while feedback is pending');
  // Bug-rejection: moderator sees one alert per report, deduplicated on retry.
  assert.equal(await counts("kind='admin_feedback_moderation'"), 3 * adminCount, 'one moderation alert per report per admin');
  await sql(`update community_game_tests set status='submitted' where id='${aTests[11]}'`);
  assert.equal(await counts("kind='admin_feedback_moderation'"), 3 * adminCount, 'moderation alerts deduplicated');

  // ---- Rejected feedback must not count toward the target ----
  await reviewAs(8, aTests[11], 'rejected', 'Not a credible original experience');
  assert.equal(await counts("kind='campaign_completed'"), 0, 'a single accepted report below target cannot complete');

  // ---- Reconsideration on the rejected report alerts admins exactly once per request ----
  await as(11); await sql(`select request_test_reconsideration('${aTests[11]}','Please re-check relevance')`);
  const reconCount = await counts("kind='admin_feedback_moderation' and dedupe_key like '%:recon:%'");
  assert.equal(reconCount, adminCount, 'one reconsideration alert per admin');
  try {
    await as(11); await sql(`select request_test_reconsideration('${aTests[11]}','Duplicate must be refused')`);
    assert.fail('duplicate reconsideration should be refused');
  } catch (e) {
    assert.match(e.message, /already pending|pending/i, 'duplicate reconsideration refused');
  }
  assert.equal(await counts("kind='admin_feedback_moderation' and dedupe_key like '%:recon:%'"), reconCount, 'no duplicate reconsideration alert');
  // Admin upholds the rejection, clearing the request.
  await reviewAs(8, aTests[11], 'rejected', 'Rejection upheld after appeal');

  // ---- Accepted reports below the target: no completion ----
  await reviewAs(8, aTests[12], 'accepted', 'Useful concrete observations');
  assert.equal(await counts("kind='campaign_completed'"), 0, 'accepted feedback below target does not complete');

  // ---- The rejected report is replaced (audited exception), freeing a place ----
  await as(8); await sql(`select replace_unusable_test('${aTests[11]}','Fraudulent spam report')`);
  await as(14);
  const aTest14 = (await one(`select claim_community_game_test('${id(40)}') r`)).r;
  await sql(`select start_community_game_test('${aTest14}');select submit_community_game_test('${aTest14}',7,7,'Minor overlap','',0,7,'probably','probably','Controls','Minor','Tutorial','{}')`);
  assert.equal(await counts("kind='campaign_completed'"), 0, 'replacement claim and pending feedback still do not complete');

  // ---- Paused campaign must still complete when accepted count reaches the target ----
  await sql(`update community_playtests set status='paused' where id='${id(40)}'`);
  await reviewAs(8, aTests[13], 'accepted', 'Specific build observations');
  assert.equal(await counts("kind='campaign_completed'"), 0, 'accepted two of three does not complete');
  await reviewAs(8, aTest14, 'accepted', 'Useful controls observations');
  assert.equal(await counts("kind='campaign_completed'"), 1, 'reaching the target completes the campaign');
  assert.equal((await one(`select status from community_playtests where id='${id(40)}'`)).status, 'closed', 'completed campaign is closed');
  assert.equal((await one(`select completed_at is not null ok from community_playtests where id='${id(40)}'`)).ok, true, 'completed_at is recorded');
  const completion = (await db.query(`select kind,title,href,dedupe_key from notifications where kind='campaign_completed'`)).rows;
  assert.match(completion[0].href, new RegExp(`^/my-submissions\\?tab=submissions&game=${id(30)}&campaign=${id(40)}$`), 'fallback deep link opens the correct game submission and campaign');
  assert.equal(await counts(`kind='campaign_completed' and recipient_id='${id(1)}'`), 1, 'only the developer is notified once');

  // ---- Idempotency: further lifecycle touches never re-notify or alter the completed state ----
  const completedAt = (await one(`select completed_at from community_playtests where id='${id(40)}'`)).completed_at;
  await sql(`update community_game_tests set status='reviewed',review_outcome='accepted' where id='${aTests[12]}'`);
  assert.equal(await counts("kind='campaign_completed'"), 1, 'completion notification stays unique');
  assert.equal((await one(`select completed_at from community_playtests where id='${id(40)}'`)).completed_at.toISOString(), completedAt.toISOString(), 'completed_at is stable');

  // ---- Pending feedback after the target decision must still reach moderation ----
  await sql(`update community_game_tests set status='submitted' where id='${aTest14}'`);
  assert.equal(await counts("kind='admin_feedback_moderation' and dedupe_key not like '%:recon:%'"), 4 * adminCount, 'no duplicate alerts for decided reports');

  // ---- Campaign B: preserved target 2 completes independently with its own deep link ----
  // A developer link row must win over the raw submission fallback in the deep link.
  await sql(`insert into game_developer_links(id,developer_id,submission_id,relationship) values('${id(50)}','${id(2)}','${id(31)}','developer')`);
  const bTests = {};
  for (const t of [13, 14]) {
    await as(t);
    bTests[t] = (await one(`select claim_community_game_test('${id(41)}') r`)).r;
    await sql(`select start_community_game_test('${bTests[t]}');select submit_community_game_test('${bTests[t]}',7,7,'None','',0,7,'definitely','definitely','Combat','None','None','{}')`);
  }
  // ---- Campaign B: preserved target 2 completes independently with its own deep link ----
  await reviewAs(9, bTests[13], 'accepted', 'Concrete action feedback');
  assert.equal(await counts("kind='campaign_completed'"), 1, 'first accepted report on the preserved-target campaign does not complete');
  await reviewAs(9, bTests[14], 'accepted', 'Concrete action feedback');
  const allCompletions = (await db.query(`select href,entity_id,dedupe_key from notifications where kind='campaign_completed' order by created_at,id`)).rows;
  assert.equal(allCompletions.length, 2, 'second campaign completes independently');
  assert.equal(allCompletions[0].dedupe_key, `campaign:completed:${id(40)}`);
  assert.equal(allCompletions[1].dedupe_key, `campaign:completed:${id(41)}`);
  assert.match(allCompletions[1].href, new RegExp(`^/my-submissions\\?tab=games&game=${id(50)}&campaign=${id(41)}$`), 'developer link row wins in the second completion deep link');

  // ---- Existing notification kinds keep their behaviour ----
  await sql(`insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type,release_status) values('${id(32)}','Regression game','Pending Review','Action','${id(1)}','Dev One','Description','https://example.test/c','No AI disclosed','Not announced')`);
  assert.equal(await counts("kind='admin_new_submission' and dedupe_key like 'submission:new:%'"), 3 * adminCount, 'admin_new_submission intact (fresh inserts alert admins)');
  await sql(`update game_submissions set status='Needs More Information',submission_revision=1 where id='${id(32)}'`);
  assert.equal(await counts(`kind='submission_needs_info' and entity_id='${id(32)}'`), 1, 'submission_needs_info intact');

  console.log('PASS campaign completion lifecycle');
} catch (e) {
  console.error(e.message, e.where || '');
  process.exitCode = 1;
} finally {
  await db.close();
}

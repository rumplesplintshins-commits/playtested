import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const foundation = await readFile(new URL(
  "../supabase/migrations/20261125140000_tester_tips_stripe_foundation.sql", import.meta.url,
), "utf8");
const recovery = await readFile(new URL(
  "../supabase/migrations/20261127130000_tester_tip_checkout_recovery.sql", import.meta.url,
), "utf8");
const reconciliation = await readFile(new URL(
  "../supabase/migrations/20261127100000_tester_tip_payment_reconciliation_hardening.sql", import.meta.url,
), "utf8");
const webhookOrdering = await readFile(new URL(
  "../supabase/migrations/20261127120000_tester_tip_webhook_ordering_notifications.sql", import.meta.url,
), "utf8");

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA playtested_studios; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
  CREATE TABLE public.profiles(id uuid PRIMARY KEY);
  CREATE TABLE public.community_playtests(id uuid PRIMARY KEY,developer_id uuid NOT NULL,title text);
  CREATE TABLE public.community_game_tests(
    id uuid PRIMARY KEY,playtest_id uuid NOT NULL,tester_id uuid,
    status text,review_outcome text,replacement_at timestamptz,feedback_usefulness text
  );
  CREATE FUNCTION public._create_notification(uuid,text,text,text,text,text,uuid,text)
    RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
`);
await db.exec(foundation);
// This column is added by the branch's intervening managed-merchant migration.
await db.exec("ALTER TABLE playtested_studios.tester_tips ADD COLUMN stripe_connected_account_id text");

const developerId = "90000000-0000-4000-8000-000000000001";
const testerId = "90000000-0000-4000-8000-000000000002";
const playtestId = "20000000-0000-4000-8000-000000000001";
const feedbackId = "10000000-0000-4000-8000-000000000001";
const accountId = "acct_checkout123";
await db.query("INSERT INTO public.profiles(id) VALUES ($1),($2)", [developerId, testerId]);
await db.query("INSERT INTO public.community_playtests(id,developer_id) VALUES ($1,$2)", [playtestId, developerId]);
await db.query("INSERT INTO public.community_game_tests(id,playtest_id,tester_id) VALUES ($1,$2,$3)", [feedbackId, playtestId, testerId]);
await db.query("INSERT INTO public.community_game_tests(id,playtest_id,tester_id) VALUES ($1,$2,$3),($4,$2,$3)", [
  "10000000-0000-4000-8000-000000000002", playtestId, testerId,
  "10000000-0000-4000-8000-000000000003",
]);

await db.exec(`CREATE FUNCTION public.tester_tip_mark_expired(p_tip_id uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER AS $$ SELECT $$;`);
await db.exec("GRANT EXECUTE ON FUNCTION public.tester_tip_mark_expired(uuid) TO service_role");
await db.query(`INSERT INTO playtested_studios.tester_tips(
  id,test_id,playtest_id,developer_id,tester_id,tip_amount_pence,platform_fee_pence,
  total_amount_pence,fee_rules_snapshot,status,stripe_checkout_session_id,created_at
) VALUES
  ('00000000-0000-4000-8000-000000000001',$1,$2,$3,$4,1000,150,1150,'[]','failed','cs_legacy_open',clock_timestamp()),
  ('00000000-0000-4000-8000-000000000002',$5,$2,$3,$4,1000,150,1150,'[]','failed',NULL,clock_timestamp()-interval '26 hours'),
  ('00000000-0000-4000-8000-000000000003',$6,$2,$3,$4,1000,150,1150,'[]','failed',NULL,clock_timestamp())`,
  [feedbackId, playtestId, developerId, testerId,
    "10000000-0000-4000-8000-000000000002", "10000000-0000-4000-8000-000000000003"]);
await db.query("UPDATE playtested_studios.tester_tips SET stripe_connected_account_id=$1 WHERE id='00000000-0000-4000-8000-000000000001'", [accountId]);

await db.exec(reconciliation);
await db.exec(webhookOrdering);
try {
  await db.exec(recovery);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await db.close();
  throw error;
}

const rpc = (name, args) => db.query(`SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")})`, args);
async function insertTip(id, testId, status = "pending", session = null) {
  await db.query("INSERT INTO public.community_game_tests(id,playtest_id,tester_id) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING", [testId, playtestId, testerId]);
  return db.query(`INSERT INTO playtested_studios.tester_tips(
    id,test_id,playtest_id,developer_id,tester_id,tip_amount_pence,platform_fee_pence,
    total_amount_pence,fee_rules_snapshot,status,stripe_checkout_session_id,stripe_connected_account_id
  ) VALUES($1,$2,$3,$4,$5,1000,150,1150,'[]'::jsonb,$6,$7,$8)`,
  [id, testId, playtestId, developerId, testerId, status, session, accountId]);
}
async function rejected(promise) { await assert.rejects(promise); }

assert.equal((await db.query("SELECT to_regprocedure('public.tester_tip_mark_expired(uuid)') AS old_rpc")).rows[0].old_rpc, null);
assert.equal((await db.query("SELECT has_function_privilege('service_role','public.tester_tip_mark_expired(uuid,text,text)','EXECUTE') AS allowed")).rows[0].allowed, true);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000001'")).rows[0].status,
  "payment_failed", "legacy failed rows with a Session remain locked");
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000002'")).rows[0].status,
  "expired", "legacy no-Session rows older than the safety window are released");
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000003'")).rows[0].status,
  "payment_failed", "recent legacy no-Session rows remain locked");

// A card failure only changes the display state. It does not release the unique lock.
await rpc("tester_tip_mark_failed", ["00000000-0000-4000-8000-000000000001"]);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000001'")).rows[0].status, "payment_failed");
await rejected(insertTip("00000000-0000-4000-8000-000000000010", feedbackId));

// An expired event is bound to exact Session and account; it cannot free another Session.
await rejected(rpc("tester_tip_mark_expired", ["00000000-0000-4000-8000-000000000001", "cs_wrong", accountId]));
await rpc("tester_tip_mark_expired", ["00000000-0000-4000-8000-000000000001", "cs_legacy_open", accountId]);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000001'")).rows[0].status, "expired");
await insertTip("00000000-0000-4000-8000-000000000011", feedbackId);

// An ambiguous no-ID attempt stays locked until its persisted Session expiry plus grace.
const pendingFeedback = "10000000-0000-4000-8000-000000000004";
const pendingTip = "00000000-0000-4000-8000-000000000012";
await insertTip(pendingTip, pendingFeedback, "payment_failed");
await db.query("UPDATE playtested_studios.tester_tips SET stripe_checkout_expires_at=clock_timestamp()+interval '1 hour',checkout_recovery_version=true WHERE id=$1", [pendingTip]);
await rejected(rpc("tester_tip_mark_no_session_expired", [pendingTip]));
await rejected(insertTip("00000000-0000-4000-8000-000000000013", pendingFeedback));
await db.query("UPDATE playtested_studios.tester_tips SET stripe_checkout_expires_at=clock_timestamp()-interval '6 minutes' WHERE id=$1", [pendingTip]);
await rpc("tester_tip_mark_no_session_expired", [pendingTip]);
await insertTip("00000000-0000-4000-8000-000000000013", pendingFeedback);

// Paid rows cannot be duplicated, and late expiration cannot downgrade paid state.
const paidFeedback = "10000000-0000-4000-8000-000000000005";
const paidTip = "00000000-0000-4000-8000-000000000014";
await insertTip(paidTip, paidFeedback, "checkout_created", "cs_paid");
await rpc("tester_tip_mark_paid", [paidTip, "cs_paid", "pi_paid"]);
await rpc("tester_tip_mark_expired", [paidTip, "cs_paid", accountId]);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [paidTip])).rows[0].status, "paid");
await rejected(insertTip("00000000-0000-4000-8000-000000000015", paidFeedback));

// Two simultaneous writes serialize through the PostgreSQL unique index.
const concurrentFeedback = "10000000-0000-4000-8000-000000000006";
const concurrent = await Promise.allSettled([
  insertTip("00000000-0000-4000-8000-000000000016", concurrentFeedback),
  insertTip("00000000-0000-4000-8000-000000000017", concurrentFeedback),
]);
assert.equal(concurrent.filter(x => x.status === "fulfilled").length, 1);

// The authorised developer sees payment_failed; unrelated developers do not.
await db.query("INSERT INTO public.community_game_tests(id,playtest_id,tester_id) VALUES($1,$2,$3)", ["10000000-0000-4000-8000-000000000007", playtestId, testerId]);
await insertTip("00000000-0000-4000-8000-000000000018", "10000000-0000-4000-8000-000000000007", "payment_failed");
await db.query("UPDATE playtested_studios.tester_tips SET paid_at=NULL WHERE id='00000000-0000-4000-8000-000000000018'");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [developerId]);
assert.equal((await db.query("SELECT status FROM public.get_developer_tester_tip($1)", ["10000000-0000-4000-8000-000000000007"])).rows[0].status, "payment_failed");

// Legacy failed duplicates must stop migration before the old partial index
// emits a generic unique violation or any partial schema/data change remains.
{
  const preflightDb = new PGlite();
  await preflightDb.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA playtested_studios; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY);
    CREATE TABLE public.community_playtests(id uuid PRIMARY KEY,developer_id uuid NOT NULL,title text);
    CREATE TABLE public.community_game_tests(id uuid PRIMARY KEY,playtest_id uuid NOT NULL);
    CREATE FUNCTION public.tester_tip_mark_expired(p_tip_id uuid) RETURNS void
      LANGUAGE sql SECURITY DEFINER AS $$ SELECT $$;
  `);
  await preflightDb.exec(foundation);
  await preflightDb.exec("ALTER TABLE playtested_studios.tester_tips ADD COLUMN stripe_connected_account_id text");
  await preflightDb.query("INSERT INTO public.profiles(id) VALUES($1),($2)", [developerId, testerId]);
  await preflightDb.query("INSERT INTO public.community_playtests(id,developer_id,title) VALUES($1,$2,'Fixture')", [playtestId, developerId]);
  await preflightDb.query("INSERT INTO public.community_game_tests(id,playtest_id) VALUES($1,$2)", [feedbackId, playtestId]);
  await preflightDb.query(`INSERT INTO playtested_studios.tester_tips(
    id,test_id,playtest_id,developer_id,tester_id,tip_amount_pence,platform_fee_pence,
    total_amount_pence,fee_rules_snapshot,status,stripe_checkout_session_id
  ) VALUES
    ('00000000-0000-4000-8000-000000000021',$1,$2,$3,$4,1000,150,1150,'[]','failed','cs_legacy_duplicate_a'),
    ('00000000-0000-4000-8000-000000000022',$1,$2,$3,$4,1000,150,1150,'[]','failed',NULL)`,
    [feedbackId, playtestId, developerId, testerId]);
  let migrationError = "";
  try { await preflightDb.exec(recovery); } catch (error) { migrationError = String(error); }
  assert.match(migrationError, /multiple rows would remain payable/);
  await preflightDb.exec("ROLLBACK");
  assert.deepEqual((await preflightDb.query("SELECT status FROM playtested_studios.tester_tips ORDER BY id")).rows.map(row => row.status), ["failed", "failed"]);
  await preflightDb.close();
}

console.log("Tester-tip checkout locking, session-bound expiry, failed-payment retention and paid uniqueness tests passed.");
await db.close();

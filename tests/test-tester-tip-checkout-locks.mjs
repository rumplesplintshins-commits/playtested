import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/20261126170000_tester_tip_checkout_locking.sql", import.meta.url), "utf8");
const baseSchema = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
  CREATE TABLE public.community_game_tests(id uuid PRIMARY KEY,playtest_id uuid NOT NULL);
  CREATE TABLE public.community_playtests(id uuid PRIMARY KEY,developer_id uuid NOT NULL);
  CREATE SCHEMA playtested_studios;
  CREATE TABLE playtested_studios.tester_tips (
    id uuid PRIMARY KEY,
    test_id uuid NOT NULL,
    developer_id uuid,
    tip_amount_pence integer NOT NULL DEFAULT 1000,
    platform_fee_pence integer NOT NULL DEFAULT 150,
    total_amount_pence integer NOT NULL DEFAULT 1150,
    status text NOT NULL CHECK (status IN ('pending','checkout_created','paid','failed','expired','refunded','partially_refunded','disputed')),
    stripe_checkout_session_id text UNIQUE,
    stripe_payment_intent_id text UNIQUE,
    stripe_connected_account_id text,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
  );
  INSERT INTO playtested_studios.tester_tips(id,test_id,status,stripe_checkout_session_id,stripe_connected_account_id)
  VALUES ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','failed','cs_old_retryable','acct_test123');
  INSERT INTO playtested_studios.tester_tips(id,test_id,status,created_at) VALUES
    ('00000000-0000-4000-8000-000000000041','12000000-0000-4000-8000-000000000001','failed',clock_timestamp()),
    ('00000000-0000-4000-8000-000000000042','13000000-0000-4000-8000-000000000001','failed',clock_timestamp()-interval '26 hours');
  CREATE FUNCTION public.tester_tip_mark_expired(p_tip_id uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN; END; $$;
  GRANT EXECUTE ON FUNCTION public.tester_tip_mark_expired(uuid) TO service_role;
`;
const db = new PGlite();
await db.exec(baseSchema);
await db.exec(migration);

async function insertTip(id, testId, status = "pending") {
  await db.query("INSERT INTO playtested_studios.tester_tips(id,test_id,status) VALUES($1,$2,$3)", [id, testId, status]);
}
async function throwsSql(fn) {
  let threw = false;
  try { await fn(); } catch { threw = true; }
  assert.equal(threw, true, "expected the database to reject an unsafe transition or duplicate");
}
const rpc = (name, args) => db.query(`SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")})`, args);
const id1 = "00000000-0000-4000-8000-000000000001";
const test1 = "10000000-0000-4000-8000-000000000001";
const session1 = "cs_old_retryable";
const account = "acct_test123";

assert.equal((await db.query("SELECT to_regprocedure('public.tester_tip_mark_expired(uuid)') AS old_rpc")).rows[0].old_rpc, null,
  "the unsafe legacy expiration overload is removed");
assert.equal((await db.query("SELECT has_function_privilege('service_role','public.tester_tip_mark_expired(uuid,text,text)','EXECUTE') AS allowed")).rows[0].allowed, true,
  "service role retains execute on the validated expiration RPC");

// Upgrade preserves a legacy failed row if it already has a Stripe session.
let row = (await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [id1])).rows[0];
assert.equal(row.status, "payment_failed");
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000041'")).rows[0].status,
  "payment_failed", "recent legacy failed rows without a session ID remain locked");
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id='00000000-0000-4000-8000-000000000042'")).rows[0].status,
  "expired", "old legacy no-ID rows are released only after the Checkout lifetime safety margin");

// A card failure while Checkout remains open does not release the feedback lock.
await rpc("tester_tip_mark_failed", [id1]);
row = (await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [id1])).rows[0];
assert.equal(row.status, "payment_failed");
await throwsSql(() => insertTip("00000000-0000-4000-8000-000000000002", test1));

const concurrentTest = "11000000-0000-4000-8000-000000000001";
const concurrentResults = await Promise.allSettled([
  insertTip("00000000-0000-4000-8000-000000000031", concurrentTest),
  insertTip("00000000-0000-4000-8000-000000000032", concurrentTest),
]);
assert.equal(concurrentResults.filter(result => result.status === "fulfilled").length, 1,
  "the PostgreSQL unique index must serialize concurrent active tip inserts");

// The original session may still complete after a failure notification. Retries are idempotent.
await rpc("tester_tip_mark_paid", [id1, session1, "pi_original"]);
await rpc("tester_tip_mark_paid", [id1, session1, "pi_original"]);
await rpc("tester_tip_mark_expired", [id1, session1, account]);
row = (await db.query("SELECT status,paid_at FROM playtested_studios.tester_tips WHERE id=$1", [id1])).rows[0];
assert.equal(row.status, "paid", "late expiration must never downgrade a paid tip");
assert.ok(row.paid_at);
await throwsSql(() => insertTip("00000000-0000-4000-8000-000000000003", test1));

// Only confirmed expiration releases the feedback for a new attempt.
const test2 = "20000000-0000-4000-8000-000000000001";
const id2 = "00000000-0000-4000-8000-000000000004";
await insertTip(id2, test2, "checkout_created");
await db.query("UPDATE playtested_studios.tester_tips SET stripe_checkout_session_id='cs_expired',stripe_connected_account_id=$2 WHERE id=$1", [id2, account]);
await rpc("tester_tip_mark_failed", [id2]);
await rpc("tester_tip_mark_expired", [id2, "cs_expired", account]);
await rpc("tester_tip_mark_expired", [id2, "cs_expired", account]);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [id2])).rows[0].status, "expired");
await insertTip("00000000-0000-4000-8000-000000000005", test2);
await throwsSql(() => rpc("tester_tip_mark_paid", [id2, "cs_expired", "pi_too_late"]));

// Event order completion -> duplicate failure -> stale expiration remains paid.
const test3 = "30000000-0000-4000-8000-000000000001";
const id3 = "00000000-0000-4000-8000-000000000006";
await insertTip(id3, test3);
await db.query("UPDATE playtested_studios.tester_tips SET stripe_connected_account_id=$2 WHERE id=$1", [id3, account]);
await rpc("tester_tip_mark_paid", [id3, "cs_out_of_order", "pi_ordered"]);
await rpc("tester_tip_mark_failed", [id3]);
await rpc("tester_tip_mark_expired", [id3, "cs_out_of_order", account]);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [id3])).rows[0].status, "paid");
await throwsSql(() => insertTip("00000000-0000-4000-8000-000000000007", test3));

// Even a direct database write cannot create two successful tips for one feedback item.
await throwsSql(() => insertTip("00000000-0000-4000-8000-000000000008", test1, "paid"));

// A failure before the Stripe Session request is known to be permanently unpayable.
const test6 = "60000000-0000-4000-8000-000000000001";
const id6 = "00000000-0000-4000-8000-000000000014";
await insertTip(id6, test6);
await rpc("tester_tip_mark_unpayable", [id6]);
await insertTip("00000000-0000-4000-8000-000000000015", test6);

// Developer status lookup returns only owned tips and includes unresolved states,
// while retaining paid/refunded rows with paid_at.
const dev = "90000000-0000-4000-8000-000000000001";
const otherDev = "90000000-0000-4000-8000-000000000002";
const statusTest = "70000000-0000-4000-8000-000000000001";
await db.query("INSERT INTO public.community_playtests(id,developer_id) VALUES($1,$2)", ["71000000-0000-4000-8000-000000000001", dev]);
await db.query("INSERT INTO public.community_game_tests(id,playtest_id) VALUES($1,$2)", [statusTest, "71000000-0000-4000-8000-000000000001"]);
await insertTip("00000000-0000-4000-8000-000000000016", statusTest, "pending");
await db.query("UPDATE playtested_studios.tester_tips SET developer_id=$2 WHERE id=$1", ["00000000-0000-4000-8000-000000000016", dev]);
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [dev]);
assert.equal((await db.query("SELECT status FROM public.get_developer_tester_tip($1)", [statusTest])).rows[0].status, "pending");
await db.query("UPDATE playtested_studios.tester_tips SET status='payment_failed' WHERE test_id=$1", [statusTest]);
assert.equal((await db.query("SELECT status FROM public.get_developer_tester_tip($1)", [statusTest])).rows[0].status, "payment_failed");
await db.query("UPDATE playtested_studios.tester_tips SET created_at=clock_timestamp()-interval '26 hours' WHERE test_id=$1", [statusTest]);
assert.equal((await db.query("SELECT status FROM public.get_developer_tester_tip($1)", [statusTest])).rows.length, 0,
  "polling safely releases an unresolved legacy session only after its maximum lifetime and grace period");
await db.query("UPDATE playtested_studios.tester_tips SET status='paid',paid_at=clock_timestamp() WHERE test_id=$1", [statusTest]);
assert.equal((await db.query("SELECT status FROM public.get_developer_tester_tip($1)", [statusTest])).rows[0].status, "paid");
await db.query("UPDATE playtested_studios.tester_tips SET status='refunded',paid_at=clock_timestamp() WHERE test_id=$1", [statusTest]);
assert.equal((await db.query("SELECT status FROM public.get_developer_tester_tip($1)", [statusTest])).rows[0].status, "refunded");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [otherDev]);
await throwsSql(() => db.query("SELECT * FROM public.get_developer_tester_tip($1)", [statusTest]));

// Preflight checks fail before index creation with an actionable explanation.
for (const dupKind of ["active", "paid"]) {
  const preflightDb = new PGlite();
  await preflightDb.exec(baseSchema);
  if (dupKind === "active") {
    await preflightDb.exec(`INSERT INTO playtested_studios.tester_tips(id,test_id,status,stripe_checkout_session_id) VALUES
      ('00000000-0000-4000-8000-000000000021','80000000-0000-4000-8000-000000000001','pending',NULL),
      ('00000000-0000-4000-8000-000000000022','80000000-0000-4000-8000-000000000001','failed','cs_legacy_duplicate');`);
  } else {
    await preflightDb.exec(`INSERT INTO playtested_studios.tester_tips(id,test_id,status,paid_at) VALUES
      ('00000000-0000-4000-8000-000000000023','80000000-0000-4000-8000-000000000002','expired',now()),
      ('00000000-0000-4000-8000-000000000024','80000000-0000-4000-8000-000000000002','expired',now());`);
  }
  let migrationError = "";
  try { await preflightDb.exec(migration); } catch (error) { migrationError = String(error); }
  assert.match(migrationError, dupKind === "active" ? /multiple active tip rows/ : /multiple paid tip rows/);
  await preflightDb.exec("ROLLBACK");
  assert.equal((await preflightDb.query("SELECT to_regclass('playtested_studios.tester_tips_one_active_per_feedback_idx') AS created")).rows[0].created, null,
    "the failed migration transaction must not leave a partial lock index");
  await preflightDb.close();
}

// Exercise the real webhook handler with a Postgres-backed RPC mock and Stripe
// canonical Session state, including retries and out-of-order event delivery.
const webhookSource = await readFile(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
const webhookJs = ts.transpileModule(webhookSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const processingFeeSource = await readFile(new URL("../lib/tester-tips/processing-fee.ts", import.meta.url), "utf8");
const processingFeeJs = ts.transpileModule(processingFeeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const processingFeeExports = {};
new Function("exports", processingFeeJs)(processingFeeExports);
let canonicalSession = {};
const mockRequire = name => {
  if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
  if (name === "@/lib/tester-tips/processing-fee") return processingFeeExports;
  if (name === "@/lib/tester-tips/server") return {
    createAdminClient: () => ({ rpc: (fn, args) => rpc(fn, Object.values(args)) }),
    stripeV1Get: async () => canonicalSession,
    stripePostForm: async () => ({ id: "fr_mock" }),
    verifyStripeWebhook: () => true,
  };
  throw new Error(`Unexpected webhook import: ${name}`);
};
const webhookExports = {};
new Function("exports", "require", webhookJs)(webhookExports, mockRequire);
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_test";
async function deliver(type, object, eventAccount = account) {
  const event = { type, account: eventAccount, data: { object } };
  return webhookExports.POST(new Request("https://example.test/api/stripe/webhook", {
    method: "POST", headers: { "stripe-signature": "test" }, body: JSON.stringify(event),
  }));
}

const test4 = "40000000-0000-4000-8000-000000000001";
const id4 = "00000000-0000-4000-8000-000000000009";
await insertTip(id4, test4, "checkout_created");
await db.query("UPDATE playtested_studios.tester_tips SET stripe_checkout_session_id='cs_webhook_race',stripe_connected_account_id=$2 WHERE id=$1", [id4, account]);
await throwsSql(() => rpc("tester_tip_mark_unpayable", [id4]));
const checkoutObject = { id: "cs_webhook_race", metadata: { tester_tip_id: id4 } };
assert.equal((await deliver("payment_intent.payment_failed", { ...checkoutObject, id: "pi_webhook" })).status, 200);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [id4])).rows[0].status, "payment_failed");
await throwsSql(() => insertTip("00000000-0000-4000-8000-000000000010", test4));
canonicalSession = { status: "complete", payment_status: "paid", payment_intent: "pi_webhook" };
assert.equal((await deliver("checkout.session.expired", checkoutObject)).status, 200);
assert.equal((await deliver("checkout.session.expired", checkoutObject)).status, 200, "duplicate expiration webhook is safe");
assert.equal((await deliver("payment_intent.payment_failed", { id: "pi_webhook", metadata: { tester_tip_id: id4 } })).status, 200);
assert.equal((await db.query("SELECT status FROM playtested_studios.tester_tips WHERE id=$1", [id4])).rows[0].status, "paid");
await throwsSql(() => insertTip("00000000-0000-4000-8000-000000000011", test4));

const test5 = "50000000-0000-4000-8000-000000000001";
const id5 = "00000000-0000-4000-8000-000000000012";
await insertTip(id5, test5, "checkout_created");
await db.query("UPDATE playtested_studios.tester_tips SET stripe_checkout_session_id='cs_webhook_expired',stripe_connected_account_id=$2 WHERE id=$1", [id5, account]);
canonicalSession = { status: "expired", payment_status: "unpaid" };
assert.equal((await deliver("checkout.session.expired", { id: "cs_webhook_expired", metadata: { tester_tip_id: id5 } })).status, 200);
await insertTip("00000000-0000-4000-8000-000000000013", test5);
console.log("Tester tip Checkout lock and webhook-order regression tests passed.");
await db.close();

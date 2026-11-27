import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL(
  "../supabase/migrations/20261127120000_tester_tip_webhook_ordering_notifications.sql", import.meta.url,
), "utf8");
const reconciliationMigration = await readFile(new URL(
  "../supabase/migrations/20261127100000_tester_tip_payment_reconciliation_hardening.sql", import.meta.url,
), "utf8");
const checkoutRecoveryMigration = await readFile(new URL(
  "../supabase/migrations/20261127130000_tester_tip_checkout_recovery.sql", import.meta.url,
), "utf8");
const baseSchema = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$;
  CREATE TABLE public.profiles(id uuid PRIMARY KEY);
  CREATE TABLE public.community_playtests(id uuid PRIMARY KEY,developer_id uuid NOT NULL,title text NOT NULL);
  CREATE TABLE public.community_game_tests(id uuid PRIMARY KEY,playtest_id uuid NOT NULL);
  CREATE TABLE public.notifications(
    id bigserial PRIMARY KEY,recipient_id uuid NOT NULL,kind text NOT NULL,title text NOT NULL,
    message text NOT NULL,href text,entity_type text,entity_id uuid,dedupe_key text NOT NULL,
    UNIQUE(recipient_id,dedupe_key)
  );
  CREATE FUNCTION public._create_notification(
    p_recipient uuid,p_kind text,p_title text,p_message text,p_href text,
    p_entity_type text,p_entity_id uuid,p_dedupe_key text
  ) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  DECLARE v_id bigint;
  BEGIN
    INSERT INTO public.notifications(recipient_id,kind,title,message,href,entity_type,entity_id,dedupe_key)
    VALUES(p_recipient,p_kind,p_title,p_message,p_href,p_entity_type,p_entity_id,p_dedupe_key)
    ON CONFLICT(recipient_id,dedupe_key) DO NOTHING RETURNING id INTO v_id;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM public.notifications WHERE recipient_id=p_recipient AND dedupe_key=p_dedupe_key; END IF;
    RETURN v_id;
  END; $$;
  CREATE SCHEMA playtested_studios;
  CREATE TABLE playtested_studios.tester_tips(
    id uuid PRIMARY KEY,test_id uuid NOT NULL,playtest_id uuid NOT NULL,developer_id uuid NOT NULL,tester_id uuid NOT NULL,
    tip_amount_pence integer NOT NULL,platform_fee_pence integer NOT NULL,total_amount_pence integer NOT NULL,
    status text NOT NULL CHECK(status IN ('pending','checkout_created','payment_failed','paid','failed','expired','refunded','partially_refunded','disputed')),
    refunded_amount_pence integer NOT NULL DEFAULT 0,
    stripe_checkout_session_id text UNIQUE,stripe_payment_intent_id text UNIQUE,stripe_charge_id text,
    stripe_connected_account_id text,paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
  );
  CREATE FUNCTION public.tester_tip_mark_expired(p_tip_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER AS $$ SELECT $$;
  CREATE FUNCTION public.tester_tip_mark_paid(p_tip_id uuid,p_session_id text,p_payment_intent_id text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
  BEGIN
    UPDATE playtested_studios.tester_tips SET status='paid',
      stripe_checkout_session_id=coalesce(stripe_checkout_session_id,p_session_id),
      stripe_payment_intent_id=coalesce(stripe_payment_intent_id,p_payment_intent_id),
      paid_at=coalesce(paid_at,clock_timestamp())
    WHERE id=p_tip_id AND status IN ('pending','checkout_created','payment_failed','paid')
      AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id=p_session_id)
      AND (p_payment_intent_id IS NULL OR stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=p_payment_intent_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Tip payment conflict.'; END IF;
  END; $$;
  CREATE FUNCTION public.tester_tip_mark_refund(
    p_tip_id uuid,p_payment_intent_id text,p_charge_id text,p_refunded_amount_pence integer,p_charge_amount_pence integer
  ) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
    UPDATE playtested_studios.tester_tips
    SET status=CASE WHEN p_refunded_amount_pence>=p_charge_amount_pence THEN 'refunded' ELSE 'partially_refunded' END,
      refunded_amount_pence=greatest(0,p_refunded_amount_pence),
      stripe_payment_intent_id=coalesce(stripe_payment_intent_id,p_payment_intent_id),stripe_charge_id=p_charge_id
    WHERE id=p_tip_id AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=p_payment_intent_id);
  $$;
  CREATE FUNCTION public.tester_tip_mark_disputed(p_tip_id uuid,p_payment_intent_id text,p_charge_id text)
  RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
    UPDATE playtested_studios.tester_tips SET status='disputed',
      stripe_payment_intent_id=coalesce(stripe_payment_intent_id,p_payment_intent_id),stripe_charge_id=p_charge_id
    WHERE id=p_tip_id AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=p_payment_intent_id);
  $$;
  CREATE FUNCTION public._notify_paid_tester_tip() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
  BEGIN
    IF OLD.status IS DISTINCT FROM 'paid' AND NEW.status='paid' THEN
      PERFORM public._create_notification(NEW.tester_id,'tester_tip_received','Tip received','Tip message',
        '/tester','playtest',NEW.playtest_id,'tester-tip:paid:'||NEW.id::text);
    END IF;
    RETURN NEW;
  END; $$;
  CREATE TRIGGER tester_tip_paid_notification AFTER UPDATE OF status ON playtested_studios.tester_tips
  FOR EACH ROW EXECUTE FUNCTION public._notify_paid_tester_tip();
`;

const webhookSource = await readFile(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
const webhookJs = ts.transpileModule(webhookSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const feeSource = await readFile(new URL("../lib/tester-tips/processing-fee.ts", import.meta.url), "utf8");
const feeJs = ts.transpileModule(feeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const feeExports = {};
new Function("exports", feeJs)(feeExports);

assert.equal(feeExports.convertBalanceFeeToChargeMinorUnits(87, "gbp", "gbp", null), 87,
  "GBP settlement requires no exchange rate");
assert.equal(feeExports.convertBalanceFeeToChargeMinorUnits(131, "usd", "gbp", 1.3), 101,
  "settlement minor units convert back by dividing by Stripe's source-to-destination rate and round up");
assert.equal(feeExports.convertBalanceFeeToChargeMinorUnits(100, "usd", "gbp", 1.25), 80,
  "an exact converted penny amount is not rounded up twice");
assert.throws(() => feeExports.convertBalanceFeeToChargeMinorUnits(131, "usd", "gbp", null), /exchange rate/);
assert.equal(feeExports.availableApplicationFeeRefund(101, 150, 80), 70,
  "refund is capped to the currently unrefunded application fee");
assert.equal(feeExports.availableApplicationFeeRefund(101, 150, 150), 0,
  "a fully refunded application fee has no remaining refund capacity");

function createHarness() {
  const db = new PGlite();
  const paymentIntentTips = new Map();
  const stripeRequests = [];
  const feeRecords = [];
  let applicationFee = null;
  let charge = null;
  let balanceTransaction = null;
  let refundSequence = 1;
  let webhookExports;

  const admin = {
    async rpc(name, args) {
      if (name === "tester_tip_record_processing_fee_refund") {
        feeRecords.push(structuredClone(args));
        return { data: null, error: null };
      }
      const values = Object.values(args);
      try {
        await db.query(`SELECT public.${name}(${values.map((_, index) => `$${index + 1}`).join(",")})`, values);
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  };

  const mockRequire = name => {
    if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name === "@/lib/tester-tips/processing-fee") return feeExports;
    if (name !== "@/lib/tester-tips/server") throw new Error(`Unexpected import ${name}`);
    return {
      createAdminClient: () => admin,
      verifyStripeWebhook: () => true,
      stripeV1Get: async path => {
        const cleanPath = decodeURIComponent(path);
        if (cleanPath.startsWith("payment_intents/")) {
          const id = cleanPath.split("/")[1].split("?")[0];
          return { metadata: { tester_tip_id: paymentIntentTips.get(id) } };
        }
        if (cleanPath.startsWith("charges/")) return charge;
        if (cleanPath.startsWith("balance_transactions/")) return balanceTransaction;
        if (/^application_fees\/[^/]+$/.test(cleanPath)) return applicationFee;
        if (cleanPath.startsWith("application_fees/") && cleanPath.includes("/refunds?")) {
          const query = new URLSearchParams(cleanPath.split("?")[1]);
          const startingAfter = query.get("starting_after");
          const all = applicationFee.refunds.data;
          const cursor = startingAfter ? all.findIndex(refund => refund.id === startingAfter) : -1;
          const start = cursor + 1;
          const data = all.slice(start, start + 100);
          return { data, has_more: start + data.length < all.length };
        }
        throw new Error(`Unexpected Stripe GET ${path}`);
      },
      stripePostForm: async (path, values, key) => {
        stripeRequests.push({ path, values: structuredClone(values), key });
        const amount = Number(values.amount);
        const refund = {
          id: `fr_ordering_${refundSequence++}`,
          amount,
          metadata: {
            tester_tip_id: values["metadata[tester_tip_id]"],
            purpose: values["metadata[purpose]"],
          },
        };
        applicationFee.amount_refunded += amount;
        applicationFee.refunds.data.unshift(refund);
        return refund;
      },
    };
  };

  return {
    db,
    paymentIntentTips,
    stripeRequests,
    feeRecords,
    get webhook() { return webhookExports; },
    setApplicationFee(value) { applicationFee = value; },
    setCharge(value) { charge = value; },
    setBalanceTransaction(value) { balanceTransaction = value; },
    async init({ migrate = true } = {}) {
      await db.exec(baseSchema);
      await db.exec(reconciliationMigration);
      if (migrate) {
        await db.exec(migration);
        await db.exec(checkoutRecoveryMigration);
      }
      const source = webhookJs;
      webhookExports = {};
      new Function("exports", "require", source)(webhookExports, mockRequire);
    },
  };
}

const developerId = "90000000-0000-4000-8000-000000000001";
const testerId = "90000000-0000-4000-8000-000000000002";
const testId = "10000000-0000-4000-8000-000000000001";
const playtestId = "20000000-0000-4000-8000-000000000001";
const accountId = "acct_test123";

async function addTip(harness, id, status = "checkout_created") {
  const actualTestId = `10000000-0000-4000-8000-${id.slice(-12)}`;
  const actualPlaytestId = `20000000-0000-4000-8000-${id.slice(-12)}`;
  const actualTesterId = `30000000-0000-4000-8000-${id.slice(-12)}`;
  await harness.db.query("INSERT INTO public.profiles(id) VALUES($1)", [actualTesterId]);
  await harness.db.query("INSERT INTO public.community_playtests(id,developer_id,title) VALUES($1,$2,'Test game')", [actualPlaytestId, developerId]);
  await harness.db.query("INSERT INTO public.community_game_tests(id,playtest_id) VALUES($1,$2)", [actualTestId, actualPlaytestId]);
  await harness.db.query(
    "INSERT INTO playtested_studios.tester_tips(id,test_id,playtest_id,developer_id,tester_id,tip_amount_pence,platform_fee_pence,total_amount_pence,status,stripe_connected_account_id) VALUES($1,$2,$3,$4,$5,1000,150,1150,$6,$7)",
    [id, actualTestId, actualPlaytestId, developerId, actualTesterId, status, accountId],
  );
  return { id, testId: actualTestId, playtestId: actualPlaytestId, testerId: actualTesterId };
}

async function deliver(harness, type, object, account = accountId) {
  const event = { type, ...(account ? { account } : {}), data: { object } };
  return harness.webhook.POST(new Request("https://playtested.test/api/stripe/webhook", {
    method: "POST", headers: { "stripe-signature": "mock-signature" }, body: JSON.stringify(event),
  }));
}

function completedSession(tip, suffix, paymentIntentId) {
  return {
    object: "checkout.session", id: `cs_${suffix}`, payment_status: "paid",
    payment_intent: paymentIntentId, metadata: { tester_tip_id: tip.id },
  };
}

async function tipState(db, tipId) {
  return (await db.query(
    "SELECT status,paid_at,stripe_checkout_session_id,stripe_payment_intent_id FROM playtested_studios.tester_tips WHERE id=$1",
    [tipId],
  )).rows[0];
}

process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_test_connect";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_platform";

// Legacy refund-before-completion state: the refund RPC changed status but did
// not mark paid_at. After the forward migration, the retried completion event
// records payment while preserving the refund and emits exactly one notice.
{
  const h = createHarness();
  await h.init({ migrate: false });
  const tip = await addTip(h, "00000000-0000-4000-8000-000000000001");
  await h.db.query("UPDATE playtested_studios.tester_tips SET stripe_payment_intent_id='pi_legacy',stripe_charge_id='ch_legacy' WHERE id=$1", [tip.id]);
  await h.db.query("SELECT public.tester_tip_mark_refund($1,$2,$3,$4,$5)", [tip.id, "pi_legacy", "ch_legacy", 1150, 1150]);
  assert.equal((await tipState(h.db, tip.id)).paid_at, null);
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications")).rows[0].count, 0);
  await h.db.exec(migration);
  h.paymentIntentTips.set("pi_legacy", tip.id);
  assert.equal((await deliver(h, "checkout.session.completed", completedSession(tip, "legacy", "pi_legacy"))).status, 200);
  assert.equal((await deliver(h, "checkout.session.completed", completedSession(tip, "legacy", "pi_legacy"))).status, 200);
  const state = await tipState(h.db, tip.id);
  assert.equal(state.status, "refunded");
  assert.ok(state.paid_at);
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].count, 1);
  assert.equal((await h.db.query("SELECT title FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].title, "£10.00 tip received!");
  // A stale partial refund and a later dispute cannot downgrade the full refund.
  assert.equal((await deliver(h, "charge.refunded", {
    object: "charge", id: "ch_legacy", payment_intent: "pi_legacy", amount: 1150, amount_refunded: 500, metadata: {},
  })).status, 200);
  assert.equal((await deliver(h, "charge.dispute.created", {
    object: "dispute", id: "dp_legacy", payment_intent: "pi_legacy", charge: "ch_legacy",
  })).status, 200);
  const afterStaleEvents = await tipState(h.db, tip.id);
  assert.equal(afterStaleEvents.status, "refunded");
  assert.equal((await h.db.query("SELECT refunded_amount_pence FROM playtested_studios.tester_tips WHERE id=$1", [tip.id])).rows[0].refunded_amount_pence, 1150);
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].count, 1);
  await h.db.close();
}

// Refund arrives first after the migration, then the completion event and both
// events are retried. Final state and notification count remain stable.
{
  const h = createHarness();
  await h.init();
  const tip = await addTip(h, "00000000-0000-4000-8000-000000000002");
  const pi = "pi_refund_first";
  h.paymentIntentTips.set(pi, tip.id);
  const refund = { object: "charge", id: "ch_refund_first", payment_intent: pi, amount: 1150, amount_refunded: 1150, metadata: {} };
  for (let i = 0; i < 2; i++) assert.equal((await deliver(h, "charge.refunded", refund)).status, 200);
  for (let i = 0; i < 2; i++) assert.equal((await deliver(h, "checkout.session.completed", completedSession(tip, "refund_first", pi))).status, 200);
  const state = await tipState(h.db, tip.id);
  assert.equal(state.status, "refunded");
  assert.ok(state.paid_at);
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].count, 1);
  await h.db.close();
}

// Dispute arrives first. Completion confirms payment without clearing the
// disputed state; duplicate dispute/completion events do not duplicate notice.
{
  const h = createHarness();
  await h.init();
  const tip = await addTip(h, "00000000-0000-4000-8000-000000000003");
  const pi = "pi_dispute_first";
  h.paymentIntentTips.set(pi, tip.id);
  const dispute = { object: "dispute", id: "dp_dispute_first", payment_intent: pi, charge: "ch_dispute_first" };
  for (let i = 0; i < 2; i++) assert.equal((await deliver(h, "charge.dispute.created", dispute)).status, 200);
  for (let i = 0; i < 2; i++) assert.equal((await deliver(h, "checkout.session.completed", completedSession(tip, "dispute_first", pi))).status, 200);
  const state = await tipState(h.db, tip.id);
  assert.equal(state.status, "disputed");
  assert.ok(state.paid_at);
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].count, 1);
  await h.db.close();
}

// Completion first, then refund/dispute: later state changes do not retrigger
// the paid notification because paid_at only transitions from null once.
{
  const h = createHarness();
  await h.init();
  const tip = await addTip(h, "00000000-0000-4000-8000-000000000004");
  const pi = "pi_payment_first";
  h.paymentIntentTips.set(pi, tip.id);
  assert.equal((await deliver(h, "checkout.session.completed", completedSession(tip, "payment_first", pi))).status, 200);
  assert.equal((await deliver(h, "charge.refunded", {
    object: "charge", id: "ch_payment_first", payment_intent: pi, amount: 1150, amount_refunded: 100, metadata: {},
  })).status, 200);
  assert.equal((await deliver(h, "charge.dispute.created", {
    object: "dispute", id: "dp_payment_first", payment_intent: pi, charge: "ch_payment_first",
  })).status, 200);
  assert.equal((await deliver(h, "checkout.session.expired", {
    object: "checkout.session", id: "cs_payment_first", metadata: { tester_tip_id: tip.id },
  })).status, 200, "a late expiry event is session-bound and idempotent after payment/refund/dispute events");
  const state = await tipState(h.db, tip.id);
  assert.equal(state.status, "disputed");
  assert.ok(state.paid_at);
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].count, 1);
  await h.db.close();
}

// Partial refund arrives before completion. The specific partial-refund state
// remains intact, while payment confirmation still emits one paid notification.
{
  const h = createHarness();
  await h.init();
  const tip = await addTip(h, "00000000-0000-4000-8000-000000000005");
  const pi = "pi_partial_refund_first";
  h.paymentIntentTips.set(pi, tip.id);
  assert.equal((await deliver(h, "charge.refunded", {
    object: "charge", id: "ch_partial_first", payment_intent: pi, amount: 1150, amount_refunded: 100, metadata: {},
  })).status, 200);
  assert.equal((await deliver(h, "checkout.session.completed", completedSession(tip, "partial_first", pi))).status, 200);
  assert.equal((await tipState(h.db, tip.id)).status, "partially_refunded");
  assert.equal((await h.db.query("SELECT count(*)::int AS count FROM public.notifications WHERE recipient_id=$1", [tip.testerId])).rows[0].count, 1);
  await h.db.close();
}

function feeFixture({ settlementCurrency, fee, exchangeRate, amountRefunded = 0 }) {
  return {
    charge: { payment_intent: "pi_fee_test", balance_transaction: "txn_fee_test", currency: "gbp" },
    balance: {
      currency: settlementCurrency,
      exchange_rate: exchangeRate,
      fee_details: [{ type: "stripe_fee", amount: fee, currency: settlementCurrency }],
    },
    applicationFee: {
      id: "fee_test", amount: 150, amount_refunded: amountRefunded, currency: "gbp",
      refunds: { object: "list", data: [], has_more: false },
    },
  };
}

async function runFeeEvent(h, fixture, tipId = "00000000-0000-4000-8000-000000000099") {
  h.setCharge(fixture.charge);
  h.setBalanceTransaction(fixture.balance);
  h.setApplicationFee(fixture.applicationFee);
  h.paymentIntentTips.set("pi_fee_test", tipId);
  return deliver(h, "application_fee.created", {
    object: "application_fee", id: "fee_test", account: accountId, charge: "ch_fee_test", amount: 150,
  }, undefined);
}

// GBP settlement uses the itemized Stripe fee as-is. Duplicate delivery finds
// the tagged fee refund and records it again without creating a second refund.
{
  const h = createHarness();
  await h.init();
  const f = feeFixture({ settlementCurrency: "gbp", fee: 87, exchangeRate: null, amountRefunded: 20 });
  assert.equal((await runFeeEvent(h, f)).status, 200);
  assert.equal((await runFeeEvent(h, f)).status, 200);
  assert.equal(h.stripeRequests.length, 1);
  assert.equal(h.stripeRequests[0].values.amount, "87");
  assert.equal(h.stripeRequests[0].values["metadata[tester_tip_id]"], "00000000-0000-4000-8000-000000000099");
  assert.equal(h.feeRecords.length, 2);
  assert.equal(h.feeRecords[0].p_refund_pence, 87);
  assert.equal(h.feeRecords[0].p_refund_id, h.feeRecords[1].p_refund_id);
  await h.db.close();
}

// A matching refund can be on a later page; an older webhook retry must find
// it instead of issuing another partial refund after the idempotency window.
{
  const h = createHarness();
  await h.init();
  const f = feeFixture({ settlementCurrency: "gbp", fee: 87, exchangeRate: null });
  f.applicationFee.refunds.data = Array.from({ length: 100 }, (_, index) => ({
    id: `fr_unrelated_${index}`, amount: 1, metadata: { purpose: "unrelated" },
  }));
  f.applicationFee.refunds.data.push({
    id: "fr_existing_tip", amount: 87,
    metadata: { tester_tip_id: "00000000-0000-4000-8000-000000000096", purpose: "tester_tip_processing_fee_offset" },
  });
  f.applicationFee.amount_refunded = 87;
  const tipId = "00000000-0000-4000-8000-000000000096";
  h.setCharge(f.charge);
  h.setBalanceTransaction(f.balance);
  h.setApplicationFee(f.applicationFee);
  h.paymentIntentTips.set("pi_fee_test", tipId);
  assert.equal((await deliver(h, "application_fee.created", {
    object: "application_fee", id: "fee_test", account: accountId, charge: "ch_fee_test", amount: 150,
  }, undefined)).status, 200);
  assert.equal(h.stripeRequests.length, 0, "existing fee refund found beyond the first page is not repeated");
  assert.equal(h.feeRecords[0].p_refund_id, "fr_existing_tip");
  await h.db.close();
}

// USD settlement uses Stripe's documented source-to-destination rate in minor
// units. The conversion rounds 131 USD cents / 1.3 up to 101 GBP pence, then
// caps the refund to the 70 pence still available on the application fee.
{
  const h = createHarness();
  await h.init();
  const f = feeFixture({ settlementCurrency: "usd", fee: 131, exchangeRate: 1.3, amountRefunded: 80 });
  const availableBeforeRefund = f.applicationFee.amount - f.applicationFee.amount_refunded;
  assert.equal((await runFeeEvent(h, f, "00000000-0000-4000-8000-000000000098")).status, 200);
  assert.equal(h.stripeRequests.length, 1);
  assert.equal(h.stripeRequests[0].values.amount, "70");
  assert.ok(Number(h.stripeRequests[0].values.amount) <= availableBeforeRefund);
  assert.equal(h.feeRecords[0].p_actual_processing_fee_pence, 101);
  await h.db.close();
}

// A missing conversion rate fails closed: no application-fee refund is sent.
{
  const h = createHarness();
  await h.init();
  const f = feeFixture({ settlementCurrency: "usd", fee: 131, exchangeRate: null });
  assert.equal((await runFeeEvent(h, f, "00000000-0000-4000-8000-000000000097")).status, 500);
  assert.equal(h.stripeRequests.length, 0);
  assert.equal(h.feeRecords.length, 0);
  await h.db.close();
}

console.log("Tester-tip webhook ordering, notification idempotency and Stripe processing-fee tests passed.");

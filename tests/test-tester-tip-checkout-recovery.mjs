import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/api/tester-tips/checkout/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const feeSource = await readFile(new URL("../lib/tester-tips/fees.ts", import.meta.url), "utf8");
const feeCompiled = ts.transpileModule(feeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const fees = {};
new Function("exports", feeCompiled)(fees);

const developerId = "90000000-0000-4000-8000-000000000001";
const testerId = "90000000-0000-4000-8000-000000000002";
const testId = "10000000-0000-4000-8000-000000000001";
const playtestId = "20000000-0000-4000-8000-000000000001";
const accountId = "acct_recovery123";
const rules = [
  { rule_order: 1, from_pence: 0, to_pence: 1000, fee_type: "fixed", fee_value: 150, description: "fixed" },
  { rule_order: 2, from_pence: 1000, to_pence: null, fee_type: "percentage", fee_value: 0, description: "rest" },
];

function setup({ timeoutOnce = false } = {}) {
  const rows = new Map();
  const sessionsByKey = new Map();
  const sessionsById = new Map();
  const requests = [];
  let nextTipId = 1;
  let nextSessionId = 1;
  let shouldTimeout = timeoutOnce;

  const activeTip = () => [...rows.values()].find(row => row.test_id === testId
    && row.developer_id === developerId && !["failed", "expired"].includes(row.status));
  const admin = {
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          if (table === "profiles") return { data: { roles: ["developer"] }, error: null };
          if (table === "community_game_tests") return { data: {
            id: testId, playtest_id: playtestId, tester_id: testerId, status: "reviewed",
            review_outcome: "accepted", replacement_at: null, feedback_usefulness: "useful",
          }, error: null };
          if (table === "community_playtests") return { data: { id: playtestId, developer_id: developerId, title: "Game" }, error: null };
          throw new Error(`Unexpected table query ${table}`);
        },
      };
    },
    async rpc(name, args) {
      if (name === "admin_get_tester_tipping_pause_state") return { data: [{ is_paused: false }], error: null };
      if (name === "tester_tip_get_merchant_account") return { data: [{ merchant_stripe_account_id: accountId }], error: null };
      if (name === "tester_tip_get_fee_rules") return { data: rules, error: null };
      if (name === "tester_tip_create_ledger") {
        if (activeTip()) return { data: null, error: { code: "23505" } };
        const id = `00000000-0000-4000-8000-${String(nextTipId++).padStart(12, "0")}`;
        rows.set(id, {
          id, test_id: args.p_test_id, developer_id: args.p_developer_id,
          tip_amount_pence: args.p_tip_amount_pence,
          platform_fee_pence: args.p_platform_fee_pence,
          total_amount_pence: args.p_total_amount_pence,
          status: "pending", stripe_connected_account_id: null,
          stripe_checkout_session_id: null, stripe_checkout_expires_at: null,
          stripe_checkout_success_url: null, stripe_checkout_cancel_url: null,
          checkout_recovery_version: true, created_at: new Date().toISOString(),
        });
        return { data: id, error: null };
      }
      if (name === "tester_tip_get_checkout_recovery") {
        const row = activeTip();
        return { data: row ? [structuredClone(row)] : [], error: null };
      }
      if (name === "tester_tip_set_charge_details") {
        const row = rows.get(args.p_tip_id);
        if (!row || (row.stripe_connected_account_id && row.stripe_connected_account_id !== args.p_stripe_account_id)) {
          return { data: null, error: new Error("account mismatch") };
        }
        row.stripe_connected_account_id ??= args.p_stripe_account_id;
        return { data: null, error: null };
      }
      if (name === "tester_tip_prepare_checkout") {
        const row = rows.get(args.p_tip_id);
        if (!row || (row.stripe_connected_account_id && row.stripe_connected_account_id !== args.p_stripe_account_id)) {
          return { data: null, error: new Error("tip unavailable") };
        }
        row.stripe_connected_account_id ??= args.p_stripe_account_id;
        row.stripe_checkout_expires_at ??= args.p_expires_at;
        row.stripe_checkout_success_url ??= args.p_success_url;
        row.stripe_checkout_cancel_url ??= args.p_cancel_url;
        return { data: [{
          stripe_checkout_expires_at: row.stripe_checkout_expires_at,
          stripe_checkout_success_url: row.stripe_checkout_success_url,
          stripe_checkout_cancel_url: row.stripe_checkout_cancel_url,
        }], error: null };
      }
      if (name === "tester_tip_update_checkout") {
        const row = rows.get(args.p_tip_id);
        if (!row || (row.stripe_checkout_session_id && row.stripe_checkout_session_id !== args.p_session_id)) {
          return { data: null, error: new Error("session mismatch") };
        }
        row.stripe_checkout_session_id ??= args.p_session_id;
        if (row.status !== "payment_failed") row.status = "checkout_created";
        return { data: null, error: null };
      }
      if (name === "tester_tip_mark_expired") {
        const row = rows.get(args.p_tip_id);
        if (!row || row.stripe_checkout_session_id !== args.p_session_id
            || row.stripe_connected_account_id !== args.p_connected_account_id) {
          return { data: null, error: new Error("session/account mismatch") };
        }
        if (["pending", "checkout_created", "payment_failed"].includes(row.status)) row.status = "expired";
        return { data: null, error: null };
      }
      if (name === "tester_tip_mark_no_session_expired") {
        const row = rows.get(args.p_tip_id);
        if (!row || row.stripe_checkout_session_id || Date.parse(row.stripe_checkout_expires_at) > Date.now() - 5 * 60 * 1000) {
          return { data: null, error: new Error("not safely expired") };
        }
        row.status = "expired";
        return { data: null, error: null };
      }
      if (name === "tester_tip_mark_unpayable") {
        const row = rows.get(args.p_tip_id);
        if (!row || row.stripe_checkout_session_id) return { data: null, error: new Error("session may be payable") };
        row.status = "failed";
        return { data: null, error: null };
      }
      if (name === "tester_tip_mark_paid") {
        const row = rows.get(args.p_tip_id);
        if (!row || row.stripe_checkout_session_id !== args.p_session_id) return { data: null, error: new Error("session mismatch") };
        row.status = "paid";
        row.paid_at = new Date().toISOString();
        return { data: null, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };

  const mocks = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/supabase-server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: developerId } }, error: null }) } }) },
    "@/lib/request-origin": { hasTrustedOrigin: () => true },
    "@/lib/tester-tips/fees": fees,
    "@/lib/tester-tips/server": {
      createAdminClient: () => admin,
      stripeV2Get: async () => ({ configuration: { merchant: { capabilities: { card_payments: { status: "active" } } } } }),
      stripeV1Get: async path => sessionsById.get(decodeURIComponent(path.split("/").at(-1))) ?? {},
      stripePostForm: async (path, params, idempotencyKey, stripeAccount) => {
        requests.push({ path, params: structuredClone(params), idempotencyKey, stripeAccount });
        if (path.endsWith("/expire")) {
          const id = decodeURIComponent(path.split("/").at(-2));
          const session = sessionsById.get(id);
          if (!session || session.status !== "open") throw new Error("Session is not open");
          session.status = "expired";
          return { id };
        }
        assert.equal(path, "checkout/sessions");
        const scope = `${stripeAccount}:${idempotencyKey}`;
        let session = sessionsByKey.get(scope);
        if (!session) {
          session = { id: `cs_recovery_${nextSessionId++}`, url: "https://checkout.test/session", status: "open" };
          sessionsByKey.set(scope, session);
          sessionsById.set(session.id, session);
        }
        if (shouldTimeout) {
          shouldTimeout = false;
          throw new TypeError("simulated response timeout after Stripe created the Checkout Session");
        }
        return session;
      },
    },
  };
  const route = {};
  new Function("exports", "require", compiled)(route, name => {
    if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
    return mocks[name];
  });
  return {
    post: route.POST, rows, sessionsByKey, sessionsById, requests,
    restart() {
      const restartedRoute = {};
      new Function("exports", "require", compiled)(restartedRoute, name => {
        if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
        return mocks[name];
      });
      this.post = restartedRoute.POST;
    },
  };
}

async function send(post, amount = 1000) {
  return post(new Request("https://playtested.test/api/tester-tips/checkout", {
    method: "POST", headers: { origin: "https://playtested.test", "content-type": "application/json" },
    body: JSON.stringify({ testId, tipAmountPence: amount, returnUrl: "/feedback/one" }),
  }));
}

// Lost response: retry reuses the same ledger, immutable params, key and Session.
{
  const app = setup({ timeoutOnce: true });
  assert.equal((await send(app.post)).status, 502);
  const [original] = [...app.rows.values()];
  assert.equal(original.status, "pending", "ambiguous creation must not release the lock");
  assert.equal(original.stripe_checkout_session_id, null);
  app.restart(); // Recovery state must come from the persisted ledger, not process memory.
  const retry = await send(app.post, 2000);
  assert.equal(retry.status, 200);
  assert.equal(app.rows.size, 1, "retry must recover the same ledger even if the submitted amount changed");
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[0].idempotencyKey, app.requests[1].idempotencyKey);
  assert.deepEqual(app.requests[0].params, app.requests[1].params);
  assert.equal(app.sessionsByKey.size, 1);
  assert.equal([...app.rows.values()][0].stripe_checkout_session_id, [...app.sessionsByKey.values()][0].id);
}

// Concurrent requests serialize on the database's active-tip constraint and
// Stripe's same-account idempotency key; both callers may receive one Session.
{
  const app = setup();
  const results = await Promise.all([send(app.post), send(app.post, 1500)]);
  assert.equal(app.rows.size, 1);
  assert.equal(app.sessionsByKey.size, 1);
  assert.equal(new Set(app.requests.map(request => request.idempotencyKey)).size, 1);
  assert.equal(results.every(response => response.status === 200), true);
  assert.equal(new Set((await Promise.all(results.map(r => r.json()))).map(body => body.url)).size, 1);
}

// A canonical expired Session releases the old ledger; only then is a new tip
// ID/key allowed. Its late expiration cannot affect the replacement ledger.
{
  const app = setup();
  assert.equal((await send(app.post)).status, 200);
  const [oldTip] = [...app.rows.values()];
  const oldSessionId = oldTip.stripe_checkout_session_id;
  app.sessionsById.get(oldSessionId).status = "expired";
  assert.equal((await send(app.post)).status, 200);
  const replacement = [...app.rows.values()].find(row => row.id !== oldTip.id);
  assert.equal(oldTip.status, "expired");
  assert.ok(replacement);
  assert.notEqual(app.requests[0].idempotencyKey, app.requests[1].idempotencyKey);
  assert.equal(app.sessionsByKey.size, 2);
  assert.equal(app.sessionsById.get(oldSessionId).status, "expired");
}

// If Stripe created a Session but its ID was lost, an idempotent retry may
// return that already-expired Session. The route must inspect canonical state,
// bind-and-expire the old row, then create a new ledger/session.
{
  const app = setup({ timeoutOnce: true });
  assert.equal((await send(app.post)).status, 502);
  const [oldTip] = [...app.rows.values()];
  const oldSession = [...app.sessionsByKey.values()][0];
  oldSession.status = "expired";
  assert.equal((await send(app.post)).status, 200);
  const replacement = [...app.rows.values()].find(row => row.id !== oldTip.id);
  assert.equal(oldTip.status, "expired");
  assert.ok(replacement?.stripe_checkout_session_id);
  assert.equal(app.sessionsByKey.size, 2);
  assert.equal(app.requests[0].idempotencyKey, app.requests[1].idempotencyKey,
    "the first replay retrieves the original expired Session using its original key");
  assert.notEqual(app.requests[1].idempotencyKey, app.requests[2].idempotencyKey,
    "only after canonical expiration does a new ledger/key get created");
}

console.log("Tester-tip checkout recovery, ambiguous timeout, concurrency and expired-session tests passed.");

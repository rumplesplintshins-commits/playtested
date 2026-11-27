import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, stripeV1Get, stripeV2Get, stripePostForm } from "@/lib/tester-tips/server";
import { calculateTesterTipFeePence, type TesterTipFeeRule } from "@/lib/tester-tips/fees";
import { hasTrustedOrigin } from "@/lib/request-origin";

const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply(403, { error: "Request origin could not be verified." });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "Expected JSON." });
  if (Number(request.headers.get("content-length") ?? 0) > 512) return reply(413, { error: "Request too large." });

  let testId = "";
  let tipAmountPence = 0;
  let requestedReturnUrl = "";
  try {
    const raw = await request.text();
    if (raw.length > 512) return reply(413, { error: "Request too large." });
    const body = JSON.parse(raw);
    testId = typeof body?.testId === "string" ? body.testId : "";
    tipAmountPence = Number(body?.tipAmountPence);
    requestedReturnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : "";
  } catch {
    return reply(400, { error: "Invalid request." });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId)) {
    return reply(400, { error: "Invalid feedback reference." });
  }
  if (!Number.isSafeInteger(tipAmountPence) || tipAmountPence < 500 || tipAmountPence > 3000) {
    return reply(400, { error: "Choose a tip between £5 and £30." });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply(401, { error: "Please sign in first." });

  try {
    const admin = createAdminClient();
    const pauseState = async () => {
      const { data, error } = await admin.rpc("admin_get_tester_tipping_pause_state");
      if (error || !data?.[0]) throw error ?? new Error("Tipping status could not be confirmed.");
      return data[0].is_paused === true;
    };
    if (await pauseState()) return reply(503, { error: "Tester tipping is temporarily paused. No payment has been started." });

    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("roles").eq("id", user.id).maybeSingle();
    if (profileError || !profile?.roles?.includes("developer")) {
      return reply(403, { error: "Developer access is required to send a tip." });
    }

    const { data: test, error: testError } = await admin.from("community_game_tests")
      .select("id,playtest_id,tester_id,status,review_outcome,replacement_at,feedback_usefulness")
      .eq("id", testId).maybeSingle();
    if (testError || !test) return reply(404, { error: "Accepted feedback was not found." });
    const { data: campaign, error: campaignError } = await admin.from("community_playtests")
      .select("id,developer_id,title").eq("id", test.playtest_id).maybeSingle();
    if (campaignError || !campaign || campaign.developer_id !== user.id) {
      return reply(403, { error: "Only the developer who owns this playtest can tip its tester." });
    }
    if (test.status !== "reviewed" || test.review_outcome !== "accepted" ||
        test.replacement_at !== null || test.feedback_usefulness !== "useful") {
      return reply(409, { error: "Tips are available only for accepted feedback marked Useful." });
    }
    if (test.tester_id === user.id) return reply(403, { error: "You cannot tip your own feedback." });

    const { data: payoutRows, error: payoutError } = await admin.rpc("tester_tip_get_merchant_account", { p_tester_id: test.tester_id });
    const connectedAccountId = payoutRows?.[0]?.merchant_stripe_account_id as string | undefined;
    if (payoutError || !connectedAccountId) return reply(409, { error: "This tester has not set up Stripe payouts yet." });
    const stripeAccount = await stripeV2Get(`core/accounts/${encodeURIComponent(connectedAccountId)}`, [
      "configuration.merchant", "requirements",
    ]);
    if (stripeAccount.configuration?.merchant?.capabilities?.card_payments?.status !== "active") {
      return reply(409, { error: "This tester's Stripe account is not ready to receive tips yet." });
    }

    const { data: rules, error: rulesError } = await admin.rpc("tester_tip_get_fee_rules");
    if (rulesError) throw rulesError;
    const activeRules = (rules ?? []) as TesterTipFeeRule[];
    const platformFeePence = calculateTesterTipFeePence(tipAmountPence, activeRules);
    const totalAmountPence = tipAmountPence + platformFeePence;
    const feeSnapshot = activeRules.map(rule => ({
      rule_order: rule.rule_order, from_pence: rule.from_pence, to_pence: rule.to_pence,
      fee_type: rule.fee_type, fee_value: rule.fee_value, description: rule.description,
    }));

    const origin = request.headers.get("origin")!;
    let successUrl = new URL("/account", origin);
    let cancelUrl = new URL("/account", origin);
    if (requestedReturnUrl.startsWith("/") && !requestedReturnUrl.startsWith("//")) {
      try {
        const candidate = new URL(requestedReturnUrl, origin);
        if (candidate.origin === origin && !candidate.pathname.startsWith("/api/")) {
          successUrl = candidate;
          cancelUrl = new URL(candidate.toString());
        }
      } catch { /* Fall back to the account page. */ }
    }
    successUrl.searchParams.set("tip", "success");
    cancelUrl.searchParams.set("tip", "cancelled");

    const createLedger = () => admin.rpc("tester_tip_create_ledger", {
      p_test_id: test.id, p_developer_id: user.id, p_tip_amount_pence: tipAmountPence,
      p_platform_fee_pence: platformFeePence, p_total_amount_pence: totalAmountPence,
      p_fee_rules_snapshot: feeSnapshot,
    });
    const inserted = await createLedger();
    let insertedNewTip = !inserted.error && Boolean(inserted.data);
    if (inserted.error && inserted.error.code !== "23505") throw inserted.error;

    for (let pass = 0; pass < 3; pass += 1) {
      let tip: Record<string, unknown> | null = null;
      if (insertedNewTip) {
        const { data: id } = inserted;
        tip = { id, tip_amount_pence: tipAmountPence, platform_fee_pence: platformFeePence,
          total_amount_pence: totalAmountPence, status: "pending", stripe_connected_account_id: connectedAccountId,
          stripe_checkout_session_id: null, stripe_checkout_expires_at: null,
          stripe_checkout_success_url: null, stripe_checkout_cancel_url: null,
          checkout_recovery_version: true, created_at: new Date().toISOString() };
        // The recovery RPC is the authoritative snapshot, including a concurrent request's stored values.
        const { data, error } = await admin.rpc("tester_tip_get_checkout_recovery", {
          p_test_id: test.id, p_developer_id: user.id,
        });
        if (error) throw error;
        tip = Array.isArray(data) ? data[0] ?? tip : tip;
      } else {
        const { data, error } = await admin.rpc("tester_tip_get_checkout_recovery", {
          p_test_id: test.id, p_developer_id: user.id,
        });
        if (error) throw error;
        tip = Array.isArray(data) ? data[0] ?? null : null;
      }
      if (!tip?.id) return reply(409, { error: "A tip has already been sent or is being paid for this feedback." });
      if (["paid", "refunded", "partially_refunded", "disputed"].includes(String(tip.status))) {
        return reply(409, { error: "A tip has already been sent for this feedback." });
      }

      const tipId = String(tip.id);
      const tipAccountId = typeof tip.stripe_connected_account_id === "string"
        ? tip.stripe_connected_account_id : connectedAccountId;
      if (tip.stripe_checkout_session_id) {
        const sessionId = String(tip.stripe_checkout_session_id);
        const session = await stripeV1Get(`checkout/sessions/${encodeURIComponent(sessionId)}`, tipAccountId);
        if (session.status === "open" && typeof session.url === "string") {
          if (await pauseState()) return reply(503, { error: "Tester tipping is paused. No checkout link was issued." });
          return reply(200, { url: session.url, breakdown: {
            tipAmountPence: tip.tip_amount_pence, platformFeePence: tip.platform_fee_pence,
            totalChargePence: tip.total_amount_pence,
            processingFeeHandling: "Stripe processing fees are paid by Playtested, not added to your checkout total.",
          } });
        }
        if (session.status === "complete" && session.payment_status === "paid") {
          const paymentIntent = session.payment_intent;
          const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent
            : paymentIntent && typeof paymentIntent === "object" && "id" in paymentIntent
              ? String(paymentIntent.id) : null;
          const { error } = await admin.rpc("tester_tip_mark_paid", {
            p_tip_id: tipId, p_session_id: sessionId, p_payment_intent_id: paymentIntentId,
          });
          if (error) throw error;
          return reply(409, { error: "This tip has already been paid." });
        }
        if (session.status !== "expired") return reply(409, { error: "The existing tip payment is still being resolved." });
        const { error } = await admin.rpc("tester_tip_mark_expired", {
          p_tip_id: tipId, p_session_id: sessionId, p_connected_account_id: tipAccountId,
        });
        if (error) throw error;
        const retried = await createLedger();
        insertedNewTip = !retried.error && Boolean(retried.data);
        if (retried.error && retried.error.code !== "23505") throw retried.error;
        continue;
      }

      const recoveryVersion = tip.checkout_recovery_version === true;
      const expiresAt = typeof tip.stripe_checkout_expires_at === "string"
        ? new Date(tip.stripe_checkout_expires_at) : null;
      const legacySafeExpiry = new Date(new Date(String(tip.created_at)).getTime() + 25 * 60 * 60 * 1000);
      const safeExpiry = expiresAt ?? legacySafeExpiry;
      if (!recoveryVersion && !insertedNewTip && Date.now() <= safeExpiry.getTime() + 5 * 60 * 1000) {
        return reply(409, { error: "An earlier checkout is still being reconciled. Try again after it expires." });
      }
      if (expiresAt && Date.now() > expiresAt.getTime()) {
        if (Date.now() <= expiresAt.getTime() + 5 * 60 * 1000) {
          return reply(409, { error: "Checkout expiration is being confirmed. Please try again shortly." });
        }
        const { error } = await admin.rpc("tester_tip_mark_no_session_expired", { p_tip_id: tipId });
        if (error) throw error;
        const retried = await createLedger();
        insertedNewTip = !retried.error && Boolean(retried.data);
        if (retried.error && retried.error.code !== "23505") throw retried.error;
        continue;
      }
      if (!expiresAt && !recoveryVersion && Date.now() > safeExpiry.getTime() + 5 * 60 * 1000) {
        const { error } = await admin.rpc("tester_tip_mark_no_session_expired", { p_tip_id: tipId });
        if (error) throw error;
        const retried = await createLedger();
        insertedNewTip = !retried.error && Boolean(retried.data);
        if (retried.error && retried.error.code !== "23505") throw retried.error;
        continue;
      }

      const { error: chargeDetailsError } = await admin.rpc("tester_tip_set_charge_details", {
        p_tip_id: tipId, p_stripe_account_id: tipAccountId,
      });
      if (chargeDetailsError) {
        if (insertedNewTip) await admin.rpc("tester_tip_mark_unpayable", { p_tip_id: tipId });
        throw chargeDetailsError;
      }
      const candidateExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data: preparedRows, error: prepareError } = await admin.rpc("tester_tip_prepare_checkout", {
        p_tip_id: tipId, p_stripe_account_id: tipAccountId, p_expires_at: candidateExpiry,
        p_success_url: successUrl.toString(), p_cancel_url: cancelUrl.toString(),
      });
      if (prepareError) throw prepareError;
      const prepared = Array.isArray(preparedRows) ? preparedRows[0] : null;
      if (!prepared?.stripe_checkout_expires_at || !prepared.stripe_checkout_success_url || !prepared.stripe_checkout_cancel_url) {
        throw new Error("Checkout recovery parameters were not saved.");
      }

      let createdSessionId: string | null = null;
      try {
        const session = await stripePostForm("checkout/sessions", {
          mode: "payment",
          "allowed_payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": "gbp",
          "line_items[0][price_data][unit_amount]": String(tip.tip_amount_pence),
          "line_items[0][price_data][product_data][name]": "Tester reward",
          "line_items[0][price_data][product_data][description]": "The tester receives this full amount.",
          "line_items[0][quantity]": "1",
          "line_items[1][price_data][currency]": "gbp",
          "line_items[1][price_data][unit_amount]": String(tip.platform_fee_pence),
          "line_items[1][price_data][product_data][name]": "Playtested fee",
          "line_items[1][quantity]": "1",
          "payment_intent_data[application_fee_amount]": String(tip.platform_fee_pence),
          "payment_intent_data[metadata][tester_tip_id]": tipId,
          "metadata[tester_tip_id]": tipId,
          "metadata[tip_amount_pence]": String(tip.tip_amount_pence),
          "metadata[platform_fee_pence]": String(tip.platform_fee_pence),
          client_reference_id: tipId,
          expires_at: String(Math.floor(new Date(prepared.stripe_checkout_expires_at).getTime() / 1000)),
          success_url: prepared.stripe_checkout_success_url,
          cancel_url: prepared.stripe_checkout_cancel_url,
        }, `playtested-tip-checkout-${tipId}`, tipAccountId);
        if (typeof session.url !== "string" || typeof session.id !== "string") {
          throw new Error("Stripe did not return a checkout URL.");
        }
        createdSessionId = session.id;
        const { error: updateError } = await admin.rpc("tester_tip_update_checkout", {
          p_tip_id: tipId, p_session_id: session.id, p_status: "checkout_created",
        });
        if (updateError) throw updateError;
        // An idempotent replay may return a Session whose response was cached
        // hours ago. Check canonical Stripe state before returning any URL.
        const canonicalSession = await stripeV1Get(
          `checkout/sessions/${encodeURIComponent(session.id)}`, tipAccountId,
        );
        if (canonicalSession.status === "expired") {
          const { error } = await admin.rpc("tester_tip_mark_expired", {
            p_tip_id: tipId, p_session_id: session.id, p_connected_account_id: tipAccountId,
          });
          if (error) throw error;
          const retried = await createLedger();
          insertedNewTip = !retried.error && Boolean(retried.data);
          if (retried.error && retried.error.code !== "23505") throw retried.error;
          continue;
        }
        if (canonicalSession.status === "complete" && canonicalSession.payment_status === "paid") {
          const paymentIntent = canonicalSession.payment_intent;
          const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent
            : paymentIntent && typeof paymentIntent === "object" && "id" in paymentIntent
              ? String(paymentIntent.id) : null;
          const { error } = await admin.rpc("tester_tip_mark_paid", {
            p_tip_id: tipId, p_session_id: session.id, p_payment_intent_id: paymentIntentId,
          });
          if (error) throw error;
          return reply(409, { error: "This tip has already been paid." });
        }
        if (canonicalSession.status !== "open" || typeof canonicalSession.url !== "string") {
          return reply(409, { error: "The Checkout Session is being reconciled. Retry shortly." });
        }
        const { data: latestPauseRows, error: latestPauseError } = await admin.rpc("admin_get_tester_tipping_pause_state");
        if (latestPauseError || !latestPauseRows?.[0]) {
          throw new Error("Tipping status could not be confirmed. The checkout link was not returned.");
        }
        if (latestPauseRows[0].is_paused === true) {
          try {
            await stripePostForm(`checkout/sessions/${encodeURIComponent(session.id)}/expire`, {},
              `playtested-tip-pause-race-expire-${session.id}`, tipAccountId);
            await admin.rpc("tester_tip_mark_expired", {
              p_tip_id: tipId, p_session_id: session.id, p_connected_account_id: tipAccountId,
            });
          } catch { /* Admin pause sweep retains and retries unresolved Sessions. */ }
          return reply(503, { error: "Tester tipping was paused while checkout was starting. No payment link was issued." });
        }
        return reply(200, { url: canonicalSession.url, breakdown: {
          tipAmountPence: tip.tip_amount_pence, platformFeePence: tip.platform_fee_pence,
          totalChargePence: tip.total_amount_pence,
          processingFeeHandling: "Stripe processing fees are paid by Playtested, not added to your checkout total.",
        } });
      } catch (error) {
        if (createdSessionId) {
          // Only release after Stripe confirms expiration. Otherwise keep the
          // exact Session ID in the ledger for the next reconciliation attempt.
          try {
            await stripePostForm(`checkout/sessions/${encodeURIComponent(createdSessionId)}/expire`, {},
              `playtested-tip-checkout-error-expire-${createdSessionId}`, tipAccountId);
            await admin.rpc("tester_tip_mark_expired", {
              p_tip_id: tipId, p_session_id: createdSessionId, p_connected_account_id: tipAccountId,
            });
          } catch {
            await admin.rpc("tester_tip_update_checkout", {
              p_tip_id: tipId, p_session_id: createdSessionId, p_status: "checkout_created",
            });
          }
        }
        // No Session ID means the request outcome is ambiguous. Keep this row
        // locked and replay identical stored parameters with the same key.
        throw error;
      }
    }
    return reply(409, { error: "Checkout is being recovered. Please retry shortly." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout.";
    return reply(502, { error: message });
  }
}

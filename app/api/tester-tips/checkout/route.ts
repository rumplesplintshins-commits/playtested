import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, stripeV2Get, stripePostForm } from "@/lib/tester-tips/server";
import { calculateTesterTipFeePence } from "@/lib/tester-tips/fees";
import { hasTrustedOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply(403, { error: "Request origin could not be verified." });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "Expected JSON." });
  if (Number(request.headers.get("content-length") ?? 0) > 512) return reply(413, { error: "Request too large." });

  let testId = "";
  let tipAmountPence = 0;
  try {
    const raw = await request.text();
    if (raw.length > 512) return reply(413, { error: "Request too large." });
    const body = JSON.parse(raw);
    testId = typeof body?.testId === "string" ? body.testId : "";
    tipAmountPence = Number(body?.tipAmountPence);
  } catch {
    return reply(400, { error: "Invalid request." });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId)) {
    return reply(400, { error: "Invalid feedback reference." });
  }
  if (!Number.isSafeInteger(tipAmountPence) || tipAmountPence < 500 || tipAmountPence > 100000) {
    return reply(400, { error: "Choose a tip between £5 and £1,000." });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply(401, { error: "Please sign in first." });

  try {
    const admin = createAdminClient();
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

    const { data: payoutRows, error: payoutError } = await admin.rpc("tester_tip_get_stripe_account", { p_tester_id: test.tester_id });
    const payoutAccount = payoutRows?.[0];
    if (payoutError || !payoutAccount) {
      return reply(409, { error: "This tester has not set up Stripe payouts yet." });
    }
    const stripeAccount = await stripeV2Get(`core/accounts/${encodeURIComponent(payoutAccount.stripe_account_id)}`, [
      "configuration.recipient", "requirements",
    ]);
    const transferStatus = stripeAccount.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
    if (transferStatus !== "active") {
      return reply(409, { error: "This tester's Stripe account is not ready to receive tips yet." });
    }

    const { data: rules, error: rulesError } = await admin.rpc("tester_tip_get_fee_rules");
    if (rulesError) throw rulesError;
    const activeRules = rules ?? [];
    const platformFeePence = calculateTesterTipFeePence(tipAmountPence, activeRules);
    const totalAmountPence = tipAmountPence + platformFeePence;
    const feeSnapshot = activeRules.map(rule => ({
      rule_order: rule.rule_order, from_pence: rule.from_pence, to_pence: rule.to_pence,
      fee_type: rule.fee_type, fee_value: rule.fee_value, description: rule.description,
    }));

    const { data: tipId, error: insertError } = await admin.rpc("tester_tip_create_ledger", {
      p_test_id: test.id, p_developer_id: user.id, p_tip_amount_pence: tipAmountPence,
      p_platform_fee_pence: platformFeePence, p_total_amount_pence: totalAmountPence,
      p_fee_rules_snapshot: feeSnapshot,
    });
    if (insertError?.code === "23505") {
      return reply(409, { error: "A tip has already been sent or is being paid for this feedback." });
    }
    if (insertError || !tipId) throw insertError ?? new Error("Could not record the tip.");
    const tip = { id: tipId as string };

    const origin = request.headers.get("origin")!;
    try {
      const session = await stripePostForm("checkout/sessions", {
        mode: "payment",
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": "gbp",
        "line_items[0][price_data][unit_amount]": String(totalAmountPence),
        "line_items[0][price_data][product_data][name]": "Playtested tester tip",
        "line_items[0][price_data][product_data][description]": "Reward for accepted and useful playtest feedback",
        "line_items[0][quantity]": "1",
        "payment_intent_data[application_fee_amount]": String(platformFeePence),
        "payment_intent_data[transfer_data][destination]": payoutAccount.stripe_account_id,
        "payment_intent_data[metadata][tester_tip_id]": tip.id,
        "metadata[tester_tip_id]": tip.id,
        client_reference_id: tip.id,
        success_url: `${origin}/account?tip=success`,
        cancel_url: `${origin}/account?tip=cancelled`,
      }, `playtested-tip-checkout-${tip.id}`);
      if (typeof session.url !== "string" || typeof session.id !== "string") {
        throw new Error("Stripe did not return a checkout URL.");
      }
      const { error: updateError } = await admin.rpc("tester_tip_update_checkout", {
        p_tip_id: tip.id, p_session_id: session.id, p_status: "checkout_created",
      });
      if (updateError) throw updateError;
      return reply(200, { url: session.url });
    } catch (error) {
      await admin.rpc("tester_tip_update_checkout", {
        p_tip_id: tip.id, p_session_id: null, p_status: "failed",
      });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout.";
    return reply(502, { error: message });
  }
}

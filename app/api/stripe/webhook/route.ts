import { NextResponse } from "next/server";
import { createAdminClient, verifyStripeWebhook } from "@/lib/tester-tips/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  if (rawBody.length > 1024 * 1024) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: Record<string, any>;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }

  try {
    const admin = createAdminClient();
    const object = event.data?.object ?? {};
    const metadataTipId = object.metadata?.tester_tip_id;
    const paymentIntentId = typeof object.payment_intent === "string"
      ? object.payment_intent
      : typeof object.id === "string" && object.object === "payment_intent" ? object.id : null;

    if (event.type === "checkout.session.completed" && object.payment_status === "paid" && metadataTipId) {
      const { error } = await admin.schema("playtested_studios").from("tester_tips").update({
        status: "paid",
        stripe_checkout_session_id: object.id,
        stripe_payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", metadataTipId).in("status", ["pending", "checkout_created"]);
      if (error) throw error;
    } else if (event.type === "checkout.session.expired" && metadataTipId) {
      const { error } = await admin.schema("playtested_studios").from("tester_tips")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", metadataTipId).in("status", ["pending", "checkout_created"]);
      if (error) throw error;
    } else if (event.type === "payment_intent.payment_failed" && metadataTipId) {
      const { error } = await admin.schema("playtested_studios").from("tester_tips")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", metadataTipId).in("status", ["pending", "checkout_created"]);
      if (error) throw error;
    } else if (event.type === "charge.refunded" && object.payment_intent) {
      const amountRefunded = Number(object.amount_refunded ?? 0);
      const amount = Number(object.amount ?? 0);
      const { error } = await admin.schema("playtested_studios").from("tester_tips").update({
        status: amountRefunded >= amount ? "refunded" : "partially_refunded",
        refunded_amount_pence: amountRefunded,
        stripe_charge_id: object.id,
        updated_at: new Date().toISOString(),
      }).eq("stripe_payment_intent_id", object.payment_intent);
      if (error) throw error;
    } else if (event.type === "charge.dispute.created" && object.payment_intent) {
      const { error } = await admin.schema("playtested_studios").from("tester_tips")
        .update({ status: "disputed", stripe_charge_id: object.id, updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", object.payment_intent);
      if (error) throw error;
    }

    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx response makes Stripe retry delivery; never acknowledge a failed ledger write.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

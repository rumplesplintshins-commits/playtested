import { NextResponse } from "next/server";
import { createAdminClient, verifyStripeWebhook } from "@/lib/tester-tips/server";

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  if (rawBody.length > 1024 * 1024) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: JsonRecord;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) throw new Error("Invalid event");
    event = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const data = isRecord(event.data) ? event.data : {};
    const object = isRecord(data.object) ? data.object : {};
    const metadata = isRecord(object.metadata) ? object.metadata : {};
    const metadataTipId = typeof metadata.tester_tip_id === "string" ? metadata.tester_tip_id : null;
    const objectId = typeof object.id === "string" ? object.id : null;
    const paymentIntentId = typeof object.payment_intent === "string"
      ? object.payment_intent
      : object.object === "payment_intent" ? objectId : null;

    if (event.type === "checkout.session.completed" && object.payment_status === "paid" && metadataTipId && objectId) {
      const { error } = await admin.rpc("tester_tip_mark_paid", {
        p_tip_id: metadataTipId, p_session_id: objectId, p_payment_intent_id: paymentIntentId,
      });
      if (error) throw error;
    } else if (event.type === "checkout.session.expired" && metadataTipId) {
      const { error } = await admin.rpc("tester_tip_mark_expired", { p_tip_id: metadataTipId });
      if (error) throw error;
    } else if (event.type === "payment_intent.payment_failed" && metadataTipId) {
      const { error } = await admin.rpc("tester_tip_mark_failed", { p_tip_id: metadataTipId });
      if (error) throw error;
    } else if (event.type === "charge.refunded" && paymentIntentId && objectId) {
      const { error } = await admin.rpc("tester_tip_mark_refund", {
        p_payment_intent_id: paymentIntentId, p_charge_id: objectId,
        p_refunded_amount_pence: Number(object.amount_refunded ?? 0),
        p_charge_amount_pence: Number(object.amount ?? 0),
      });
      if (error) throw error;
    } else if (event.type === "charge.dispute.created" && paymentIntentId && objectId) {
      const { error } = await admin.rpc("tester_tip_mark_disputed", {
        p_payment_intent_id: paymentIntentId, p_charge_id: objectId,
      });
      if (error) throw error;
    }

    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx response makes Stripe retry delivery; never acknowledge a failed ledger write.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

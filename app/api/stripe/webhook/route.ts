import { NextResponse } from "next/server";
import { createAdminClient, stripeV1Get, verifyStripeWebhook } from "@/lib/tester-tips/server";

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
    const connectedAccountId = typeof event.account === "string" ? event.account : undefined;


    if (event.type === "charge.succeeded" && connectedAccountId && objectId && paymentIntentId) {
      // Direct charges live on the tester's connected account. Read the actual
      // Stripe fee from that account's balance transaction before refunding
      // any unused processing allowance to the developer.
      const paymentIntent = await stripeV1Get(
        `payment_intents/${encodeURIComponent(paymentIntentId)}`, connectedAccountId,
      );
      const paymentMetadata = isRecord(paymentIntent.metadata) ? paymentIntent.metadata : {};
      const tipId = typeof paymentMetadata.tester_tip_id === "string" ? paymentMetadata.tester_tip_id : null;
      if (tipId) {
        const balanceTransactionId = typeof object.balance_transaction === "string"
          ? object.balance_transaction
          : isRecord(object.balance_transaction) && typeof object.balance_transaction.id === "string"
            ? object.balance_transaction.id : null;
        if (!balanceTransactionId) throw new Error("Stripe charge has no balance transaction yet.");
        const balanceTransaction = await stripeV1Get(
          `balance_transactions/${encodeURIComponent(balanceTransactionId)}`, connectedAccountId,
        );
        let actualFeePence = Number(balanceTransaction.fee);
        if (!Number.isSafeInteger(actualFeePence) || actualFeePence < 0) {
          throw new Error("Stripe returned an invalid processing fee.");
        }
        const chargeCurrency = typeof object.currency === "string" ? object.currency.toLowerCase() : "gbp";
        const settlementCurrency = typeof balanceTransaction.currency === "string"
          ? balanceTransaction.currency.toLowerCase() : chargeCurrency;
        if (settlementCurrency !== chargeCurrency) {
          const exchangeRate = Number(balanceTransaction.exchange_rate);
          if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
            throw new Error("Unable to convert the Stripe processing fee into the charge currency.");
          }
          actualFeePence = Math.ceil(actualFeePence / exchangeRate);
        }
        if (chargeCurrency !== "gbp") {
          throw new Error("Tester tip processing-fee reconciliation currently expects GBP charges.");
        }
        const { data: refundAmount, error: prepareError } = await admin.rpc(
          "tester_tip_prepare_processing_refund",
          { p_tip_id: tipId, p_actual_fee_pence: actualFeePence },
        );
        if (prepareError) throw prepareError;
        const refundPence = Number(refundAmount ?? 0);
        if (refundPence > 0) {
          try {
            const refund = await stripePostForm("refunds", {
              charge: objectId,
              amount: String(refundPence),
              "metadata[tester_tip_id]": tipId,
              "metadata[refund_type]": "unused_processing_allowance",
            }, `playtested-tip-processing-refund-${tipId}`, connectedAccountId);
            if (typeof refund.id !== "string") throw new Error("Stripe did not return a refund ID.");
            const { error: completeError } = await admin.rpc("tester_tip_complete_processing_refund", {
              p_tip_id: tipId, p_refund_id: refund.id,
            });
            if (completeError) throw completeError;
          } catch (refundError) {
            await admin.rpc("tester_tip_fail_processing_refund", { p_tip_id: tipId });
            throw refundError;
          }
        }
      }
    }

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
    } else if ((event.type === "charge.refunded" || event.type === "charge.dispute.created") && paymentIntentId && objectId) {
      // Stripe does not guarantee event delivery order. Resolve the tip from PaymentIntent
      // metadata so refunds/disputes can be recorded even before checkout.session.completed.
      let tipId = metadataTipId;
      if (!tipId) {
        const paymentIntent = await stripeV1Get(
          `payment_intents/${encodeURIComponent(paymentIntentId)}`, connectedAccountId,
        );
        const paymentMetadata = isRecord(paymentIntent.metadata) ? paymentIntent.metadata : {};
        tipId = typeof paymentMetadata.tester_tip_id === "string" ? paymentMetadata.tester_tip_id : null;
      }
      if (tipId && event.type === "charge.refunded") {
        const paymentIntent = await stripeV1Get(
          `payment_intents/${encodeURIComponent(paymentIntentId)}`, connectedAccountId,
        );
        const paymentMetadata = isRecord(paymentIntent.metadata) ? paymentIntent.metadata : {};
        const allowance = Number(paymentMetadata.processing_allowance_pence ?? 0);
        // The automatic allowance return is not a refund of the tester's reward.
        if (Number(object.amount_refunded ?? 0) <= allowance) {
          return NextResponse.json({ received: true });
        }
        const { error } = await admin.rpc("tester_tip_mark_refund", {
          p_tip_id: tipId, p_payment_intent_id: paymentIntentId, p_charge_id: objectId,
          p_refunded_amount_pence: Number(object.amount_refunded ?? 0),
          p_charge_amount_pence: Number(object.amount ?? 0),
        });
        if (error) throw error;
      } else if (tipId && event.type === "charge.dispute.created") {
        const { error } = await admin.rpc("tester_tip_mark_disputed", {
          p_tip_id: tipId, p_payment_intent_id: paymentIntentId, p_charge_id: objectId,
        });
        if (error) throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx response makes Stripe retry delivery; never acknowledge a failed ledger write.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

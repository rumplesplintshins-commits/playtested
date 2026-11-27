import { NextResponse } from "next/server";
import { createAdminClient, stripeV1Get, stripePostForm, verifyStripeWebhook } from "@/lib/tester-tips/server";
import { availableApplicationFeeRefund, convertBalanceFeeToChargeMinorUnits } from "@/lib/tester-tips/processing-fee";

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 1024 * 1024) return NextResponse.json({ error: "Payload too large." }, { status: 413 });

  // Parse only to select the expected endpoint secret. No event data is acted on
  // until its signature has been verified with that event family's own secret.
  let event: JsonRecord;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed) || typeof parsed.type !== "string") throw new Error("Invalid event");
    event = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  const webhookSecret = event.type === "application_fee.created"
    ? process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeWebhook(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
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



    if (event.type === "application_fee.created" && objectId) {
      // Stripe-managed pricing charges processing fees to the connected account.
      // Refund that exact cost from Playtested's application fee so the tester
      // nets the advertised reward while the developer still pays only tip + fee.
      const feeId = objectId;
      const connectedId = typeof object.account === "string" ? object.account : null;
      const chargeId = typeof object.charge === "string"
        ? object.charge
        : isRecord(object.charge) && typeof object.charge.id === "string" ? object.charge.id : null;
      if (!connectedId || !chargeId) throw new Error("Application fee is missing its connected account or charge.");
      const charge = await stripeV1Get(`charges/${encodeURIComponent(chargeId)}`, connectedId);
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      const balanceTransactionId = typeof charge.balance_transaction === "string"
        ? charge.balance_transaction
        : isRecord(charge.balance_transaction) && typeof charge.balance_transaction.id === "string"
          ? charge.balance_transaction.id : null;
      if (!paymentIntentId || !balanceTransactionId) throw new Error("Charge is missing its PaymentIntent or balance transaction.");
      const paymentIntent = await stripeV1Get(`payment_intents/${encodeURIComponent(paymentIntentId)}`, connectedId);
      const paymentMetadata = isRecord(paymentIntent.metadata) ? paymentIntent.metadata : {};
      const tipId = typeof paymentMetadata.tester_tip_id === "string" ? paymentMetadata.tester_tip_id : null;
      if (!tipId) throw new Error("PaymentIntent is missing its tester tip reference.");
      const balanceTransaction = await stripeV1Get(
        `balance_transactions/${encodeURIComponent(balanceTransactionId)}`, connectedId,
      );
      // For Connect direct charges, balance_transaction.fee can include both
      // Stripe's processing fee and the platform application fee. Refund only
      // the itemised Stripe processing component, never the application fee.
      if (!Array.isArray(balanceTransaction.fee_details)) {
        throw new Error("Stripe did not return itemised balance transaction fees.");
      }
      const chargeCurrency = typeof charge.currency === "string" ? charge.currency.toLowerCase() : null;
      const settlementCurrency = typeof balanceTransaction.currency === "string"
        ? balanceTransaction.currency.toLowerCase() : null;
      if (!chargeCurrency || !settlementCurrency) throw new Error("Stripe omitted a charge or settlement currency.");
      const stripeFeeDetails = balanceTransaction.fee_details.filter((detail: unknown) =>
        isRecord(detail) && detail.type === "stripe_fee",
      );
      let actualFeePence = 0;
      for (const detail of stripeFeeDetails) {
        if (!isRecord(detail)) continue;
        const amount = Number(detail.amount);
        const feeCurrency = typeof detail.currency === "string" ? detail.currency.toLowerCase() : null;
        if (!Number.isSafeInteger(amount) || amount < 0 || feeCurrency !== settlementCurrency) {
          throw new Error("Stripe returned an invalid itemised processing fee.");
        }
        actualFeePence += amount;
      }
      if (!Number.isSafeInteger(actualFeePence)) {
        throw new Error("Stripe returned an invalid total processing fee.");
      }
      if (chargeCurrency !== "gbp") throw new Error("Tester tip processing fee must be denominated in GBP.");
      actualFeePence = convertBalanceFeeToChargeMinorUnits(
        actualFeePence, settlementCurrency, chargeCurrency, balanceTransaction.exchange_rate,
      );

      // Use Stripe's current fee state, not the possibly stale webhook snapshot,
      // to cap the refund at the still-unrefunded application fee. Expand its
      // refund list so a retried event can recover a refund created before a
      // transient database failure without issuing another refund.
      const applicationFee = await stripeV1Get(`application_fees/${encodeURIComponent(feeId)}`);
      const applicationFeePence = Number(applicationFee.amount);
      const alreadyRefundedPence = Number(applicationFee.amount_refunded ?? 0);
      if (applicationFee.currency !== chargeCurrency
          || !Number.isSafeInteger(applicationFeePence) || applicationFeePence < 0
          || !Number.isSafeInteger(alreadyRefundedPence) || alreadyRefundedPence < 0
          || alreadyRefundedPence > applicationFeePence) {
        throw new Error("Stripe returned an invalid application fee.");
      }
      // The expanded fee object only contains one page of refunds. Walk the
      // refund endpoint so a successful refund is still found after a delayed
      // webhook retry and after Stripe's idempotency window expires.
      const refunds: unknown[] = [];
      let startingAfter: string | null = null;
      let refundsComplete = false;
      for (let page = 0; page < 100; page += 1) {
        const query = new URLSearchParams({ limit: "100" });
        if (startingAfter) query.set("starting_after", startingAfter);
        const refundPage = await stripeV1Get(
          `application_fees/${encodeURIComponent(feeId)}/refunds?${query.toString()}`,
        );
        if (!Array.isArray(refundPage.data) || typeof refundPage.has_more !== "boolean") {
          throw new Error("Stripe returned an invalid application fee refund page.");
        }
        refunds.push(...refundPage.data);
        if (!refundPage.has_more) {
          refundsComplete = true;
          break;
        }
        const lastRefund = refundPage.data.at(-1);
        if (!isRecord(lastRefund) || typeof lastRefund.id !== "string" || lastRefund.id === startingAfter) {
          throw new Error("Stripe returned an incomplete application fee refund page.");
        }
        startingAfter = lastRefund.id;
      }
      if (!refundsComplete) throw new Error("Stripe application fee refund history exceeds the safe reconciliation limit.");
      const existingRefunds = refunds.filter((refund: unknown) => {
        if (!isRecord(refund) || !isRecord(refund.metadata)) return false;
        return refund.metadata.tester_tip_id === tipId
          && refund.metadata.purpose === "tester_tip_processing_fee_offset";
      });
      if (existingRefunds.length > 1) throw new Error("Multiple processing-fee refunds already exist for this tip.");

      let refundPence = 0;
      let refundId: string | null = null;
      if (existingRefunds.length === 1 && isRecord(existingRefunds[0])) {
        const existingRefund = existingRefunds[0];
        const existingAmount = Number(existingRefund.amount);
        if (typeof existingRefund.id !== "string" || !Number.isSafeInteger(existingAmount)
            || existingAmount < 0 || existingAmount > actualFeePence) {
          throw new Error("Stripe returned an invalid existing processing-fee refund.");
        }
        refundPence = existingAmount;
        refundId = existingRefund.id;
      } else {
        refundPence = availableApplicationFeeRefund(
          actualFeePence, applicationFeePence, alreadyRefundedPence,
        );
        if (refundPence > 0) {
          const feeRefund = await stripePostForm(
            `application_fees/${encodeURIComponent(feeId)}/refunds`,
            {
              amount: String(refundPence),
              "metadata[tester_tip_id]": tipId,
              "metadata[purpose]": "tester_tip_processing_fee_offset",
            },
            `playtested-tip-processing-fee-offset-${tipId}`,
          );
          if (typeof feeRefund.id !== "string" || Number(feeRefund.amount) !== refundPence) {
            throw new Error("Stripe did not return the expected application fee refund.");
          }
          refundId = feeRefund.id;
        }
      }
      const { error: recordError } = await admin.rpc("tester_tip_record_processing_fee_refund", {
        p_tip_id: tipId,
        p_charge_id: chargeId,
        p_actual_processing_fee_pence: actualFeePence,
        p_refund_pence: refundPence,
        p_refund_id: refundId,
      });
      if (recordError) throw recordError;
    }

    if (event.type === "checkout.session.completed" && object.payment_status === "paid" && metadataTipId && objectId) {
      const { error } = await admin.rpc("tester_tip_mark_paid", {
        p_tip_id: metadataTipId, p_session_id: objectId, p_payment_intent_id: paymentIntentId,
      });
      if (error) throw error;
    } else if (event.type === "checkout.session.expired" && metadataTipId) {
      if (!objectId || !connectedAccountId) throw new Error("Expired Checkout event is missing its Session or connected account.");
      const { error } = await admin.rpc("tester_tip_mark_expired", {
        p_tip_id: metadataTipId, p_session_id: objectId, p_connected_account_id: connectedAccountId,
      });
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
        const customerRefundedPence = Number(object.amount_refunded ?? 0);
        if (!Number.isSafeInteger(customerRefundedPence) || customerRefundedPence <= 0) {
          return NextResponse.json({ received: true });
        }
        const { error } = await admin.rpc("tester_tip_mark_refund", {
          p_tip_id: tipId, p_payment_intent_id: paymentIntentId, p_charge_id: objectId,
          p_refunded_amount_pence: customerRefundedPence,
          p_charge_amount_pence: Number(object.amount ?? 0),
        });
        if (error) throw error;
      } else if (tipId && event.type === "charge.dispute.created") {
        // A dispute event's object ID is dp_..., not the underlying charge ID.
        const disputeChargeId = typeof object.charge === "string"
          ? object.charge
          : isRecord(object.charge) && typeof object.charge.id === "string" ? object.charge.id : null;
        if (!disputeChargeId) throw new Error("Dispute is missing its underlying charge ID.");
        const { error } = await admin.rpc("tester_tip_mark_disputed", {
          p_tip_id: tipId, p_payment_intent_id: paymentIntentId, p_charge_id: disputeChargeId,
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

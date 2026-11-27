import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_API_VERSION = "2026-11-18.endive";

type JsonRecord = Record<string, unknown>;
type StripeApiResponse = JsonRecord & {
  id?: string;
  url?: string;
  configuration?: {
    merchant?: {
      capabilities?: { card_payments?: { status?: string } };
    };
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: string };
        };
      };
    };
  };
  requirements?: { currently_due?: unknown[] };
};
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripeErrorMessage(value: unknown, fallback: string) {
  if (!isRecord(value) || !isRecord(value.error)) return fallback;
  return typeof value.error.message === "string" ? value.error.message : fallback;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side Supabase service credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function stripeSecret() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe secret key is not configured.");
  return secret;
}

export async function stripeV2Post(path: string, body: JsonRecord, idempotencyKey?: string) {
  const response = await fetch(`https://api.stripe.com/v2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Content-Type": "application/json",
      "Stripe-Version": STRIPE_API_VERSION,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(stripeErrorMessage(payload, "Stripe request failed."));
  return isRecord(payload) ? payload as StripeApiResponse : {};
}

export async function stripeV2Get(path: string, include: string[] = []) {
  const url = new URL(`https://api.stripe.com/v2/${path}`);
  include.forEach((value, index) => url.searchParams.set(`include[${index}]`, value));
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Stripe-Version": STRIPE_API_VERSION,
    },
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(stripeErrorMessage(payload, "Stripe request failed."));
  return isRecord(payload) ? payload as StripeApiResponse : {};
}

export async function stripeV1Get(path: string, connectedAccountId?: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(connectedAccountId ? { "Stripe-Account": connectedAccountId } : {}),
    },
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(stripeErrorMessage(payload, "Stripe request failed."));
  return isRecord(payload) ? payload as StripeApiResponse : {};
}

export async function stripePostForm(
  path: string, values: Record<string, string>, idempotencyKey: string, connectedAccountId?: string,
) {
  const form = new URLSearchParams(values);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
      ...(connectedAccountId ? { "Stripe-Account": connectedAccountId } : {}),
    },
    body: form.toString(),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(stripeErrorMessage(payload, "Stripe checkout could not be created."));
  return isRecord(payload) ? payload as StripeApiResponse : {};
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(",").map(part => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest();
  return signatures.some(signature => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

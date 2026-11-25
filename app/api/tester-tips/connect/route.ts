import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { hasTrustedOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

const STRIPE_V2_VERSION = "2026-09-30.endive";
const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function stripeV2(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe is not configured.");
  const response = await fetch(`https://api.stripe.com/v2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "Stripe-Version": STRIPE_V2_VERSION,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : "Stripe could not start payout setup.";
    throw new Error(message);
  }
  return data as { id: string; url?: string };
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply(403, { error: "Request origin could not be verified." });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "Expected JSON." });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 256) return reply(413, { error: "Request too large." });

  let country = "";
  try {
    const raw = await request.text();
    if (raw.length > 256) return reply(413, { error: "Request too large." });
    const body = JSON.parse(raw);
    country = typeof body?.country === "string" ? body.country.trim().toUpperCase() : "";
  } catch {
    return reply(400, { error: "Invalid request." });
  }
  if (!/^[A-Z]{2}$/.test(country)) return reply(400, { error: "Choose a valid country." });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply(401, { error: "Please sign in first." });

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("roles").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.roles?.includes("tester")) {
    return reply(403, { error: "Tester access is required to set up payouts." });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl || !process.env.STRIPE_SECRET_KEY) {
    return reply(503, { error: "Payout setup is not configured yet." });
  }

  const admin = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: existing, error: lookupError } = await admin
    .schema("playtested_studios").from("tester_stripe_accounts")
    .select("stripe_account_id").eq("tester_id", user.id).maybeSingle();
  if (lookupError) return reply(503, { error: "Unable to load payout setup." });

  try {
    let accountId = existing?.stripe_account_id as string | undefined;
    if (!accountId) {
      const account = await stripeV2("core/accounts", {
        contact_email: user.email,
        display_name: "Playtested tester",
        identity: { country },
        configuration: {
          recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
        },
        defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
        dashboard: "express",
        metadata: { playtested_user_id: user.id },
        include: ["configuration.recipient", "identity", "defaults"],
      }, `playtested-tester-connect-${user.id}`);
      accountId = account.id;
      const { error: saveError } = await admin.schema("playtested_studios")
        .from("tester_stripe_accounts").upsert({
          tester_id: user.id,
          stripe_account_id: accountId,
          transfers_status: "pending",
          details_submitted: false,
          payouts_enabled: false,
          requirements_due: [],
        }, { onConflict: "tester_id" });
      if (saveError) throw new Error("Unable to save your payout account. Please try again.");
    }

    const origin = new URL(request.url).origin;
    const link = await stripeV2("core/account_links", {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          return_url: `${origin}/account?stripe_connect=return`,
          refresh_url: `${origin}/account?stripe_connect=refresh`,
        },
      },
    });
    if (!link.url) throw new Error("Stripe did not return an onboarding link.");
    return reply(200, { url: link.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start payout setup.";
    return reply(502, { error: message });
  }
}

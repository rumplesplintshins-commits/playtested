import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, stripeV2Post } from "@/lib/tester-tips/server";
import { hasTrustedOrigin } from "@/lib/request-origin";

const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply(403, { error: "Request origin could not be verified." });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "Expected JSON." });
  if (Number(request.headers.get("content-length") ?? 0) > 256) return reply(413, { error: "Request too large." });

  let country = "";
  try {
    const raw = await request.text();
    if (raw.length > 256) return reply(413, { error: "Request too large." });
    const body = JSON.parse(raw);
    country = typeof body?.country === "string" ? body.country.trim().toUpperCase() : "";
  } catch {
    return reply(400, { error: "Invalid request." });
  }
  if (country !== "GB") return reply(400, { error: "Tester payouts are currently available for UK-based accounts only." });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply(401, { error: "Please sign in first." });

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("roles").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.roles?.includes("tester")) {
    return reply(403, { error: "Tester access is required to set up payouts." });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.STRIPE_SECRET_KEY) {
    return reply(503, { error: "Payout setup is not configured yet." });
  }

  const admin = createAdminClient();
  const { data: existingRows, error: lookupError } = await admin.rpc("tester_tip_get_merchant_account", {
    p_tester_id: user.id,
  });
  if (lookupError) return reply(503, { error: "Unable to load payout setup." });
  const existing = existingRows?.[0] ?? null;

  try {
    let accountId = existing?.merchant_stripe_account_id as string | undefined;
    if (!accountId) {
      const account = await stripeV2Post("core/accounts", {
        contact_email: user.email,
        display_name: "Playtested tester",
        identity: { country: country.toLowerCase() },
        configuration: {
          merchant: { capabilities: { card_payments: { requested: true } } },
        },
        defaults: {
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        dashboard: "express",
        metadata: { playtested_user_id: user.id, playtested_account_purpose: "tester_tips" },
        include: ["configuration.merchant", "identity", "defaults", "requirements"],
      }, `playtested-tester-merchant-${user.id}`);
      if (typeof account.id !== "string" || !account.id) throw new Error("Stripe did not return an account ID.");
      accountId = account.id;
      const { error: saveError } = await admin.rpc("tester_tip_save_merchant_account", {
        p_tester_id: user.id, p_stripe_account_id: accountId,
      });
      if (saveError) throw new Error("Unable to save your payout account. Please try again.");
    }

    const origin = request.headers.get("origin")!;
    const link = await stripeV2Post("core/account_links", {
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

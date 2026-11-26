import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, stripeV2Post } from "@/lib/tester-tips/server";
import { hasTrustedOrigin } from "@/lib/request-origin";

const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function createDashboardLink(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { response: reply(401, { error: "Please sign in first." }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("roles").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.roles?.includes("tester")) {
    return { response: reply(403, { error: "Tester access is required." }) };
  }

  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin.rpc("tester_tip_get_merchant_account", {
      p_tester_id: user.id,
    });
    if (error) throw error;
    const accountId = rows?.[0]?.merchant_stripe_account_id;
    if (typeof accountId !== "string" || !accountId) {
      return { response: reply(404, { error: "No Stripe payout account was found." }) };
    }

    const origin = new URL(request.url).origin;
    const link = await stripeV2Post("core/account_links", {
      account: accountId,
      use_case: {
        type: "account_dashboard",
        account_dashboard: {
          refresh_url: `${origin}/api/tester-tips/connect/dashboard`,
        },
      },
    });
    if (typeof link.url !== "string" || !link.url) throw new Error("Stripe did not return a dashboard link.");
    return { url: link.url };
  } catch {
    return { response: reply(502, { error: "Unable to open your Stripe dashboard. Please try again." }) };
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply(403, { error: "Request origin could not be verified." });
  const result = await createDashboardLink(request);
  if (result.response) return result.response;
  return reply(200, { url: result.url });
}

// Stripe redirects here when a single-use dashboard link expires or is consumed.
export async function GET(request: Request) {
  const result = await createDashboardLink(request);
  if (result.response) return result.response;
  return NextResponse.redirect(result.url!, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, stripeV2Get } from "@/lib/tester-tips/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

  try {
    const admin = createAdminClient();
    const { data: savedRows, error: lookupError } = await admin.rpc("tester_tip_get_merchant_account", {
      p_tester_id: user.id,
    });
    if (lookupError) throw lookupError;
    const saved = savedRows?.[0];
    if (!saved?.merchant_stripe_account_id) {
      return NextResponse.json({ connected: false }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const account = await stripeV2Get(`core/accounts/${encodeURIComponent(saved.merchant_stripe_account_id)}`, [
      "configuration.merchant", "requirements",
    ]);
    const capability = account.configuration?.merchant?.capabilities?.card_payments;
    const rawStatus = typeof capability?.status === "string" ? capability.status : "pending";
    const status = rawStatus === "active" ? "active"
      : rawStatus === "restricted" ? "restricted"
      : rawStatus === "inactive" ? "disabled" : "pending";
    const requirements = account.requirements ?? {};
    const due = Array.isArray(requirements.currently_due) ? requirements.currently_due : [];
    const { error: updateError } = await admin.rpc("tester_tip_update_merchant_account_status", {
      p_tester_id: user.id,
      p_status: status,
      p_details_submitted: due.length === 0,
      p_requirements_due: due,
    });
    if (updateError) throw updateError;

    return NextResponse.json({
      connected: true,
      cardPaymentsActive: status === "active",
      status,
      requirementsDue: due.length,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to check Stripe payout status." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, stripeV2Get } from "@/lib/tester-tips/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

  try {
    const admin = createAdminClient();
    const { data: saved, error: lookupError } = await admin.schema("playtested_studios")
      .from("tester_stripe_accounts")
      .select("stripe_account_id,transfers_status")
      .eq("tester_id", user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!saved) return NextResponse.json({ connected: false }, { headers: { "Cache-Control": "private, no-store" } });

    const account = await stripeV2Get(`core/accounts/${encodeURIComponent(saved.stripe_account_id)}`, [
      "configuration.recipient", "requirements",
    ]);
    const capability = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
    const rawStatus = typeof capability?.status === "string" ? capability.status : "pending";
    const transfersStatus = rawStatus === "active" ? "active"
      : rawStatus === "restricted" ? "restricted"
      : rawStatus === "inactive" ? "disabled" : "pending";
    const requirements = account.requirements ?? {};
    const due = Array.isArray(requirements.currently_due) ? requirements.currently_due : [];
    const { error: updateError } = await admin.schema("playtested_studios")
      .from("tester_stripe_accounts").update({
        transfers_status: transfersStatus,
        details_submitted: due.length === 0,
        requirements_due: due,
        updated_at: new Date().toISOString(),
      }).eq("tester_id", user.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      connected: true,
      transfersActive: transfersStatus === "active",
      status: transfersStatus,
      requirementsDue: due.length,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to check Stripe payout status." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}

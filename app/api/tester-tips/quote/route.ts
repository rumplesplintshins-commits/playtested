import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/tester-tips/server";
import { calculateTesterTipFeePence, calculateGrossTesterTipChargePence } from "@/lib/tester-tips/fees";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const amount = new URL(request.url).searchParams.get("tipAmountPence") ?? "";
  if (!/^\d+$/.test(amount)) return NextResponse.json({ error: "Enter a valid tip amount." }, { status: 400 });
  const tipAmountPence = Number(amount);
  try {
    const admin = createAdminClient();
    const { data: rules, error: rulesError } = await admin.rpc("tester_tip_get_fee_rules");
    if (rulesError) throw rulesError;
    const platformFeePence = calculateTesterTipFeePence(tipAmountPence, rules ?? []);
    const totalAmountPence = tipAmountPence + platformFeePence;
    const chargeAmountPence = calculateGrossTesterTipChargePence(tipAmountPence, platformFeePence);
    return NextResponse.json({
      tipAmountPence,
      platformFeePence,
      processingAllowancePence: chargeAmountPence - totalAmountPence,
      totalAmountPence: chargeAmountPence,
      processingRefundPolicy: "Any unused card-processing allowance is automatically refunded to your original payment method after Stripe confirms the actual fee.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unable to calculate the tip.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

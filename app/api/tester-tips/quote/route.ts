import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/tester-tips/server";
import { calculateTesterTipFeePence } from "@/lib/tester-tips/fees";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const amount = new URL(request.url).searchParams.get("tipAmountPence") ?? "";
  if (!/^\d+$/.test(amount)) return NextResponse.json({ error: "Enter a valid tip amount." }, { status: 400 });
  const tipAmountPence = Number(amount);
  try {
    const admin = createAdminClient();
    const { data: rules, error: rulesError } = await admin.schema("playtested_studios")
      .from("tester_tip_fee_rules")
      .select("rule_order,from_pence,to_pence,fee_type,fee_value,description")
      .eq("active", true).order("rule_order");
    if (rulesError) throw rulesError;
    const platformFeePence = calculateTesterTipFeePence(tipAmountPence, rules ?? []);
    return NextResponse.json({
      tipAmountPence, platformFeePence, totalAmountPence: tipAmountPence + platformFeePence,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unable to calculate the tip.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

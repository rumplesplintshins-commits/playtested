import { NextResponse } from "next/server";
import { analyticsService, requireAdmin } from "@/lib/admin-server";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const { status } = await requireAdmin();
  if (status !== 200) return NextResponse.json({ error: "Administrator access required." }, { status, headers });
  const client = analyticsService();
  if (!client) return NextResponse.json({ error: "Analytics are not configured." }, { status: 503, headers });
  const { data, error } = await client.rpc("m24_analytics_summary");
  return NextResponse.json(error ? { error: "Analytics could not be loaded. Check the Merge 24 migration." } : data, { status: error ? 503 : 200, headers });
}

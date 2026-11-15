import { NextResponse } from "next/server";
import { analyticsService, requireAdmin } from "@/lib/admin-server";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const { status } = await requireAdmin();
  if (status !== 200) return NextResponse.json({ error: "Administrator access required." }, { status, headers });
  const client = analyticsService();
  if (!client) return NextResponse.json({ error: "Platform user metrics are not configured." }, { status: 503, headers });
  const { data, error } = await client.rpc("m24_platform_user_summary");
  return NextResponse.json(error ? { error: "Platform user metrics could not be loaded. Please retry." } : data, { status: error ? 503 : 200, headers });
}

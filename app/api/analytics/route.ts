import { NextResponse } from "next/server";
import { analyticsService } from "@/lib/admin-server";
import { campaignLabel } from "@/lib/acquisition";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pages = ["/", "/games/detail", "/submissions/detail", "/tester", "/submit", "/login", "/privacy", "/terms", "/contact"];
// Best-effort abuse cap per server instance; no IP or device fingerprint retained.
let minute = 0, total = 0;
const perVisitor = new Map<string, number>();
export async function POST(request: Request) {
  const reply = (status: number) => new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply(403);
  if (/bot|crawler|spider|headless|slurp|preview/i.test(request.headers.get("user-agent") || "") || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return reply(204);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415);
  const raw = await request.text();
  if (raw.length > 1500) return reply(413);
  let body;
  try { body = JSON.parse(raw); } catch { return reply(400); }
  if (!body || body.consent !== true || !uuid.test(body.event_id) || !uuid.test(body.visitor_id) || !pages.includes(body.page)) return reply(400);
  const now = Math.floor(Date.now() / 60000);
  if (minute !== now) { minute = now; total = 0; perVisitor.clear(); }
  const count = perVisitor.get(body.visitor_id) || 0;
  if (++total > 600 || count >= 30) return reply(429);
  perVisitor.set(body.visitor_id, count + 1);
  const client = analyticsService();
  if (!client) return reply(503);
  const { error } = await client.from("m24_page_views").upsert({
    event_id: body.event_id, visitor_id: body.visitor_id, page: body.page,
    source: campaignLabel(body.source), medium: campaignLabel(body.medium), campaign: campaignLabel(body.campaign),
    referral: ["reddit", "search", "external"].includes(body.referral) ? body.referral : null,
  }, { onConflict: "event_id", ignoreDuplicates: true });
  return reply(error ? 503 : 204);
}

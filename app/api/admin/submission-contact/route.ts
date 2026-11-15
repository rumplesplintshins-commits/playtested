import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as serviceClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return response({ error: "Sign in required." }, 401);
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return response({ error: "Admin access required." }, 403);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return response({ error: "Invalid submission." }, 400);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return response({ error: "Private contact access is not configured." }, 503);
  const admin = serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await admin.from("game_submission_contacts").select("contact_email,contact_discord,contact_reddit,contact_allowed,updated_at").eq("submission_id", id).maybeSingle();
  if (result.error) return response({ error: "Private contact information could not be loaded." }, 503);
  return response({ contact: result.data });
}

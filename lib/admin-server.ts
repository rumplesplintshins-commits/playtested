import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function analyticsService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}
export async function requireAdmin() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { status: 401 as const };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { status: 403 as const };
  return { status: 200 as const };
}

export async function isInternalAnalyticsRequest() {
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return false;
  const {data:profile,error:profileError}=await client.from("profiles").select("role").eq("id",user.id).maybeSingle();
  // Uncertain signed-in traffic is omitted rather than attributed as genuine visits.
  return !!profileError||profile?.role==="admin";
}

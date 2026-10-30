import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { createAdminClient } from "../../../../lib/supabase-admin";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || (body as { confirmation?: unknown }).confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data, error: eraseError } = await supabase.rpc("prepare_my_account_erasure");

  if (eraseError) {
    console.error("Account erasure preparation failed", eraseError);
    return NextResponse.json(
      { error: "We could not safely prepare your account for deletion. Nothing was deleted from authentication." },
      { status: 500 }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  const requestId = result?.request_id;

  if (!requestId) {
    return NextResponse.json({ error: "Account deletion could not be verified." }, { status: 500 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Supabase admin client unavailable", error);
    return NextResponse.json(
      { error: "Account deletion is temporarily unavailable. Your request has been retained for completion." },
      { status: 503 }
    );
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteAuthError) {
    console.error("Supabase Auth deletion failed", deleteAuthError);
    return NextResponse.json(
      { error: "Your personal data was de-identified, but sign-in deletion needs administrator completion. Please contact support if you can still sign in." },
      { status: 500 }
    );
  }

  const { error: completeError } = await admin
    .from("account_deletion_requests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", requestId);

  if (completeError) {
    console.error("Could not mark deletion request complete", completeError);
  }

  return NextResponse.json({ deleted: true });
}

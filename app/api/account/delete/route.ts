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

  if (
    !body ||
    typeof body !== "object" ||
    (body as { confirmation?: unknown }).confirmation !== "DELETE"
  ) {
    return NextResponse.json(
      { error: "Type DELETE to confirm account deletion." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Supabase admin client unavailable", error);
    return NextResponse.json(
      { error: "Account deletion is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const { data, error: eraseError } = await supabase.rpc(
    "prepare_my_account_erasure"
  );

  if (eraseError) {
    console.error("Account erasure preparation failed", eraseError);
    return NextResponse.json(
      {
        error:
          "We could not safely prepare your account for deletion. Your sign-in account was not deleted.",
      },
      { status: 500 }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  const requestId = result?.request_id;

  if (!requestId) {
    return NextResponse.json(
      { error: "Account deletion could not be verified." },
      { status: 500 }
    );
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteAuthError) {
    console.error("Supabase Auth deletion failed", deleteAuthError);
    return NextResponse.json(
      {
        error:
          "Your account data was prepared for deletion, but sign-in deletion could not be completed automatically. Please contact Playtested support.",
      },
      { status: 500 }
    );
  }

  const { error: completeError } = await admin
    .from("account_deletion_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      user_id: null,
      operator_notes: "Account erasure completed.",
    })
    .eq("id", requestId);

  if (completeError) {
    console.error("Could not finalise deletion request audit record", completeError);
  }

  return NextResponse.json({ deleted: true });
}

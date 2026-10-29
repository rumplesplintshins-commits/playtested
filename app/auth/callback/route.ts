
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase-server";
import { confirmationFailurePath, getSafeNextPath } from "../../../lib/auth-navigation";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch {
      // Authentication outages get the same recoverable screen, without leaking diagnostics.
    }
  }

  return NextResponse.redirect(
    new URL(confirmationFailurePath(next), origin)
  );
}

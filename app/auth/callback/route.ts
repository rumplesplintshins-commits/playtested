import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase-server";
import { confirmationFailurePath, getSafeNextPath } from "../../../lib/auth-navigation";

const allowedRoles = new Set(["player", "tester", "developer"]);

function getSignupRoles(value: string | null): string[] {
  if (!value) return [];

  return [...new Set(
    value
      .split(",")
      .map((role) => role.trim())
      .filter((role) => allowedRoles.has(role))
  )];
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));
  const signupRoles = getSignupRoles(searchParams.get("roles"));

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        if (signupRoles.length > 0) {
          const { error: roleError } = await supabase.rpc("update_my_roles", {
            p_roles: signupRoles,
          });

          if (roleError) {
            return NextResponse.redirect(
              new URL(confirmationFailurePath(next), origin)
            );
          }
        }

        return NextResponse.redirect(new URL(next, origin));
      }
    } catch {
      // Authentication outages get the same recoverable screen, without leaking diagnostics.
    }
  }

  return NextResponse.redirect(
    new URL(confirmationFailurePath(next), origin)
  );
}

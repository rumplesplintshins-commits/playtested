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

function getPublicOrigin(request: Request): string {
  const requestUrl = new URL(request.url);

  if (process.env.NODE_ENV === "development") {
    return requestUrl.origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const protocol = forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : "https";
    return `${protocol}://${forwardedHost}`;
  }

  return "https://playtested.co.uk";
}

function wasUserCreatedByThisOAuthSignIn(
  createdAt: string | undefined,
  lastSignInAt: string | undefined
): boolean {
  if (!createdAt || !lastSignInAt) return false;

  const created = Date.parse(createdAt);
  const signedIn = Date.parse(lastSignInAt);

  if (!Number.isFinite(created) || !Number.isFinite(signedIn)) return false;

  // A genuinely new OAuth account is created as part of this sign-in, so these
  // timestamps should be effectively identical. Existing accounts must never
  // have their application roles replaced just because they used the signup UI.
  return Math.abs(signedIn - created) <= 10_000;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  const origin = getPublicOrigin(request);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));
  const signupRoles = getSignupRoles(searchParams.get("roles"));

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const isNewUser = wasUserCreatedByThisOAuthSignIn(
          data.user?.created_at,
          data.user?.last_sign_in_at
        );

        if (signupRoles.length > 0 && isNewUser) {
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

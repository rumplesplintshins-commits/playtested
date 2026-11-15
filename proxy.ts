
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {noIndexPath} from "./lib/seo";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getClaims();

  if(noIndexPath(request.nextUrl.pathname))response.headers.set("X-Robots-Tag","noindex, follow");

  // Apply after getClaims/setAll: auth refresh replaces the response above.
  // Keep refreshed cookies and robots headers on the very same response.
  const path = request.nextUrl.pathname;
  const sessionCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && name.includes("auth-token")
  );
  if (sessionCookie || noIndexPath(path) || /^\/(?:api|notifications)(?:\/|$)/.test(path)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

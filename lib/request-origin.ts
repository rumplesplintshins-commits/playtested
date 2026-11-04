import { SITE_ORIGIN } from "./seo";

// A reverse proxy can leave Request.url pointing at Next's internal bind host.
// Never derive a trusted public origin from client-supplied forwarding headers.
export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === SITE_ORIGIN) return true;
  if (!origin || process.env.NODE_ENV === "production") return false;
  // Keep local development usable without admitting arbitrary preview domains.
  try {
    const target = new URL(request.url);
    return ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) &&
      ["http:", "https:"].includes(target.protocol) && origin === target.origin;
  } catch { return false; }
}

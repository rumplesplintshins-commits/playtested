import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    // Public browser configuration only; URL parsing prevents CSP token injection.
    const connections: string[] = [];
    try {
      const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
      if (["https:", "http:"].includes(backend.protocol)) {
        connections.push(backend.origin);
        connections.push(backend.origin.replace(/^http/, "ws"));
      }
    } catch { /* No backend origin to allow before environment configuration. */ }
    const development = process.env.NODE_ENV === "development";
    const reportOnly = [
      "default-src 'self'",
      // Next streaming/hydration and existing inline styles need a phased CSP.
      "script-src 'self' 'unsafe-inline'" + (development ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      // Developer/Steam/Supabase image URLs are data-driven, not a fixed CDN list.
      "img-src 'self' https: data: blob: " + connections.filter(origin => !origin.startsWith("ws")).join(" "),
      "font-src 'self' data:",
      "connect-src 'self' " + connections.join(" ") + (development ? " ws: http://localhost:* http://127.0.0.1:*" : ""),
      "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com",
      "media-src 'self' https: blob:",
      "worker-src 'self' blob:",
      "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join("; ");
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
        { key: "Content-Security-Policy-Report-Only", value: reportOnly },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      ] },
      // Verified HTTPS apex only; no assumption about other subdomains or preload.
      { source: "/:path*", has: [
        { type: "host", value: "playtested\\.co\\.uk" },
        { type: "header", key: "x-forwarded-proto", value: "https" },
      ], headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] },
    ];
  },
  // Resolve visibility metadata before headers, including for browsers/Googlebot:
  // a missing or hidden public game must return 404 rather than a streamed 200.
  htmlLimitedBots: /.*/,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

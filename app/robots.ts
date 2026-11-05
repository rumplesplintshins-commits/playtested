import type { MetadataRoute } from "next";
import { organicOrigin } from "@/lib/organic-search";

export default function robots(): MetadataRoute.Robots {
  // Crawl guidance only, never an authentication or privacy access control.
  // Private/auth pages must remain crawlable for their noindex headers to be seen.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: organicOrigin + "/sitemap.xml" };
}

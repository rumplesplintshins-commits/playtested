import type {MetadataRoute} from "next";
import {SITE_ORIGIN} from "@/lib/seo";
export default function robots():MetadataRoute.Robots {
  // Let crawlers see noindex headers on auth/private/invitation pages.
  return {rules:{userAgent:"*",allow:"/",disallow:"/api/"},sitemap:`${SITE_ORIGIN}/sitemap.xml`};
}

import type { MetadataRoute } from "next";
import { organicOrigin, organicPages } from "@/lib/organic-search";

export default function sitemap(): MetadataRoute.Sitemap {
  // This main baseline has only fictitious demo games. Never advertise them as real.
  // Integration must APPEND these editorial paths to the approved-game sitemap.
  return [{ url: organicOrigin }, ...organicPages.map(page => ({ url: organicOrigin + page.path }))];
}

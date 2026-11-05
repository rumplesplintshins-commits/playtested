import { publicSitemap } from "@/lib/public-game-seo";
import { organicOrigin, organicPages } from "@/lib/organic-search";
import { connection } from "next/server";

export default async function sitemap() {
  await connection();
  const existing = await publicSitemap();
  // Preserve approved-only public game enumeration and append editorial pages.
  return [...existing, ...organicPages.map(page => ({ url: organicOrigin + page.path }))];
}

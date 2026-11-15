import { publicSitemap } from "@/lib/public-game-seo";
import { publicContentSitemapEntries } from "@/lib/organic-search";
import { connection } from "next/server";

export default async function sitemap() {
  await connection();
  const existing = await publicSitemap();
  // Preserve public game enumeration and append crawlable content hubs.
  return [...existing, ...publicContentSitemapEntries()];
}

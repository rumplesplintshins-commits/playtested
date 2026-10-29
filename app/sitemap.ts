import {publicSitemap} from "@/lib/public-game-seo";
import {connection} from "next/server";
export default async function sitemap(){
  await connection();
  return publicSitemap();
}

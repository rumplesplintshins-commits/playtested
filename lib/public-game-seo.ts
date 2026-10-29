import "server-only";
import {createClient} from "@supabase/supabase-js";
import {cacheLife} from "next/cache";
import type {MetadataRoute} from "next";
import {notFound} from "next/navigation";
import {listingUpdates} from "./listing-updates";
import {publicMetadata,SITE_ORIGIN} from "./seo";

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

export async function gameMetadata(kind:"imported"|"approved",value:string) {
  const game=await publicGame(kind,value);
  if(!game)notFound();
  return publicMetadata(`${game.title} | Playtested`,game.description,game.path);
}

async function publicGame(kind:"imported"|"approved",value:string) {
  "use cache";
  cacheLife("hours");
  if(kind==="imported"?!/^[0-9]+$/.test(value):!/^[0-9a-f-]{36}$/i.test(value))return null;
  const client=publicClient();
  const result=kind==="imported"
    ? await client.from("imported_games").select("id,title,description,developer_name").eq("steam_app_id",value).eq("catalogue_eligible",true).maybeSingle()
    : await client.from("approved_games").select("id,title,description,developer_name").eq("id",value).maybeSingle();
  if(result.error)throw new Error("Public game metadata unavailable");
  if(!result.data)return null;
  const updates=await listingUpdates(client,[{kind,id:result.data.id}]);
  if(updates===null)throw new Error("Public listing metadata unavailable");
  const game={...result.data,...updates[0]?.fields};
  return {title:game.title||"Game",description:(game.description?.trim()||`Discover ${game.title||"this game"} on Playtested and explore available player feedback.`).slice(0,300),path:kind==="imported"?`/games/steam-${value}`:`/submissions/${value}`};
}

export async function publicSitemap():Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  const client=publicClient(),urls=new Set([SITE_ORIGIN+"/",SITE_ORIGIN+"/contact"]);
  // Use the same anonymous view/link access as public detail pages, rather than
  // repeatedly aggregating thousands of Steam cards that link off-site.
  async function pages(table:string,columns:string,key:string) {
    const rows:Record<string,string>[]=[];
    for(let offset=0;offset<49000;offset+=100) {
      const result=await client.from(table).select(columns).order(key).range(offset,offset+99);
      if(result.error||!Array.isArray(result.data))throw new Error("Public sitemap unavailable");
      rows.push(...result.data as unknown as Record<string,string>[]);
      if(result.data.length<100)return rows;
    }
    throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
  }
  for(const row of await pages("approved_games","id","id")) {
    if(/^[0-9a-f-]{36}$/i.test(row.id))urls.add(SITE_ORIGIN+"/submissions/"+row.id);
  }
  const ids=[...new Set((await pages("game_developer_links","id,imported_game_id","id")).map(row=>row.imported_game_id).filter(Boolean))];
  for(let offset=0;offset<ids.length;offset+=100) {
    const result=await client.from("imported_games").select("steam_app_id").in("id",ids.slice(offset,offset+100)).eq("catalogue_eligible",true);
    if(result.error||!Array.isArray(result.data))throw new Error("Public sitemap unavailable");
    for(const row of result.data)if(/^[0-9]+$/.test(String(row.steam_app_id)))urls.add(SITE_ORIGIN+"/games/steam-"+row.steam_app_id);
  }
  if(urls.size>49000)throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
  // Draft legal pages retain their existing noindex; no invented modification dates.
  return [...urls].map(url=>({url}));
}

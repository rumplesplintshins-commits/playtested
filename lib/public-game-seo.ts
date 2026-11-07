import "server-only";
import {publicProfileClient as publicClient} from "./public-profile-links";
import {cacheLife} from "next/cache";
import type {MetadataRoute} from "next";
import {notFound} from "next/navigation";
import {listingUpdates} from "./listing-updates";
import {publicMetadata,SITE_ORIGIN} from "./seo";


export async function gameMetadata(kind:"imported"|"approved",value:string) {
  const game=await publicGame(kind,value);
  if(!game)notFound();
  return publicMetadata(`${game.title} | Playtested`,`${game.title}${game.developer?` by ${game.developer}`:""}. ${game.description}`.slice(0,300),game.path);
}

async function publicGame(kind:"imported"|"approved",value:string) {
  "use cache";
  cacheLife("hours");
  if(kind==="imported"?!/^[0-9]+$/.test(value):!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))return null;
  const client=publicClient();
  const result=kind==="imported"
    ? await client.from("imported_games").select("id,title,description,developer_name,genre,image_url").eq("steam_app_id",value).eq("catalogue_eligible",true).eq("metadata_backfill_status","complete").not("title","is",null).not("developer_name","is",null).not("genre","is",null).not("image_url","is",null).maybeSingle()
    : await client.from("approved_games").select("id,title,description,developer_name,genre,image_url").eq("id",value).maybeSingle();
  if(result.error)throw new Error("Public game metadata unavailable");
  if(!result.data)return null;
  const updates=await listingUpdates(client,[{kind,id:result.data.id}]);
  if(updates===null)throw new Error("Public listing metadata unavailable");
  const game={...result.data,...updates[0]?.fields};
  return {title:game.title||"Game",developer:game.developer_name||null,description:(game.description?.trim()||`Discover ${game.title||"this game"} on Playtested and explore available player feedback.`).slice(0,300),genre:game.genre||null,image:game.image_url||null,path:kind==="imported"?`/games/steam-${value}`:`/submissions/${value}`};
}

export async function publicProfileLinks() {
  "use cache";
  cacheLife("hours");
  const client=publicClient(),profiles=new Map<string,{path:string;title:string}>();
  const approvedSteamIds=new Set<string>();
  const pageSize=100;
  for(let offset=0;offset<49000;offset+=pageSize) {
    const result=await client.from("approved_games").select("id,title,steam_app_id").order("id").range(offset,offset+pageSize-1);
    if(result.error||!Array.isArray(result.data))throw new Error("Public sitemap unavailable");
    for(const row of result.data as {id:string;title:string|null;steam_app_id:string|null}[]) {
      if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id))profiles.set("/submissions/"+row.id,{path:"/submissions/"+row.id,title:row.title||"Game profile"});
      const steamId=String(row.steam_app_id??"").trim();
      if(steamId)approvedSteamIds.add(steamId);
    }
    if(result.data.length<pageSize)break;
    if(offset+pageSize>=49000)throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
  }
  // Keep these predicates aligned with get_public_catalogue. RLS also excludes hidden
  // listings, while the public approved_games view filters unapproved submissions.
  for(let offset=0;offset<49000;offset+=pageSize) {
    const result=await client.from("imported_games").select("id,steam_app_id,title")
      .eq("catalogue_eligible",true)
      .eq("metadata_backfill_status","complete")
      .not("title","is",null)
      .not("developer_name","is",null)
      .not("genre","is",null)
      .not("image_url","is",null)
      .order("steam_app_id")
      .order("id")
      .range(offset,offset+pageSize-1);
    if(result.error||!Array.isArray(result.data))throw new Error("Public sitemap unavailable");
    for(const row of result.data as {id:string;steam_app_id:string|number|null;title:string|null}[]) {
      const steamId=String(row.steam_app_id??"").trim();
      if(/^[0-9]+$/.test(steamId)&&!approvedSteamIds.has(steamId))profiles.set("/games/steam-"+steamId,{path:"/games/steam-"+steamId,title:row.title||"Game profile"});
    }
    if(profiles.size>48998)throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
    if(result.data.length<pageSize)return [...profiles.values()];
    if(offset+pageSize>=49000)throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
  }
  throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
}

export async function publicSitemap():Promise<MetadataRoute.Sitemap> {
  // Reuse public identities; never invent lastmod from build/crawl time.
  return [{url:SITE_ORIGIN+"/"},{url:SITE_ORIGIN+"/contact"},...(await publicProfileLinks()).map(game=>({url:SITE_ORIGIN+game.path}))];
}

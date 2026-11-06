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
  for(let page=1;page<=490;page++) {
    const result=await client.rpc("get_public_catalogue",{
      p_page:page,
      p_page_size:100,
      p_search:"",
      p_genre:"All genres",
      p_verification:"All verification statuses",
      p_ai_type:"All AI types",
      p_include_nsfw:true,
      p_sort:"Recently added",
    });
    if(result.error||!Array.isArray(result.data))throw new Error("Public sitemap unavailable");
    const rows=result.data as {source_type:string;game_id:string;steam_app_id:string|null;title:string|null}[];
    for(const row of rows) {
      if(row.source_type==="approved"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.game_id))profiles.set("/submissions/"+row.game_id,{path:"/submissions/"+row.game_id,title:row.title||"Game profile"});
      if(row.source_type==="steam"&&/^[0-9]+$/.test(String(row.steam_app_id)))profiles.set("/games/steam-"+row.steam_app_id,{path:"/games/steam-"+row.steam_app_id,title:row.title||"Game profile"});
    }
    if(profiles.size>48998)throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
    if(rows.length<100)return [...profiles.values()];
  }
  throw new Error("Sitemap needs a reviewed partition before exceeding its URL limit");
}

export async function publicSitemap():Promise<MetadataRoute.Sitemap> {
  // Reuse public identities; never invent lastmod from build/crawl time.
  return [{url:SITE_ORIGIN+"/"},{url:SITE_ORIGIN+"/contact"},...(await publicProfileLinks()).map(game=>({url:SITE_ORIGIN+game.path}))];
}

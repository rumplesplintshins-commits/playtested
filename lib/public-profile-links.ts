import {createClient} from "@supabase/supabase-js";

// Always anonymous: a signed-in owner's private relationship is not a public profile.
export function publicProfileClient(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}

// Callers also require catalogue_eligible imported rows (or the approved view).
// Share the public relationship rule across cards, detail, metadata and sitemap.
export async function publicLinkedImportedIds(ids?:string[],client=publicProfileClient()):Promise<Map<string,string|null>|null>{
 const found=new Map<string,string|null>(),batches=ids?[...new Set(ids)]:undefined;
 try{
  for(let batch=0;batch<(batches?.length??1);batch+=100){
   for(let offset=0;offset<49000;offset+=100){
    let query=client.from("game_developer_links").select("id,imported_game_id,relationship").order("id");
    if(batches)query=query.in("imported_game_id",batches.slice(batch,batch+100));
    const result=await query.range(offset,offset+99);
    if(result.error||!Array.isArray(result.data))return null;
    for(const row of result.data)if(row.imported_game_id)found.set(row.imported_game_id,row.relationship??null);
    if(result.data.length<100)break;
    if(offset===48900)return null;
   }
  }
  return found;
 }catch{return null;}
}

export function steamStoreUrl(saved:unknown,appId:unknown):string|undefined{
 const id=String(appId??"").trim();
 if(!/^[0-9]+$/.test(id))return undefined;
 try{const url=new URL(String(saved));if(url.protocol==="https:"&&url.hostname==="store.steampowered.com"&&!url.username&&!url.password&&url.port===""&&url.pathname.match(/^\/app\/([0-9]+)(?:\/|$)/)?.[1]===id)return url.href;}catch{}
 return "https://store.steampowered.com/app/"+id+"/";
}

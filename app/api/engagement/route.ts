import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase-server";
import {shareService,shareRateKey,publicShareRequest} from "@/lib/share-server";
import {taggedPath} from "@/lib/share-links";
const uuid=(value:unknown)=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return reply({error:"Invalid origin"},403);
 if(!publicShareRequest(request.headers))return reply({ignored:true});
 try{
  const text=await request.text();if(text.length>2048)return reply({error:"Invalid event"},400);let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid event"},400);}if(!body||typeof body!=="object")return reply({error:"Invalid event"},400);
  if(!["visit","context","access"].includes(body.action)||body.action==="visit"&&!uuid(body.link)||body.action!=="visit"&&!/^[a-f0-9]{64}$/.test(body.token||"")||body.campaign!=null&&!uuid(body.campaign))return reply({error:"Invalid event"},400);
  const service=shareService();
  if(body.action==="context"){
   const result=await service.rpc("share_journey_context",{p_token:body.token,p_path:String(body.path||"").slice(0,200)});if(result.error)throw result.error;
   return reply(result.data||{unavailable:true});
  }
  const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
  if(body.action==="visit"){
   const result=await service.rpc("record_share_visit",{p_link:body.link,p_rate:shareRateKey(request.headers),p_actor:user?.id||null});if(result.error)throw result.error;if(!result.data)return reply({unavailable:true},404);
   const data=result.data;return reply({...data,nextPath:taggedPath(data.path,data.tags,data.token)});
  }
  const result=await service.rpc("record_share_access",{p_token:body.token,p_path:String(body.path||"").slice(0,200),p_campaign:body.campaign||null,p_rate:shareRateKey(request.headers),p_actor:user?.id||null});if(result.error)throw result.error;
  return reply({recorded:result.data===true});
 }catch(error){const limited=error&&typeof error==="object"&&"message" in error&&String(error.message).includes("rate limit");return reply({error:limited?"Please try this link again later.":"Link reporting is unavailable."},limited?429:503);}
}

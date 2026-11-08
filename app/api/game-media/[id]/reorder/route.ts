import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { analyticsService } from "@/lib/admin-server";
import { hasTrustedOrigin } from "@/lib/request-origin";

type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function POST(request:Request,context:Context){
  if(!hasTrustedOrigin(request))return reply("Same-origin request required.",403);
  const {id}=await context.params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply("Media not found.",404);
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return reply("Sign in required.",401);
  const owner=await client.from("game_submissions").select("developer_id").eq("id",id).maybeSingle();
  if(owner.error||owner.data?.developer_id!==user.id)return reply("Only the submission owner can reorder screenshots.",403);
  const service=analyticsService();
  if(!service)return reply("Screenshot storage is not configured.",503);
  const current=await client.from("game_screenshots").select("slot").eq("submission_id",id).order("slot");
  if(current.error)return reply("Screenshot list unavailable.",503);
  const slots=(current.data??[]).map(r=>Number(r.slot));
  let order:number[];
  try{order=(await request.json()).order;}catch{return reply("Provide an ordered slot list.",400);}
  if(!Array.isArray(order)||order.some(s=>typeof s!="number"))return reply("Provide an ordered slot list.",400);
  const expected=[...slots].sort((a,b)=>a-b);
  const provided=[...order].sort((a,b)=>a-b);
  if(expected.length!==provided.length||expected.some((s,i)=>s!==provided[i]))return reply("The slot order must list every existing screenshot exactly once.",400);
  const {error:reorderError}=await service.rpc("reorder_game_screenshots",{p_id:id,p_order:order});
  if(reorderError)return reply("Screenshots could not be reordered. Please retry.",503);
  return NextResponse.json({saved:true},{headers});
}

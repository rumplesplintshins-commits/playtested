import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
function client(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function GET(){
 let state="unknown";
 if(process.env.PULSE_ENABLED==="false")state="disabled";
 else try{const result=await client().rpc("get_pulse_availability");if(!result.error&&["available","busy","unavailable"].includes(result.data))state=result.data;}catch{}
 return NextResponse.json({state},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
 try{
  const authorization=request.headers.get("authorization");const token=authorization?.startsWith("Bearer ")?authorization.slice(7).trim():null;
  if(!token)return NextResponse.json({state:"unknown",error:"Sign in to run checks."},{status:401});
  const db=client();const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user)return NextResponse.json({state:"unknown",error:"Session could not be verified."},{status:401});
  const body=await request.json();if(typeof body.submissionId!=="string"||! /^[0-9a-f-]{36}$/i.test(body.submissionId))return NextResponse.json({state:"unknown"},{status:400});
  if(process.env.PULSE_ENABLED==="false")return NextResponse.json({state:"disabled"});
  const result=await db.rpc("enqueue_available_pulse_job",{p_submission:body.submissionId,p_actor:user.id});
  if(result.error)return NextResponse.json({state:"unknown",error:"Optional automated checks could not be queued. Your submission is still saved."},{status:result.error.code==="42501"?403:503});
  const payload=result.data;
  return NextResponse.json({...payload,success:!!payload.job},{status:payload.state==="queued"?201:200,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({state:"unknown",error:"Optional automated checks could not be confirmed. Your submission is still saved."},{status:503});}
}

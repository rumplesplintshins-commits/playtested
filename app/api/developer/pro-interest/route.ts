import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase-server";
import {hasTrustedOrigin} from "@/lib/request-origin";
export async function POST(request: Request) {
 const reply=(status:number)=>new NextResponse(null,{status,headers:{"Cache-Control":"private, no-store"}});
 if (!hasTrustedOrigin(request)) return reply(403);
 if (request.headers.get("dnt")==="1" || request.headers.get("sec-gpc")==="1") return reply(204);
 if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415);
 if (Number(request.headers.get("content-length"))>100) return reply(413);
 const raw=await request.text(); if(raw.length>100) return reply(413);
 try {if(JSON.parse(raw)?.consent!==true) return reply(204);} catch {return reply(400);}
 const client=await createClient();
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user) return reply(401);
 const {data,error}=await client.rpc("record_developer_pro_interest",{p_consent:true});
 return reply(error ? error.code==="42501"?403:503 : data?204:429);
}

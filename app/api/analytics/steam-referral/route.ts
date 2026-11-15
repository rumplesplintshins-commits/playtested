import {NextResponse} from 'next/server';
import {hasTrustedOrigin} from '@/lib/request-origin';
import {createClient} from '@/lib/supabase-server';
import {analyticsService} from '@/lib/admin-server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let windowMinute=0,events=0;
export async function POST(request:Request){
 const reply=(status:number)=>new NextResponse(null,{status,headers:{'Cache-Control':'no-store'}});
 if(!hasTrustedOrigin(request))return reply(403);
 if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return reply(204);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415);
 const raw=await request.text();if(raw.length>300)return reply(413);
 let body;try{body=JSON.parse(raw);}catch{return reply(400);}
 if(!body||body.consent!==true||!uuid.test(body.event_id)||!uuid.test(body.test_id))return reply(400);
 const client=await createClient();const {data:{user},error}=await client.auth.getUser();if(error||!user)return reply(401);
 const minute=Math.floor(Date.now()/60000);if(minute!==windowMinute){windowMinute=minute;events=0;}if(++events>600)return reply(429);
 const service=analyticsService();if(!service)return reply(503);
 const result=await service.rpc('record_testing_activity_steam_click',{p_actor:user.id,p_test:body.test_id,p_event:body.event_id});
 return reply(result.error?503:result.data===true?204:403);
}

import {NextResponse} from "next/server";
import {analyticsService,requireAdmin} from "@/lib/admin-server";
export async function GET(){
 const headers={"Cache-Control":"private, no-store"};const {status}=await requireAdmin();
 if(status!==200)return NextResponse.json({error:"Administrator access required."},{status,headers});
 const client=analyticsService();if(!client)return NextResponse.json({error:"Game metrics unavailable."},{status:503,headers});
 const {data,error}=await client.rpc('admin_game_activity_metrics');
 return NextResponse.json(error?{error:"Game metrics unavailable. Check the metrics migration."}:data,{status:error?503:200,headers});
}

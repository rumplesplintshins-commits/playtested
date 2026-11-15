import {NextResponse} from "next/server";
import {analyticsService,requireAdmin} from "@/lib/admin-server";
export async function GET(){
 const headers={"Cache-Control":"private, no-store"};
 const {status}=await requireAdmin();
 if(status!==200)return NextResponse.json({error:"Administrator access required."},{status,headers});
 const client=analyticsService();if(!client)return NextResponse.json({error:"Analytics unavailable."},{status:503,headers});
 const {data,error}=await client.rpc("m26_tester_analytics");
 return NextResponse.json(error?{error:"Tester analytics could not be loaded."}:data,{status:error?503:200,headers});
}

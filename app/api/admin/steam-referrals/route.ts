import {NextResponse} from 'next/server';
import {analyticsService,requireAdmin} from '@/lib/admin-server';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};const {status}=await requireAdmin();
 if(status!==200)return NextResponse.json({error:'Administrator access required.'},{status,headers});
 const params=new URL(request.url).searchParams,limit=Number(params.get('limit')||10),offset=Number(params.get('offset')||0);
 if(![10,25,50,100].includes(limit)||!Number.isSafeInteger(offset)||offset<0)return NextResponse.json({error:'Invalid result window.'},{status:400,headers});
 const asOf=params.get('as_of');if(asOf&&(!Number.isFinite(Date.parse(asOf))||asOf.length>40))return NextResponse.json({error:'Invalid reporting snapshot.'},{status:400,headers});
 const service=analyticsService();if(!service)return NextResponse.json({error:'Analytics unavailable.'},{status:503,headers});
 const {data,error}=await service.rpc('m26_steam_referrals_window',{p_limit:limit,p_offset:offset,p_as_of:asOf||null});
 return NextResponse.json(error?{error:'Steam referrals could not be loaded.'}:data,{status:error?503:200,headers});
}

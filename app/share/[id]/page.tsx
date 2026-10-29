import Link from "next/link";
import {connection} from "next/server";
import {notFound} from "next/navigation";
import {shareService} from "@/lib/share-server";
import {ShareEntry} from "@/app/components/ShareJourney";
export default async function SharedGame({params}:{params:Promise<{id:string}>}){
 await connection();const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 let context;
 try{const result=await shareService().rpc("_share_link_context",{p_link:id});if(!result.error)context=result.data;}catch{}
 if(!context)return <main className="min-h-screen bg-[#090b0a] p-8 text-white"><h1 className="text-2xl font-bold">This share link is unavailable</h1><p className="mt-3 text-zinc-400">The destination may no longer be public, or link reporting may need to be enabled.</p><Link className="mt-4 inline-block text-emerald-300 underline" href="/tester">Browse Tester Hub</Link></main>;
 return <ShareEntry id={id} context={context}/>;
}

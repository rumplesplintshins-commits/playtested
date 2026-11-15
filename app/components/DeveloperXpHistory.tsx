"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase";
type Award={id:string;xp_amount:number;description:string;created_at:string};
export default function DeveloperXpHistory(){
  const [awards,setAwards]=useState<Award[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{let active=true;void createClient().rpc("get_my_developer_xp_history",{p_limit:20}).then(({data,error})=>{
    if(!active)return;setError(Boolean(error));setAwards((data??[]) as Award[]);setLoading(false);
  });return()=>{active=false;};},[]);
  return <details id="developer-xp-history" className="mt-8 rounded-xl border border-white/10 bg-[#0d110f] p-5">
    <summary className="cursor-pointer font-semibold text-zinc-100">Developer XP history</summary>
    {loading?<p className="mt-4 text-sm text-zinc-400">Loading XP history...</p>:error?<p role="alert" className="mt-4 text-sm text-zinc-400">Developer XP history is unavailable.</p>:awards.length===0?<p className="mt-4 text-sm text-zinc-400">No Developer XP awards yet.</p>:<ol className="mt-4 space-y-3">{awards.map(award=><li key={award.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 p-3 text-sm">
      <div className="min-w-0"><p className="break-words text-zinc-200">{award.description}</p><p className="mt-1 text-xs text-zinc-500">{new Date(award.created_at).toLocaleString()}</p></div>
      <span className="shrink-0 font-semibold text-[#77f29b]">+{award.xp_amount} Developer XP</span>
    </li>)}</ol>}
  </details>;
}

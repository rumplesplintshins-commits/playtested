"use client";
import {hardwareLabel} from '@/lib/hardware-catalogue';
import {useEffect,useState} from "react";
import {PC_FIELDS,type PcRequirements,type PcSpecs} from "@/lib/pc-specifications";
import {subscribeGamePc} from "@/lib/game-pc-requirements";
import {usePrivatePc} from "./AccountPcSpecifications";
import CompactDetails from "./CompactDetails";
function Specs({value,privateSpecs=false}:{value:PcSpecs;privateSpecs?:boolean}){
 return <dl className="space-y-2 text-sm">{PC_FIELDS.filter(f=>value[f.key]!==undefined&&value[f.key]!=="").map(f=><div key={f.key} className="min-w-0 break-words [overflow-wrap:anywhere]"><dt className="text-xs text-zinc-500">{f.key==='storage_gb'?(privateSpecs?'Available storage':'Storage required'):f.label}</dt><dd className="whitespace-pre-wrap text-zinc-200">{f.key==='cpu'||f.key==='gpu'?hardwareLabel(f.key,String(value[f.key])):String(value[f.key])}{['ram_gb','vram_gb','storage_gb'].includes(f.key)?' GB':''}</dd></div>)}</dl>;
}
export default function GamePcRequirements({id,kind="submission",compact=false,showEmpty=false}:{id:string;kind?:"submission"|"approved"|"imported"|"campaign";compact?:boolean;showEmpty?:boolean}){
 const [value,setValue]=useState<PcRequirements|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),pc=usePrivatePc();
 useEffect(()=>subscribeGamePc(kind,id,(value,error)=>{setValue(value);setError(error);setLoaded(true);}),[kind,id]);
 const tiers=value?(['minimum','recommended'] as const).filter(tier=>Object.values(value[tier]).some(v=>v!=="")):[];
 if(!loaded)return null;if(!compact&&!showEmpty&&!tiers.length&&!error)return null;
 return <section aria-label="Game PC requirements" className="my-4 min-w-0"><CompactDetails title={<span className="flex min-w-0 flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#77f29b]">Hardware compatibility</span><span className="text-sm font-semibold text-zinc-100">PC requirements</span></span>}><div className="space-y-4 p-4 pt-0">
  {error?<p role="status" className="text-sm text-amber-200">PC requirements are temporarily unavailable. Refresh to retry.</p>:!tiers.length?<p className="text-sm text-zinc-400">Requirements not provided. These details are optional.</p>:<><p className="text-xs text-zinc-400">Developer-provided requirements. Compatibility is not independently verified.</p><div className={`grid min-w-0 gap-5 ${tiers.length===2&&!compact?'sm:grid-cols-2':''}`}>{tiers.map(tier=><section key={tier} className="min-w-0"><h3 className="mb-3 text-sm font-semibold text-emerald-200">{tier==='minimum'?'Minimum':'Recommended'}</h3><Specs value={value![tier]}/></section>)}</div></>}
  {compact&&<><p className="text-xs text-zinc-400">{pc.error?'Your private PC details could not be loaded.':pc.specs&&Object.keys(pc.specs).length?'Your PC details saved. Review requirements — compatibility not verified.':'Save optional PC details to compare manually. Compatibility not verified.'}</p>{pc.specs&&Object.keys(pc.specs).length>0&&<section aria-label="Your private PC specifications" className="rounded-lg border border-white/10 p-3"><h3 className="mb-3 text-sm font-semibold">Your PC (private)</h3><Specs value={pc.specs} privateSpecs/></section>}<a href="/account#pc-specifications" className="inline-block text-xs text-emerald-300 underline focus-visible:outline-2 focus-visible:outline-emerald-300">Manage my PC specifications</a></>}
 </div></CompactDetails></section>;
}

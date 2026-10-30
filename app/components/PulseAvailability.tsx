"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase";
import {pulseMessage} from "@/lib/pulse-availability";
export default function PulseAvailability({submissionId,automatic=false,submissions=[]}:{submissionId?:string;automatic?:boolean;submissions?:{id:string;title:string}[]}){
 const [state,setState]=useState("unknown"),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[selected,setSelected]=useState(submissionId||submissions[0]?.id||"");
 const active=useRef(false),attempted=useRef<string|null>(null),mounted=useRef(false),lastResult=useRef(""),jobId=useRef<string|null>(null);
 const enqueue=useCallback(async(id:string)=>{
  if(active.current)return;active.current=true;setBusy(true);
  try{
   const {data:{session}}=await createClient().auth.getSession();
   if(!session)throw Error("Session unavailable");
   const response=await fetch("/api/pulse/runs",{method:"POST",signal:AbortSignal.timeout(10000),headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({submissionId:id})});
   const payload=await response.json();if(!mounted.current)return;
   const next=response.ok?payload.state:"unknown";lastResult.current=next;jobId.current=payload.job?.id||null;setState(next);setNotice(pulseMessage(next,response.ok?payload.job:undefined));
  }catch{if(mounted.current)setNotice(pulseMessage("unknown"));}finally{active.current=false;if(mounted.current)setBusy(false);}
 },[]);
 useEffect(()=>{
  mounted.current=true;let cancelled=false;
  async function refresh(){try{const response=await fetch("/api/pulse/runs",{cache:"no-store",signal:AbortSignal.timeout(10000)});const payload=await response.json();if(!cancelled){setState(response.ok?payload.state:"unknown");if(!["queued","existing","unsupported"].includes(lastResult.current))setNotice("");}if(jobId.current&&!cancelled){const {data:{session}}=await createClient().auth.getSession();if(session){const r=await fetch("/api/pulse/runs/"+encodeURIComponent(jobId.current),{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});const result=await r.json();if(!cancelled)setNotice(r.ok&&result.job?.statusMessage?result.job.statusMessage:pulseMessage("unknown"));}}}catch{if(!cancelled){setState("unknown");if(jobId.current)setNotice(pulseMessage("unknown"));}}}
  void refresh();const timer=setInterval(()=>void refresh(),20000);
  if(automatic&&submissionId&&attempted.current!==submissionId){attempted.current=submissionId;void enqueue(submissionId);}
  return()=>{cancelled=true;mounted.current=false;clearInterval(timer);};
 },[automatic,submissionId,enqueue]);
 const canRun=state==="available"||state==="busy";
 return <aside aria-label="Automated technical checks" className="my-4 space-y-2 text-sm text-zinc-400"><p role="status">{notice||pulseMessage(state)}</p>{submissions.length>0&&<label className="block">Submission<select disabled={busy} className="ml-2 max-w-full rounded border border-white/20 bg-black p-2" value={selected} onChange={event=>{setSelected(event.target.value);jobId.current=null;lastResult.current="";setNotice("");}}>{submissions.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}{(submissionId||submissions.length>0)&&<button type="button" disabled={busy||!canRun||!selected} onClick={()=>void enqueue(selected)} className="min-h-11 rounded border border-white/20 px-3 py-2 text-emerald-300 disabled:opacity-50">{busy?"Checking queue...":"Run checks"}</button>}<p className="text-xs">Technical diagnostics do not approve a listing, certify AI use, guarantee safety or rate gameplay.</p></aside>;
}

export function PulseJobStatus({status,updatedAt}:{status:string;updatedAt?:string}){const [,tick]=useState(0);useEffect(()=>{const timer=setInterval(()=>tick(value=>value+1),20000);return()=>clearInterval(timer);},[]);return <p className="my-2 text-sm text-zinc-400">{pulseMessage("existing",{status,updated_at:updatedAt})}</p>;}

"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase";
import {showToast} from "./ToastHost";
export default function AvailabilityPreference({id,available,canRequest=true}:{id:string;available:number;canRequest?:boolean}){
 const [enabled,setEnabled]=useState<boolean|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0),lock=useRef(false);
 useEffect(()=>{let active=true;void createClient().from("tester_availability_preferences").select("expires_at").eq("playtest_id",id).maybeSingle().then(({data,error})=>{if(active){setEnabled(error?null:!!data&&Date.parse(data.expires_at)>Date.now());setError(error?"Availability preference could not be loaded.":"");}});return()=>{active=false;};},[id,retry]);
 async function toggle(){if(lock.current||enabled===null)return;lock.current=true;setBusy(true);setError("");try{const {data,error}=await createClient().rpc("set_tester_availability_preference",{p_id:id,p_enabled:!enabled});if(error)throw Error(error.message);setEnabled(data===true);showToast(data?"Availability alert requested. No place is reserved.":"Availability request cancelled.");}catch(e){setError(e instanceof Error?e.message:"Preference could not be saved.");}finally{lock.current=false;setBusy(false);}}
 if(available>0&&!enabled&&!error)return null;
 return <div className="mt-3 space-y-2 text-sm"><p className="text-zinc-300">{available===0?"All places taken":"A place may be available. Claiming remains first come, first served."}</p>
  {enabled===null&&!error&&<p role="status">Loading your availability preference…</p>}
  {enabled!==null&&(enabled||canRequest)&&<button disabled={busy} onClick={()=>void toggle()} className="rounded-lg border border-emerald-300/40 px-3 py-2 text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50">{busy?"Saving…":enabled?"Cancel availability notification":"Notify me when a place opens"}</button>}
  {!enabled&&!canRequest&&<p className="text-xs text-zinc-400">Finish or release your current reservation before requesting another place. Completed reports cannot join the same campaign again.</p>}
  <p className="text-xs text-zinc-400">Optional bell alerts only, not email or marketing. Requests expire after 30 days. An alert does not reserve a place; eligibility and capacity are checked again when you claim.</p>
  {error&&<p role="alert" className="text-amber-200">{error} <button onClick={()=>setRetry(n=>n+1)} className="underline">Refresh preference</button></p>}
 </div>;
}

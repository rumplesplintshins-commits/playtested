"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase";
import {showToast} from "./ToastHost";

type Controls={archived:boolean;is_admin_test:boolean;deleted?:boolean};
export default function ListingControls({id,kind="submission",title,approved=false,admin=false}:{id:string;kind?:"submission"|"imported";title:string;approved?:boolean;admin?:boolean}){
 const router=useRouter(),lock=useRef(false);
 const [value,setValue]=useState<Controls|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[action,setAction]=useState(""),[confirmation,setConfirmation]=useState("");
 useEffect(()=>{let active=true;void createClient().rpc("get_listing_controls",{p_kind:kind,p_id:id}).then(({data,error})=>{if(!active)return;setValue(error?null:data);setError(error?"Listing controls could not be loaded. Refresh to retry.":"");});return()=>{active=false;};},[kind,id]);
 async function change(next:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{
   const {data,error}=await createClient().rpc("set_listing_control",{p_kind:kind,p_id:id,p_action:next,p_confirmation:confirmation});
   if(error)throw new Error(error.message);
   setValue(data);setAction("");setConfirmation("");
   showToast(next==="delete"?"Submission deleted.":next==="archive"?"Game archived. Private history is preserved.":next==="restore"?"Game restored. Existing approval still applies.":"Test / Demo designation saved.");
   router.refresh();
  }catch(e){const message=e instanceof Error?e.message:"Listing change failed. Please retry.";setError(message);showToast(message,"error");}finally{lock.current=false;setBusy(false);}
 }
 if(value?.deleted)return <p role="status" className="my-4 rounded border border-white/10 p-4">Submission deleted.</p>;
 return <section aria-label="Publication & test controls" className="my-4 rounded-xl border border-white/10 p-4 text-sm">
  <h3 className="font-semibold">Publication &amp; test controls</h3><p className="mt-2 leading-6 text-zinc-400">Archive / unpublish hides a listing and stops new public testing while preserving history. Delete unapproved submission permanently removes only an eligible record without dependent history, after confirmation. Admin Test / Demo excludes a listing from public discovery and genuine analytics; it does not delete it.</p>
  {!value&&!error&&<p role="status" className="mt-2">Loading listing controls…</p>}
  {error&&<p role="alert" className="mt-2 text-amber-200">{error}</p>}
  {value&&<><p className="mt-2 text-zinc-400">{value.archived?"Archived: hidden from the public catalogue and new public testing. Your private feedback and history remain available.":"Existing review and publication rules apply."}{value.is_admin_test&&" Admin Test / Demo: excluded from public listings, ratings and genuine acquisition totals."}</p>
   <div className="mt-3 flex flex-wrap gap-3">
    {value.archived?<button disabled={busy} onClick={()=>void change("restore")} className="rounded border border-emerald-300/30 px-3 py-2">Restore listing</button>:<button disabled={busy} onClick={()=>{setAction("archive");setConfirmation("");}} className="rounded border border-white/20 px-3 py-2">Archive / unpublish</button>}
    {!approved&&kind==="submission"&&<button disabled={busy} onClick={()=>{setAction("delete");setConfirmation("");}} className="rounded border border-red-300/30 px-3 py-2 text-red-200">Delete unapproved submission</button>}
    {admin&&<label className="flex items-center gap-2"><input type="checkbox" checked={value.is_admin_test} disabled={busy} onChange={()=>void change(value.is_admin_test?"clear_test":"mark_test")}/>Admin Test / Demo</label>}
   </div>
   {action&&<div className="mt-4 space-y-3 rounded border border-amber-300/30 p-3"><p>{action==="delete"?"Permanent deletion is allowed only without dependent records or review history. Otherwise archive the game.":"This hides the game from public listings and new testing, preserving accounts, campaigns, reports and review history."}</p><label className="block">Type the exact game title to confirm: <strong>{title}</strong><input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 block w-full rounded border border-white/20 bg-black p-3" autoComplete="off"/></label><div className="flex flex-wrap gap-3"><button disabled={busy||confirmation!==title} onClick={()=>void change(action)} className="rounded border border-amber-300/40 px-3 py-2 disabled:opacity-40">{busy?"Saving…":`Confirm ${action}`}</button><button disabled={busy} onClick={()=>setAction("")} className="rounded border border-white/20 px-3 py-2">Cancel</button></div></div>}
  </>}
 </section>;
}

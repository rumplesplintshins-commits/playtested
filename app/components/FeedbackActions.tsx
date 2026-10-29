"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/lib/supabase";
import {feedbackQualityLabel,type FeedbackQualityRecord} from "@/lib/feedback-review";
import {FEEDBACK_ACTION_STATUSES, readFeedbackActions, type FeedbackActionReport, type FeedbackActionStatus} from "@/lib/feedback-actions";

export function FeedbackActions({campaignId,reports,filter,onFilterChange,compactHeading=false}:{campaignId:string;reports:FeedbackActionReport[];filter?:string;onFilterChange?:(filter:string)=>void;compactHeading?:boolean}) {
  // Keying the stateful view by campaign prevents state leaking between builds.
  return <FeedbackActionList key={campaignId} campaignId={campaignId} reports={reports} filter={filter} onFilterChange={onFilterChange} compactHeading={compactHeading}/>;
}
function FeedbackActionList({campaignId,reports,filter:controlledFilter,onFilterChange,compactHeading}:{campaignId:string;reports:FeedbackActionReport[];filter?:string;onFilterChange?:(filter:string)=>void;compactHeading?:boolean}) {
  const [quality,setQuality]=useState<Record<string,FeedbackQualityRecord>>({});
  const [statuses,setStatuses]=useState<Record<string,FeedbackActionStatus>>({});
  const [storageKey,setStorageKey]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [localFilter,setLocalFilter]=useState("All reports");
  const filter=controlledFilter??localFilter;
  const setFilter=onFilterChange??setLocalFilter;
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    let active=true;
    const client=createClient();
    void client.auth.getUser().then(({data,error})=>{
      if(!active)return;
      if(error||!data.user){setMessage("Sign in to save investigation statuses.");setLoaded(true);return;}
      void client.rpc("get_developer_quality_reports",{p_playtest_id:campaignId}).then(({data,error})=>{if(active&&!error&&Array.isArray(data))setQuality(Object.fromEntries(data.map(row=>[row.id,{...row,review_outcome:row.review_outcome||row.outcome}])));});
      const key=`playtested:feedback-actions:v1:${data.user.id}:${campaignId}`;
      try{setStatuses(readFeedbackActions(localStorage.getItem(key)));setStorageKey(key);}
      catch{setMessage("Browser storage is unavailable. Status changes cannot be saved.");}
      setLoaded(true);
    }).catch(()=>{if(active){setMessage("Could not load your investigation statuses.");setLoaded(true);}});
    return()=>{active=false;};
  },[campaignId]);
  function update(id:string,status:FeedbackActionStatus) {
    if(!storageKey)return;
    const next={...statuses,[id]:status};
    try{localStorage.setItem(storageKey,JSON.stringify(next));setStatuses(next);setMessage("Status saved in this browser.");}
    catch{setMessage("Status was not saved: browser storage is unavailable.");}
  }
  const statusOf=(id:string)=>statuses[id]||"To investigate";
  const counts=Object.fromEntries(FEEDBACK_ACTION_STATUSES.map(status=>[status,reports.filter(report=>statusOf(report.id)===status).length]));
  const visible=reports.filter(report=>filter==="All reports"||statusOf(report.id)===filter);
  if(!loaded)return <section aria-label="Feedback action list"><p role="status" className="text-sm text-zinc-400">Loading saved follow-up actions...</p></section>;
  return <section aria-label="Feedback action list" className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.025] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div>{!compactHeading&&<h3 className="text-lg font-semibold text-white">Feedback to follow up</h3>}<p className="mt-1 text-sm text-zinc-400">Review each report, then track your next action.</p></div><span className="rounded-full border border-amber-200/20 px-3 py-1 text-xs text-amber-100">{counts["To investigate"]} to investigate</span></div>
    <p className="mt-3 text-xs leading-5 text-zinc-500">Statuses are saved in this browser for this account and build. They do not sync across devices or change admin approval, tester XP or the original report. Fixed means you marked the report addressed; it is not a verified retest. Reviewed means you considered the feedback and no action is planned.</p>
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter feedback actions">{["All reports",...FEEDBACK_ACTION_STATUSES].map(status=><button key={status} type="button" aria-pressed={filter===status} onClick={()=>setFilter(status)} className={`rounded-lg border px-3 py-2 text-xs ${filter===status?"border-emerald-300/40 bg-emerald-300/10 text-emerald-100":"border-white/10 text-zinc-400"}`}>{status} <span className="ml-1">{status==="All reports"?reports.length:counts[status]}</span></button>)}</div>
    <p role="status" className="mt-2 text-xs text-zinc-400">{message}</p>
    {visible.length===0?<p className="mt-4 text-sm text-zinc-400">{reports.length?"No reports with this status.":"Accepted tester reports and community responses will appear here."}</p>:<div className="mt-4 grid grid-cols-1 gap-4">{visible.map((report)=><article key={report.id} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-semibold text-white">{report.source}</h4>{report.date&&<p className="mt-1 text-xs text-zinc-500">{new Date(report.date).toLocaleDateString("en-GB")}</p>}</div><label className="text-xs text-zinc-400">Developer action<select aria-label={`Developer action for ${report.source}`} disabled={!storageKey} value={statusOf(report.id)} onChange={event=>update(report.id,event.target.value as FeedbackActionStatus)} className="mt-1 block rounded border border-white/15 bg-[#101310] p-2 text-sm text-white disabled:opacity-50">{FEEDBACK_ACTION_STATUSES.map(status=><option key={status}>{status}</option>)}</select></label></div>
      {report.id.startsWith("independent:")&&<p className="mt-3 text-xs text-zinc-400">{quality[report.id.slice(12)]?feedbackQualityLabel(quality[report.id.slice(12)]):"Feedback quality details unavailable"}</p>}
      <dl className="mt-4 space-y-4">{[["Suggested improvement",report.improvement],["What got in the way",report.frustration],["Issue notes",report.bugs],["What worked",report.enjoyed]].filter(([,text])=>text?.trim()).map(([label,text])=><div key={label}><dt className="text-xs font-medium text-emerald-200">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-base leading-7 text-zinc-300">{text}</dd></div>)}</dl>
    </article>)}</div>}
  </section>;
}

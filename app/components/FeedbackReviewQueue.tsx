"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { needsFeedbackReview, feedbackQualityLabel, feedbackReasonSuggestion, FEEDBACK_QUALITY_CRITERIA, type FeedbackReviewItem } from "@/lib/feedback-review";
import { QualityGuidance } from "./TestingPolicy";

function ReviewCard({ item, reload }: { item: FeedbackReviewItem; reload: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [criteria, setCriteria] = useState<Record<string, boolean>>({specific:false,examples:false,impact:false,focus:false,takeaway:false});
  const [eligibility,setEligibility]=useState<Record<string,boolean|null>>({original:null,relevant:null});
  const [rubric,setRubric]=useState<{version:number;maximum_xp:number;criteria:Record<string,{label:string;guidance:string}>;eligibility:Record<string,string>}|null>(null);
  useEffect(()=>{let active=true;void createClient().rpc("get_feedback_quality_rubric").then(({data,error})=>{if(active){setRubric(error?null:data);if(error||!data)setError("Feedback quality rubric unavailable. Enable migration 013, then refresh before reviewing.");}});return()=>{active=false;};},[]);
  const assessed=Object.values(eligibility).every(value=>value!==null);
  const eligible=assessed&&Object.values(eligibility).every(Boolean);
  const count=Object.values(criteria).filter(Boolean).length;
  const score=eligible?count*20:0;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const t = item.report;

  async function decide(action: "accepted" | "rejected" | "replacement") {
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { error } = action === "replacement"
        ? await client.rpc("replace_unusable_test", { p_test_id: t.id, p_reason: reason })
        : await client.rpc("review_test_quality", { p_test_id: t.id, p_outcome: action, p_reason: reason, p_criteria: {rubric_version:rubric?.version,eligibility,scores:criteria} });
      if (error) { setError(error.message); return; }
      await reload();
    } catch { setError("The decision could not be confirmed. Refresh before trying again."); }
    finally { setBusy(false); }
  }

  return <article id={`report-${t.id}`} className="my-5 scroll-mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Independent Tester Hub report</p><h3 className="mt-2 text-xl font-bold">{item.context?.title || "Legacy report"}</h3><p className="mt-1 text-sm text-zinc-400">{item.context?.build || "Unlabelled build"}</p></div>
      <span className="rounded-full border border-amber-400/20 px-3 py-1 text-xs">{needsFeedbackReview(item) ? "Awaiting review" : t.review_outcome}</span>
    </div>
    <p className="text-xs text-zinc-500">Tester {t.tester_id} · {feedbackQualityLabel(t)}</p>
    {t.hours_played != null && <p className="text-sm text-zinc-400">Time played: {t.hours_played} hours</p>}
    {(t.continue_playing || t.recommend_game) && <p className="text-sm text-zinc-400">Continue playing: {t.continue_playing?.replaceAll("_", " ") || "Not answered"} · Recommend: {t.recommend_game?.replaceAll("_", " ") || "Not answered"}</p>}
    {!!t.focus_responses && Object.keys(t.focus_responses).length > 0 && <details className="text-sm text-zinc-400"><summary>Testing focus responses</summary>{Object.entries(t.focus_responses).map(([key,value]) => <p key={key} className="mt-2 whitespace-pre-wrap">{key}: {typeof value === "string" ? value : JSON.stringify(value)}</p>)}</details>}
    <p className="text-sm text-zinc-400">Task: {item.context?.instructions || "Not recorded"}<br/>Focus: {item.context?.focus_areas?.join(", ") || "Balanced feedback"}</p>
    <div className="grid grid-cols-3 gap-3 text-sm">{([['Overall', t.overall_score], ['Gameplay', t.gameplay_score], ['Performance', t.performance_score]] as const).map(([label,value]) => <div key={label} className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-400">{label}</p><p className="mt-1 font-semibold">{value ?? "Not rated"}{value !== null ? "/10" : ""}</p></div>)}</div>
    <div className="grid gap-4 md:grid-cols-2">{([['What worked', t.enjoyed_most], ['What did not', t.frustrations], ['Biggest improvement', t.biggest_improvement], ['Bugs', t.bugs_found], ['Additional feedback', t.feedback]] as const).map(([label,value]) => <div key={label}><h4 className="text-sm font-semibold">{label}</h4><p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm text-zinc-300">{value || "Not provided"}</p></div>)}</div>
    {item.developer_signals?.map((signal,i) => <p key={i} className="text-sm text-zinc-400">Developer {signal.signal}: {signal.reason}. Advisory only.</p>)}
    <p className="text-sm text-zinc-400">Previous reason: {t.review_reason || "No recorded rubric reason (legacy or pending)."}</p>
    <p className="text-sm text-zinc-400">Saving finalises this admin assessment. Later edits and reversals are audited and adjust only the recorded XP difference. Current award: {t.base_xp_amount??"unknown (legacy)"} XP.</p>
    {t.quality_rubric_version===rubric?.version&&t.quality_criteria&&<button type="button" disabled={busy} onClick={()=>{setCriteria(t.quality_criteria!);setEligibility(t.quality_eligibility||{original:null,relevant:null});setReason(t.review_reason||"");}} className="text-sm text-zinc-300 underline">Load recorded assessment for editing</button>}
    <fieldset disabled={busy||!rubric} className="space-y-3 border-t border-zinc-800 pt-4"><legend className="font-semibold">Eligibility before XP</legend><p className="text-xs text-zinc-400">Assess the report yourself. This does not claim automated verification of originality. Either failure means rejection and 0 XP, regardless of scored criteria.</p>{Object.entries(rubric?.eligibility||{original:"Credible original feedback, not spam or copied filler",relevant:"Relates to the relevant game/build and testing experience"}).map(([key,label])=><label key={key} className="block text-sm">{label}<select className="mt-1 block w-full rounded-lg border border-zinc-700 bg-black p-2" value={eligibility[key]===null?"":String(eligibility[key])} onChange={e=>setEligibility(previous=>({...previous,[key]:e.target.value===""?null:e.target.value==="true"}))}><option value="">Choose assessment</option><option value="true">Meets requirement</option><option value="false">Does not meet requirement</option></select></label>)}</fieldset>
    <fieldset disabled={busy||!rubric} className="space-y-3 border-t border-zinc-800 pt-4"><legend className="font-semibold">Feedback quality · scored criteria</legend>{Object.entries(FEEDBACK_QUALITY_CRITERIA).map(([key,fallback])=>[key,rubric?.criteria[key]||fallback] as const).map(([key,criterion])=><label key={key} className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={criteria[key]||false} onChange={e=>setCriteria(previous=>({...previous,[key]:e.target.checked}))}/><span>{criterion.label}<span className="mt-1 block text-xs text-zinc-400">{criterion.guidance}</span></span></label>)}</fieldset>
    <p role="status" className="rounded-lg border border-emerald-300/20 p-3 text-sm">{count} of 5 criteria · {assessed?`Quality ${score}% · Award ${eligible?score:0} XP`:"Complete eligibility to preview XP"}{assessed&&!eligible?" · Eligibility failed: reject with a reason":""}</p>
    <label className="block text-sm font-semibold">Reason visible to the tester<textarea disabled={busy} className="mt-2 block w-full rounded-lg border border-zinc-700 bg-black p-3 font-normal" value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button type="button" disabled={busy} onClick={()=>setReason(feedbackReasonSuggestion(criteria,eligibility))} className="text-sm text-zinc-300 underline">Use editable reason suggestion</button>
    <p className="text-xs text-zinc-400">Praise and criticism are equal. Do not require bugs, polished English or invented negatives. Rejection awards 0 XP and reverses the actual current award. Feedback quality percentage is distinct from acceptance rate.</p>
    <div className="flex flex-wrap gap-3"><button disabled={busy||!rubric||!eligible||!reason.trim()} onClick={()=>void decide("accepted")} className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-black disabled:opacity-50">Save accepted assessment / restore XP</button><button disabled={busy||!rubric||!assessed||!reason.trim()} onClick={()=>void decide("rejected")} className="rounded-lg border border-red-400/30 px-4 py-3 text-sm text-red-200 disabled:opacity-50">Save rejection / reverse XP</button><button disabled={busy||!reason.trim()||!!t.replacement_at} onClick={()=>{if(window.confirm("Replace demonstrably fraudulent or unusable feedback? This restores its place, preserves the report and audits your reason. XP requires a separate decision."))void decide("replacement");}} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm disabled:opacity-50">Moderator replacement exception</button></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!!item.events?.length && <details className="text-sm text-zinc-400"><summary>Review history</summary>{item.events.map(event => <p key={event.id} className="mt-2 break-words">{event.created_at?new Date(event.created_at).toLocaleString():"Historical event"} · {event.kind}: {event.reason} · {event.rubric_version==null?"Legacy score not recorded":`Rubric ${event.rubric_version} · Feedback quality ${event.quality_score}% · Award ${event.actual_xp_award} XP`} · XP change {event.xp_delta}{event.actor_id?` · Reviewer ${event.actor_id}`:""}</p>)}</details>}
  </article>;
}

export function FeedbackReviewQueue({ items, loading, error, refresh }: {
  items: FeedbackReviewItem[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}) {
  const [view, setView] = useState<"pending" | "history">("pending");
  const [notice, setNotice] = useState("");
  const pending = items.filter(needsFeedbackReview);
  const history = items.filter(item => !needsFeedbackReview(item));
  const visible = view === "pending" ? pending : history;
  async function reload() { await refresh(); setNotice("Decision saved and audited."); }
  return <section aria-label="Playtest feedback reviews">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Independent playtest reviews</h2><p className="mt-1 text-sm text-zinc-400">Review submitted feedback against the quality criteria. Admin decisions control XP.</p></div><button disabled={loading} onClick={() => void refresh()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-50">Refresh reviews</button></div>
    <QualityGuidance/>
    <div className="flex gap-3"><button aria-pressed={view === "pending"} onClick={() => setView("pending")} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Awaiting review ({pending.length})</button><button aria-pressed={view === "history"} onClick={() => setView("history")} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Reviewed ({history.length})</button></div>
    {notice && <p role="status" className="mt-4 text-sm text-emerald-300">{notice}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {loading ? <p className="mt-4 text-sm text-zinc-400">Loading reviews...</p> : !error && visible.length === 0 ? <p className="mt-4 text-sm text-zinc-400">{view === "pending" ? "No playtest feedback is awaiting review." : "No reviewed feedback yet."}</p> : visible.map(item => <ReviewCard key={item.report.id} item={item} reload={reload}/>)}
  </section>;
}

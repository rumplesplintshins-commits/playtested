"use client";
import {ukDateTime} from "@/lib/uk-date-time";
import DeveloperUsefulnessBadge from './DeveloperUsefulnessBadge';
import AnonymousTesterLabel from "./AnonymousTesterLabel";

import { useEffect, useMemo, useState } from "react";
import PaginationControls from "./PaginationControls";
import {pageCount,pagedItems} from "@/lib/pagination";
import { createClient } from "@/lib/supabase";
import { needsFeedbackReview, feedbackQualityLabel, feedbackReasonSuggestion, FEEDBACK_QUALITY_CRITERIA, type FeedbackReviewItem } from "@/lib/feedback-review";
import { QualityGuidance } from "./TestingPolicy";

type PrivateDeveloperReason = { test_id: string; reason: string; marked_at: string; developer_id: string };
function ReviewCard({ item, reload, privateReason }: { item: FeedbackReviewItem; reload: () => Promise<void>; privateReason?: PrivateDeveloperReason }) {
  const [error, setError] = useState("");
  const [rubricAttempt,setRubricAttempt]=useState(0);
  const [criteria, setCriteria] = useState<Record<string, boolean>>({specific:false,examples:false,impact:false,focus:false,takeaway:false});
  const [eligibility,setEligibility]=useState<Record<string,boolean|null>>({original:null,relevant:null});
  const [rubric,setRubric]=useState<{version:number;maximum_xp:number;criteria:Record<string,{label:string;guidance:string}>;eligibility:Record<string,string>}|null>(null);
  useEffect(()=>{let active=true;void createClient().rpc("get_feedback_quality_rubric").then(({data,error})=>{if(active){setRubric(error?null:data);if(error||!data)setError("Feedback quality rubric could not be loaded. Retry; if this continues, check administrator access and the development RPC configuration.");else setError("");}});return()=>{active=false;};},[rubricAttempt]);
  const assessed=Object.values(eligibility).every(value=>value!==null);
  const eligible=assessed&&Object.values(eligibility).every(Boolean);
  const count=Object.values(criteria).filter(Boolean).length;
  const score=eligible?count*20:0;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const t = item.report;
  const waitingForDispute=t.appeal?.state==="provisional_rejection";
  const activeDispute=t.appeal?.state==="disputed";
  const finalDecision = t.status === "reviewed" && ["accepted","rejected"].includes(t.review_outcome);
  const [correctionOpen,setCorrectionOpen] = useState(false);
  const [correctionReason,setCorrectionReason] = useState("");
  const [privateEvidence,setPrivateEvidence] = useState<{document_url:string|null;recording_url:string|null}|null>(null);
  const [evidenceError,setEvidenceError] = useState("");
  const [repairDocument,setRepairDocument] = useState("");
  const [repairRecording,setRepairRecording] = useState("");
  const [repairPublicFeedback,setRepairPublicFeedback] = useState("Detailed supporting report provided privately.");
  const [repairReason,setRepairReason] = useState("");
  const [repairing,setRepairing] = useState(false);
  const publicTextRisk = [t.feedback,t.enjoyed_most,t.frustrations,t.bugs_found,t.biggest_improvement,JSON.stringify(t.focus_responses??{})]
    .some(value=>/https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value||""));
  useEffect(()=>{
    let active=true;
    void createClient().rpc("get_admin_private_playtest_evidence",{p_test_id:t.id}).then(({data,error})=>{
      if(!active)return;
      if(error){setEvidenceError("Private evidence could not be loaded. Retry before approving.");return;}
      const row=(data??[])[0] as {document_url:string|null;recording_url:string|null}|undefined;
      setPrivateEvidence(row??null);
      setEvidenceError("");
    });
    return()=>{active=false;};
  },[t.id]);
  async function relocate() {
    if(!repairReason.trim() || repairReason.trim().length<12){setEvidenceError("Provide a reason of at least 12 characters.");return;}
    setRepairing(true);setEvidenceError("");
    try{
      const {error}=await createClient().rpc("admin_relocate_playtest_private_evidence",{
        p_test_id:t.id,p_document_url:repairDocument.trim()||null,
        p_recording_url:repairRecording.trim()||null,
        p_public_feedback:repairPublicFeedback.trim(),p_reason:repairReason.trim()
      });
      if(error){setEvidenceError(error.message);return;}
      await reload();
    }catch{setEvidenceError("Private evidence correction failed. Please retry.");}
    finally{setRepairing(false);}
  }
  const moderationTime=t.reviewed_at||item.events?.filter(e=>["accepted","rejected","replacement","replacement_granted"].includes(e.kind)&&e.created_at).sort((a,b)=>Date.parse(b.created_at!)-Date.parse(a.created_at!))[0]?.created_at;
  const devQa=[t.feedback,t.enjoyed_most,t.frustrations,t.bugs_found,t.biggest_improvement].some(value=>typeof value==="string"&&/^\s*\[DEV QA\](?:\s|$)/im.test(value));

  async function decide(action: "accepted" | "rejected" | "replacement") {
    if(action==="accepted" && (publicTextRisk || evidenceError)){setError("Move or redact personal contacts and supporting links before approving.");return;}
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { error } = action === "replacement"
        ? await client.rpc("replace_unusable_test", { p_test_id: t.id, p_reason: reason })
        : await client.rpc(finalDecision ? "admin_correct_test_quality" : "review_test_quality", { p_test_id: t.id, p_outcome: action, p_reason: reason, p_criteria: {rubric_version:rubric?.version,eligibility,scores:criteria}, ...(finalDecision ? {p_audit_reason:correctionReason} : {}) });
      if (error) { setError(error.message); return; }
      await reload();
    } catch { setError("The decision could not be confirmed. Refresh before trying again."); }
    finally { setBusy(false); }
  }

  return <article id={`report-${t.id}`} className="my-5 min-w-0 break-words [overflow-wrap:anywhere] scroll-mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400"><div><dt>Feedback submitted</dt><dd>{ukDateTime(t.submitted_at)}</dd></div><div><dt>Moderated</dt><dd>{ukDateTime(moderationTime)}</dd></div></dl>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-full"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Independent Tester Hub report</p>{devQa&&<span className="mt-2 inline-flex rounded border border-amber-200/30 bg-amber-200/10 px-2 py-0.5 text-xs font-semibold text-amber-200">DEV QA</span>}<h3 className="mt-2 break-words [overflow-wrap:anywhere] text-xl font-bold">{item.context?.title || "Legacy report"}</h3><p className="mt-1 text-sm text-zinc-400">{item.context?.build || "Unlabelled build"}</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-400/20 px-3 py-1 text-xs">{waitingForDispute ? "Provisional rejection ? place retained" : activeDispute ? "Dispute awaiting review" : needsFeedbackReview(item) ? "Awaiting review" : t.review_outcome}</span>{t.status==="reviewed"&&<DeveloperUsefulnessBadge value={t.feedback_usefulness}/>}</div>
    </div>
    {t.appeal&&<section aria-label="Feedback dispute" className="space-y-2 rounded-lg border border-amber-200/30 p-3 text-sm"><p>Initial rejection: {t.appeal.rejection_reason}</p>{t.appeal.dispute_deadline&&<p>One-dispute deadline: {ukDateTime(t.appeal.dispute_deadline)}</p>}{activeDispute&&<><p className="font-semibold">Additional tester clarification</p><p className="whitespace-pre-wrap break-words">{t.appeal.dispute_text}</p><p>The original campaign place stays occupied until you decide this dispute.</p></>}{waitingForDispute&&<p>Wait for a dispute within 24 hours. Without a dispute, the server finalises rejection automatically. Do not release the place early.</p>}</section>}
    {t.feedback_usefulness === "not_useful" && privateReason && (
      <section aria-label="Developer explanation (admin only)" className="min-w-0 space-y-2 rounded-lg border border-amber-300/30 bg-amber-300/[0.045] p-3 sm:p-4">
        <h4 className="break-words text-sm font-semibold text-amber-100">Developer marked this feedback as Not useful</h4>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Developer&apos;s explanation</p>
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-zinc-200">{privateReason.reason}</p>
        <p className="text-xs text-zinc-400">Submitted {ukDateTime(privateReason.marked_at)} · Admin only</p>
      </section>
    )}
    <p className="text-xs text-zinc-500">Tester {t.tester_id} · <AnonymousTesterLabel testId={t.id} rankOnly compact/> · {feedbackQualityLabel(t)}</p>
    {t.hours_played != null && <p className="text-sm text-zinc-400">Time played: {t.hours_played} hours</p>}
    {(t.continue_playing || t.recommend_game) && <p className="text-sm text-zinc-400">Continue playing: {t.continue_playing?.replaceAll("_", " ") || "Not answered"} · Recommend: {t.recommend_game?.replaceAll("_", " ") || "Not answered"}</p>}
    {!!t.focus_responses && Object.keys(t.focus_responses).length > 0 && <details className="text-sm text-zinc-400"><summary>Testing focus responses</summary>{Object.entries(t.focus_responses).map(([key,value]) => <p key={key} className="mt-2 whitespace-pre-wrap">{key}: {typeof value === "string" ? value : JSON.stringify(value)}</p>)}</details>}
    <div className="grid gap-3 rounded-xl border border-white/10 p-4 text-sm text-zinc-300">
      <section aria-label="Testing objectives">
        <h4 className="font-semibold text-white">Testing objectives</h4>
        <p className="mt-2 whitespace-pre-wrap break-words leading-6">{item.context?.instructions || "Not recorded"}</p>
      </section>
      <section aria-label="Focus areas" className="border-t border-white/10 pt-3">
        <h4 className="font-semibold text-white">Focus areas</h4>
        <div className="mt-2 flex flex-wrap gap-2">{item.context?.focus_areas?.length ? item.context.focus_areas.map(area=><span key={area} className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-200">{area}</span>) : <span className="text-zinc-400">Balanced feedback</span>}</div>
      </section>
    </div>
    <div className="grid grid-cols-3 gap-3 text-sm">{([['Overall', t.overall_score], ['Gameplay', t.gameplay_score], ['Performance', t.performance_score]] as const).map(([label,value]) => <div key={label} className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-400">{label}</p><p className="mt-1 font-semibold">{value ?? "Not rated"}{value !== null ? "/10" : ""}</p></div>)}</div>
    <div className="grid gap-4 md:grid-cols-2">{([['What worked', t.enjoyed_most], ['What did not', t.frustrations], ['Biggest improvement', t.biggest_improvement], ['Bugs', t.bugs_found], ['Additional feedback', t.feedback]] as const).map(([label,value]) => <div key={label}><h4 className="text-sm font-semibold">{label}</h4><p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm text-zinc-300">{value || "Not provided"}</p></div>)}</div>
    <section aria-label="Admin-only supplementary evidence" className="space-y-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.035] p-4">
      <h4 className="font-semibold text-emerald-200">Private supporting evidence · admin only</h4>
      <p className="text-xs text-zinc-400">The developer can access these links only after approval. Public visitors cannot. External hosts may disclose the sharer’s identity.</p>
      {privateEvidence?.document_url?.startsWith("https://") && <p className="break-words text-sm"><strong>Additional feedback document:</strong> <a href={privateEvidence.document_url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">Open document</a></p>}
      {privateEvidence?.recording_url?.startsWith("https://") && <p className="break-words text-sm"><strong>Gameplay recording:</strong> <a href={privateEvidence.recording_url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">Watch recording</a></p>}
      {!privateEvidence && !publicTextRisk && <p className="text-sm text-zinc-500">No supplementary evidence attached.</p>}
      {publicTextRisk && <div className="space-y-3 rounded-lg border border-amber-300/30 bg-amber-300/[0.05] p-3">
        <p role="alert" className="text-sm font-semibold text-amber-200">Public feedback contains a link or contact detail. Remove it before accepting the report.</p>
        <p className="text-xs text-zinc-400">The correction is audited. It moves the evidence to private storage and replaces the public comment, without approving the report or changing XP.</p>
        <label className="block text-xs font-semibold text-zinc-300">Additional feedback document (private)
          <input type="url" maxLength={2048} value={repairDocument} onChange={event=>setRepairDocument(event.target.value)} placeholder="https://docs.google.com/document/d/..." className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-2 text-sm font-normal" />
        </label>
        <label className="block text-xs font-semibold text-zinc-300">Gameplay recording (private)
          <input type="url" maxLength={2048} value={repairRecording} onChange={event=>setRepairRecording(event.target.value)} placeholder="https://drive.google.com/file/d/..." className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-2 text-sm font-normal" />
        </label>
        <label className="block text-xs font-semibold text-zinc-300">Replacement public feedback
          <textarea maxLength={10000} rows={2} value={repairPublicFeedback} onChange={event=>setRepairPublicFeedback(event.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-2 text-sm font-normal" />
        </label>
        <label className="block text-xs font-semibold text-zinc-300">Audit reason
          <textarea rows={2} value={repairReason} onChange={event=>setRepairReason(event.target.value)} placeholder="Separate supporting document and recording from public feedback" className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-2 text-sm font-normal" />
        </label>
        <button type="button" disabled={repairing||busy||repairReason.trim().length<12||(!repairDocument.trim()&&!repairRecording.trim())} onClick={()=>void relocate()} className="rounded-lg border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50">Save private evidence &amp; redact public link (audited)</button>
      </div>}
      {evidenceError && <p role="alert" className="text-sm text-red-300">{evidenceError}</p>}
    </section>
    {item.developer_signals?.map((signal,i) => <p key={i} className="text-sm text-zinc-400">Developer {signal.signal}: {signal.reason}. Advisory only.</p>)}
    <p className="text-sm text-zinc-400">Previous reason: {t.review_reason || "No recorded rubric reason (legacy or pending)."}</p>
    <p className="text-sm text-zinc-400">An initial rejection is provisional for 24 hours and keeps the place. A timely dispute keeps it until an admin accepts or finally rejects it. Final rejection starts a 24-hour same-game cooldown. Current award: {t.base_xp_amount??"unknown (legacy)"} XP.</p>
    {(!finalDecision||correctionOpen)&&t.quality_rubric_version===rubric?.version&&t.quality_criteria&&<button type="button" disabled={busy} onClick={()=>{setCriteria(t.quality_criteria!);setEligibility(t.quality_eligibility||{original:null,relevant:null});setReason(t.review_reason||"");}} className="text-sm text-zinc-300 underline">Load recorded assessment for editing</button>}
    {finalDecision && <div className="rounded-lg border border-white/10 p-3 text-sm"><p>Final admin decision. Existing reconsideration records remain in review history. Only final rejection releases its place and begins the same-game cooldown.</p><button type="button" onClick={()=>setCorrectionOpen(value=>!value)} className="mt-2 text-amber-200 underline">{correctionOpen ? "Cancel exceptional correction" : "Exceptional administrative correction"}</button></div>}
    {!waitingForDispute && (!finalDecision || correctionOpen) && <div className="space-y-4">
    {finalDecision && <label className="block text-sm text-amber-100">Exceptional correction audit reason<textarea minLength={12} value={correctionReason} onChange={event=>setCorrectionReason(event.target.value)} className="mt-2 block w-full rounded border border-amber-200/30 bg-black p-3"/><span className="mt-1 block text-xs">Requires an audit reason. A rejected report cannot be accepted if its released place has been allocated. Paused or closed campaigns are never reopened.</span></label>}
    <fieldset disabled={busy||!rubric} className="space-y-3 border-t border-zinc-800 pt-4"><legend className="font-semibold">Eligibility before XP</legend><p className="text-xs text-zinc-400">Assess the report yourself. This does not claim automated verification of originality. Either failure means rejection and 0 XP, regardless of scored criteria.</p>{Object.entries(rubric?.eligibility||{original:"Credible original feedback, not spam or copied filler",relevant:"Relates to the relevant game/build and testing experience"}).map(([key,label])=><label key={key} className="block text-sm">{label}<select className="mt-1 block w-full rounded-lg border border-zinc-700 bg-black p-2" value={eligibility[key]===null?"":String(eligibility[key])} onChange={e=>setEligibility(previous=>({...previous,[key]:e.target.value===""?null:e.target.value==="true"}))}><option value="">Choose assessment</option><option value="true">Meets requirement</option><option value="false">Does not meet requirement</option></select></label>)}</fieldset>
    <fieldset disabled={busy||!rubric} className="space-y-3 border-t border-zinc-800 pt-4"><legend className="font-semibold">Feedback quality · scored criteria</legend>{Object.entries(FEEDBACK_QUALITY_CRITERIA).map(([key,fallback])=>[key,rubric?.criteria[key]||fallback] as const).map(([key,criterion])=><label key={key} className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={criteria[key]||false} onChange={e=>setCriteria(previous=>({...previous,[key]:e.target.checked}))}/><span>{criterion.label}<span className="mt-1 block text-xs text-zinc-400">{criterion.guidance}</span></span></label>)}</fieldset>
    <p role="status" className="rounded-lg border border-emerald-300/20 p-3 text-sm">{count} of 5 criteria · {assessed?`Quality ${score}% · Award ${eligible?score:0} XP`:"Complete eligibility to preview XP"}{assessed&&!eligible?" · Eligibility failed: reject with a reason":""}</p>
    <label className="block text-sm font-semibold">Reason visible to the tester<textarea disabled={busy} className="mt-2 block w-full rounded-lg border border-zinc-700 bg-black p-3 font-normal" value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button type="button" disabled={busy} onClick={()=>setReason(feedbackReasonSuggestion(criteria,eligibility))} className="text-sm text-zinc-300 underline">Use editable reason suggestion</button>
    <p className="text-xs text-zinc-400">Praise and criticism are equal. Do not require bugs, polished English or invented negatives. Rejection awards 0 XP and reverses the actual current award. Feedback quality percentage is distinct from acceptance rate.</p>
    <div className="flex flex-wrap gap-3"><button disabled={busy||!rubric||!eligible||!reason.trim()||publicTextRisk||!!evidenceError||(finalDecision&&correctionReason.trim().length<12)} onClick={()=>void decide("accepted")} className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-black disabled:opacity-50">{finalDecision ? "Apply audited acceptance correction" : activeDispute ? "Accept dispute and award XP" : "Accept feedback (final decision)"}</button>{(!finalDecision||t.review_outcome!=="accepted") && <button disabled={busy||!rubric||!assessed||!reason.trim()||(finalDecision&&correctionReason.trim().length<12)} onClick={()=>void decide("rejected")} className="rounded-lg border border-red-400/30 px-4 py-3 text-sm text-red-200 disabled:opacity-50">{finalDecision ? "Apply audited rejection correction" : activeDispute ? "Finally reject dispute (releases place)" : "Provisionally reject (24-hour dispute window)"}</button>}</div>
    </div>}
    {error && <p role="alert" className="text-sm text-red-300">{error}{!rubric&&<button type="button" onClick={()=>setRubricAttempt(n=>n+1)} className="ml-2 underline">Retry rubric</button>}</p>}
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
  const [privateReasons, setPrivateReasons] = useState<Record<string, PrivateDeveloperReason>>({});
  const [privateReasonsError, setPrivateReasonsError] = useState("");
  const [focusedReviewId,setFocusedReviewId]=useState<string|null>(null);
  const [pendingPage,setPendingPage]=useState(1),[reviewedPage,setReviewedPage]=useState(1);
  const [paginationReady,setPaginationReady]=useState(false);
  const pending=useMemo(()=>items.filter(needsFeedbackReview),[items]);
  const history=useMemo(()=>items.filter(item=>!needsFeedbackReview(item)).sort((a,b)=>{
    const aa=Date.parse(a.report.submitted_at||"")||0,bb=Date.parse(b.report.submitted_at||"")||0;
    return bb-aa||b.report.id.localeCompare(a.report.id);
  }),[items]);
  const activePage=view==="pending"?pendingPage:reviewedPage;
  const visible=useMemo(()=>pagedItems(view==="pending"?pending:history,activePage,10),[view,pending,history,activePage]);
  const reasonReviewIds=useMemo(()=>visible.filter(item=>!needsFeedbackReview(item)&&item.report.feedback_usefulness==="not_useful").map(item=>item.report.id),[visible]);
  useEffect(() => {
    let active = true;
    if (!reasonReviewIds.length) {
      setPrivateReasons({});
      setPrivateReasonsError("");
      return () => {active=false;};
    }
    void createClient().rpc("get_admin_feedback_not_useful_reasons", {p_test_ids: reasonReviewIds}).then(({data,error}) => {
      if (!active) return;
      if (error) {
        setPrivateReasonsError("Private developer explanations could not be loaded. Refresh to retry.");
        setPrivateReasons({});
        return;
      }
      setPrivateReasons(Object.fromEntries(((data ?? []) as PrivateDeveloperReason[]).map(row => [row.test_id,row])));
      setPrivateReasonsError("");
    });
    return () => {active=false;};
  }, [reasonReviewIds]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const page=Number(params.get("reviewPage"));
    if(Number.isSafeInteger(page)&&page>0)setReviewedPage(page);
    const target=window.location.hash.match(/^#report-([0-9a-f-]{36})$/i)?.[1]??null;
    if(target){setFocusedReviewId(target);setView("history");}
    else if(params.get("review")==="reviewed")setView("history");
    setPaginationReady(true);
  },[]);
  useEffect(()=>{
    if(!focusedReviewId)return;
    const index=history.findIndex(item=>item.report.id===focusedReviewId);
    if(index>=0)setReviewedPage(page=>page===Math.floor(index/10)+1?page:Math.floor(index/10)+1);
  },[focusedReviewId,history]);
  useEffect(()=>{
    if(!focusedReviewId||!visible.some(item=>item.report.id===focusedReviewId))return;
    const timer=window.setTimeout(()=>document.getElementById("report-"+focusedReviewId)?.scrollIntoView({block:"center"}),130);
    return()=>window.clearTimeout(timer);
  },[focusedReviewId,visible]);
  useEffect(()=>{if(!loading)setPendingPage(page=>Math.min(page,pageCount(pending.length,10)));},[pending.length,loading]);
  useEffect(()=>{if(!loading)setReviewedPage(page=>Math.min(page,pageCount(history.length,10)));},[history.length,loading]);
  useEffect(()=>{
    if(!paginationReady)return;
    const url=new URL(window.location.href);
    url.searchParams.set("review",view==="history"?"reviewed":"pending");
    if(view==="history"&&reviewedPage>1)url.searchParams.set("reviewPage",String(reviewedPage));
    else url.searchParams.delete("reviewPage");
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  },[view,reviewedPage,paginationReady]);
  const changePage=(page:number)=>{
    setFocusedReviewId(null);
    if(window.location.hash.startsWith("#report-"))window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
    if(view==="history")setReviewedPage(page);else setPendingPage(page);
  };
    async function reload() { await refresh(); setNotice("Decision saved and audited."); }
  return <section aria-label="Playtest feedback reviews">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Independent playtest reviews</h2><p className="mt-1 text-sm text-zinc-400">Review submitted feedback against the quality criteria. Admin decisions control XP.</p></div><button disabled={loading} onClick={() => void refresh()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-50">Refresh reviews</button></div>
    <details className="my-4 rounded-lg border border-white/10 p-4"><summary className="cursor-pointer font-semibold">How feedback earns XP</summary><QualityGuidance/></details>
    <div className="flex gap-3"><button aria-pressed={view === "pending"} onClick={() => {setFocusedReviewId(null);setView("pending");}} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Awaiting review ({pending.length})</button><button aria-pressed={view === "history"} onClick={() => {setFocusedReviewId(null);setView("history");}} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Reviewed ({history.length})</button></div>
    {notice && <p role="status" className="mt-4 text-sm text-emerald-300">{notice}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {privateReasonsError && <p role="alert" className="mt-4 text-sm text-amber-200">{privateReasonsError}</p>}
    {loading ? <p className="mt-4 text-sm text-zinc-400">Loading reviews...</p> : !error && visible.length === 0 ? <p className="mt-4 text-sm text-zinc-400">{view === "pending" ? "No playtest feedback is awaiting review." : "No reviewed feedback yet."}</p> : visible.map(item => view === "history" ? <details key={item.report.id} open={focusedReviewId === item.report.id ? true : undefined} className="group my-3 min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/40"><summary className="cursor-pointer list-none px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><span className="block min-w-0 max-w-full break-words [overflow-wrap:anywhere] font-semibold text-zinc-100">{item.context?.title || "Legacy report"}</span><p className="mt-1 text-xs text-zinc-400">Submitted {ukDateTime(item.report.submitted_at)} · {item.report.review_outcome || "Reviewed"} · {item.report.base_xp_amount ?? 0} XP</p></div><div className="flex max-w-full flex-wrap items-center justify-end gap-2">
  {item.report.feedback_usefulness === "not_useful" && (
    <span className="inline-flex max-w-full items-center rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-2.5 py-1 text-[11px] font-semibold leading-4 text-amber-200">
      Developer marked Not useful
    </span>
  )}
  {item.report.feedback_usefulness === "useful" && (
    <span className="inline-flex max-w-full items-center rounded-full border border-emerald-300/25 bg-emerald-300/[0.06] px-2.5 py-1 text-[11px] font-semibold leading-4 text-emerald-200">
      ✓ Developer marked Useful
    </span>
  )}
  <span className="text-xs text-emerald-300 group-open:hidden">View feedback +</span>
  <span className="hidden text-xs text-emerald-300 group-open:inline">Collapse −</span>
</div></div></summary><div className="border-t border-zinc-800 px-3 pb-3"><ReviewCard item={item} reload={reload} privateReason={privateReasons[item.report.id]}/></div></details> : <ReviewCard key={item.report.id} item={item} reload={reload} privateReason={privateReasons[item.report.id]}/>)}
    {!loading&&!error&&<PaginationControls label={view==="history"?"Reviewed playtest reviews":"Awaiting playtest reviews"}
      page={activePage} pageSize={10} total={view==="history"?history.length:pending.length} onPageChange={changePage}/>}
  </section>;
}

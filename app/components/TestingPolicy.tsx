"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { GAME_GENRES, normalizeGenrePreferences } from "@/lib/genres";
import { TesterRankSummary } from "./TesterRankSummary";
import {RANKS} from "@/lib/tester-rank";
export {RANKS} from "@/lib/tester-rank";
import {FEEDBACK_QUALITY_CRITERIA,feedbackQualityLabel,type FeedbackQualityRecord} from "@/lib/feedback-review";
export const QUALITY_CRITERIA=Object.fromEntries(Object.entries(FEEDBACK_QUALITY_CRITERIA).map(([key,value])=>[key,value.label]));

export function QualityGuidance({ collapsible = false }: { collapsible?: boolean }) {
    const content = <div className="space-y-3 text-sm leading-6 text-zinc-400">
      <ul className="list-disc space-y-1 pl-5">{Object.values(QUALITY_CRITERIA).map(c => <li key={c}>{c}</li>)}</ul>
      <p>Useful praise and honest criticism earn equal treatment. An admin first assesses credible originality/non-spam and relevance, then awards 0 to 100 XP for feedback quality in 20 XP steps. This is an assessment of usefulness, not automated originality verification or proof of subjective opinions. Finding no bugs is valid.</p>
      <p>Ratings, positivity, polished English, length and time played do not determine quality or XP. Do not invent bugs or criticism.</p>
    </div>;
    if (collapsible) return <details className="group my-4 rounded-xl border border-white/[0.08] bg-white/[0.015]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden"><span className="font-medium text-zinc-300">Feedback and XP guide <span className="ml-2 font-normal text-zinc-500">Up to 100 XP per report</span></span><span className="text-xs text-zinc-500"><span className="group-open:hidden">Show guide +</span><span className="hidden group-open:inline">Hide guide −</span></span></summary>
      <div className="border-t border-white/[0.06] px-5 py-4">{content}</div>
    </details>;
    return <aside className="my-4 space-y-3 rounded-xl border border-white/10 p-4"><p className="text-sm font-semibold text-white">How feedback earns XP</p>{content}</aside>;
}
type Progress = {
    rank: number;
    xp: number;
    accepted: number;
    reviewed: number;
    passed: number;
    genres: string[];
};
export function TesterRankPanel() {
    const [data, setData] = useState<Progress | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        void createClient().rpc("get_my_testing_progress").then(({ data, error }) => {
            if (active) {
                setData(data);
                setError(error?.message || "");
            }
        });
        return () => { active = false; };
    }, []);
    if (error)
        return <p role="alert">Tester progress unavailable: {error}</p>;
    if (!data)
        return <p>Loading tester rank…</p>;
    return <TesterRankSummary data={data} ranks={RANKS}/>;
}

export function GenrePreferences() {
    const [mappingReady, setMappingReady] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(true);
    useEffect(() => {
        let active = true;
        const client = createClient();
        void Promise.all([
            client.rpc("get_testing_genres"), client.rpc("get_my_testing_progress")
        ]).then(([options, progress]) => { if (!active)
            return;
            const ready = options.data?.length === GAME_GENRES.length && options.data.every((g: string) => GAME_GENRES.some(option => option === g));
            setMappingReady(!!ready);
            setSelected(normalizeGenrePreferences(progress.data?.genres || []));
            setStatus(options.error?.message || progress.error?.message || (!ready ? "Your saved preferences remain active. Genre updates will be available shortly." : ""));
            setBusy(false); });
        return () => { active = false; };
    }, []);
    async function save() { setBusy(true); const { error } = await createClient().rpc("update_my_testing_genres", { p_genres: selected }); setStatus(error?.message || "Preferences saved. These are interests, not verified expertise."); setBusy(false); }
    return <section className="my-6 rounded-xl border border-white/10 p-5">
    <h2 className="font-bold">Preferred testing genres</h2>
    <p className="my-2 text-sm text-zinc-400">Select any genres you enjoy testing. You can change these normally; existing claims remain usable.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{GAME_GENRES.map(g => <label key={g} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={selected.includes(g)} onChange={e => setSelected(s => e.target.checked ? [...s, g] : s.filter(x => x !== g))}/> {g}</label>)}</div>
    <button type="button" disabled={busy || !mappingReady} onClick={save} className="mt-4 rounded border px-3 py-2 disabled:opacity-50">Save testing genres</button>
    <p role="status" className="mt-2 text-sm">{status}</p>
  </section>;
}
export function Reconsideration({ testId, reason }: {
    testId: string;
    reason: string | null;
}) {
    const [text, setText] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    async function send() { setBusy(true); const { error } = await createClient().rpc("request_test_reconsideration", { p_test_id: testId, p_reason: text }); setStatus(error?.message || "Reconsideration requested. An admin will review your explanation."); setBusy(false); }
    return <div className="mt-3 text-sm"><p>Quality review reason: {reason || "No reason recorded on this legacy review."}</p><label className="block mt-2">Request reconsideration<textarea className="block w-full rounded bg-black p-2" value={text} onChange={e => setText(e.target.value)}/></label><button disabled={busy || !text.trim()} onClick={send} className="mt-2 rounded border px-3 py-2">Send request</button><p role="status">{status}</p></div>;
}
export function useTestingCapacityPolicy(){
 const [data,setData]=useState<{places:number;reservation_hours:number;server_now:string;activated_at:string|null}|null>(null);
 useEffect(()=>{let active=true;void createClient().rpc('get_testing_capacity_policy').then(({data,error})=>{if(active&&!error&&data)setData(data);});return()=>{active=false;};},[]);
 return data;
}
export function PlacesRules(){return <details className="mt-2 text-xs leading-5 text-zinc-400"><summary className="cursor-pointer">How places work</summary><p className="mt-2">A confirmed claim reserves one place for 72 hours. Starting or refreshing does not extend it. Release or expiry before submission frees the place, with no XP penalty. Expired drafts are kept; reclaim a place before submitting. Submitted feedback uses a place regardless of review outcome, except an audited moderator replacement. Community feedback is separate. Places do not guarantee participation or accepted feedback.</p></details>;}
export function ReservationNotice({expiresAt,now,hours,claimed=false}:{expiresAt?:string|null;now:number|null;hours?:number;claimed?:boolean}){
 if(!expiresAt&&claimed)return <p className="mt-2 text-xs text-zinc-400">{hours?"Historical reservation: its 72-hour transition has not been activated yet.":"Reservation deadline unavailable. Your existing claim is unchanged."}</p>;
 if(!expiresAt)return <p className="mt-2 text-xs text-zinc-400">{now&&hours?`If claimed now: submit by ${new Date(now+hours*3600000).toLocaleString()}. ${hours}-hour reservation begins when confirmed.`:'Reservation deadline will be shown when server rules are available.'}</p>;
 if(now===null)return <p className="mt-2 text-xs text-zinc-400">Checking reservation deadline…</p>;
 const remaining=Date.parse(expiresAt)-now;
 return <p role="status" className={`mt-2 text-sm ${remaining<=86400000?'text-amber-200':'text-zinc-400'}`}>{remaining<=0?'Reservation expired. Your draft is kept. Reclaim a place before submitting.':`${remaining<=86400000?'Final 24 hours · ':''}${Math.ceil(remaining/3600000)}h remaining · Submit by ${new Date(expiresAt).toLocaleString()}.`}</p>;
}
export function CampaignPlaces({ id,refreshKey }: {
    id: string;
    refreshKey?: string;
}) {
    const [data, setData] = useState<{
        submitted: number;
        testing: number;
        available: number;
        capacity?: number;
    } | null>(null);
    const [error, setError] = useState("");
    const [revision,setRevision]=useState(0);
    useEffect(() => { let active = true; void createClient().rpc("get_campaign_testing_details", { p_id: id }).then(({ data, error }) => { if (active) {
        setData(data);
        setError(error?.message || "");
    } }); return () => { active = false; }; }, [id,refreshKey,revision]);
    return <div className="my-2"><p className="text-sm text-zinc-400" role="status">{error ? `Places unavailable: ${error}` : data ? `${data.capacity??(data.submitted+data.testing+data.available)} places · ${data.submitted} submitted · ${data.testing} reserved · ${data.available} available${data.available===0?(data.submitted>=(data.capacity??(data.submitted+data.testing))?' · Feedback capacity reached':' · All places reserved'):''}` : 'Loading places…'}</p><button type="button" onClick={()=>setRevision(n=>n+1)} className="mt-1 text-xs text-zinc-400 underline">Refresh places</button><PlacesRules/></div>;
}
export function FeedbackSignal({ testId }: {
    testId: string;
}) {
    const [signal, setSignal] = useState("helpful");
    const [reason, setReason] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    async function send() { setBusy(true); const { error } = await createClient().rpc("signal_test_feedback", { p_test_id: testId, p_signal: signal, p_reason: reason }); setStatus(error?.message || "Signal saved for moderator consideration. XP and rank are unchanged."); setBusy(false); }
    return <div className="mt-3 text-sm"><label>Feedback quality signal <select className="bg-black" value={signal} onChange={e => setSignal(e.target.value)}><option value="helpful">Helpful</option><option value="concern">Specific quality concern</option></select></label><label className="block">Reason<textarea className="block w-full bg-black p-2" value={reason} onChange={e => setReason(e.target.value)}/></label><p>Disagreement with a rating is not a quality concern. Signals do not award or remove XP.</p><button disabled={busy || !reason.trim()} onClick={send} className="rounded border px-3 py-2">Save signal</button><p role="status">{status}</p></div>;
}
type QualityReport = FeedbackQualityRecord & {
    id: string;
    outcome: string;
    overall: number | null;
    enjoyed: string | null;
    frustrations: string | null;
    improvement: string | null;
    bugs: string | null;
    feedback: string | null;
};
export function DeveloperQualityReports({ campaignId }: {
    campaignId: string;
}) {
    const [reports, setReports] = useState<QualityReport[]>([]);
    const [error, setError] = useState("");
    useEffect(() => { let active = true; void createClient().rpc("get_developer_quality_reports", { p_playtest_id: campaignId }).then(({ data, error }) => { if (active) {
        setReports(data || []);
        setError(error?.message || "");
    } }); return () => { active = false; }; }, [campaignId]);
    return <section className="my-4 rounded-xl border border-white/10 p-4"><h3 className="font-semibold">Independent reports and quality signals</h3><CampaignPlaces id={campaignId}/><p className="my-2 text-sm text-zinc-400">Submitted reports use a tester place regardless of review outcome. Small samples are early feedback, not statistical confidence. Community responses are separate. The platform allowance does not prevent public link sharing or feedback collected elsewhere.</p>{error && <p role="alert">{error}</p>}{reports.map(r => <details key={r.id} className="my-3 rounded border border-white/10 p-3"><summary>Independent report · {r.outcome} · Overall {r.overall ?? "unrated"}</summary><p className="mt-2 text-xs text-zinc-400">{feedbackQualityLabel(r)}</p>{([['What worked', r.enjoyed], ['What did not', r.frustrations], ['Improvement', r.improvement], ['Bugs', r.bugs], ['Additional feedback', r.feedback]] as const).map(([label, text]) => <div className="my-2" key={label}><h4 className="font-semibold">{label}</h4><p className="whitespace-pre-wrap">{text || "Not provided"}</p></div>)}<FeedbackSignal testId={r.id}/></details>)}</section>;
}

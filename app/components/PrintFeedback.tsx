"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal, flushSync } from "react-dom";
import { createClient } from "@/lib/supabase";
import type { AcceptedIndependentFeedback } from "./StartPlaytest";

type Props = {
  playtestId:string;
  studioId?:string;
  gameTitle: string;
  developerName: string;
  releaseLabel: string;
  responses: AcceptedIndependentFeedback[];
  rankRef: RefObject<HTMLElement | null>;
  snapshot: {
    averageOverall: number | null;
    averageGameplay: number | null;
    averagePerformance: number | null;
    continuation: string | null;
    recommendation: string | null;
    averageHours: number | null;
    totalHours: number | null;
    issueResponses: number | null;
    sampleNote: string;
  };
};

function reportDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function rating(value: number | null) {
  return value === null ? "Not provided" : `${value}/10`;
}

const hoursFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

function printHours(hours: number | null) {
  return hours === null ? null : `${hoursFormat.format(hours)} h`;
}

function intent(value: string | null) {
  return value?.replaceAll("_", " ") || "Not answered";
}

export function PrintFeedbackButton({ disabled, onClick }: { disabled: boolean; onClick?: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="rounded-lg border border-emerald-300/30 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/10 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50">
      <span aria-hidden="true">🖨 </span>Print feedback
    </button>
  );
}

export default function PrintFeedback({ playtestId, studioId, gameTitle, developerName, releaseLabel, responses, rankRef, snapshot }: Props) {
  const [printReport, setPrintReport] = useState<{ date: string; ranks: string[]; responses: AcceptedIndependentFeedback[] } | null>(null);
  const [error, setError] = useState(false);

  const [checking,setChecking]=useState(false);
  const active=useRef(false);
  const pending=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);

  async function print() {
    if (!responses.length || printReport || pending.current) return;
    pending.current=true;
    setChecking(true);
    const ranks = Array.from(rankRef.current?.querySelectorAll("[data-print-tester-rank]") ?? [],
      label => label.textContent ?? "");
    setError(false);
    const clearReport = () => setPrintReport(null);

    try {
      const {data,error:failure}=await createClient().rpc("get_pro_feedback_export",{p_playtest_id:playtestId,p_studio:studioId||null});
      if(!active.current)return;
      if(failure||!Array.isArray(data)||!data.length)throw new Error("Report unavailable");
      const ranksById=new Map(responses.map((response,index)=>[response.test_id,ranks[index]||""]));
      window.addEventListener("afterprint", clearReport, { once: true });
      flushSync(() => setPrintReport({
        date:reportDate(new Date()), responses:data,
        ranks:data.map((response:AcceptedIndependentFeedback)=>ranksById.get(response.test_id)||""),
      }));
      window.print();
    } catch {
      window.removeEventListener("afterprint", clearReport);
      if(!active.current)return;
      clearReport();
      setError(true);
    } finally {
      pending.current=false;
      if(active.current)setChecking(false);
    }
  }

  return (
    <>
      <PrintFeedbackButton disabled={!responses.length || checking || Boolean(printReport)} onClick={print} />
      {error && <p role="alert" className="text-sm text-amber-200">This workspace cannot export the report right now. Refresh and try again.</p>}
      {printReport && createPortal(
        <main className="feedback-print">
          <div className="feedback-print-opening">
            <header>
              <p><strong>Playtested</strong> · playtested.co.uk</p>
              <h1>Tester feedback</h1>
              <h2>{gameTitle}</h2>
              <p>Developer: {developerName}</p>
              <p>Build: {releaseLabel}</p>
              <p>Report date: {printReport.date}</p>
              <p>Quality-accepted independent tester reports: {printReport.responses.length}</p>
            </header>
            <section className="feedback-print-snapshot" aria-label="Results snapshot">
              <h3>Results snapshot</h3>
              <p>{snapshot.sampleNote}</p>
              <dl>
                {[
                  ["Overall experience", snapshot.averageOverall === null ? null : rating(snapshot.averageOverall)],
                  ["Gameplay", snapshot.averageGameplay === null ? null : rating(snapshot.averageGameplay)],
                  ["Performance", snapshot.averagePerformance === null ? null : rating(snapshot.averagePerformance)],
                  ["Would continue playing", snapshot.continuation],
                  ["Would recommend", snapshot.recommendation],
                  ["Issue responses", snapshot.issueResponses],
                  ["Average playtime", printHours(snapshot.averageHours)],
                  ["Total reported playtime", printHours(snapshot.totalHours)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value ?? "N/A"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
          {printReport.responses.map((response, index) => {
            const rank = printReport.ranks[index];
            const answers = [
              ["Enjoyed most", response.enjoyed_most],
              ["Frustrations", response.frustrations],
              ["Bugs & technical issues", response.bugs_found],
              ["Biggest improvement", response.biggest_improvement],
              ["Anything else", response.feedback],
              ...Object.entries(response.focus_responses ?? {}).filter(([, answer]) => typeof answer === "string"),
            ];
            return (
              <article key={response.test_id}>
                <h3>Tester {index + 1}{rank && !rank.startsWith("Rank unavailable") ? ` · ${rank}` : ""}</h3>
                {response.submitted_at && <p>Submitted: {reportDate(new Date(response.submitted_at))}</p>}
                <p>Overall: {rating(response.overall_score)} · Gameplay: {rating(response.gameplay_score)} · Performance: {rating(response.performance_score)}</p>
                <p>Continue playing: {intent(response.continue_playing)} · Recommend: {intent(response.recommend_game)}</p>
                {response.hours_played !== null && <p>Time played: {response.hours_played} hours</p>}
                <dl>
                  {answers.map(([label, answer], answerIndex) => typeof answer === "string" && answer.trim() && (
                    <div key={answerIndex}><dt>{String(label)}</dt><dd>{answer}</dd></div>
                  ))}
                </dl>
              </article>
            );
          })}
        </main>, document.body
      )}
    </>
  );
}

"use client";

import { useState, type RefObject } from "react";
import { createPortal, flushSync } from "react-dom";
import type { AcceptedIndependentFeedback } from "./StartPlaytest";

type Props = {
  gameTitle: string;
  developerName: string;
  releaseLabel: string;
  responses: AcceptedIndependentFeedback[];
  panelRef: RefObject<HTMLElement | null>;
};

function reportDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function rating(value: number | null) {
  return value === null ? "Not provided" : `${value}/10`;
}

function intent(value: string | null) {
  return value?.replaceAll("_", " ") || "Not answered";
}

export default function PrintFeedback({ gameTitle, developerName, releaseLabel, responses, panelRef }: Props) {
  const [printReport, setPrintReport] = useState<{ date: string; ranks: string[] } | null>(null);
  const [error, setError] = useState(false);

  function print() {
    if (!responses.length || printReport) return;
    const ranks = Array.from(panelRef.current?.querySelectorAll("[data-print-tester-rank]") ?? [],
      label => label.textContent ?? "");
    setError(false);
    const clearReport = () => setPrintReport(null);
    window.addEventListener("afterprint", clearReport, { once: true });
    try {
      flushSync(() => setPrintReport({ date: reportDate(new Date()), ranks }));
      window.print();
    } catch {
      window.removeEventListener("afterprint", clearReport);
      clearReport();
      setError(true);
    }
  }

  return (
    <>
      <button type="button" disabled={!responses.length || Boolean(printReport)} onClick={print}
        className="rounded-lg border border-emerald-300/30 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/10 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50">
        <span aria-hidden="true">🖨 </span>Print feedback
      </button>
      {error && <p role="alert" className="text-sm text-amber-200">Could not open the print dialogue. Please try again.</p>}
      {printReport && createPortal(
        <main className="feedback-print">
          <header>
            <p><strong>Playtested</strong> · playtested.co.uk</p>
            <h1>Tester feedback</h1>
            <h2>{gameTitle}</h2>
            <p>Developer: {developerName}</p>
            <p>Build: {releaseLabel}</p>
            <p>Report date: {printReport.date}</p>
          </header>
          {responses.map((response, index) => {
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

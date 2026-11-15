"use client";
import { useState } from "react";
import { comparePlaytime, formatPlaytime, type summarizePlaytime } from "@/lib/playtime";

type Summary = ReturnType<typeof summarizePlaytime>;
export function PlaytimeComparison({ summary, targetMinutes, preview = false }: { summary: Summary; targetMinutes: number | null; preview?: boolean }) {
  const hasTarget = targetMinutes !== null && Number.isFinite(targetMinutes) && targetMinutes > 0;
  const [mode, setMode] = useState(hasTarget ? "target" : "none");
  const [customMinutes, setCustomMinutes] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const referenceMinutes = mode === "demo" ? 14 : mode === "target" && hasTarget ? targetMinutes : mode === "custom" && customMinutes.trim() ? Number(customMinutes) : null;
  const statistic = mode === "demo" ? "Median" : "Average";
  const hours = mode === "demo" ? summary.medianHours : summary.averageHours;
  const comparison = comparePlaytime(hours, referenceMinutes);
  const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
  return <section aria-label="Playtime comparison" className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.025] p-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h4 className="text-sm font-semibold text-zinc-200">Playtime comparison</h4><p className="mt-1 text-xs text-zinc-400">{summary.count} accepted independent report{summary.count === 1 ? "" : "s"} include playtime. Self-reported for this build; community responses do not include playtime.</p></div>
      <label className="text-xs text-zinc-400">Compare against<select className="ml-2 rounded-lg border border-zinc-700 bg-[#090b0a] p-2 text-zinc-100" value={mode} onChange={e => setMode(e.target.value)}><option value="none">No reference</option>{hasTarget && <option value="target">Requested test duration ({targetMinutes} min)</option>}<option value="demo">2022 Steam demo survey (median)</option><option value="custom">Custom average playtime reference</option></select></label>
    </div>
    {mode === "custom" && <div className="mt-3 flex flex-wrap gap-3"><label className="text-xs text-zinc-400">Reference average (minutes per tester)<input type="number" min="0.1" step="any" className="ml-2 w-24 rounded border border-zinc-700 bg-black p-2 text-white" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}/></label><label className="text-xs text-zinc-400">Reference source / cohort<input className="ml-2 rounded border border-zinc-700 bg-black p-2 text-white" placeholder="For example, similar-genre demos" value={referenceName} onChange={e => setReferenceName(e.target.value)}/></label><p className="w-full text-xs text-zinc-500">Custom references apply to this view only. Use comparable playtests and a documented source.</p></div>}
    {comparison && <div className="mt-3 text-sm text-zinc-300"><p><strong className="text-lg text-amber-200">{number.format(comparison.percentOfReference)}% of reference</strong> · {number.format(Math.abs(comparison.percentDifference))}% {comparison.percentDifference >= 0 ? "above" : "below"}</p><p className="mt-1">{statistic} reported playtime {formatPlaytime(hours)} versus {referenceMinutes} minutes {mode === "target" ? "requested per tester" : mode === "custom" ? referenceName || "custom reference" : "demo median reference"}.</p></div>}
    {mode !== "none" && !comparison && <p className="mt-3 text-xs text-zinc-400">{summary.count === 0 ? "A comparison becomes available when playtime is reported." : "Enter a reference greater than zero."}</p>}
    {mode === "demo" && <p className="mt-3 text-xs text-zinc-400"><a className="underline" href="https://howtomarketagame.com/2022/10/26/what-is-a-good-median-play-time-for-a-demo-benchmark/" target="_blank" rel="noreferrer">Source: 130-demo developer survey, 2022</a>. The 14-minute reference is the median of developer-reported Steam demo medians, not an average for all indie games. These self-reported, selected playtest reports are a different sample.</p>}
    <p className="mt-2 text-xs text-zinc-500">{preview ? "Includes sample reports in this preview. " : ""}Total hours measure testing coverage; a higher percentage is not a quality score, percentile, retention measure or XP award.</p>
  </section>;
}

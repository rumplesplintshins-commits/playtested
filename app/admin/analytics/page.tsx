"use client";
import AdminSteamReferrals from "@/app/components/AdminSteamReferrals";
import { useEffect, useState } from "react";
import SiteHeader from "@/app/components/SiteHeader";
import {capturedChannel} from "@/lib/acquisition";
import PlatformUsers from "@/app/components/PlatformUsers";

type Summary = {
  windows: { days: number; visitors: number; views: number }[];
  trend: { day: string; visitors: number; views: number }[];
  sources: { source: string; medium: string | null; campaign: string | null; views: number; visitors: number }[];
  submission_totals: {submissions:number;approved:number;developers:number};
  submissions: { medium?:string|null; referral?:string|null; developers:number; source: string; campaign: string | null; self_reported: string | null; submissions: number; approved: number }[];
};
export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      setError("");
      try {
        const response = await fetch("/api/admin/analytics", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setData(result);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Analytics could not be loaded."); }
    })();
    return () => { active = false; };
  }, [retry]);
  return <main className="min-h-screen bg-[#090b0a] text-zinc-100"><SiteHeader /><article className="mx-auto max-w-6xl px-5 py-10">
    <a href="/admin/submissions" className="text-sm text-emerald-300 underline">Back to submission review</a>
    <h1 className="mt-5 text-3xl font-bold">Visitor &amp; acquisition analytics</h1>
    <PlatformUsers /><AdminSteamReferrals/>
    <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">Unique visitors here means distinct consenting browser-tab sessions, renewed after 30 minutes of inactivity. These are approximate visits, not unique people. Returning visitors, multiple tabs/devices and storage clearing can increase counts. Non-consenting visits, privacy signals and recognised bots are excluded; bot filtering is best effort. Times and daily trends use UTC.</p>
    {error && <div role="alert" className="my-5 rounded border border-amber-300/30 p-4"><p>{error}</p><button onClick={() => setRetry(n => n + 1)} className="mt-3 rounded border px-3 py-2">Retry analytics</button></div>}
    {!data && !error && <p role="status" className="mt-5">Loading analytics…</p>}
    {data && <>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">{data.windows.map(w => <section key={w.days} className="rounded-xl border border-white/10 p-5"><h2 className="text-zinc-400">Last {w.days === 1 ? "24 hours" : `${w.days} days`}</h2><p className="mt-3 text-3xl font-semibold">{w.visitors.toLocaleString()}</p><p className="text-sm text-zinc-400">unique visitor sessions · {w.views.toLocaleString()} page views</p></section>)}</div>
      <h2 className="mt-9 text-xl font-semibold">Daily trend · 30 days</h2>
      <div className="mt-4 max-h-80 overflow-auto rounded border border-white/10"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">UTC date</th><th>Visitor sessions</th><th>Page views</th></tr></thead><tbody>{data.trend.map(d => <tr key={d.day} className="border-t border-white/10"><td className="p-3">{d.day}</td><td>{d.visitors}</td><td>{d.views}</td></tr>)}</tbody></table></div>
      <h2 className="mt-9 text-xl font-semibold">Acquisition · last 30 days</h2>
      <p className="mt-2 text-sm text-zinc-400">Campaign values are self-supplied labels, not verified identities. Direct and unknown cannot reliably be separated. Sources may be missing because referrers are stripped or tracking is declined.</p>
      {!data.sources.length ? <p className="mt-4 text-zinc-400">No consenting visitor data yet.</p> : <div className="mt-4 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Source / medium / campaign</th><th>Sessions</th><th>Views</th></tr></thead><tbody>{data.sources.map((s, i) => <tr key={i} className="border-t border-white/10"><td className="break-all p-3">{s.source} / {s.medium || "—"} / {s.campaign || "—"}</td><td>{s.visitors}</td><td>{s.views}</td></tr>)}</tbody></table></div>}
      <h2 className="mt-9 text-xl font-semibold">Submission acquisition · last 30 days</h2>
      <p className="mt-2 text-sm text-zinc-400">Counts are distinct submission records created in the last 30 days, with Approved showing their current approval status (not approvals made during this period). Steam imports, explicitly flagged Test / Demo games and previously excluded fixtures are omitted. Archiving a genuine game preserves its historical activity here. Developers are distinct owners, not registrations. Registration attribution is not collected. Self-reported discovery is voluntary and independent of analytics permission. Unknown attribution includes legitimate historical records without captured labels; it does not mean a verified direct visit. Tables show up to 50 source groups; totals cover the entire cohort.</p>
      <p className="mt-3 text-sm text-zinc-300">{data.submission_totals?.submissions??0} genuine submissions · {data.submission_totals?.approved??0} currently Approved · {data.submission_totals?.developers??0} distinct developers</p>
      {!data.submissions.length ? <p className="mt-4 text-zinc-400">No submissions in this period.</p> : <div className="mt-4 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Captured channel / labels / voluntary self-report</th><th>Submitted</th><th>Approved</th></tr></thead><tbody>{data.submissions.map((s, i) => <tr key={i} className="border-t border-white/10"><td className="break-words p-3"><p>{capturedChannel(s)}</p><p className="mt-1 text-xs text-zinc-400">Captured: {s.source} / {s.medium || "—"} / {s.campaign || "—"}</p><p className="mt-1 text-xs text-zinc-400">Voluntary discovery: {s.self_reported || "Not provided"}</p></td><td>{s.submissions}</td><td>{s.approved}</td></tr>)}</tbody></table></div>}
    </>}
  </article></main>;
}

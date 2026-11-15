"use client";
import { useEffect, useState } from "react";

type UserSummary = {
  registered_users: number; developers: number; testers: number; players: number;
  new_7_days: number; new_30_days: number;
};
const metrics: [keyof UserSummary, string][] = [
  ["registered_users", "Total registered users"], ["developers", "Developers"],
  ["testers", "Testers"], ["players", "Players"],
  ["new_7_days", "New registrations · 7 days"], ["new_30_days", "New registrations · 30 days"],
];
export default function PlatformUsers() {
  const [data, setData] = useState<UserSummary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      setError("");
      try {
        const response = await fetch("/api/admin/analytics/platform-users", { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Platform user metrics could not be loaded.");
        if (active) setData(result);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Platform user metrics could not be loaded."); }
    })();
    return () => { active = false; controller.abort(); };
  }, [retry]);
  return <section aria-labelledby="platform-users-heading" className="mt-7 min-w-0 rounded-xl border border-white/10 p-4 sm:p-5">
    <h2 id="platform-users-heading" className="text-xl font-semibold">Platform users</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Registered accounts, independent of visitor sessions or analytics permission. Each account counts once in the total and in every role it holds, so role counts can overlap. Roles come from current profiles. Registration windows use account creation time over the last 7 and 30 days.</p>
    {error ? <div role="alert" className="mt-4 text-sm text-amber-200"><p>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 rounded-lg border border-zinc-600 px-4 py-2 text-zinc-100">Retry platform users</button></div> : <>
      {!data && <p role="status" className="mt-4 text-sm text-zinc-400">Loading platform users…</p>}
      <dl aria-busy={!data} className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([key, label]) => <div key={key} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <dt className="break-words text-sm leading-6 text-zinc-400">{label}</dt>
          <dd className="mt-2 break-words text-3xl font-semibold tabular-nums">{data ? data[key].toLocaleString() : "—"}</dd>
        </div>)}
      </dl>
      {data?.registered_users === 0 && <p className="mt-4 text-sm text-zinc-400">No registered users yet.</p>}
    </>}
    <p className="mt-4 text-xs leading-5 text-zinc-500">Includes unconfirmed registrations; excludes deleted and anonymous guest accounts. An account without a profile still counts in the total.</p>
  </section>;
}

import {testerRankPresentation} from "@/lib/tester-rank";
type TesterProgress = { rank: number; xp: number; accepted: number; reviewed: number; passed: number };

export function TesterRankSummary({ data, ranks }: { data: TesterProgress; ranks: readonly string[] }) {
  const next = data.rank + 1;
  const nextXp = [0, 500, 2000, 5000][next];
  const nextAccepted = [0, 5, 20, 50][next];
  const acceptanceRate = data.reviewed ? data.passed / data.reviewed * 100 : 0;
  const qualityRequired = data.reviewed >= 5;
  const rank=testerRankPresentation(data.rank), nextRank=testerRankPresentation(next);
  if(!rank.known)return <section aria-label="Your tester rank" className="my-5 rounded-2xl border border-white/10 p-5"><p role="status" className={rank.text}>{rank.label}</p></section>;
  return <section aria-label="Your tester rank" className="my-5 overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.035] to-transparent">
    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div className="flex items-center gap-4">
        <div aria-hidden="true" className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${rank.badge}`}><svg width="34" height="38" viewBox="0 0 34 38" fill="none"><path d="M17 2 31 8v11c0 8-7 13-14 17C10 32 3 27 3 19V8L17 2Z" stroke="currentColor" strokeWidth="1.5"/><path d="m17 10 2.3 4.7 5.2.8-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.6 5.2-.8L17 10Z" fill="currentColor"/></svg></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Your tester rank</p><h2 className={`mt-1 text-xl font-semibold tracking-tight ${rank.text}`}>{rank.label}</h2><p className="mt-2 text-sm text-zinc-400"><span className="font-medium tabular-nums text-zinc-200">{data.xp.toLocaleString()} XP</span><span className="mx-2 text-zinc-700">/</span><span className="font-medium text-zinc-200">{data.accepted}</span> accepted test{data.accepted === 1 ? "" : "s"}</p></div>
      </div>
      {next < ranks.length ? <div className="space-y-3 lg:border-l lg:border-white/[0.07] lg:pl-6">
        <p className="text-sm text-zinc-400">Next rank <span className={`ml-1 rounded-full border px-2 py-0.5 font-semibold ${nextRank.badge}`}>{nextRank.label}</span></p>
        <div><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-zinc-400">XP</span><span className="tabular-nums text-zinc-300">{data.xp.toLocaleString()} / {nextXp.toLocaleString()}</span></div><div role="progressbar" aria-label={`XP toward ${nextRank.label}`} aria-valuemin={0} aria-valuemax={nextXp} aria-valuenow={Math.min(data.xp, nextXp)} className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-[#77f29b]" style={{width:`${Math.min(100,data.xp / nextXp * 100)}%`}}/></div></div>
        <div><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-zinc-400">Accepted tests</span><span className="tabular-nums text-zinc-300">{data.accepted} / {nextAccepted}</span></div><div role="progressbar" aria-label={`Accepted tests toward ${nextRank.label}`} aria-valuemin={0} aria-valuemax={nextAccepted} aria-valuenow={Math.min(data.accepted,nextAccepted)} className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-[#77f29b]/60" style={{width:`${Math.min(100,data.accepted / nextAccepted * 100)}%`}}/></div></div>
        <p className="text-xs text-zinc-500">{Math.max(0,nextXp-data.xp).toLocaleString()} XP and {Math.max(0,nextAccepted-data.accepted)} accepted tests to go{qualityRequired && acceptanceRate < 80 ? "; acceptance rate must also reach 80%." : "."}</p>
      </div> : <p className="text-sm text-zinc-400 lg:text-right">Highest rank achieved. Thank you for your contributions.</p>}
    </div>
    <details className="group border-t border-white/[0.06]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-zinc-500 sm:px-6 [&::-webkit-details-marker]:hidden"><span>How ranks work</span><span>{qualityRequired ? <span className={acceptanceRate < 80 ? "text-amber-300" : "text-zinc-400"}>{acceptanceRate < 80 ? "Below 80% acceptance" : `${Math.round(acceptanceRate)}% acceptance · acceptance requirement met`}</span> : "Earn XP by submitting useful feedback"}<span aria-hidden="true" className="ml-3 group-open:hidden">+</span><span aria-hidden="true" className="ml-3 hidden group-open:inline">−</span></span></summary>
      <div className="space-y-2 px-5 pb-5 text-xs leading-5 text-zinc-400 sm:px-6"><p>Both XP and accepted-test requirements must be met. Accepted tests here are quality-accepted reports awarded XP.</p><p>{data.reviewed < 5 ? `${data.reviewed} of your first 5 quality reviews are complete. The 80% acceptance requirement starts after five reviews.` : `${data.passed} of ${data.reviewed} quality-reviewed reports were accepted. Pending and unassessed legacy reports do not lower this rate.`}</p><p>Feedback quality percentage scores one report; acceptance rate counts accepted quality-reviewed reports. Partial positive-XP acceptance counts as one XP-awarded test, not several awards. Accepted 0-XP reports affect acceptance rate but not the XP-awarded-test requirement. Lower awards can mean more reports are needed to meet the unchanged XP threshold.</p><p>Existing XP is preserved. Purchases, developer Helpful votes, game ratings and playtime do not determine rank.</p></div>
    </details>
  </section>;
}

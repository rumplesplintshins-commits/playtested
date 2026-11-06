"use client";
import {useEffect,useState} from 'react';
type Metrics={published_games:number;approved_claims:number;historical_submission_records:number};
export default function DeveloperGameMetrics(){
 const [data,setData]=useState<Metrics|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;void fetch('/api/admin/analytics/games',{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw Error();const result:Metrics=await r.json();
  if(![result.published_games,result.approved_claims,result.historical_submission_records].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error();
  if(active){setData(result);setError(false);}
 }).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[retry]);
 return <section aria-labelledby="developer-game-metrics" className="my-6 rounded-xl border border-white/10 p-4 sm:p-5">
  <h2 id="developer-game-metrics" className="text-xl font-semibold">Developer-associated games</h2>
  <p className="mt-2 text-sm leading-6 text-zinc-400">Published games and approved ownership claims measure different things. These figures do not establish genuine original developer-submission activity.</p>
  {error?<p role="alert" className="mt-4">Game metrics unavailable. <button className="underline" onClick={()=>setRetry(n=>n+1)}>Retry game metrics</button></p>:!data?<p role="status" className="mt-4">Loading game metrics…</p>:<>
   <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
    <div className="min-w-0 rounded border border-white/10 p-4"><h3 className="break-words text-sm text-zinc-400">Currently published developer-associated games</h3><p className="mt-2 text-2xl font-semibold">{data.published_games.toLocaleString('en-GB')}</p><p className="mt-2 text-xs leading-5 text-zinc-400">Unique games with public Playtested profiles, across all NSFW categories. Excludes archived and explicitly hidden Test / Demo listings. Catalogue search and filters do not affect this total.</p></div>
    <div className="min-w-0 rounded border border-white/10 p-4"><h3 className="break-words text-sm text-zinc-400">Approved developer ownership claims</h3><p className="mt-2 text-2xl font-semibold">{data.approved_claims.toLocaleString('en-GB')}</p><p className="mt-2 text-xs leading-5 text-zinc-400">Approved claim requests, including historical approvals for archived games. Excludes explicit fixtures and unverified/manual ownership links. Multiple approved requests for one game count separately.</p></div>
   </div>
   <details className="mt-4 rounded border border-white/10 p-4"><summary className="cursor-pointer text-sm font-semibold">Diagnostic information</summary><h3 className="mt-3 text-sm text-zinc-400">Historical submission records</h3><p className="mt-2 text-2xl font-semibold">{data.historical_submission_records.toLocaleString('en-GB')}</p><p className="mt-2 text-xs leading-5 text-zinc-400">All stored submission records, including approved, rejected, pending, archived and test/demo records. Repeat submissions count separately. This is not a count of genuine developer submissions or unique games.</p></details>
  </>}
 </section>;
}
"use client";
import {useEffect,useRef,useState} from 'react';
import DisclosureControl from './DisclosureControl';
type Row={game_kind:string;game_id:string;title:string;clicks:number};
type Data={as_of?:string;total_clicks:number;total_games:number;games:Row[]};
function Metrics(){
 const snapshot=useRef<string|undefined>(undefined);
 const [selection,setSelection]=useState('10'),[data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();
 void(async()=>{setLoading(true);setError('');try{const limit=selection==='all'?100:Number(selection);let offset=0,asOf=snapshot.current;const rows:Row[]=[];let result:Data;
 do{const response=await fetch(`/api/admin/steam-referrals?limit=${limit}&offset=${offset}${asOf?`&as_of=${encodeURIComponent(asOf)}`:""}`,{cache:'no-store',signal:controller.signal});result=await response.json();if(!response.ok)throw Error('Steam referrals unavailable. Check administrator access and retry.');asOf=result.as_of;if(!controller.signal.aborted)snapshot.current=asOf;rows.push(...result.games);offset+=result.games.length;
 if(!result.games.length)break;
 }while(selection==='all'&&offset<result.total_games);
 if(!controller.signal.aborted)setData({...result!,games:rows});
 }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Steam referrals unavailable.');}finally{if(!controller.signal.aborted)setLoading(false);}})();return()=>controller.abort();},[selection,retry]);
 return <div className="space-y-4 border-t border-white/10 p-4 sm:p-5"><p className="text-sm text-zinc-400">Recorded clicks through to Steam in the last 90 days. Repeated deliberate clicks count separately. Optional analytics only: untracked clicks are unknown, not zero engagement. These are not confirmed visits or purchases.</p>
 <div className="grid gap-3 sm:grid-cols-2">{[['Total Steam clicks',data?.total_clicks],['Games with clicks',data?.total_games]].map(([label,value])=><div key={label} className="rounded-lg border border-white/10 p-4"><p className="text-sm text-zinc-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value==null?'—':Number(value).toLocaleString()}</p></div>)}</div>
 <div className="flex flex-wrap items-center gap-3 text-sm"><label htmlFor="steam-referral-results">Results</label><select id="steam-referral-results" value={selection} onChange={e=>setSelection(e.target.value)} className="rounded-lg border border-white/20 bg-[#101210] px-3 py-2"><option value="10">Top 10</option><option value="25">Top 25</option><option value="50">Top 50</option><option value="all">All</option></select></div>
 {loading&&<p role="status" className="text-sm text-zinc-400">Loading Steam referrals…</p>}{error&&<p role="alert" className="text-sm text-amber-200">{error} <button onClick={()=>{snapshot.current=undefined;setRetry(n=>n+1);}} className="underline">Retry</button></p>}
 {!loading&&!error&&data&&<>{data.games.length?<ol aria-label="Steam clicks by game" className="max-h-96 space-y-2 overflow-y-auto overscroll-contain">{data.games.map(row=><li key={`${row.game_kind}:${row.game_id}`} className="break-words rounded-lg border border-white/10 p-3 text-sm"><span className="font-medium">{row.title}</span> — {row.clicks.toLocaleString()} {row.clicks===1?'click':'clicks'} through to Steam.</li>)}</ol>:<p className="rounded-lg border border-white/10 p-4 text-sm text-zinc-400">No qualifying Steam clicks have been recorded. Links still work when analytics is declined.</p>}<p className="text-xs text-zinc-400">Showing {data.games.length} of {data.total_games} games</p></>}
 </div>;
}
export default function AdminSteamReferrals(){const [open,setOpen]=useState(false),[loaded,setLoaded]=useState(false);return <section className="my-6 min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-[#101210]"><button type="button" aria-expanded={open} aria-controls="steam-referrals-content" onClick={()=>{setOpen(!open);setLoaded(true);}} className="flex w-full items-center justify-between gap-4 p-5 text-left focus-visible:outline-2 focus-visible:outline-emerald-300"><span><span className="block text-lg font-semibold">Steam referrals</span><span className="mt-1 block text-sm text-zinc-400">Clicks from Tester Hub &rarr; Testing Activity</span></span><DisclosureControl expanded={open}/></button><div id="steam-referrals-content" hidden={!open}>{loaded&&<Metrics/>}</div></section>;}

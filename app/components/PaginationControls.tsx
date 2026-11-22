"use client";
import {pageCount,pageNumbers,safePage} from "@/lib/pagination";
export default function PaginationControls({page,pageSize,total,onPageChange,label}:{
 page:number;pageSize:number;total:number;onPageChange:(next:number)=>void;label:string;
}) {
 if(total<=pageSize)return null;
 const current=safePage(page,total,pageSize),pages=pageCount(total,pageSize);
 const first=(current-1)*pageSize+1,last=Math.min(current*pageSize,total);
 const change=(next:number)=>onPageChange(safePage(next,total,pageSize));
 return <nav aria-label={label+" pagination"} className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3 sm:px-4">
  <span className="text-xs text-zinc-400">Showing {first}–{last} of {total}</span>
  <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
   <button type="button" disabled={current===1} onClick={()=>change(current-1)} className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#77f29b]/45 disabled:cursor-not-allowed disabled:opacity-35">Previous</button>
   {pageNumbers(current,pages).map((n,index)=>n==="…"?<span key={"ellipsis-"+index} aria-hidden="true" className="px-1 text-xs text-zinc-500">…</span>:
    <button key={n} type="button" aria-label={"Page "+n} aria-current={n===current?"page":undefined} onClick={()=>change(n)} className={"min-w-7 rounded-md border px-2 py-1.5 text-xs font-semibold "+(n===current?"border-[#77f29b]/50 bg-[#77f29b]/10 text-[#77f29b]":"border-white/10 text-zinc-300 hover:border-white/30")}>{n}</button>)}
   <button type="button" disabled={current===pages} onClick={()=>change(current+1)} className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#77f29b]/45 disabled:cursor-not-allowed disabled:opacity-35">Next</button>
  </div>
 </nav>;
}

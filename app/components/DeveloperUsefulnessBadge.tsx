"use client";
export default function DeveloperUsefulnessBadge({value}:{value?:string|null}){
 const useful=value==='useful',negative=value==='not_useful';
 return <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-medium ${useful?'border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]':negative?'border-amber-200/20 bg-amber-200/5 text-amber-200/80':'border-white/15 text-zinc-400'}`}>{useful?'Developer marked useful':negative?'Developer marked not useful':'Not yet rated by developer'}</span>;
}

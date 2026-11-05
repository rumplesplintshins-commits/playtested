"use client";
import {useState} from 'react';
import {safeActivityImage} from '@/lib/testing-activity';
import DeveloperUsefulnessBadge from './DeveloperUsefulnessBadge';
export default function TestingActivityHeader({title,developer,image,usefulness,status}:{title:string;developer?:string|null;image?:string|null;usefulness?:string|null;status:string}){
 const [failed,setFailed]=useState<string|null>(null),src=safeActivityImage(image);
 return <div className="flex min-w-0 flex-col gap-3 sm:flex-row"><div className="w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">{src&&failed!==src?<img ref={node=>{if(node?.complete&&node.currentSrc&&node.naturalWidth===0)setFailed(src);}} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(src)} className="aspect-video w-full object-contain"/>:<span className="flex aspect-video items-center justify-center px-2 text-center text-xs text-zinc-500">Artwork unavailable</span>}</div><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{title}</h3>{developer&&<p className="mt-1 break-words text-sm text-zinc-400">By {developer}</p>}<div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-zinc-300">{status}</span><DeveloperUsefulnessBadge value={usefulness}/></div></div></div>;
}

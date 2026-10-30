"use client";

export default function DisclosureHeading({title,expanded,controls,onToggle}:{title:string;expanded:boolean;controls:string;onToggle:()=>void}){
 return <h3><button type="button" aria-label={`${expanded?"Collapse":"Expand"} ${title}`} aria-expanded={expanded} aria-controls={controls} onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-4 rounded-lg py-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><span>{title}</span><span aria-hidden="true" className="px-3 text-xl">{expanded?"\u2212":"+"}</span></button></h3>;
}

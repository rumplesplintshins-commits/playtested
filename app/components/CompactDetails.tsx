"use client";
import {useId,useState,type ReactNode} from "react";
import DisclosureControl from "./DisclosureControl";
export default function CompactDetails({title,children,defaultOpen=false}:{title:ReactNode;children:ReactNode;defaultOpen?:boolean}){
 const id=useId(),[open,setOpen]=useState(defaultOpen);
 return <details open={open} onToggle={e=>setOpen(e.currentTarget.open)} className="rounded-xl border border-white/10"><summary aria-expanded={open} aria-controls={id} className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 p-4 focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="min-w-0">{title}</span><DisclosureControl expanded={open}/></summary><div id={id}>{children}</div></details>;
}

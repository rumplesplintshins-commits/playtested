"use client";

import {useEffect,useRef,useState} from "react";

const OPTIONS=[
  {value:"",label:"Not specified",free:true},
  {value:"15",label:"15 minutes",free:true},
  {value:"30",label:"30 minutes",free:true},
  {value:"45",label:"45 minutes",free:false},
  {value:"60",label:"1 hour",free:false},
  {value:"90",label:"1 hour 30 minutes",free:false},
  {value:"120",label:"2 hours",free:false},
  {value:"180",label:"3+ hours",free:false},
] as const;

type Props={value:string;onChange:(value:string)=>void;isPro:boolean;className?:string};

export default function DurationPicker({value,onChange,isPro,className=""}:Props){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const selected=OPTIONS.find(option=>option.value===value)??OPTIONS[0];

  useEffect(()=>{
    const close=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("mousedown",close);
    document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape);};
  },[]);

  return <div ref={root} className={`relative ${className}`}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(current=>!current)} className="flex w-full items-center justify-between rounded-lg border border-[#77f29b] bg-[#090b0a] px-3 py-2 text-left text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-emerald-300">
      <span>{selected.label}</span><span aria-hidden className="ml-3 text-zinc-300">⌄</span>
    </button>
    {open&&<div role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-white/20 bg-[#111412] py-1 shadow-2xl">
      {OPTIONS.map(option=>{
        const locked=!isPro&&!option.free;
        const active=option.value===value;
        return <button key={option.value||"unspecified"} type="button" role="option" aria-selected={active} aria-disabled={locked} disabled={locked} onClick={()=>{if(locked)return;onChange(option.value);setOpen(false);}} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${locked?"cursor-not-allowed text-zinc-600":"cursor-pointer text-white hover:bg-white/[0.06]"} ${active&&!locked?"bg-[#77f29b]/10 text-[#b9f9ca]":""}`}>
          <span>{option.label}</span>{locked&&<span className="ml-3 text-[11px] text-zinc-600">Locked</span>}
        </button>;
      })}
    </div>}
  </div>;
}

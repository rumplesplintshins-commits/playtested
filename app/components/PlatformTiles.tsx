"use client";
import {useEffect,useRef,useState,type KeyboardEvent} from "react";
import {PLATFORMS,type Platform,PLATFORM_INFO} from "@/lib/platforms";

function PlatformTile({platform,selected,onSelect,disabled}:{platform:Platform;selected:boolean;onSelect:(platform:Platform)=>void;disabled?:boolean}){
  const info=PLATFORM_INFO[platform];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={info.label}
      disabled={disabled}
      onClick={()=>onSelect(platform)}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition ${selected
        ? "border-[#77f29b] bg-[#77f29b]/10 text-[#77f29b]"
        : "border-white/10 bg-[#101311] text-zinc-300 hover:border-white/25 hover:text-white"
      }`}
    >
      <span className="text-sm font-semibold">{info.label}</span>
      {info.icon}
    </button>
  );
}

export default function PlatformTiles({value,onChange,disabled}:{value:Platform|null;onChange:(platform:Platform)=>void;disabled?:boolean}){
  const groupRef=useRef<HTMLDivElement>(null);
  const [focusIndex,setFocusIndex]=useState(PLATFORMS.indexOf(value??PLATFORMS[0]));
  function focusTile(index:number){const tiles=groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')??[];tiles[index]?.focus({preventScroll:true});}
  function handleKeyDown(event:KeyboardEvent<HTMLDivElement>){
    const tiles=groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')??[];
    const current=focusIndex;let next=current;
    if(event.key==="ArrowRight"||event.key==="ArrowDown"){event.preventDefault();next=(current+1)%tiles.length;}
    else if(event.key==="ArrowLeft"||event.key==="ArrowUp"){event.preventDefault();next=(current-1+tiles.length)%tiles.length;}
    else if(event.key==="Home"){event.preventDefault();next=0;}
    else if(event.key==="End"){event.preventDefault();next=tiles.length-1;}
    else{return;}
    setFocusIndex(next);focusTile(next);
  }
  useEffect(()=>{focusTile(focusIndex);},[focusIndex]);
  return (
    <div ref={groupRef} role="radiogroup" aria-label="Game platform" onKeyDown={handleKeyDown} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {PLATFORMS.map((platform)=>(<PlatformTile key={platform} platform={platform} selected={(value??null)===platform} onSelect={onChange} disabled={disabled}/>))}
    </div>
  );
}

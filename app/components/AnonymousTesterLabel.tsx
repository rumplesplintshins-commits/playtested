"use client";
import {useEffect,useState} from "react";
import {subscribeFeedbackIdentity,type FeedbackIdentity} from "@/lib/feedback-identities";
import {testerRankPresentation} from "@/lib/tester-rank";
export default function AnonymousTesterLabel({testId,compact=false,genres}:{testId:string;compact?:boolean;rankOnly?:boolean;genres?:string[]}){
 const [identity,setIdentity]=useState<FeedbackIdentity|null>(null);
 useEffect(()=>subscribeFeedbackIdentity(testId,setIdentity),[testId]);
 const rank=testerRankPresentation(identity?.current_rank);
 const label=(rank.known?rank.label:"Rank unavailable")+" (current)";
 return <span className={compact?rank.text:"font-semibold "+rank.text} title="Current tester rank; no public tester identifier is displayed">{label}
  {genres && genres.length>0 && <span className="ml-2 flex flex-wrap gap-1">{genres.map((g)=><span key={g} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{g}</span>)}</span>}</span>;
}

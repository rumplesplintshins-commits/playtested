"use client";
import {useEffect,useState} from "react";
import {subscribeFeedbackIdentity,type FeedbackIdentity} from "@/lib/feedback-identities";
import {testerRankPresentation} from "@/lib/tester-rank";
export default function AnonymousTesterLabel({testId,compact=false}:{testId:string;compact?:boolean;rankOnly?:boolean}){
 const [identity,setIdentity]=useState<FeedbackIdentity|null>(null);
 useEffect(()=>subscribeFeedbackIdentity(testId,setIdentity),[testId]);
 const rank=testerRankPresentation(identity?.current_rank);
 const label=(rank.known?rank.label:"Rank unavailable")+" (current)";
 return <span className={compact?rank.text:"font-semibold "+rank.text} title="Current tester rank; no public tester identifier is displayed">{label}</span>;
}

"use client";
import {useEffect,useState} from "react";
import {subscribeFeedbackIdentity,type FeedbackIdentity} from "@/lib/feedback-identities";
import {testerRankPresentation} from "@/lib/tester-rank";
export default function AnonymousTesterLabel({testId,compact=false,rankOnly=false}:{testId:string;number?:number;compact?:boolean;rankOnly?:boolean}){
 const [identity,setIdentity]=useState<FeedbackIdentity|null>(null);
 useEffect(()=>subscribeFeedbackIdentity(testId,setIdentity),[testId]);
 const rank=testerRankPresentation(identity?.current_rank);
 const label=rankOnly?(rank.known?rank.label:"Rank unavailable")+" (current)":identity?.public_number?(rank.known?rank.label:"Tester")+" #"+identity.public_number:"Tester profile unavailable";
 return <span className={compact?rank.text:"font-semibold "+rank.text} title="Pseudonymous tester identifier; rank reflects current status, not historical rank">{label}</span>;
}

"use client";
import {useEffect,useState} from "react";

export const BUILD_RECEPTION_EVENT="playtested:build-reception";
export type BuildReceptionSnapshot={
  playtestId:string; releaseLabel:string; playtestStatus:string; targetTesters:number;
  acceptedTests:number; ratedTests:number; overallScore:number|null;
  recommendPercent:number|null; continuePercent:number|null;
  state:"loading"|"ready"|"error";
};
type Build={id:string;releaseLabel:string|null;status:string;targetTesters:number};
type Feedback={overall_score:number|null;recommend_game:string|null;continue_playing:string|null};
const percent=(answers:(string|null)[])=>{
  const valid=answers.filter((a):a is string=>a!==null);
  return valid.length?Math.round(valid.filter(a=>["definitely","probably"].includes(a.trim().toLowerCase())).length*100/valid.length):null;
};
export function receptionFromReports(build:Build,rows:Feedback[]):BuildReceptionSnapshot{
  const scored=rows.map(r=>r.overall_score).filter((n):n is number=>typeof n==="number"&&Number.isFinite(n));
  return {playtestId:build.id,releaseLabel:build.releaseLabel?.trim()||"Unlabelled build",
    playtestStatus:build.status,targetTesters:build.targetTesters,acceptedTests:rows.length,ratedTests:scored.length,
    overallScore:scored.length?Math.round(scored.reduce((a,b)=>a+b,0)*10/scored.length)/10:null,
    recommendPercent:percent(rows.map(r=>r.recommend_game)),continuePercent:percent(rows.map(r=>r.continue_playing)),state:"ready"};
}
export function emitBuildReception(snapshot:BuildReceptionSnapshot){
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent(BUILD_RECEPTION_EVENT,{detail:snapshot}));
}
function category(r:BuildReceptionSnapshot){
  if(r.acceptedTests<5||r.ratedTests<5)return "Early results";
  if((r.overallScore??0)>=8&&(r.recommendPercent??0)>=70&&(r.continuePercent??0)>=70)return "Excellent reception";
  if((r.overallScore??0)>=6.5&&(r.recommendPercent??0)>=60&&(r.continuePercent??0)>=60)return "Positive reception";
  if((r.overallScore??0)<5&&(r.recommendPercent??0)<40&&(r.continuePercent??0)<40)return "Poor reception";
  return "Mixed reception";
}
function tone(v:string){
  if(v==="Excellent reception")return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  if(v==="Positive reception")return "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200";
  if(v==="Poor reception")return "border-red-400/30 bg-red-400/10 text-red-300";
  if(v==="Mixed reception")return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return "border-sky-300/25 bg-sky-300/[0.08] text-sky-200";
}
export default function BuildReceptionSummary({campaignIds,currentBuild,initialReception}:{
  campaignIds:string[];currentBuild:Build;initialReception?:Omit<BuildReceptionSnapshot,"state">|null;
}){
  const [view,setView]=useState<BuildReceptionSnapshot>(()=>{
    return initialReception?.playtestId===currentBuild.id
      ? {...initialReception,state:"ready"}
      : {...receptionFromReports(currentBuild,[]),state:"loading"};
  });
  useEffect(()=>{
    const onBuild=(event:Event)=>{
      const value=(event as CustomEvent<BuildReceptionSnapshot>).detail;
      if(value&&campaignIds.includes(value.playtestId))setView(value);
    };
    window.addEventListener(BUILD_RECEPTION_EVENT,onBuild);
    return()=>window.removeEventListener(BUILD_RECEPTION_EVENT,onBuild);
  },[campaignIds]);
  const group=category(view);
  return <div className="mt-4 min-w-0 space-y-2" aria-live="polite">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Selected build</span>
      <span className="max-w-full break-words rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-semibold text-zinc-200">{view.releaseLabel}</span>
      <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-400">{view.playtestId===currentBuild.id?"Current":"Historical"} round</span>
    </div>
    {view.state==="loading"
      ? <p className="text-xs text-zinc-500">Loading results for this build…</p>
      : view.state==="error"
        ? <p className="text-xs text-amber-200">Results unavailable for this build. Use Refresh results below to retry.</p>
        : <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={"rounded-md border px-2.5 py-1 text-xs font-semibold "+tone(group)}>{group}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-200">{view.overallScore===null?"No score yet":view.overallScore.toFixed(1)+"/10"}</span>
            <span className="text-xs text-zinc-500">{view.acceptedTests} accepted{view.targetTesters>0?" / "+view.targetTesters+" target":""}</span>
            {view.recommendPercent!==null&&<span className="text-xs text-zinc-500">· {view.recommendPercent}% recommend</span>}
          </div>}
  </div>;
}

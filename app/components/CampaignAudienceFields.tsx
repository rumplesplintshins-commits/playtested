"use client";
import {useEffect,useState,useId} from "react";
import {createClient} from "@/lib/supabase";
import { GAME_GENRES } from "@/lib/genres";
import {RANKS,testerRankPresentation} from "@/lib/tester-rank";
import {useDeveloperPlan} from "./DeveloperPlan";
export type AudienceAvailability = {key:string;available:boolean;message:string};
export function audienceSelectionKey(rank:number,genre:string,restricted:boolean){return JSON.stringify([rank,genre,restricted]);}
export function CampaignAudienceFields({ minimumRank, setMinimumRank, genre, setGenre, restricted, setRestricted, onAvailability, enabled=true,publishedTargeting }: {
    enabled?: boolean;
    publishedTargeting?:[number,string,boolean];
    onAvailability?: (value:AudienceAvailability)=>void;
    minimumRank: number;
    setMinimumRank: (v: number) => void;
    genre: string;
    setGenre: (v: string) => void;
    restricted: boolean;
    setRestricted: (v: boolean) => void;
}) {
    const {data:plan,loading:planLoading}=useDeveloperPlan();
    const description=useId();
    const maximumRank=plan?.rank_targeting?3:(publishedTargeting?.[0]??0);
    const canKeepMatch=!!publishedTargeting?.[2];
    const key=audienceSelectionKey(minimumRank,genre,restricted);
    const [result,setResult]=useState<AudienceAvailability|null>(null);
    const [retry,setRetry]=useState(0);
    useEffect(()=>{
      if(!enabled)return;
      let active=true;
      const timeout=setTimeout(()=>{
        void (async()=>{
          let value:AudienceAvailability;
          try {
            const {data,error}=await createClient().rpc("get_testing_audience_availability",{p_minimum_rank:minimumRank,p_testing_genre:genre||null,p_genre_restricted:restricted});
            value={key,available:!error&&data===true,message:error?"Tester availability could not be checked. Retry before publishing.":data===true?"Registered testers match these requirements. Participation is not guaranteed.":"No registered testers match these requirements. Lower the minimum rank or broaden the genre audience before publishing."};
          }catch{value={key,available:false,message:"Tester availability could not be checked. Retry before publishing."};}
          if(active){setResult(value);onAvailability?.(value);}
        })();
      },200);
      return()=>{active=false;clearTimeout(timeout);};
    },[key,minimumRank,genre,restricted,onAvailability,retry,enabled]);
    if(!enabled)return null;
    return <fieldset aria-describedby={description} className="my-4 space-y-3 rounded-xl border border-white/10 p-4"><legend>Tester Hub eligibility</legend>
 <p id={description} className="text-xs leading-5 text-zinc-400">{planLoading?"Checking plan targeting...":!plan?"Plan targeting unavailable. Refresh your plan before changing advanced settings.":plan.rank_targeting?"Pro targeting: choose a minimum rank or require a genre-interest match.":publishedTargeting?"Free: keep or lower this published round's existing restrictions. You cannot add or strengthen Pro targeting. Remove a required match before changing its genre.":"Free: Bronze Tester (all ranks qualify) and any genre interests. Pro lets you limit participation to Silver Tester and above, Gold Tester and above, or Platinum Tester, and require matching genre interests."}</p>
 <label className="block">Minimum tester rank <select className="mt-1 block w-full max-w-full rounded border border-white/15 bg-black p-2" disabled={!plan} value={minimumRank} onChange={e => setMinimumRank(Number(e.target.value))}>{RANKS.map((r, i) => <option key={r} value={i} disabled={i>maximumRank}>{testerRankPresentation(i).label}{i === 0 ? " — all ranks qualify" : " and above"}</option>)}</select></label>
 <label className="block">Testing genre <select className="mt-1 block w-full max-w-full rounded border border-white/15 bg-black p-2" value={genre} onChange={e => setGenre(e.target.value)}><option value="">Use the game&apos;s genre</option>{genre && !GAME_GENRES.some(g => g === genre) && <option value={genre}>Existing genre (unchanged)</option>}{GAME_GENRES.map(g => <option key={g} value={g} disabled={restricted && g === "Other"}>{g}</option>)}</select></label>
 <label className="block">Audience <select className="mt-1 block w-full max-w-full rounded border border-white/15 bg-black p-2" disabled={!plan} value={restricted ? "match" : "any"} onChange={e => setRestricted(e.target.value === "match")}><option value="any">Any genre interests</option><option value="match" disabled={!plan?.genre_targeting&&!canKeepMatch}>Require a selected genre match (Pro)</option></select></label>
 <p className="text-sm text-zinc-400">Restricting genres reduces the eligible tester pool. Preferences are self-declared interests. Higher ranks qualify for lower-rank campaigns; every rank must meet a mandatory genre match. Existing claims remain usable.</p>
 {enabled && <div role="status" className={`rounded-lg border p-3 text-sm ${result?.key===key&&!result.available?"border-amber-300/30 text-amber-100":"border-white/10 text-zinc-400"}`}>
   {result?.key===key?result.message:"Checking registered tester availability…"}
   {result?.key===key&&!result.available&&<button type="button" onClick={()=>setRetry(value=>value+1)} className="ml-2 rounded border border-white/20 px-3 py-2 underline">Check again</button>}
   <p className="mt-2 text-xs text-zinc-400">This checks rank and declared interests, not who is online or free to claim. Drafts can still be saved.</p>
 </div>}
 </fieldset>;
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AI_CLASSIFICATIONS } from "@/lib/submission-completeness";
import {listingUpdates,listingNotice} from "@/lib/listing-updates";
import {publicIntentCounts,type IntentCounts} from "@/lib/intent-counts";
import IntentSummary from "./IntentSummary";
import {publicLinkedImportedIds,steamStoreUrl} from "@/lib/public-profile-links";

type VerificationStatus = "Verified" | "Assessed" | "Not yet verified";

type CatalogueGame = {
  key: string;
  slug: string;
  title: string;
  developer: string;
  genre: string;
  description: string;
  image: string;
  aiType: string;
  score: number;
  gameLink?: string;
  steamAppId?: string;
  isSubmission: boolean;
  isImportedSteam?: boolean;
  hasPlaytestedProfile?: boolean;
  isNsfw: boolean;
  verificationStatus: VerificationStatus | null;
  submittedAt?: string;
  communityReception: CommunityReception | null;
  recruiting: boolean;
  listingNotice: string;
  assessmentUnavailable: boolean;
  recommendationCounts?:IntentCounts;
};

type CatalogueRpcRow = {
  source_type: "approved" | "steam";
  game_id: string;
  steam_app_id: string | null;
  title: string;
  developer_name: string;
  genre: string;
  description: string;
  image_url: string;
  game_link: string;
  ai_type: string;
  verification_status: VerificationStatus;
  quality_score: number | string | null;
  submitted_at: string | null;
  is_nsfw: boolean;
  has_playtested_profile: boolean;
  total_count: number | string;
};

type ReceptionStatus = "Early results" | "Excellent reception" | "Positive reception" | "Mixed reception" | "Poor reception";
type CommunityReceptionRow = { imported_game_id:string|null; approved_game_id:string|null; submission_id:string|null; game_title:string; accepted_test_count:number|string; rated_test_count:number|string; average_overall_score:number|string|null; average_gameplay_score:number|string|null; average_performance_score:number|string|null; recommend_positive_count:number|string; recommend_answered_count:number|string; recommend_positive_percent:number|string|null; continue_positive_count:number|string; continue_answered_count:number|string; continue_positive_percent:number|string|null; bug_report_count:number|string; average_hours_played:number|string|null; reception_status:ReceptionStatus; };
type CommunityReception = { acceptedTestCount:number; ratedTestCount:number; averageOverallScore:number|null; recommendPositivePercent:number|null; continuePositivePercent:number|null; receptionStatus:ReceptionStatus; };

const AI_PUBLIC_LABELS: Record<string,string>={"AI-assisted: Code only":"AI Code Only","AI-assisted: Content only":"AI Content Only","AI-assisted: Code and content":"AI Code & Content","No AI used":"No AI disclosed","No AI disclosed":"No AI disclosed"};
const aiTypes=["All AI types",...AI_CLASSIFICATIONS,"AI use unknown"];
function publicAiLabel(value:string){return AI_PUBLIC_LABELS[value]??"AI Use Unknown";}
const genres=["All genres","Action","Adventure","Casual","RPG","Strategy","Simulation","Racing","Sports"];
const sortOptions=["Featured","Recently added","Highest rated","Title A-Z"];
const verificationOptions=["All verification statuses","Verified","Assessed","Not yet verified","Steam listings"];
const PAGE_SIZE=12;
function normalizeSteamAppId(value:unknown):string{return String(value??"").trim();}

function VerificationBadge({status}:{status:VerificationStatus|null}){
  if(status!=="Verified"&&status!=="Assessed") return null;
  return <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Assessed</span>;
}
function ReceptionBadge({status}:{status:ReceptionStatus}){const styles:Record<ReceptionStatus,string>={"Early results":"border-amber-400/35 bg-amber-400/10 text-amber-200","Excellent reception":"border-emerald-300/50 bg-emerald-300/15 text-emerald-200","Positive reception":"border-emerald-400/35 bg-emerald-400/10 text-emerald-300","Mixed reception":"border-sky-400/35 bg-sky-400/10 text-sky-200","Poor reception":"border-red-400/35 bg-red-400/10 text-red-200"};return <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}>{status}</span>;}
function GenreBadge({genre}:{genre:string}){return <span className="inline-flex w-fit rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 sm:text-sm">{genre}</span>;}

function GameCardContent({game,href,compact}:{game:CatalogueGame;href:string|undefined;compact:boolean}){
 const [failedImage,setFailedImage]=useState<string|null>(null);
 const rawAi=game.aiType.trim();
 const disclosure=(AI_CLASSIFICATIONS as readonly string[]).includes(rawAi)||rawAi==="No AI disclosed"?rawAi:"AI use unknown";
 const disclosureLabel=publicAiLabel(disclosure);
 const disclosureStyle=disclosure==="AI-assisted: Content only"||disclosure==="AI-assisted: Code and content"?"border-violet-300/30 bg-violet-300/10 text-violet-200":disclosure==="AI-assisted: Code only"?"border-sky-300/30 bg-sky-300/10 text-sky-200":"border-white/25 bg-white/5 text-slate-200";
 return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151815] break-words transition hover:border-emerald-400/30 [overflow-wrap:anywhere]">
  <a href={href} target={game.isImportedSteam&&!game.hasPlaytestedProfile?"_blank":undefined} rel={game.isImportedSteam&&!game.hasPlaytestedProfile?"noopener noreferrer":undefined} className="block aspect-video w-full overflow-hidden bg-[#202520] text-left" aria-label={`View ${game.title} details`}>
   {game.image&&failedImage!==game.image?<img src={game.image} alt={game.title} loading="lazy" onError={()=>setFailedImage(game.image)} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-[#253b2b] to-[#151815] text-sm text-white/45">Game image</div>}
  </a>
  <div className={`flex flex-1 flex-col ${compact?"gap-3 p-4":"gap-4 p-5"}`}>
   <div className="flex flex-wrap items-center justify-between gap-2"><GenreBadge genre={game.genre}/></div>
   <a href={href} target={game.isImportedSteam&&!game.hasPlaytestedProfile?"_blank":undefined} rel={game.isImportedSteam&&!game.hasPlaytestedProfile?"noopener noreferrer":undefined} className="text-left"><h3 className="text-lg font-semibold text-white hover:text-emerald-300">{game.title}</h3></a>
   <p className="text-sm text-white/70">By {game.developer||"Developer not listed"}</p>
   <div className="flex flex-wrap items-center gap-2">
    {game.listingNotice?<span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">{game.listingNotice}</span>:<VerificationBadge status={game.verificationStatus}/>} 
    <span title="AI-use disclosure; not independent verification" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${disclosureStyle}`}>{disclosureLabel}</span>
    {game.recruiting&&<span tabIndex={0} aria-label="Recruiting testers. An active playtest has places available. Eligibility requirements apply." title="An active playtest has places available. Eligibility requirements apply." className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><span aria-hidden="true">◎</span>Recruiting testers</span>}
   </div>
   {game.description?<details className="group text-sm leading-6 text-white/75"><summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="line-clamp-3 group-open:hidden">{game.description}</span><span className="text-xs text-emerald-300 group-open:hidden">Read full description</span><span className="hidden text-xs text-emerald-300 group-open:inline">Hide full description</span></summary><p className="mt-2">{game.description}</p></details>:<p className="text-sm text-white/65">No description provided.</p>}
   <div className="rounded-lg border border-white/10 bg-black/15 p-3">{game.communityReception&&game.communityReception.ratedTestCount>0&&game.communityReception.averageOverallScore!==null?<div className="space-y-2.5"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Community reception</p><p className="mt-1 text-lg font-extrabold text-white">{game.communityReception.averageOverallScore.toFixed(1)}<span className="text-sm font-semibold text-white/45">/10</span></p></div><ReceptionBadge status={game.communityReception.receptionStatus}/></div><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55"><span>{game.communityReception.ratedTestCount.toLocaleString()} {game.communityReception.ratedTestCount===1?"rating":"ratings"}</span><span>Would recommend <IntentSummary counts={game.recommendationCounts}/></span></div></div>:<div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Community reception</p><p className="mt-1 text-sm font-semibold text-white/60">Not community tested yet</p></div>}</div>
   <div className="mt-auto space-y-3 pt-2"><a href={href} target={game.isImportedSteam&&!game.hasPlaytestedProfile?"_blank":undefined} rel={game.isImportedSteam&&!game.hasPlaytestedProfile?"noopener noreferrer":undefined} className="block w-full rounded-md bg-emerald-400 px-3 py-2 text-center text-sm font-semibold text-black hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">{game.isImportedSteam&&!game.hasPlaytestedProfile?"View Steam page ↗":"View game details"}</a></div>
  </div>
 </article>;
}
function gameHref(game:CatalogueGame){return game.isImportedSteam&&!game.hasPlaytestedProfile?game.gameLink:game.isSubmission?`/submissions/${game.key}`:`/games/${game.slug}`;}

export default function GameCatalogue(){
 const [density,setDensity]=useState<"compact"|"comfortable">("compact"); const [search,setSearch]=useState(""); const [genre,setGenre]=useState("All genres"); const [verificationFilter,setVerificationFilter]=useState("All verification statuses"); const [aiType,setAiType]=useState("All AI types"); const [includeNsfw,setIncludeNsfw]=useState(false); const [sort,setSort]=useState("Featured"); const [page,setPage]=useState(1); const [games,setGames]=useState<CatalogueGame[]>([]); const [totalCount,setTotalCount]=useState(0); const [loaded,setLoaded]=useState(false); const [loadError,setLoadError]=useState(false);
 useEffect(()=>{let cancelled=false; async function loadGames(){const supabase=createClient();setLoaded(false);setLoadError(false);const [catalogueResult,receptionResult]=await Promise.all([supabase.rpc("get_public_catalogue",{p_page:page,p_page_size:PAGE_SIZE,p_search:search.trim(),p_genre:genre,p_verification:verificationFilter,p_ai_type:aiType,p_include_nsfw:includeNsfw,p_sort:sort}),supabase.rpc("get_game_community_reception")]);if(cancelled)return;if(catalogueResult.error){console.error("Could not load public catalogue:",catalogueResult.error);setGames([]);setTotalCount(0);setLoadError(true);setLoaded(true);return;}if(receptionResult.error)console.error("Could not load community reception:",receptionResult.error);const rows=(catalogueResult.data??[]) as CatalogueRpcRow[];const publicLinks=await publicLinkedImportedIds(rows.filter(row=>row.source_type==="steam").map(row=>row.game_id));const updates=await listingUpdates(rows.map(row=>row.game_id));const notices=new Map<string,string>();for(const row of rows){const notice=listingNotice(row.game_id,updates);if(notice)notices.set(row.game_id,notice);}const receptionRows=(receptionResult.data??[]) as CommunityReceptionRow[];const receptionByKey=new Map<string,CommunityReception>();for(const row of receptionRows){const reception:CommunityReception={acceptedTestCount:Number(row.accepted_test_count)||0,ratedTestCount:Number(row.rated_test_count)||0,averageOverallScore:row.average_overall_score===null?null:Number(row.average_overall_score),recommendPositivePercent:row.recommend_positive_percent===null?null:Number(row.recommend_positive_percent),continuePositivePercent:row.continue_positive_percent===null?null:Number(row.continue_positive_percent),receptionStatus:row.reception_status};for(const key of [row.imported_game_id,row.approved_game_id,row.submission_id])if(key)receptionByKey.set(key,reception);}const mapped:CatalogueGame[]=rows.map(row=>({key:row.game_id,slug:row.game_id,title:row.title,developer:row.developer_name,genre:row.genre,description:row.description,image:row.image_url,aiType:row.ai_type,score:Number(row.quality_score)||0,gameLink:row.source_type==="steam"?steamStoreUrl(row.steam_app_id)||row.game_link:row.game_link,steamAppId:normalizeSteamAppId(row.steam_app_id)||undefined,isSubmission:row.source_type==="approved",isImportedSteam:row.source_type==="steam",hasPlaytestedProfile:row.has_playtested_profile||publicLinks.has(row.game_id),isNsfw:row.is_nsfw,verificationStatus:row.verification_status??null,submittedAt:row.submitted_at??undefined,communityReception:receptionByKey.get(row.game_id)??null,recruiting:false,listingNotice:notices.get(row.game_id)??"",assessmentUnavailable:false}));const counts=await publicIntentCounts(mapped.map(game=>game.key));for(const game of mapped)game.recommendationCounts=counts.get(game.key);if(!cancelled){setGames(mapped);setTotalCount(rows.length?Number(rows[0].total_count)||0:0);setLoaded(true);}}loadGames();return()=>{cancelled=true};},[search,genre,verificationFilter,aiType,includeNsfw,sort,page]);
 useEffect(()=>{setPage(1)},[search,genre,verificationFilter,aiType,includeNsfw,sort]);
 const totalPages=Math.max(1,Math.ceil(totalCount/PAGE_SIZE));
 return <div className="space-y-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm text-white/60">{totalCount.toLocaleString()} games found</p></div><div className="flex gap-2"><button type="button" onClick={()=>setDensity("compact")} className={`rounded-md border px-3 py-2 text-xs font-semibold ${density==="compact"?"border-emerald-300 bg-emerald-300/10 text-emerald-200":"border-white/20 text-white/70"}`}>Compact</button><button type="button" onClick={()=>setDensity("comfortable")} className={`rounded-md border px-3 py-2 text-xs font-semibold ${density==="comfortable"?"border-emerald-300 bg-emerald-300/10 text-emerald-200":"border-white/20 text-white/70"}`}>Comfortable</button></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search games" className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm text-white xl:col-span-2"/><select value={genre} onChange={e=>setGenre(e.target.value)} className="rounded-md border border-white/15 bg-[#151815] px-3 py-2 text-sm text-white">{genres.map(value=><option key={value}>{value}</option>)}</select><select value={aiType} onChange={e=>setAiType(e.target.value)} className="rounded-md border border-white/15 bg-[#151815] px-3 py-2 text-sm text-white">{aiTypes.map(value=><option key={value} value={value}>{value==="AI use unknown"?"AI Use Unknown":publicAiLabel(value)==="AI Use Unknown"?value:publicAiLabel(value)}</option>)}</select><select value={verificationFilter} onChange={e=>setVerificationFilter(e.target.value)} className="rounded-md border border-white/15 bg-[#151815] px-3 py-2 text-sm text-white">{verificationOptions.map(value=><option key={value}>{value}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-md border border-white/15 bg-[#151815] px-3 py-2 text-sm text-white">{sortOptions.map(value=><option key={value}>{value}</option>)}</select></div><label className="flex w-fit items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={includeNsfw} onChange={e=>setIncludeNsfw(e.target.checked)}/>Include NSFW</label>{loadError?<div className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-200">Could not load the catalogue right now.</div>:!loaded?<div className="py-12 text-center text-white/55">Loading games...</div>:games.length===0?<div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/55">No games match these filters.</div>:<div className={`grid gap-4 ${density==="compact"?"sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6":"sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>{games.map(game=><GameCardContent key={`${game.isSubmission?"submission":"steam"}-${game.key}`} game={game} href={gameHref(game)} compact={density==="compact"}/>)}</div>}<div className="flex items-center justify-between border-t border-white/10 pt-4"><button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-30">Previous</button><span className="text-sm text-white/55">Page {page} of {totalPages}</span><button type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-30">Next</button></div></div>;
}

"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {DeveloperPlanProvider,DeveloperPlanSummary} from "./DeveloperPlan";
import {useRouter} from "next/navigation";

export type WorkspaceItem={missingCount?:number;correctionHref?:string;id:string;title:string;status:string;image?:string|null;context?:string;feedback?:string;active?:boolean;hasPlaytest?:boolean;hasFeedback?:boolean;content:ReactNode};
type Tab="games"|"submissions"|"claims"|"diagnostics";
type Selection={tab:Tab;filter:string;search:string;item:string};
const labels={games:"My games",submissions:"Game submissions",claims:"Developer claims",diagnostics:"Diagnostics"};
const filters={games:["All","Active playtest","Current Hub feedback"],submissions:["All","Pending Review","Approved","Needs More Information","Rejected"],claims:["All","Pending","Approved","Needs More Information","Rejected"],diagnostics:["All"]};
function readSelection():Selection{
 const query=new URLSearchParams(window.location.search);const value=query.get("tab");const tab:Tab=value==="claims"||value==="submissions"||value==="diagnostics"?value:"games";
 return {tab,filter:(tab==="diagnostics"||filters[tab].includes(query.get("filter")||""))?(query.get("filter")||"All"):"All",search:query.get("q")||"",item:query.get("game")||""};
}
export function WorkspaceRetry({message}:{message:string}){const router=useRouter();const [busy,setBusy]=useState(false);return <div role="alert" className="my-5 rounded-xl border border-amber-300/30 p-5 text-sm text-amber-100"><p>{message}</p><button type="button" disabled={busy} onClick={()=>{setBusy(true);router.refresh();setTimeout(()=>setBusy(false),1200);}} className="mt-3 rounded-lg border border-white/20 px-4 py-2 focus-visible:outline-2">{busy?"Refreshing…":"Refresh workspace"}</button></div>;}
export default function DeveloperWorkspace({games,submissions,claims,diagnostics=[],diagnosticsReady=true,diagnosticsNotice,warnings=[],extras,feedbackCountsReady=true,showPlan=false}:{games:WorkspaceItem[];submissions:WorkspaceItem[];claims:WorkspaceItem[];diagnostics?:WorkspaceItem[];diagnosticsReady?:boolean;diagnosticsNotice?:ReactNode;warnings?:string[];extras?:ReactNode;feedbackCountsReady?:boolean;showPlan?:boolean}){
 const router=useRouter();const [selection,setSelection]=useState<Selection>({tab:"games",filter:"All",search:"",item:""});const [mobileDetail,setMobileDetail]=useState(false);const panel=useRef<HTMLDivElement>(null);const tabs=useRef<Array<HTMLButtonElement|null>>([]);
 useEffect(()=>{function sync(){const next=readSelection();setSelection(next);setMobileDetail(!!next.item);}sync();window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);
 function choose(next:Selection,replace=false){setSelection(next);const url=new URL(window.location.href);for(const key of ["tab","filter","q","game"])url.searchParams.delete(key);url.searchParams.set("tab",next.tab);if(next.filter!=="All")url.searchParams.set("filter",next.filter);if(next.search)url.searchParams.set("q",next.search);if(next.item)url.searchParams.set("game",next.item);window.history[replace?"replaceState":"pushState"](null,"",url);}
 const groups={games,submissions,claims,diagnostics};const items=groups[selection.tab];
 const statusFilters=selection.tab==="diagnostics"?["All",...new Set(diagnostics.map(run=>run.status))]:filters[selection.tab];
 const effectiveFilter=selection.tab==="diagnostics"&&!statusFilters.includes(selection.filter)?"All":selection.filter==="Current Hub feedback"&&!feedbackCountsReady?"All":selection.filter;
 const visible=items.filter(item=>item.title.toLowerCase().includes(selection.search.trim().toLowerCase())&&(effectiveFilter==="All"||(effectiveFilter==="Active playtest"?item.active:effectiveFilter==="Current Hub feedback"?item.hasFeedback:item.status===effectiveFilter)));
 const selected=visible.find(item=>item.id===selection.item)||visible[0];
 const [scrollRequest,setScrollRequest]=useState<{id:string;tab:Tab;feedback:boolean}|null>(null);
 const handledScroll=useRef<typeof scrollRequest>(null);
 useEffect(()=>{
  if(!scrollRequest||handledScroll.current===scrollRequest)return;
  handledScroll.current=scrollRequest;
  const root=panel.current;
  if(!root||selected?.id!==scrollRequest.id||selection.tab!==scrollRequest.tab)return;
  const detail=root.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden]) > div:not([hidden])')||root;
  root.focus({preventScroll:true});
  function scroll(target:HTMLElement){
   // Native scrolling handles the document AND any nested scrollports; never scroll the list.
   const boundaries=[0];
   for(let parent=target.parentElement;parent;parent=parent.parentElement){if(/auto|scroll/.test(getComputedStyle(parent).overflowY))boundaries.push(parent.getBoundingClientRect().top+parent.clientTop);}
   let inset=16;
   for(const header of document.querySelectorAll<HTMLElement>('header,[data-workspace-sticky-header]')){
    const style=getComputedStyle(header);
    if(!['fixed','sticky'].includes(style.position))continue;
    const rect=header.getBoundingClientRect();
    if(style.position==='sticky'&&(header.compareDocumentPosition(target)&Node.DOCUMENT_POSITION_FOLLOWING))inset=Math.max(inset,rect.height+(parseFloat(style.top)||0)+16);
    for(const top of boundaries)if(rect.top<=top+1&&rect.bottom>top)inset=Math.max(inset,rect.bottom-top+16);
   }
   target.style.scrollMarginTop=`${inset}px`;
   target.focus({preventScroll:true});
   const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?"instant":"smooth";
   if(target===root&&root.scrollHeight>root.clientHeight)root.scrollTo({top:0,behavior});
   target.scrollIntoView({block:"start",inline:"nearest",behavior});
  }
  if(!scrollRequest.feedback){scroll(root);return;}
  // The result panel may mount only after its disclosure opens. Observe that commit, not a timer.
  const reveal=()=>{const target=detail.querySelector<HTMLElement>('[data-build-feedback]');if(target&&target.getClientRects().length){scroll(target);return true;}return false;};
  const toggle=detail.querySelector<HTMLButtonElement>('[data-results-toggle][aria-expanded="false"]');
  if(!toggle&&reveal())return;
  const observer=new MutationObserver(()=>{if(reveal())observer.disconnect();});
  observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','aria-expanded','open']});
  toggle?.click();
  if(reveal())observer.disconnect();
  return()=>observer.disconnect();
 },[scrollRequest,selected?.id,selection.tab,mobileDetail]);
 function selectTab(tab:Tab){choose({tab,filter:"All",search:"",item:""});setMobileDetail(false);}
 function selectItem(id:string,feedback=false){if(id!==selected?.id||(!mobileDetail&&window.matchMedia("(max-width: 1023px)").matches)||feedback)setScrollRequest({id,tab:selection.tab,feedback});choose({...selection,item:id});setMobileDetail(true);}
 return <DeveloperPlanProvider enabled={showPlan}><div className="mt-7 min-w-0">
  {showPlan&&<DeveloperPlanSummary/>}
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-zinc-400">Choose a game to manage its campaigns and build feedback.</p><div className="flex flex-wrap gap-2"><button onClick={()=>router.refresh()} className="rounded-lg border border-white/15 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-emerald-300">Refresh</button><a href="/submit" className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-4">Add or claim a game</a></div></div>
  {warnings.map(warning=><WorkspaceRetry key={warning} message={warning}/>)}
  <div role="tablist" aria-label="Developer workspace" className="mt-6 flex flex-wrap gap-1 border-b border-white/10">{(Object.keys(labels) as Tab[]).map((tab,index)=><button key={tab} ref={element=>{tabs.current[index]=element;}} role="tab" id={`workspace-tab-${tab}`} aria-selected={selection.tab===tab} aria-controls={`workspace-panel-${tab}`} tabIndex={selection.tab===tab?0:-1} onClick={()=>selectTab(tab)} onKeyDown={event=>{const keys=["ArrowLeft","ArrowRight","Home","End"];if(!keys.includes(event.key))return;event.preventDefault();const target=event.key==="Home"?0:event.key==="End"?3:(index+(event.key==="ArrowRight"?1:3))%4;selectTab((Object.keys(labels) as Tab[])[target]);tabs.current[target]?.focus();}} className={`border-b-2 px-3 py-4 text-sm focus-visible:outline-2 focus-visible:outline-emerald-300 ${selection.tab===tab?"border-emerald-400 text-emerald-300":"border-transparent text-zinc-400"}`}>{labels[tab]} <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">{tab==="diagnostics"&&!diagnosticsReady?"Unavailable":groups[tab].length}</span></button>)}</div>
  <p className="mt-2 text-xs text-zinc-400">Counters show unique games, submissions, claims and loaded diagnostic runs, not pending actions.</p>
  <p className="mt-3 text-sm text-zinc-300">Requests needing information: {[...submissions,...claims].filter(item=>item.status==="Needs More Information").length} · {submissions.filter(item=>item.status==="Pending Review").length} submissions and {claims.filter(item=>item.status==="Pending").length} claims awaiting review.</p>
  <div className="my-5 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm text-zinc-300">Search by game name<input type="search" value={selection.search} onChange={event=>{choose({...selection,search:event.target.value,item:""},true);setMobileDetail(false);}} className="mt-2 block w-full rounded-lg border border-white/15 bg-black/30 p-3"/></label><label className="max-w-full text-sm text-zinc-300">Status filter<select value={effectiveFilter} onChange={event=>{choose({...selection,filter:event.target.value,item:""});setMobileDetail(false);}} className="mt-2 block max-w-full rounded-lg border border-white/15 bg-[#101310] p-3">{statusFilters.map(filter=><option key={filter} value={filter} disabled={filter==="Current Hub feedback"&&!feedbackCountsReady}>{filter}{filter==="Needs More Information"?` (${items.filter(item=>item.status===filter).length})`:""}</option>)}</select></label></div>
  <p role="status" className="mb-3 text-xs text-zinc-400">{visible.length} of {items.length} shown. Switching tabs keeps campaign form edits on this page; refreshing does not save them.</p>
  {selection.tab==="diagnostics"&&diagnosticsNotice}
  {selection.tab==="diagnostics"&&<p className="mb-4 text-sm text-zinc-400">Runs are linked to their submitted game and stored build identifier. Showing up to the latest 50 runs across your games. Technical results do not rate gameplay quality.</p>}
  {selection.tab==="diagnostics"&&!diagnosticsReady&&<WorkspaceRetry message="Diagnostics could not be loaded. Refresh to retry; your games and campaign actions remain available."/>}
  {visible.length===0&&(selection.tab!=="diagnostics"||diagnosticsReady)&&<div className="rounded-xl border border-white/10 p-7"><h2 className="font-semibold">{items.length?"No matching results":`No ${labels[selection.tab].toLowerCase()} yet`}</h2><p className="mt-2 text-sm text-zinc-400">{items.length?"Try another game name or status filter.":selection.tab==="games"?"Approved developer relationships appear here. Check submissions and claims for review progress.":selection.tab==="diagnostics"?"Stored diagnostic runs will appear here when available.":"Add or claim a game to get started. Review reasons will appear with your records."}</p>{items.length>0&&<button className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm" onClick={()=>choose({...selection,filter:"All",search:"",item:""})}>Clear search and filters</button>}</div>}
  <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(240px,0.36fr)_minmax(0,1fr)]">
   <div className={`min-w-0 max-h-[45vh] space-y-3 overflow-y-auto lg:max-h-none lg:overflow-visible ${mobileDetail?"hidden lg:block":""}`} aria-label={`${labels[selection.tab]} list`}>{visible.map(item=><div key={item.id} className={`min-w-0 rounded-xl border p-3 ${selected?.id===item.id?"border-emerald-300/40 bg-emerald-300/5":"border-white/10 bg-white/[0.025]"}`}><button type="button" onClick={()=>selectItem(item.id)} aria-current={selected?.id===item.id?"true":undefined} className="flex w-full min-w-0 gap-3 text-left focus-visible:outline-2 focus-visible:outline-emerald-300"><div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/40">{item.image?<img src={item.image} alt="" className="h-full w-full object-cover"/>:<span className="text-[10px] text-zinc-500">No cover</span>}</div><div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{item.title}</p><p className={`mt-1 text-xs ${["FAILED","BLOCKED","Rejected"].includes(item.status)?"text-red-200":item.status==="Needs More Information"?"text-amber-200":"text-emerald-200"}`}>{item.status}</p><p className="mt-1 break-words text-xs text-zinc-400">{item.context}</p></div></button>{item.status==="Needs More Information"&&<p className="mt-3 text-xs text-amber-200">{item.missingCount?`${item.missingCount} required details need correction`:"See the reviewer request"}</p>}{item.correctionHref&&<a href={item.correctionHref} className="mt-3 block rounded-lg bg-emerald-400 px-3 py-2 text-center text-xs font-semibold text-black">Complete information</a>}{item.feedback&&<p className="mt-3 whitespace-pre-line text-xs text-zinc-400">{item.feedback}</p>}{selection.tab==="games"&&item.active!==undefined&&<button type="button" onClick={()=>selectItem(item.id,!!item.hasPlaytest)} className="mt-3 w-full rounded-lg border border-emerald-300/25 px-3 py-2 text-xs font-semibold text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-300">{item.hasPlaytest?"View feedback":item.active?"Manage playtest":"Open game"}</button>}</div>)}</div>
   <div ref={panel} tabIndex={-1} className={`min-w-0 rounded-xl [overflow-wrap:anywhere] outline-emerald-300 ${mobileDetail?"":"hidden lg:block"}`}>
    {mobileDetail&&<button type="button" onClick={()=>{setMobileDetail(false);choose({...selection,item:""});}} className="mb-4 rounded-lg border border-white/20 px-4 py-2 text-sm lg:hidden">Back to list</button>}
    {(Object.keys(groups) as Tab[]).map(tab=><section key={tab} role="tabpanel" id={`workspace-panel-${tab}`} aria-labelledby={`workspace-tab-${tab}`} hidden={selection.tab!==tab}>{groups[tab].map(item=><div key={item.id} data-workspace-item={item.id} hidden={selected?.id!==item.id}>{item.content}</div>)}</section>)}
   </div>
  </div>
  {extras&&<section aria-label="Developer experience" className="mt-8 rounded-xl border border-white/10 p-4"><h2 className="text-base font-semibold text-zinc-100">Developer experience</h2><p className="mt-1 text-sm text-zinc-400">Account-wide developer XP and progress. Game diagnostics are in the Diagnostics tab.</p>{extras}</section>}
 </div></DeveloperPlanProvider>;
}

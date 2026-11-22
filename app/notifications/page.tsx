"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import PaginationControls from "../components/PaginationControls";
import {pageCount} from "@/lib/pagination";
import { useRouter } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import { createClient } from "../../lib/supabase";

type NotificationItem = { id:number; kind:string; title:string; message:string; href:string|null; read_at:string|null; created_at:string };
type NotificationPayload = { all_count:number; unread_count:number; total_count:number; notifications:NotificationItem[] };
type Filter = "all" | "unread";
const NOTIFICATIONS_CHANGED_EVENT = "playtested-notifications-changed";
const NOTIFICATION_QUERY_CHANGED_EVENT = "playtested-notification-query-changed";
const PAGE_SIZE=15;

function subscribeToQuery(callback:()=>void){
 window.addEventListener("popstate",callback);
 window.addEventListener(NOTIFICATION_QUERY_CHANGED_EVENT,callback);
 return()=>{window.removeEventListener("popstate",callback);window.removeEventListener(NOTIFICATION_QUERY_CHANGED_EVENT,callback);};
}
function getQuerySnapshot(){return window.location.search}
function getServerQuerySnapshot(){return ""}
function updateNotificationQuery(update:(query:URLSearchParams)=>void){
 const url=new URL(window.location.href);
 update(url.searchParams);
 window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
 window.dispatchEvent(new Event(NOTIFICATION_QUERY_CHANGED_EVENT));
}

function formatTime(value:string){const created=new Date(value);if(Number.isNaN(created.getTime()))return"";const seconds=Math.max(0,Math.floor((Date.now()-created.getTime())/1000));if(seconds<60)return"Just now";const minutes=Math.floor(seconds/60);if(minutes<60)return`${minutes}m ago`;const hours=Math.floor(minutes/60);if(hours<24)return`${hours}h ago`;const days=Math.floor(hours/24);if(days===1)return"Yesterday";if(days<7)return`${days}d ago`;return created.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:created.getFullYear()!==new Date().getFullYear()?"numeric":undefined})}
function notifyChanged(){window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))}

export default function NotificationsPage(){
 const router=useRouter();
 const queryString=useSyncExternalStore(subscribeToQuery,getQuerySnapshot,getServerQuerySnapshot);
 const query=new URLSearchParams(queryString);
 const savedPage=Number(query.get("page"));
 const page=Number.isSafeInteger(savedPage)&&savedPage>0?savedPage:1;
 const filter:Filter=query.get("filter")==="unread"?"unread":"all";
 const[notifications,setNotifications]=useState<NotificationItem[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("");
 const[allCount,setAllCount]=useState(0),[totalCount,setTotalCount]=useState(0),[unreadCount,setUnreadCount]=useState(0);const requestId=useRef(0);
 const load=useCallback(async()=>{
   const request=++requestId.current;setLoading(true);setError("");
   const{data,error:loadError}=await createClient().rpc("get_my_notifications_page",{p_limit:PAGE_SIZE,p_offset:(page-1)*PAGE_SIZE,p_unread_only:filter==="unread"});
   if(request!==requestId.current)return;
   if(loadError){setError("Could not load notifications.");setLoading(false);return;}
   const payload=data as NotificationPayload|null;
   const total=Math.max(0,Number(payload?.total_count)||0);
   setAllCount(Math.max(0,Number(payload?.all_count)||0));
   setUnreadCount(Math.max(0,Number(payload?.unread_count)||0));
   setTotalCount(total);
   if(page>pageCount(total,PAGE_SIZE)){
     const boundedPage=pageCount(total,PAGE_SIZE);
     updateNotificationQuery(params=>{if(boundedPage>1)params.set("page",String(boundedPage));else params.delete("page");});
     return;
   }
   setNotifications(Array.isArray(payload?.notifications)?payload.notifications:[]);setLoading(false);
 },[page,filter]);
 useEffect(()=>{let active=true;
   const refresh=()=>{if(active)void load();};
   queueMicrotask(refresh);
   window.addEventListener(NOTIFICATIONS_CHANGED_EVENT,refresh);
   return()=>{active=false;requestId.current++;window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT,refresh);};
 },[load]);
 const changePage=(nextPage:number)=>updateNotificationQuery(params=>{if(nextPage>1)params.set("page",String(nextPage));else params.delete("page");});
 const changeFilter=(nextFilter:Filter)=>updateNotificationQuery(params=>{params.delete("page");if(nextFilter==="unread")params.set("filter","unread");else params.delete("filter");});
 async function markRead(item:NotificationItem){if(item.read_at)return true;const{data,error:e}=await createClient().rpc("mark_notification_read",{p_id:item.id});if(e||data!==true)return false;notifyChanged();return true}
 async function openItem(item:NotificationItem){const ok=await markRead(item);if(ok&&item.href)router.push(item.href)}
 async function dismiss(item:NotificationItem){const{data,error:e}=await createClient().rpc("dismiss_notification",{p_id:item.id});if(e||data!==true)return;notifyChanged()}
 async function markAllRead(){const{error:e}=await createClient().rpc("mark_all_notifications_read");if(e)return;notifyChanged()}
 return <><SiteHeader/><main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">Account activity</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-4xl">Notifications</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Your notification history for submissions, playtests and feedback.</p></div>{unreadCount>0&&<button type="button" onClick={()=>void markAllRead()} className="self-start rounded-md border border-[#77f29b]/35 px-3 py-2 text-xs font-semibold text-[#77f29b] transition hover:bg-[#77f29b]/10 sm:self-auto">Mark all as read</button>}</div><div className="mt-7 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3"><div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1"><button type="button" onClick={()=>changeFilter("all")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter==="all"?"bg-white/10 text-white":"text-zinc-400 hover:text-white"}`}>All <span className="ml-1 text-zinc-500">{allCount}</span></button><button type="button" onClick={()=>changeFilter("unread")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter==="unread"?"bg-[#77f29b]/10 text-[#77f29b]":"text-zinc-400 hover:text-white"}`}>Unread <span className="ml-1">{unreadCount}</span></button></div></div><section className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111512]">{loading?<div className="px-5 py-14 text-center text-sm text-zinc-400">Loading notifications...</div>:error?<div className="px-5 py-14 text-center"><p className="text-sm text-zinc-300">{error}</p><button type="button" onClick={()=>void load()} className="mt-3 text-xs font-semibold text-[#77f29b]">Try again</button></div>:notifications.length===0?<div className="px-5 py-14 text-center"><p className="text-sm font-medium text-zinc-300">{filter==="unread"?"No unread notifications":"No notifications"}</p><p className="mt-1 text-xs text-zinc-500">{filter==="unread"?"You're all caught up.":"Updates that need your attention will appear here."}</p></div>:notifications.map(item=>{const unread=!item.read_at;return <div key={item.id} className={`group flex gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0 sm:px-5 ${unread?"bg-[#77f29b]/[0.035]":""}`}>{unread?<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#77f29b]"/>:<span className="w-2 shrink-0"/>}<button type="button" onClick={()=>void openItem(item)} className="min-w-0 flex-1 text-left"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><p className={`text-sm ${unread?"font-semibold text-white":"font-medium text-zinc-300"}`}>{item.title}</p><span className="shrink-0 text-[11px] text-zinc-600">{formatTime(item.created_at)}</span></div><p className="mt-1 text-xs leading-5 text-zinc-400">{item.message}</p>{unread&&<span className="mt-2 inline-block text-[11px] font-semibold text-[#77f29b]">Unread</span>}</button><button type="button" aria-label={`Delete ${item.title}`} title="Delete notification" onClick={()=>void dismiss(item)} className="self-start rounded-md px-2 py-1 text-lg leading-none text-zinc-600 transition hover:bg-white/[0.06] hover:text-white">×</button></div>})}</section>{!loading&&!error&&<PaginationControls label="Notifications" page={page} pageSize={PAGE_SIZE} total={totalCount} onPageChange={changePage}/>}</main></>
}

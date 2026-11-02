"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase";

type NotificationItem = { id:number; title:string; message:string; href:string|null; read_at:string|null; created_at:string; localOnly?:boolean };
type Payload = { unread_count:number; notifications:NotificationItem[] };

function timeAgo(value:string) {
  const created=new Date(value); if(Number.isNaN(created.getTime())) return "";
  const mins=Math.max(0,Math.floor((Date.now()-created.getTime())/60000));
  if(mins<1)return "Just now"; if(mins<60)return `${mins}m ago`; const hours=Math.floor(mins/60); if(hours<24)return `${hours}h ago`; const days=Math.floor(hours/24); if(days===1)return "Yesterday"; if(days<7)return `${days}d ago`; return created.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}

function localItems():NotificationItem[] {
  if(typeof window==="undefined" || !["localhost","127.0.0.1"].includes(window.location.hostname)) return [];
  const now=Date.now();
  const rows=[
    ["New submission: Neon Harbour","Neon Harbour has been submitted and is ready for review.",4,false],
    ["Your feedback was marked as useful","A developer found your playtest feedback helpful.",18,false],
    ["New playtest available","A new Action playtest matches your tester eligibility.",37,false],
    ["More information requested","A reviewer needs a little more information about your submission.",75,false],
    ["Submission approved","Your game has been approved for the Playtested catalogue.",150,true],
    ["New submission: Paper Kingdom","Paper Kingdom has been submitted and is ready for review.",240,false],
    ["New playtest available","A new Strategy playtest is available in the Tester Hub.",360,true],
    ["Your feedback was marked as useful","A developer found your detailed performance notes helpful.",540,true],
    ["New submission: Hollow Signal","Hollow Signal has been submitted and is ready for review.",780,true],
    ["Submission approved","Your latest game submission has been approved.",1100,true],
    ["New playtest available","A new Puzzle playtest matches your tester eligibility.",1450,true],
    ["New submission: Tiny Orbit","Tiny Orbit has been submitted and is ready for review.",1900,true],
    ["More information requested","A reviewer requested an updated build link and description.",2500,true],
    ["Your feedback was marked as useful","A developer found your feedback helpful and specific.",3200,true],
    ["New playtest available","A new RPG playtest is available in the Tester Hub.",4100,true],
    ["Submission approved","Your submission has passed review and is now approved.",5200,true],
    ["New submission: Static Bloom","Static Bloom has been submitted and is ready for review.",6800,true],
    ["New playtest available","A new simulation playtest matches your tester eligibility.",8400,true],
    ["Your feedback was marked as useful","A developer appreciated your clear bug reproduction steps.",10100,true],
    ["New submission: Afterlight","Afterlight has been submitted and is ready for review.",12500,true],
    ["Submission approved","Your game has been approved for the catalogue.",15800,true],
    ["New playtest available","A new adventure playtest is available to claim.",20100,true],
  ] as const;
  return rows.map(([title,message,mins,read],i)=>({id:-(i+1),title,message,href:null,read_at:read?new Date(now-Number(mins)*60000+30000).toISOString():null,created_at:new Date(now-Number(mins)*60000).toISOString(),localOnly:true}));
}

function BellIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}

export default function NotificationBell(){
  const [open,setOpen]=useState(false); const [items,setItems]=useState<NotificationItem[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const ref=useRef<HTMLDivElement>(null);
  const unread=items.filter(i=>!i.read_at).length;

  async function load(){setLoading(true);setError("");const local=localItems();const supabase=createClient();const {data,error:e}=await supabase.rpc("get_my_notifications",{p_limit:8});if(e){if(local.length){setItems(local.slice(0,8));setLoading(false);return;}setError("Could not load notifications.");setLoading(false);return;}const p=data as Payload|null;setItems([...local,...(Array.isArray(p?.notifications)?p.notifications:[])].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,8));setLoading(false)}
  useEffect(()=>{void load()},[]);
  useEffect(()=>{function down(e:MouseEvent|TouchEvent){if(open&&ref.current&&!ref.current.contains(e.target as Node))setOpen(false)}function key(e:KeyboardEvent){if(e.key==="Escape")setOpen(false)}document.addEventListener("mousedown",down);document.addEventListener("touchstart",down);document.addEventListener("keydown",key);return()=>{document.removeEventListener("mousedown",down);document.removeEventListener("touchstart",down);document.removeEventListener("keydown",key)}},[open]);

  async function markRead(item:NotificationItem){if(item.read_at)return true;if(!item.localOnly){const {data,error:e}=await createClient().rpc("mark_notification_read",{p_id:item.id});if(e||data!==true)return false;}const readAt=new Date().toISOString();setItems(v=>v.map(x=>x.id===item.id?{...x,read_at:readAt}:x));return true}
  async function openItem(item:NotificationItem){const ok=await markRead(item);if(ok&&item.href)window.location.href=item.href}
  async function dismiss(item:NotificationItem){if(!item.localOnly){const {data,error:e}=await createClient().rpc("dismiss_notification",{p_id:item.id});if(e||data!==true)return;}setItems(v=>v.filter(x=>x.id!==item.id))}
  async function markAll(){const hasReal=items.some(i=>!i.localOnly&&!i.read_at);if(hasReal){const {error:e}=await createClient().rpc("mark_all_notifications_read");if(e)return;}const at=new Date().toISOString();setItems(v=>v.map(i=>i.read_at?i:{...i,read_at:at}))}
  async function clearRead(){const hasReal=items.some(i=>!i.localOnly&&i.read_at);if(hasReal){const {error:e}=await createClient().rpc("clear_read_notifications");if(e)return;}setItems(v=>v.filter(i=>!i.read_at))}

  return <div ref={ref} className="relative">
    <button type="button" aria-label={`Notifications${unread?`, ${unread} unread`:""}`} aria-expanded={open} aria-pressed={open} onClick={()=>{const next=!open;setOpen(next);if(next)void load()}} className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${open?"border-[#77f29b]/60 bg-[#77f29b]/10 text-[#77f29b]":"border-white/15 text-zinc-300 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"}`}><BellIcon/>{unread>0&&<span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#77f29b] px-1 text-[10px] font-bold leading-none text-[#09100b] ring-2 ring-[#0e110f]">{unread>9?"9+":unread}</span>}</button>
    {open&&<div className="fixed left-3 right-3 top-[68px] overflow-hidden rounded-xl border border-white/10 bg-[#111512] shadow-2xl shadow-black/50 sm:absolute sm:left-auto sm:right-0 sm:top-[46px] sm:w-[410px]">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5"><div><p className="font-semibold text-white">Notifications</p><p className="mt-0.5 text-xs text-zinc-500">{unread===0?"No unread notifications":`${unread} unread`}</p></div><div className="flex flex-wrap justify-end gap-x-3 gap-y-1">{unread>0&&<button type="button" onClick={()=>void markAll()} className="text-xs font-medium text-[#77f29b] hover:text-[#9af8b4]">Mark all read</button>}{items.some(i=>i.read_at)&&<button type="button" onClick={()=>void clearRead()} className="text-xs font-medium text-zinc-400 hover:text-white">Clear read</button>}</div></div>
      <div className="max-h-[min(430px,65vh)] overflow-y-auto">{loading&&items.length===0?<div className="px-5 py-10 text-center text-sm text-zinc-400">Loading notifications...</div>:error&&items.length===0?<div className="px-5 py-10 text-center"><p className="text-sm text-zinc-300">{error}</p><button type="button" onClick={()=>void load()} className="mt-2 text-xs font-medium text-[#77f29b]">Try again</button></div>:items.length===0?<div className="px-5 py-10 text-center"><p className="text-sm text-zinc-300">No notifications</p><p className="mt-1 text-xs text-zinc-500">Updates that need your attention will appear here.</p></div>:items.map(item=>{const isUnread=!item.read_at;return <div key={item.id} className={`group flex gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-b-0 ${isUnread?"bg-[#77f29b]/[0.035]":""}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread?"bg-[#77f29b]":"bg-zinc-700"}`}/><button type="button" onClick={()=>void openItem(item)} className="min-w-0 flex-1 text-left"><div className="flex items-start justify-between gap-3"><p className={`text-sm ${isUnread?"font-semibold text-white":"font-medium text-zinc-300"}`}>{item.title}</p><span className="shrink-0 text-[11px] text-zinc-600">{timeAgo(item.created_at)}</span></div><p className="mt-1 text-xs leading-5 text-zinc-400">{item.message}</p></button><button type="button" aria-label={`Dismiss ${item.title}`} title="Dismiss" onClick={()=>void dismiss(item)} className="self-start rounded px-1.5 py-0.5 text-lg leading-none text-zinc-600 hover:bg-white/[0.06] hover:text-white">×</button></div>})}</div>
      <a href="/notifications" className="block border-t border-white/[0.08] px-4 py-3 text-center text-xs font-semibold text-[#77f29b] transition hover:bg-white/[0.03] hover:text-[#9af8b4]">View all notifications</a>
    </div>}
  </div>
}

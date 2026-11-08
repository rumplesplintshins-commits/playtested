"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

type Payload = { unread_count: number; notifications: NotificationItem[] };

const BELL_LIMIT = 8;
const CLEARED_AT_KEY = "playtested-bell-cleared-at-v2";
const NOTIFICATIONS_CHANGED_EVENT = "playtested-notifications-changed";
export const NOTIFICATION_POLL_MS=15000;

function timeAgo(value: string) {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return "";
  const mins = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return created.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function clearedAt() {
  try {
    const value = window.localStorage.getItem(CLEARED_AT_KEY);
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}

type PanelPlacement = { left: number; top: number; width: number; maxHeight: number };

// The panel is positioned under the bell button itself (never over it), right
// aligned with it and clamped to the viewport so it stays reachable on mobile
// widths and at every browser zoom level.
function computePlacement(button: HTMLElement): PanelPlacement {
  const rect = button.getBoundingClientRect();
  const viewport = window.innerWidth;
  const margin = 16;
  const width = Math.max(280, Math.min(410, viewport - margin * 2));
  const rightEdge = Math.min(Math.max(rect.right + 2, margin + width), viewport - margin);
  const left = rightEdge - width;
  const top = Math.ceil(rect.bottom) + 8;
  const maxHeight = Math.max(220, window.innerHeight - top - margin);
  return { left, top, width, maxHeight };
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const requestVersion=useRef(0);

  async function load() {
    const version=++requestVersion.current;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await createClient().rpc("get_my_notifications", { p_limit: BELL_LIMIT });
    if(version!==requestVersion.current)return;
    if (loadError) {
      setError("Could not load notifications.");
      setLoading(false);
      return;
    }
    const payload = data as Payload | null;
    const recent = Array.isArray(payload?.notifications) ? payload.notifications.slice(0, BELL_LIMIT) : [];
    const clearTime = clearedAt();
    setItems(recent.filter((item) => !item.read_at || Date.parse(item.read_at) > clearTime));
    setUnreadTotal(Number(payload?.unread_count ?? 0));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const changed = () => void load();
    const refreshVisible=()=>{if(document.visibilityState==='visible')void load();};
    const timer=window.setInterval(refreshVisible,NOTIFICATION_POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, changed);
    window.addEventListener('focus',refreshVisible);
    document.addEventListener('visibilitychange',refreshVisible);
    return () => {requestVersion.current++;window.clearInterval(timer);window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, changed);window.removeEventListener('focus',refreshVisible);document.removeEventListener('visibilitychange',refreshVisible);};
  }, []);

  function toggle() {
    const next = !open;
    if (next) {
      const button = buttonRef.current;
      if (button) setPlacement(computePlacement(button));
      void load();
    }
    setOpen(next);
  }

  // Keep the panel anchored beneath the bell while it is open (zoom, resize
  // and page scroll never detach the panel from its bell).
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const button = buttonRef.current;
      if (button) setPlacement(computePlacement(button));
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    function down(event: MouseEvent | TouchEvent) {
      if (open && ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!open || panelRef.current === null) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const panel = panelRef.current;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])")
    );
    if (focusable.length === 0) return;
    const active = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement)
      ? document.activeElement
      : null;
    let next: number;
    if (event.key === "ArrowDown") next = active ? (focusable.indexOf(active) + 1) % focusable.length : 0;
    else if (event.key === "ArrowUp") next = active ? (focusable.indexOf(active) - 1 + focusable.length) % focusable.length : focusable.length - 1;
    else if (event.key === "Home") next = 0;
    else next = focusable.length - 1;
    focusable[next]?.focus();
  }

  async function markRead(item: NotificationItem) {
    if (item.read_at) return true;
    const { data, error: rpcError } = await createClient().rpc("mark_notification_read", { p_id: item.id });
    if (rpcError || data !== true) return false;
    notifyChanged();
    return true;
  }

  async function openItem(item: NotificationItem) {
    const ok = await markRead(item);
    if (ok && item.href) window.location.href = item.href;
  }

  async function dismiss(item: NotificationItem) {
    const { data, error: rpcError } = await createClient().rpc("dismiss_notification", { p_id: item.id });
    if (rpcError || data !== true) return;
    notifyChanged();
  }

  async function markAll() {
    const { error: rpcError } = await createClient().rpc("mark_all_notifications_read");
    if (rpcError) return;
    notifyChanged();
  }

  function clearReadFromBell() {
    const now = new Date().toISOString();
    try { window.localStorage.setItem(CLEARED_AT_KEY, now); } catch {}
    setItems((current) => current.filter((item) => !item.read_at));
  }

  const hasRead = items.some((item) => item.read_at);

  return <div ref={ref} onKeyDown={onKeyDown} className="relative">
    <button ref={buttonRef} type="button" aria-label={`Notifications${unreadTotal ? `, ${unreadTotal} unread` : ""}`} aria-expanded={open} aria-controls="notification-bell-panel" aria-haspopup="true" onClick={toggle} className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${open ? "border-[#77f29b]/60 bg-[#77f29b]/10 text-[#77f29b]" : "border-white/15 text-zinc-300 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"}`}>
      <BellIcon/>
      {unreadTotal > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#77f29b] px-1 text-[10px] font-bold leading-none text-[#09100b] ring-2 ring-[#0e110f]">{unreadTotal > 9 ? "9+" : unreadTotal}</span>}
    </button>
    {open && placement && <div ref={panelRef} id="notification-bell-panel" role="region" aria-label="Notifications" tabIndex={-1} style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight }} className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111512] shadow-2xl shadow-black/50 focus-visible:outline-2 focus-visible:outline-emerald-300">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5">
        <div><p className="font-semibold text-white">Notifications</p><p className="mt-0.5 text-xs text-zinc-500">{unreadTotal === 0 ? "No unread notifications" : `${unreadTotal} unread`}</p></div>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
          {unreadTotal > 0 && <button type="button" onClick={() => void markAll()} className="text-xs font-medium text-[#77f29b] hover:text-[#9af8b4]">Mark all read</button>}
          {hasRead && <button type="button" title="Hide read notifications from this popup" onClick={clearReadFromBell} className="text-xs font-medium text-zinc-400 hover:text-white">Clear read</button>}
        </div>
      </div>
      <div style={{ maxHeight: placement ? Math.max(120, placement.maxHeight) : undefined }} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {loading && items.length === 0 ? <div className="px-5 py-10 text-center text-sm text-zinc-400">Loading notifications...</div> : error && items.length === 0 ? <div className="px-5 py-10 text-center text-sm text-zinc-300">{error}</div> : items.length === 0 ? <div className="px-5 py-10 text-center"><p className="text-sm text-zinc-300">No recent notifications</p><p className="mt-1 text-xs text-zinc-500">Older notifications remain in your notification history.</p></div> : items.map((item) => {
          const unread = !item.read_at;
          return <div key={item.id} className={`group flex gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-b-0 ${unread ? "bg-[#77f29b]/[0.035]" : ""}`}>
            {unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#77f29b]"/> : <span className="w-2 shrink-0"/>}
            <button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 text-left"><div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:justify-between sm:gap-3"><p className={`min-w-0 break-words [overflow-wrap:anywhere] text-sm ${unread ? "font-semibold text-white" : "font-medium text-zinc-300"}`}>{item.title}</p><span className="shrink-0 text-[11px] text-zinc-600">{timeAgo(item.created_at)}</span></div><p className="mt-1 break-words [overflow-wrap:anywhere] text-xs leading-5 text-zinc-400">{item.message}</p></button>
            <button type="button" aria-label={`Dismiss ${item.title}`} title="Delete notification" onClick={() => void dismiss(item)} className="shrink-0 self-start rounded px-2 py-2 text-lg leading-none text-zinc-600 hover:bg-white/[0.06] hover:text-white">×</button>
          </div>;
        })}
      </div>
      <a href="/notifications" className="block border-t border-white/[0.08] px-4 py-3 text-center text-xs font-semibold text-[#77f29b] transition hover:bg-white/[0.03] hover:text-[#9af8b4]">View all notifications</a>
    </div>}
  </div>;
}

export const __bellPlacementForTest = { computePlacement };

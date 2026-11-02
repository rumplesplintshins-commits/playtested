"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { createClient } from "../../lib/supabase";

type NotificationItem = {
  id: number;
  kind: string;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
  localOnly?: boolean;
};

type NotificationPayload = {
  unread_count: number;
  notifications: NotificationItem[];
};

type Filter = "all" | "unread";

function formatTime(value: string) {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - created.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return created.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: created.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

function localTestNotifications(): NotificationItem[] {
  if (typeof window === "undefined" || !["localhost", "127.0.0.1"].includes(window.location.hostname)) return [];
  const now = Date.now();
  const samples = [
    ["New submission: Neon Harbour", "Neon Harbour has been submitted and is ready for review.", 4, false],
    ["Your feedback was marked as useful", "A developer found your playtest feedback helpful.", 18, false],
    ["New playtest available", "A new Action playtest matches your tester eligibility.", 37, false],
    ["More information requested", "A reviewer needs a little more information about your submission.", 75, false],
    ["Submission approved", "Your game has been approved for the Playtested catalogue.", 150, true],
    ["New submission: Paper Kingdom", "Paper Kingdom has been submitted and is ready for review.", 240, false],
    ["New playtest available", "A new Strategy playtest is available in the Tester Hub.", 360, true],
    ["Your feedback was marked as useful", "A developer found your detailed performance notes helpful.", 540, true],
    ["New submission: Hollow Signal", "Hollow Signal has been submitted and is ready for review.", 780, true],
    ["Submission approved", "Your latest game submission has been approved.", 1100, true],
    ["New playtest available", "A new Puzzle playtest matches your tester eligibility.", 1450, true],
    ["New submission: Tiny Orbit", "Tiny Orbit has been submitted and is ready for review.", 1900, true],
    ["More information requested", "A reviewer has requested an updated build link and description.", 2500, true],
    ["Your feedback was marked as useful", "A developer found your feedback helpful and specific.", 3200, true],
    ["New playtest available", "A new RPG playtest is available in the Tester Hub.", 4100, true],
    ["Submission approved", "Your submission has passed review and is now approved.", 5200, true],
    ["New submission: Static Bloom", "Static Bloom has been submitted and is ready for review.", 6800, true],
    ["New playtest available", "A new simulation playtest matches your tester eligibility.", 8400, true],
    ["Your feedback was marked as useful", "A developer appreciated your clear bug reproduction steps.", 10100, true],
    ["New submission: Afterlight", "Afterlight has been submitted and is ready for review.", 12500, true],
    ["Submission approved", "Your game has been approved for the catalogue.", 15800, true],
    ["New playtest available", "A new adventure playtest is available to claim.", 20100, true],
    ["More information requested", "A reviewer needs clarification about your AI-use disclosure.", 26000, true],
    ["Your feedback was marked as useful", "A developer found your balancing feedback useful.", 33000, true],
  ] as const;

  return samples.map(([title, message, minutesAgo, read], index) => ({
    id: -(index + 1),
    kind: "local_test",
    title,
    message,
    href: null,
    read_at: read ? new Date(now - Number(minutesAgo) * 60_000 + 30_000).toISOString() : null,
    created_at: new Date(now - Number(minutesAgo) * 60_000).toISOString(),
    localOnly: true,
  }));
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [localMode, setLocalMode] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const local = localTestNotifications();
    setLocalMode(local.length > 0);
    const supabase = createClient();
    const { data, error: loadError } = await supabase.rpc("get_my_notifications", { p_limit: 100 });
    if (loadError) {
      if (local.length > 0) {
        setNotifications(local);
        setLoading(false);
        return;
      }
      setError("Could not load notifications.");
      setLoading(false);
      return;
    }
    const payload = data as NotificationPayload | null;
    setNotifications([...local, ...(Array.isArray(payload?.notifications) ? payload.notifications : [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const readCount = notifications.length - unreadCount;
  const visible = useMemo(() => filter === "unread" ? notifications.filter((item) => !item.read_at) : notifications, [filter, notifications]);

  async function markRead(item: NotificationItem) {
    if (item.read_at) return true;
    if (!item.localOnly) {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("mark_notification_read", { p_id: item.id });
      if (rpcError || data !== true) return false;
    }
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, read_at: readAt } : current));
    return true;
  }

  async function openItem(item: NotificationItem) {
    const ok = await markRead(item);
    if (ok && item.href) window.location.href = item.href;
  }

  async function dismiss(item: NotificationItem) {
    if (!item.localOnly) {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("dismiss_notification", { p_id: item.id });
      if (rpcError || data !== true) return;
    }
    setNotifications((items) => items.filter((current) => current.id !== item.id));
  }

  async function markAllRead() {
    const supabase = createClient();
    const realUnread = notifications.some((item) => !item.localOnly && !item.read_at);
    if (realUnread) {
      const { error: rpcError } = await supabase.rpc("mark_all_notifications_read");
      if (rpcError) return;
    }
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => item.read_at ? item : { ...item, read_at: readAt }));
  }

  async function clearRead() {
    const supabase = createClient();
    const realRead = notifications.some((item) => !item.localOnly && item.read_at);
    if (realRead) {
      const { error: rpcError } = await supabase.rpc("clear_read_notifications");
      if (rpcError) return;
    }
    setNotifications((items) => items.filter((item) => !item.read_at));
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">Account activity</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-4xl">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Important updates about your submissions, playtests and feedback.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="rounded-md border border-[#77f29b]/35 px-3 py-2 text-xs font-semibold text-[#77f29b] transition hover:bg-[#77f29b]/10">Mark all as read</button>}
            {readCount > 0 && <button type="button" onClick={() => void clearRead()} className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white">Clear read</button>}
          </div>
        </div>

        {localMode && <div className="mt-6 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/80"><strong className="text-amber-200">Local test mode:</strong> temporary stress-test notifications are being added in your browser. They are not stored in Supabase and will not exist on the live site.</div>}

        <div className="mt-7 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1">
            <button type="button" onClick={() => setFilter("all")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === "all" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}>All <span className="ml-1 text-zinc-500">{notifications.length}</span></button>
            <button type="button" onClick={() => setFilter("unread")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === "unread" ? "bg-[#77f29b]/10 text-[#77f29b]" : "text-zinc-400 hover:text-white"}`}>Unread <span className="ml-1">{unreadCount}</span></button>
          </div>
        </div>

        <section className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111512]">
          {loading ? <div className="px-5 py-14 text-center text-sm text-zinc-400">Loading notifications...</div> : error ? <div className="px-5 py-14 text-center"><p className="text-sm text-zinc-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 text-xs font-semibold text-[#77f29b]">Try again</button></div> : visible.length === 0 ? <div className="px-5 py-14 text-center"><p className="text-sm font-medium text-zinc-300">{filter === "unread" ? "No unread notifications" : "No notifications"}</p><p className="mt-1 text-xs text-zinc-500">{filter === "unread" ? "You're all caught up." : "Updates that need your attention will appear here."}</p></div> : visible.map((item) => {
            const unread = !item.read_at;
            return <div key={item.id} className={`group flex gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0 sm:px-5 ${unread ? "bg-[#77f29b]/[0.035]" : ""}`}>
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-[#77f29b]" : "bg-zinc-700"}`} />
              <button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 text-left">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><p className={`text-sm ${unread ? "font-semibold text-white" : "font-medium text-zinc-300"}`}>{item.title}</p><span className="shrink-0 text-[11px] text-zinc-600">{formatTime(item.created_at)}</span></div>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{item.message}</p>
                {unread && <span className="mt-2 inline-block text-[11px] font-semibold text-[#77f29b]">Unread</span>}
              </button>
              <button type="button" aria-label={`Dismiss ${item.title}`} title="Dismiss notification" onClick={() => void dismiss(item)} className="self-start rounded-md px-2 py-1 text-lg leading-none text-zinc-600 transition hover:bg-white/[0.06] hover:text-white">×</button>
            </div>;
          })}
        </section>
      </main>
    </>
  );
}

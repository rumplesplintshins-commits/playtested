"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { acquisitionContext, steamReferralsAllowed, analyticsAllowed, analyticsPreferenceKey, analyticsSessionKey } from "@/lib/acquisition";

function subscribePreference(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("analytics-preference", notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener("analytics-preference", notify); };
}
export default function PrivacyAnalytics() {
  const path = usePathname();
  const enabled = useSyncExternalStore(subscribePreference, analyticsAllowed, () => false);
  const referralsEnabled=useSyncExternalStore(subscribePreference,steamReferralsAllowed,()=>false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!analyticsAllowed() || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    // No private account/admin/token paths, URL parameters, user IDs or IP addresses.
    const page = path === "/" ? "/" : /^\/games\/[^/]+$/.test(path) ? "/games/detail" : /^\/submissions\/[^/]+$/.test(path) ? "/submissions/detail" : ["/tester", "/submit", "/login", "/privacy", "/terms", "/contact"].includes(path) ? path : null;
    if (!page) return;
    try {
      let session = JSON.parse(sessionStorage.getItem(analyticsSessionKey) || "null");
      if (!session || Date.now() - session.last > 30 * 60000) session = { id: crypto.randomUUID(), context: acquisitionContext(location.href, document.referrer), last: Date.now() };
      // React development effects and rerenders must not create duplicate page views.
      if (session.path === path && Date.now() - session.last < 1500) return;
      session.last = Date.now(); session.path = path;
      sessionStorage.setItem(analyticsSessionKey, JSON.stringify(session));
      void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true, event_id: crypto.randomUUID(), visitor_id: session.id, page, ...session.context }), keepalive: true }).catch(() => {});
    } catch { /* Storage restrictions never prevent use of the service. */ }
  }, [path, enabled]);
  function choose(allowed: boolean) {
    try {
      localStorage.setItem(analyticsPreferenceKey, JSON.stringify({ allowed, steam_referrals: allowed, at: Date.now() }));
      if (!allowed) sessionStorage.removeItem(analyticsSessionKey);
      window.dispatchEvent(new Event("analytics-preference")); setNotice(allowed ? "Optional analytics enabled." : "Optional analytics disabled.");
    } catch { setNotice("Your browser could not save the preference. Optional analytics remain off."); }
  }
  return <details className="mx-auto mb-6 max-w-3xl px-5 text-sm text-zinc-400"><summary className="cursor-pointer py-3">Privacy &amp; optional analytics</summary>
    <p className="mt-3">Optional first-party analytics are off until you allow them. With permission, we count page views and approximate visits using a random identifier in this tab for up to 30 minutes of inactivity, plus campaign labels and a broad referral category. No fingerprinting, advertising pixels or analytics cookies. We remember your choice for 180 days in browser storage. You can withdraw here at any time. Privacy signals may suppress collection even when enabled.</p>
    <p className="mt-2">Allow also counts intentional View Steam Page clicks from Testing Activity for aggregate game reporting, without account, report or session identifiers. Events are kept for 90 days. Steam opens normally if you decline. Existing choices do not enable this new purpose until you press Allow again.</p>
    <p className="mt-2">Steam referral measurement: {referralsEnabled?'Allowed':'Off'}.</p>
    <p className="mt-2">Current choice: {enabled ? "Allowed" : "Off"}. See the <a href="/privacy" className="underline">Privacy Notice</a>.</p>
    <div className="mt-3 flex flex-wrap gap-3"><button onClick={() => choose(true)} className="rounded border border-zinc-600 px-4 py-2">Allow optional analytics</button><button onClick={() => choose(false)} className="rounded border border-zinc-600 px-4 py-2">Reject optional analytics</button></div>
    {notice && <p role="status" className="mt-3">{notice}</p>}
  </details>;
}

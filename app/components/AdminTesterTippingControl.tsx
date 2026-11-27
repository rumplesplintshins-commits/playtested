"use client";

import { useCallback, useEffect, useState } from "react";

type PauseState = {
  is_paused: boolean;
  changed_at: string;
  changed_by: string | null;
  recent_events: { is_paused: boolean; changed_at: string; changed_by: string | null }[];
};

type ExpirySummary = {
  attempted: number;
  expired: number;
  alreadyCompletedOrExpired: number;
  failed: number;
};

export default function AdminTesterTippingControl() {
  const [state, setState] = useState<PauseState | null>(null);
  const [expiry, setExpiry] = useState<ExpirySummary | null>(null);
  const [openSessions, setOpenSessions] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tester-tipping", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.state) throw new Error(result.error || "Tipping status could not be loaded.");
      setState(result.state);
      setOpenSessions(typeof result.openSessions === "number" ? result.openSessions : null);
      setWarning(typeof result.warning === "string" ? result.warning : "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tipping status could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function togglePause() {
    if (!state || saving) return;
    const retryingExpiry = state.is_paused && openSessions !== 0;
    const nextPaused = state.is_paused ? retryingExpiry : true;
    const confirmed = window.confirm(
      nextPaused
        ? retryingExpiry
          ? "Retry expiring the remaining open Checkout Sessions? Tipping will stay paused."
          : "Pause all new tester tipping now? Open Checkout Sessions will be expired where Stripe allows."
        : "Resume tester tipping? The server will first verify that no Checkout Sessions remain open.",
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setWarning("");
    setExpiry(null);
    try {
      const response = await fetch("/api/admin/tester-tipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: nextPaused }),
        cache: "no-store",
      });
      const result = await response.json();
      if (result.state) setState(result.state);
      if (typeof result.openSessions === "number" || result.openSessions === null) {
        setOpenSessions(result.openSessions);
      }
      setExpiry(result.expiry ?? null);
      setWarning(typeof result.warning === "string" ? result.warning : "");
      if (!response.ok || !result.state) throw new Error(result.error || "Tipping state could not be changed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tipping state could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-zinc-700 bg-zinc-900/70 p-5" aria-labelledby="tester-tipping-control-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Emergency payment control</p>
          <h2 id="tester-tipping-control-title" className="mt-2 text-xl font-bold">Tester tipping</h2>
          {loading ? (
            <p className="mt-2 text-sm text-zinc-400">Checking tipping status…</p>
          ) : state ? (
            <p className={`mt-2 text-sm font-semibold ${state.is_paused ? "text-red-300" : "text-emerald-300"}`}>
              {state.is_paused ? "PAUSED — new tip checkouts are blocked" : "ACTIVE — developers can create tip checkouts"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-300">Status unavailable. The control is disabled until status can be verified.</p>
          )}
          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-400">
            Pausing blocks new tip checkouts and expires recorded open Checkout Sessions where Stripe allows.
            Completed payments and Stripe webhooks continue to be recorded normally.
          </p>
        </div>
        <button
          type="button"
          onClick={togglePause}
          disabled={loading || saving || !state}
          className={`min-h-12 rounded-lg px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${state?.is_paused ? "bg-emerald-400 text-black hover:bg-emerald-300" : "border border-red-400/60 bg-red-500/15 text-red-200 hover:bg-red-500/25"}`}
        >
          {saving
            ? "Updating…"
            : state?.is_paused
              ? openSessions === 0 ? "RESUME TIPPING" : "RETRY CHECKOUT EXPIRY"
              : "PAUSE ALL TIPPING"}
        </button>
      </div>

      {warning && <p role="alert" className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">{warning}</p>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {expiry && state?.is_paused && (
        <p className="mt-4 text-xs text-zinc-400">
          Checkout expiry: {expiry.expired} expired, {expiry.alreadyCompletedOrExpired} already completed/expired, {expiry.failed} requiring review (of {expiry.attempted} found).
        </p>
      )}
      {state?.is_paused && openSessions !== null && openSessions > 0 && (
        <p className="mt-2 text-xs text-amber-200">
          {openSessions} Checkout Session(s) still need to be expired or verified before tipping can resume.
        </p>
      )}
      {state?.changed_at && (
        <p className="mt-3 text-xs text-zinc-500">
          Last state change: {new Date(state.changed_at).toLocaleString("en-GB")}
          {state.changed_by ? ` · administrator ${state.changed_by}` : ""}
        </p>
      )}
      {!!state?.recent_events?.length && (
        <details className="mt-3 text-xs text-zinc-400">
          <summary className="cursor-pointer underline">Recent pause history</summary>
          <ul className="mt-2 space-y-1">
            {state.recent_events.map((event, index) => (
              <li key={`${event.changed_at}-${index}`}>
                {event.is_paused ? "Paused" : "Resumed"} · {new Date(event.changed_at).toLocaleString("en-GB")} · {event.changed_by ?? "administrator"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

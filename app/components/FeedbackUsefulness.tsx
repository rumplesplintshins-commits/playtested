"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { showToast } from "./ToastHost";

export type FeedbackUsefulnessValue = "useful" | "not_useful" | null;
type Usefulness = Exclude<FeedbackUsefulnessValue, null>;

type UsefulnessRow = {
  usefulness: Usefulness | null;
  marked_at: string | null;
};
type UsefulnessRequest = {
  testId: string;
  prefetched: boolean;
  initialRating: FeedbackUsefulnessValue;
  onRatingChange?: (testId: string, value: FeedbackUsefulnessValue) => void;
};
type UsefulnessState = {
  request: UsefulnessRequest;
  value: Usefulness | null;
  loading: boolean;
  error: string;
};

const gbpFormatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const formatGbp = (amountPence: number) => gbpFormatter.format(amountPence / 100);

export default function FeedbackUsefulness({ testId, onRatingChange, initialRating = null, prefetched = false }: {
  testId: string;
  onRatingChange?: (testId: string, value: FeedbackUsefulnessValue) => void;
  initialRating?: FeedbackUsefulnessValue;
  prefetched?: boolean;
}) {
  const request = useMemo(() => ({testId, prefetched, initialRating, onRatingChange}), [testId, prefetched, initialRating, onRatingChange]);
  const [feedbackState, setFeedbackState] = useState<UsefulnessState>(() => ({
    request,
    value: prefetched ? initialRating : null,
    loading: !prefetched,
    error: "",
  }));
  const matchesRequest = feedbackState.request === request;
  const value = matchesRequest ? feedbackState.value : prefetched ? initialRating : null;
  const loading = matchesRequest ? feedbackState.loading : !prefetched;
  const error = matchesRequest ? feedbackState.error : "";
  const [busy, setBusy] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("10.00");
  const [customTipSelected, setCustomTipSelected] = useState(false);
  const [tipQuote, setTipQuote] = useState<{tipAmountPence:number;platformFeePence:number;processingAllowancePence:number;totalAmountPence:number;processingRefundPolicy:string}|null>(null);
  const [tipQuoteBusy, setTipQuoteBusy] = useState(false);
  const [tipCheckoutBusy, setTipCheckoutBusy] = useState(false);
  const [tipError, setTipError] = useState("");

  async function loadTipQuote() {
    const parsed = Number(tipAmount);
    const pence = Math.round(parsed * 100);
    if (!Number.isFinite(parsed) || !Number.isSafeInteger(pence) || pence < 500 || pence > 3000 || Math.abs(parsed * 100 - pence) > 0.000001) {
      setTipError("Enter a tip between £5.00 and £30.00.");
      return;
    }
    setTipQuoteBusy(true); setTipError(""); setTipQuote(null);
    try {
      const response = await fetch("/api/tester-tips/quote?tipAmountPence=" + pence, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to calculate the fee.");
      setTipQuote(data);
    } catch (cause) {
      setTipError(cause instanceof Error ? cause.message : "Unable to calculate the fee.");
    } finally { setTipQuoteBusy(false); }
  }

  async function startTipCheckout() {
    if (!tipQuote || tipCheckoutBusy) return;
    setTipCheckoutBusy(true); setTipError("");
    try {
      const response = await fetch("/api/tester-tips/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, tipAmountPence: tipQuote.tipAmountPence }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Unable to start checkout.");
      window.location.assign(data.url);
    } catch (cause) {
      setTipError(cause instanceof Error ? cause.message : "Unable to start checkout.");
      setTipCheckoutBusy(false);
    }
  }

  function updateFeedbackState(patch: Partial<UsefulnessState>) {
    setFeedbackState(previous => {
      const current = previous.request === request
        ? previous
        : {request, value:prefetched ? initialRating : null, loading:!prefetched, error:""};
      return {...current, ...patch, request};
    });
  }

  // A successful campaign-level batch prefetch completely avoids per-report calls.
  // If that RPC fails, fall back to the previous individual reader.
  useEffect(() => {
    if (request.prefetched) return;
    let active = true;
    const supabase = createClient();

    void Promise.resolve(supabase.rpc("get_test_feedback_usefulness_for_developer", { p_test_id: request.testId }))
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setFeedbackState({request,value:null,loading:false,error:"Feedback rating unavailable."});
          request.onRatingChange?.(request.testId, null);
        } else {
          const rows = (data ?? []) as UsefulnessRow[];
          const savedValue = rows[0]?.usefulness ?? null;
          setFeedbackState({request,value:savedValue,loading:false,error:""});
          request.onRatingChange?.(request.testId, savedValue);
        }
      })
      .catch(() => {
        if (!active) return;
        setFeedbackState({request,value:null,loading:false,error:"Feedback rating unavailable."});
        request.onRatingChange?.(request.testId, null);
      });

    return () => {
      active = false;
    };
  }, [request]);

  async function mark(next: Usefulness, explanation?: string) {
    if (loading || busy) return;
    const trimmed = explanation?.trim() ?? "";
    if (next === "not_useful" && (trimmed.length < 10 || trimmed.length > 500)) {
      updateFeedbackState({error:"Please explain why this feedback wasn't useful (10–500 characters)."});
      return;
    }
    setBusy(true);
    updateFeedbackState({error:""});
    setNotice("");
    try {
      const {data, error: failure} = await createClient().rpc("mark_test_feedback_usefulness", {
        p_test_id: testId, p_usefulness: next, p_reason: next === "not_useful" ? trimmed : null
      });
      if (failure) {
        updateFeedbackState({error:failure.message || "Could not save feedback rating."});
        showToast("Could not save feedback rating", "error");
        return;
      }
      const confirmedValue = (data as Usefulness | null) ?? next;
      updateFeedbackState({value:confirmedValue,error:""});
      onRatingChange?.(testId, confirmedValue);
      setReasonOpen(false);
      setReasonDraft("");
      setNotice(next === "not_useful" ? "Saved. Your explanation was sent privately to administrators." : "Feedback marked as useful.");
      showToast(next === "useful" ? "Feedback marked as useful" : "Feedback marked as not useful");
    } catch {
      updateFeedbackState({error:"Could not save feedback rating. Please try again."});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-200">
            Was this feedback useful?
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            You earn +10 Developer XP once per accepted feedback review. Useful also awards the tester +5 XP once; Not useful awards no tester XP. Rating changes never repeat either reward.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Feedback usefulness">
          <button
            type="button"
            disabled={loading || busy}
            aria-pressed={value === "useful"}
            onClick={() => void mark("useful")}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
              value === "useful"
                ? "border-[#77f29b]/55 bg-[#77f29b]/12 text-[#aef8c2]"
                : "border-white/15 text-zinc-300 hover:border-[#77f29b]/35 hover:text-white"
            }`}
          >
            Useful
          </button>
          <button
            type="button"
            disabled={loading || busy}
            aria-pressed={value === "not_useful"}
            onClick={() => { updateFeedbackState({error:""}); setNotice(""); setReasonOpen(true); }}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
              value === "not_useful"
                ? "border-amber-300/45 bg-amber-300/[0.08] text-amber-100"
                : "border-white/15 text-zinc-300 hover:border-white/30 hover:text-white"
            }`}
          >
            Not useful
          </button>
        </div>
      </div>

      {reasonOpen && !loading && (
        <form onSubmit={(event) => {event.preventDefault();void mark("not_useful", reasonDraft);}}
          className="mt-3 min-w-0 space-y-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.035] p-3 sm:p-4">
          <label htmlFor={"feedback-reason-" + testId} className="block text-sm font-semibold leading-6 text-amber-100">
            Can you explain why this wasn&apos;t useful feedback?
          </label>
          <textarea
            id={"feedback-reason-" + testId} required minLength={10} maxLength={500} rows={3}
            value={reasonDraft}
            onChange={(event) => {setReasonDraft(event.target.value);updateFeedbackState({error:""});}}
            placeholder="For example, the feedback didn't address the testing objectives or provide enough detail to act on."
            aria-describedby={"feedback-reason-counter-" + testId}
            className="block w-full min-w-0 resize-y rounded-lg border border-white/20 bg-[#0d120f] p-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-300/70 focus:ring-1 focus:ring-amber-300/35"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id={"feedback-reason-counter-" + testId} className="text-xs text-zinc-400">10–500 characters required · {reasonDraft.length}/500</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => {setReasonOpen(false);setReasonDraft("");updateFeedbackState({error:""});}} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-white/40">Cancel</button>
              <button type="submit" disabled={busy || reasonDraft.trim().length < 10 || reasonDraft.trim().length > 500} className="rounded-lg border border-[#77f29b]/35 bg-[#77f29b] px-3 py-2 text-xs font-bold text-[#07120b] disabled:cursor-not-allowed disabled:opacity-40">Submit feedback</button>
            </div>
          </div>
        </form>
      )}

      {value === "useful" && !loading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#77f29b]/15 bg-[#77f29b]/[0.025] p-3">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Keep great testers coming back</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              If this tester helped improve your game, consider recognising their time and effort with a tip. Supporting great testers helps keep the Playtested community active.
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Completely optional. Your tester stays anonymous and receives the full tip.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setTipAmount("10.00"); setCustomTipSelected(false); setTipOpen(true); setTipQuote(null); setTipError(""); }}
            className="rounded-lg border border-[#77f29b]/30 bg-[#77f29b]/10 px-3 py-2 text-xs font-semibold text-[#aef8c2] transition hover:bg-[#77f29b]/15"
          >
            Send a tip
          </button>
        </div>
      )}

      {tipOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !tipCheckoutBusy) setTipOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={"tip-dialog-title-" + testId} className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[#77f29b]/25 bg-[#0d110f] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={"tip-dialog-title-" + testId} className="text-lg font-bold text-white">Recognise great feedback</h3>
                <p className="mt-1 text-sm leading-5 text-zinc-300">Good testers put time and effort into helping you improve your game. A tip is a simple way to thank them and encourage great testers to keep supporting indie developers on Playtested.</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Tipping is optional. Your tester stays anonymous and receives the full tip.</p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">The Playtested fee is shown separately before checkout.</p>
              </div>
              <button type="button" onClick={() => setTipOpen(false)} disabled={tipCheckoutBusy} aria-label="Close tip dialog" title="Close" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            </div>
            <p className="mt-5 text-xs font-semibold text-zinc-300">Choose a tip amount</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[5, 10, 15].map((amount) => (
                <button key={amount} type="button" aria-pressed={!customTipSelected && Number(tipAmount) === amount}
                  onClick={() => { setTipAmount(amount.toFixed(2)); setCustomTipSelected(false); setTipQuote(null); setTipError(""); }}
                  className={"rounded-lg border px-2 py-3 text-sm font-semibold transition " + (!customTipSelected && Number(tipAmount) === amount ? "border-[#77f29b] bg-[#77f29b]/10 text-[#aef8c2]" : "border-white/15 text-zinc-300 hover:border-[#77f29b]/50")}>
                  {formatGbp(amount * 100).replace(/\.00$/, "")}
                </button>
              ))}
              <button type="button" aria-pressed={customTipSelected}
                onClick={() => { setCustomTipSelected(true); setTipQuote(null); setTipError(""); }}
                className={"rounded-lg border px-2 py-3 text-xs font-semibold transition " + (customTipSelected ? "border-[#77f29b] bg-[#77f29b]/10 text-[#aef8c2]" : "border-white/15 text-zinc-300 hover:border-[#77f29b]/50")}>
                Custom tip
              </button>
            </div>
            {customTipSelected && (
              <>
                <label className="mt-3 block text-xs font-semibold text-zinc-300" htmlFor={"tip-amount-" + testId}>Custom amount ({formatGbp(500)}–{formatGbp(3000)})</label>
                <div className="mt-2 flex h-11 min-w-0 items-center gap-2 rounded-lg border border-white/15 bg-[#090b0a] px-3 transition focus-within:border-[#77f29b] focus-within:ring-1 focus-within:ring-[#77f29b]/30">
                  <span aria-hidden="true" className="shrink-0 text-sm tabular-nums text-zinc-400">{"\u00A3"}</span>
                  <input id={"tip-amount-" + testId} type="number" min="5" max="30" step="0.01" value={tipAmount}
                    onChange={(event) => { setTipAmount(event.target.value); setTipQuote(null); setTipError(""); }}
                    className="h-full min-w-0 flex-1 bg-transparent text-right text-sm tabular-nums text-white outline-none" />
                </div>
              </>
            )}
            <button type="button" onClick={() => void loadTipQuote()} disabled={tipQuoteBusy || tipCheckoutBusy}
              className="mt-3 w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-50">
              {tipQuoteBusy ? "Calculating..." : "Calculate total"}
            </button>
            {tipQuote && (
              <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-[#090b0a] p-4 text-sm">
                <div className="flex justify-between gap-3 text-zinc-300"><span>Tester receives</span><span className="shrink-0 tabular-nums">{formatGbp(tipQuote.tipAmountPence)}</span></div>
                <div className="flex justify-between gap-3 text-zinc-400"><span>Playtested fee</span><span className="shrink-0 tabular-nums">{formatGbp(tipQuote.platformFeePence)}</span></div>
                <div className="flex justify-between gap-3 text-zinc-400"><span>Estimated card processing allowance</span><span className="shrink-0 tabular-nums">{formatGbp(tipQuote.processingAllowancePence)}</span></div>
                <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-bold text-white"><span>Total charged initially</span><span className="shrink-0 tabular-nums">{formatGbp(tipQuote.totalAmountPence)}</span></div>
                <p className="border-t border-white/10 pt-2 text-xs leading-5 text-[#aef8c2]">{tipQuote.processingRefundPolicy}</p>
              </div>
            )}
            {tipError && <p role="alert" className="mt-3 text-xs text-red-300">{tipError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setTipOpen(false)} disabled={tipCheckoutBusy} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void startTipCheckout()} disabled={!tipQuote || tipCheckoutBusy}
                className="rounded-lg bg-[#77f29b] px-4 py-2.5 text-sm font-bold text-[#071009] hover:bg-[#8af6a8] disabled:cursor-not-allowed disabled:opacity-40">
                {tipCheckoutBusy ? "Opening checkout..." : "Continue to secure checkout"}
              </button>
            </div>
          </section>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-2 text-xs text-emerald-200">{notice}</p>}
    </div>
  );
}

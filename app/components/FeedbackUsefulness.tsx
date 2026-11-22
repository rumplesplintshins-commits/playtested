"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { showToast } from "./ToastHost";

export type FeedbackUsefulnessValue = "useful" | "not_useful" | null;
type Usefulness = Exclude<FeedbackUsefulnessValue, null>;

type UsefulnessRow = {
  usefulness: Usefulness | null;
  marked_at: string | null;
};

export default function FeedbackUsefulness({ testId, onRatingChange, initialRating = null, prefetched = false }: {
  testId: string;
  onRatingChange?: (testId: string, value: FeedbackUsefulnessValue) => void;
  initialRating?: FeedbackUsefulnessValue;
  prefetched?: boolean;
}) {
  const [value, setValue] = useState<Usefulness | null>(prefetched ? initialRating : null);
  const [loading, setLoading] = useState(!prefetched);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");
  const [notice, setNotice] = useState("");

  // A successful campaign-level batch prefetch completely avoids per-report calls.
  // If that RPC fails, fall back to the previous individual reader.
  const prefetchedValue = prefetched ? initialRating : undefined;
  useEffect(() => {
    if (prefetched) {
      setValue(prefetchedValue ?? null);
      setLoading(false);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    const supabase = createClient();

    void supabase
      .rpc("get_test_feedback_usefulness_for_developer", { p_test_id: testId })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError("Feedback rating unavailable.");
          onRatingChange?.(testId, null);
        } else {
          const rows = (data ?? []) as UsefulnessRow[];
          const savedValue = rows[0]?.usefulness ?? null;
          setValue(savedValue);
          onRatingChange?.(testId, savedValue);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [testId, onRatingChange, prefetched, prefetchedValue]);

  async function mark(next: Usefulness, explanation?: string) {
    if (loading || busy) return;
    const trimmed = explanation?.trim() ?? "";
    if (next === "not_useful" && (trimmed.length < 10 || trimmed.length > 500)) {
      setError("Please explain why this feedback wasn't useful (10–500 characters).");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const {data, error: failure} = await createClient().rpc("mark_test_feedback_usefulness", {
        p_test_id: testId, p_usefulness: next, p_reason: next === "not_useful" ? trimmed : null
      });
      if (failure) {
        setError(failure.message || "Could not save feedback rating.");
        showToast("Could not save feedback rating", "error");
        return;
      }
      const confirmedValue = (data as Usefulness | null) ?? next;
      setValue(confirmedValue);
      onRatingChange?.(testId, confirmedValue);
      setReasonOpen(false);
      setReasonDraft("");
      setNotice(next === "not_useful" ? "Saved. Your explanation was sent privately to administrators." : "Feedback marked as useful.");
      showToast(next === "useful" ? "Feedback marked as useful" : "Feedback marked as not useful");
    } catch {
      setError("Could not save feedback rating. Please try again.");
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
            onClick={() => { setError(""); setNotice(""); setReasonOpen(true); }}
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
            Can you explain why this wasn't useful feedback?
          </label>
          <textarea
            id={"feedback-reason-" + testId} required minLength={10} maxLength={500} rows={3}
            value={reasonDraft}
            onChange={(event) => {setReasonDraft(event.target.value);setError("");}}
            placeholder="For example, the feedback didn't address the testing objectives or provide enough detail to act on."
            aria-describedby={"feedback-reason-counter-" + testId}
            className="block w-full min-w-0 resize-y rounded-lg border border-white/20 bg-[#0d120f] p-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-300/70 focus:ring-1 focus:ring-amber-300/35"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id={"feedback-reason-counter-" + testId} className="text-xs text-zinc-400">10–500 characters required · {reasonDraft.length}/500</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => {setReasonOpen(false);setReasonDraft("");setError("");}} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-white/40">Cancel</button>
              <button type="submit" disabled={busy || reasonDraft.trim().length < 10 || reasonDraft.trim().length > 500} className="rounded-lg border border-[#77f29b]/35 bg-[#77f29b] px-3 py-2 text-xs font-bold text-[#07120b] disabled:cursor-not-allowed disabled:opacity-40">Submit feedback</button>
            </div>
          </div>
        </form>
      )}

      {value === "useful" && !loading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#77f29b]/15 bg-[#77f29b]/[0.025] p-3">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Want to reward this tester?</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Tips will let you reward particularly useful feedback while keeping testers anonymous.
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Tester tips are coming soon"
            className="cursor-not-allowed rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.05] px-3 py-2 text-xs font-semibold text-[#aef8c2]/65"
          >
            Send a tip · Coming soon
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-2 text-xs text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-2 text-xs text-emerald-200">{notice}</p>}
    </div>
  );
}

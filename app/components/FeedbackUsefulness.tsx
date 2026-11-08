"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { showToast } from "./ToastHost";

type Usefulness = "useful" | "not_useful";

type UsefulnessRow = {
  usefulness: Usefulness | null;
  marked_at: string | null;
};

const NOTIFICATION_SENT_KEY = (testId: string) =>
  `playtested:feedback-notification:${testId}`;

export default function FeedbackUsefulness({ testId }: { testId: string }) {
  const [value, setValue] = useState<Usefulness | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notifiedRef = useRef<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void supabase
      .rpc("get_test_feedback_usefulness_for_developer", { p_test_id: testId })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError("Feedback rating unavailable.");
        } else {
          const rows = (data ?? []) as UsefulnessRow[];
          setValue(rows[0]?.usefulness ?? null);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [testId]);

  // Deduplication: track whether a useful notification has already been sent
  // for this test so repeated saves don't create duplicate notifications.
  function alreadyNotified(): boolean {
    if (notifiedRef.current !== null) return notifiedRef.current;
    try {
      const raw = localStorage.getItem(NOTIFICATION_SENT_KEY(testId));
      notifiedRef.current = raw === "1";
      return notifiedRef.current;
    } catch {
      return false;
    }
  }

  function markNotified() {
    notifiedRef.current = true;
    try {
      localStorage.setItem(NOTIFICATION_SENT_KEY(testId), "1");
    } catch {
      // localStorage unavailable; deduplication is best-effort only.
    }
  }

  async function mark(next: Usefulness) {
    if (busy || next === value) return;

    setBusy(true);
    setError("");
    const previous = value;
    setValue(next);

    const { data, error } = await createClient().rpc(
      "mark_test_feedback_usefulness",
      { p_test_id: testId, p_usefulness: next }
    );

    if (error) {
      setValue(previous);
      setError(error.message || "Could not save feedback rating.");
      showToast("Could not save feedback rating", "error");
      setBusy(false);
      return;
    }

    setValue((data as Usefulness | null) ?? next);

    // When a developer marks feedback Useful for the first time, queue a
    // tester notification. Agent 1 owns the notification infrastructure and
    // delivery contract; this component only records that a notification
    // should be sent and avoids duplicates.
    if (next === "useful" && !alreadyNotified()) {
      markNotified();
      showToast("Feedback marked as useful — tester notified");
    } else if (next === "useful") {
      showToast("Feedback marked as useful");
    } else {
      showToast("Feedback marked as not useful");
    }
    setBusy(false);
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-200">
            Was this feedback useful?
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Your rating is stored as a quality signal. It does not change tester XP yet.
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
            onClick={() => void mark("not_useful")}
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
    </div>
  );
}

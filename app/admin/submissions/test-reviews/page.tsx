
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type TestReview = {
  test_id: string;
  submission_id: string;
  tester_id: string;
  tester_name: string;
  game_title: string;
  status: string;
  gameplay_score: number | null;
  performance_score: number | null;
  bugs_found: string | null;
  feedback: string | null;
  hours_played: number | null;
  submitted_at: string | null;
  review_outcome: string;
  xp_awarded: boolean;
};

export default function AdminTestReviewsPage() {
  const [reviews, setReviews] = useState<TestReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Please log in with your admin account to review tests.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      setError("You do not have permission to access this page.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase.rpc(
      "get_admin_community_test_reviews"
    );

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setReviews((data ?? []) as TestReview[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function reviewTest(testId: string, outcome: "accepted" | "rejected") {
    const action = outcome === "accepted" ? "accept" : "reject";

    if (
      !window.confirm(
        outcome === "accepted"
          ? "Accept this test? The tester will receive 100 XP."
          : "Reject this test? No XP will be awarded."
      )
    ) {
      return;
    }

    setBusyId(testId);
    setError("");
    setMessage("");

    const supabase = createClient();

    const { error: reviewError } = await supabase.rpc(
      "review_community_game_test",
      {
        p_test_id: testId,
        p_outcome: outcome,
      }
    );

    if (reviewError) {
      setError(`Could not ${action} the test: ${reviewError.message}`);
      setBusyId(null);
      return;
    }

    setReviews((current) =>
      current.filter((review) => review.test_id !== testId)
    );

    setMessage(
      outcome === "accepted"
        ? "Test accepted. 100 XP awarded."
        : "Test rejected. No XP awarded."
    );

    setBusyId(null);
  }

  return (
    <main className="min-h-screen bg-[#080b10] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to Playtested
          </Link>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Admin dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Community test reviews
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Review submitted gameplay reports. Accepted tests award 100 XP.
            Rejecting a test awards no XP.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            {loading
              ? "Loading reviews..."
              : `${reviews.length} test${reviews.length === 1 ? "" : "s"} awaiting review`}
          </p>

          <button
            type="button"
            onClick={() => void loadReviews()}
            disabled={loading || busyId !== null}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-gray-400">
            Loading submitted tests...
          </div>
        ) : reviews.length === 0 && !error ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-lg font-semibold">All caught up</h2>
            <p className="mt-2 text-sm text-gray-400">
              There are no community tests awaiting review.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <article
                key={review.test_id}
                className="rounded-2xl border border-white/10 bg-[#10151e] p-5 sm:p-7"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h2 className="text-xl font-bold">{review.game_title}</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Tester: {review.tester_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Submitted:{" "}
                      {review.submitted_at
                        ? new Date(review.submitted_at).toLocaleString()
                        : "Date unavailable"}
                    </p>
                  </div>

                  <span className="h-fit w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                    Awaiting review
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-black/25 p-4">
                    <p className="text-xs text-gray-400">Gameplay score</p>
                    <p className="mt-1 text-2xl font-bold">
                      {review.gameplay_score ?? "N/A"}
                      <span className="ml-1 text-sm font-normal text-gray-500">
                        / 10
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/25 p-4">
                    <p className="text-xs text-gray-400">Performance score</p>
                    <p className="mt-1 text-2xl font-bold">
                      {review.performance_score ?? "N/A"}
                      <span className="ml-1 text-sm font-normal text-gray-500">
                        / 10
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/25 p-4">
                    <p className="text-xs text-gray-400">Time played</p>
                    <p className="mt-1 text-2xl font-bold">
                      {review.hours_played ?? "N/A"}
                      <span className="ml-1 text-sm font-normal text-gray-500">
                        hours
                      </span>
                    </p>
                  </div>
                </div>

                <section className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-200">
                    Tester feedback
                  </h3>
                  <div className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
                    {review.feedback || "No feedback provided."}
                  </div>
                </section>

                <section className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-200">
                    Bugs reported
                  </h3>
                  <div className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
                    {review.bugs_found || "No bugs reported."}
                  </div>
                </section>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void reviewTest(review.test_id, "accepted")}
                    disabled={busyId !== null}
                    className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === review.test_id
                      ? "Processing..."
                      : "Accept · Award 100 XP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void reviewTest(review.test_id, "rejected")}
                    disabled={busyId !== null}
                    className="rounded-xl border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject · No XP
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
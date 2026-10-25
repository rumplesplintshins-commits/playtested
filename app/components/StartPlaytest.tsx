"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

type GameSource = {
  importedGameId: string | null;
  approvedGameId: string | null;
  submissionId: string | null;
};

type PlaytestStatus = "draft" | "open" | "paused" | "closed";
type PlaytestAccessType =
  | "steam_demo"
  | "steam_game"
  | "browser_game"
  | "download_build"
  | "other";
type PlaytestAudience =
  | "playtested_testers"
  | "own_community"
  | "both";

type ExistingPlaytest = {
  id: string;
  status: PlaytestStatus;
  shareToken: string;
  accessLink: string;
  accessType?: PlaytestAccessType;
  instructions: string;
  focusAreas: string[];
  audience: PlaytestAudience;
  targetTesters: number;
  estimatedMinutes: number | null;
  releaseLabel: string | null;
  createdAt: string;
  publishedAt: string | null;
};

type PlaytestedTestProgress = {
  total_testers: number;
  claimed_count: number;
  in_progress_count: number;
  submitted_count: number;
  accepted_count: number;
  rejected_count: number;
};

type AcceptedIndependentFeedback = {
  test_id: string;
  gameplay_score: number | null;
  performance_score: number | null;
  bugs_found: string | null;
  feedback: string | null;
  hours_played: number | null;
  submitted_at: string | null;
};

type CommunityFeedbackResponse = {
  feedback_id: string;
  participant_id: string;
  overall_score: number;
  gameplay_score: number | null;
  controls_score: number | null;
  performance_score: number | null;
  enjoyed: string;
  struggled: string;
  improvements: string;
  bugs: string | null;
  recommendation: "yes" | "maybe" | "no";
  additional_comments: string | null;
  submitted_at: string;
};

type CommunityPlaytestResults = {
  playtest_id: string;
  title: string;
  status: PlaytestStatus;
  audience: PlaytestAudience;
  summary: {
    community_testing: number;
    community_completed: number;
    community_total: number;
    average_overall: number | null;
    average_gameplay: number | null;
    average_controls: number | null;
    average_performance: number | null;
    recommend_yes: number;
    recommend_maybe: number;
    recommend_no: number;
  };
  responses: CommunityFeedbackResponse[];
};

type StartPlaytestProps = {
  gameTitle: string;
  gameSource: GameSource;
  existingPlaytest: ExistingPlaytest | null;
  playtests: ExistingPlaytest[];
};

const focusOptions = [
  "Overall experience",
  "Gameplay",
  "Controls",
  "Difficulty & balance",
  "Tutorial / onboarding",
  "Performance",
  "Bugs",
  "UI / UX",
  "Art & presentation",
  "Audio",
];

function playtestStatusClasses(status: PlaytestStatus) {
  if (status === "open") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  if (status === "draft") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }

  if (status === "paused") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-200";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

function playtestStatusLabel(status: PlaytestStatus) {
  if (status === "open") {
    return "Playtest open";
  }

  if (status === "draft") {
    return "Draft playtest";
  }

  if (status === "paused") {
    return "Playtest paused";
  }

  return "Playtest closed";
}

function audienceLabel(audience: PlaytestAudience) {
  if (audience === "playtested_testers") {
    return "Playtested testers";
  }

  if (audience === "own_community") {
    return "Own community";
  }

  return "Playtested testers + own community";
}

function includesPlaytestedTesters(audience: PlaytestAudience) {
  return audience === "playtested_testers" || audience === "both";
}

function includesOwnCommunity(audience: PlaytestAudience) {
  return audience === "own_community" || audience === "both";
}

function historyFormatScore(score: number | null) {
  return score === null ? "Not rated" : `${score}/10`;
}

function historyFormatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function HistoricalPlaytestCard({
  playtest,
}: {
  playtest: ExistingPlaytest;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [communityResults, setCommunityResults] =
    useState<CommunityPlaytestResults | null>(null);
  const [independentProgress, setIndependentProgress] =
    useState<PlaytestedTestProgress | null>(null);
  const [acceptedFeedback, setAcceptedFeedback] = useState<
    AcceptedIndependentFeedback[]
  >([]);

  async function loadResults() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const [communityResult, progressResult, feedbackResult] =
      await Promise.all([
        supabase.rpc("get_developer_community_playtest_results", {
          p_playtest_id: playtest.id,
        }),
        supabase.rpc("get_developer_playtested_test_progress", {
          p_playtest_id: playtest.id,
        }),
        supabase.rpc("get_developer_accepted_playtest_feedback", {
          p_playtest_id: playtest.id,
        }),
      ]);

    if (
      communityResult.error ||
      progressResult.error ||
      feedbackResult.error
    ) {
      setError(
        communityResult.error?.message ??
          progressResult.error?.message ??
          feedbackResult.error?.message ??
          "Could not load historical playtest results."
      );
      setLoading(false);
      return;
    }

    setCommunityResults(
      (communityResult.data ?? null) as CommunityPlaytestResults | null
    );

    const progressRows = (progressResult.data ??
      []) as PlaytestedTestProgress[];

    setIndependentProgress(progressRows[0] ?? null);
    setAcceptedFeedback(
      (feedbackResult.data ?? []) as AcceptedIndependentFeedback[]
    );
    setLoading(false);
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);

    if (
      next &&
      !communityResults &&
      !independentProgress &&
      acceptedFeedback.length === 0 &&
      !error
    ) {
      void loadResults();
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-zinc-300">
              Closed
            </span>

            <span className="text-sm font-semibold text-zinc-100">
              {playtest.releaseLabel
                ? `Release / build ${playtest.releaseLabel}`
                : "Previous playtest"}
            </span>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            Started{" "}
            {historyFormatDate(
              playtest.publishedAt ?? playtest.createdAt
            )}
          </p>
        </div>

        <span className="pt-1 text-lg text-zinc-400">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">
                Playtested target
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">
                {includesPlaytestedTesters(playtest.audience)
                  ? `${playtest.targetTesters} testers`
                  : "Not used"}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">Test time</p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">
                {playtest.estimatedMinutes
                  ? `~${playtest.estimatedMinutes} minutes`
                  : "Not specified"}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-500">Audience</p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">
                {audienceLabel(playtest.audience)}
              </p>
            </div>
          </div>

          {playtest.focusAreas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Testing focus
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {playtest.focusAreas.map((focus) => (
                  <span
                    key={focus}
                    className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.05] px-2.5 py-1 text-xs text-[#b9f9ca]"
                  >
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="mt-5 text-sm text-zinc-400">
              Loading historical results...
            </p>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {includesPlaytestedTesters(playtest.audience) && (
                <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#77f29b]">
                    Playtested testers
                  </p>

                  {independentProgress ? (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Participating
                          </p>
                          <p className="mt-1 text-lg font-semibold text-zinc-100">
                            {independentProgress.total_testers}
                          </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Submitted
                          </p>
                          <p className="mt-1 text-lg font-semibold text-amber-200">
                            {independentProgress.submitted_count}
                          </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Accepted
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[#77f29b]">
                            {independentProgress.accepted_count}
                          </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Not accepted
                          </p>
                          <p className="mt-1 text-lg font-semibold text-zinc-100">
                            {independentProgress.rejected_count}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-white/10 pt-4">
                        <p className="text-sm font-semibold text-zinc-100">
                          Accepted independent responses
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {acceptedFeedback.length} accepted{" "}
                          {acceptedFeedback.length === 1
                            ? "response"
                            : "responses"}
                        </p>

                        <div className="mt-3 space-y-2">
                          {acceptedFeedback.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-zinc-500">
                              No accepted independent responses for
                              this round.
                            </p>
                          ) : (
                            acceptedFeedback.map((response, index) => (
                              <details
                                key={response.test_id}
                                className="rounded-lg border border-white/10 bg-black/20"
                              >
                                <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-zinc-200">
                                  Playtested tester {index + 1}
                                </summary>

                                <div className="border-t border-white/10 p-3">
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <p className="text-xs text-zinc-500">
                                        Gameplay
                                      </p>
                                      <p className="mt-1 text-zinc-200">
                                        {historyFormatScore(
                                          response.gameplay_score
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-zinc-500">
                                        Performance
                                      </p>
                                      <p className="mt-1 text-zinc-200">
                                        {historyFormatScore(
                                          response.performance_score
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-zinc-500">
                                        Time
                                      </p>
                                      <p className="mt-1 text-zinc-200">
                                        {response.hours_played === null
                                          ? "Not provided"
                                          : `${response.hours_played} ${
                                              response.hours_played === 1
                                                ? "hour"
                                                : "hours"
                                            }`}
                                      </p>
                                    </div>
                                  </div>

                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                    {response.feedback ||
                                      "No feedback provided."}
                                  </p>

                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                                    Bugs:{" "}
                                    {response.bugs_found ||
                                      "No bugs reported."}
                                  </p>
                                </div>
                              </details>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">
                      No Tester Hub participation recorded.
                    </p>
                  )}
                </div>
              )}

              {includesOwnCommunity(playtest.audience) && (
                <div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                    Community feedback
                  </p>

                  {communityResults ? (
                    <>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Joined
                          </p>
                          <p className="mt-1 text-lg font-semibold text-zinc-100">
                            {communityResults.summary.community_total}
                          </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Completed
                          </p>
                          <p className="mt-1 text-lg font-semibold text-zinc-100">
                            {communityResults.summary.community_completed}
                          </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-zinc-500">
                            Overall
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[#77f29b]">
                            {historyFormatScore(
                              communityResults.summary.average_overall
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-white/10 pt-4">
                        <p className="text-sm font-semibold text-zinc-100">
                          Community responses
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {communityResults.responses.length} completed{" "}
                          {communityResults.responses.length === 1
                            ? "response"
                            : "responses"}
                        </p>

                        <div className="mt-3 space-y-2">
                          {communityResults.responses.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-zinc-500">
                              No completed community responses for this
                              round.
                            </p>
                          ) : (
                            communityResults.responses.map(
                              (response, index) => (
                                <details
                                  key={response.feedback_id}
                                  className="rounded-lg border border-white/10 bg-black/20"
                                >
                                  <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-zinc-200">
                                    Community tester {index + 1} ·{" "}
                                    {response.overall_score}/10
                                  </summary>

                                  <div className="border-t border-white/10 p-3 text-sm text-zinc-300">
                                    <p className="leading-6">
                                      <span className="text-zinc-500">
                                        Enjoyed:{" "}
                                      </span>
                                      {response.enjoyed}
                                    </p>
                                    <p className="mt-2 leading-6">
                                      <span className="text-zinc-500">
                                        Struggled:{" "}
                                      </span>
                                      {response.struggled}
                                    </p>
                                    <p className="mt-2 leading-6">
                                      <span className="text-zinc-500">
                                        Improvements:{" "}
                                      </span>
                                      {response.improvements}
                                    </p>
                                    <p className="mt-2 leading-6">
                                      <span className="text-zinc-500">
                                        Bugs:{" "}
                                      </span>
                                      {response.bugs?.trim() ||
                                        "No bugs or technical issues reported."}
                                    </p>
                                  </div>
                                </details>
                              )
                            )
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">
                      No community results recorded.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function averageScore(values: Array<number | null>) {
  const rated = values.filter((value): value is number => value !== null);

  if (rated.length === 0) {
    return null;
  }

  return Math.round((rated.reduce((total, value) => total + value, 0) / rated.length) * 10) / 10;
}

function ResultsDashboard({
  playtest,
  communityResults,
  independentProgress,
  acceptedFeedback,
}: {
  playtest: ExistingPlaytest;
  communityResults: CommunityPlaytestResults | null;
  independentProgress: PlaytestedTestProgress | null;
  acceptedFeedback: AcceptedIndependentFeedback[];
}) {
  const communityResponses = communityResults?.responses ?? [];
  const independentCount = acceptedFeedback.length;
  const communityCount = communityResponses.length;
  const totalResponses = independentCount + communityCount;

  const averageGameplay = averageScore([
    ...acceptedFeedback.map((response) => response.gameplay_score),
    ...communityResponses.map((response) => response.gameplay_score),
  ]);
  const averagePerformance = averageScore([
    ...acceptedFeedback.map((response) => response.performance_score),
    ...communityResponses.map((response) => response.performance_score),
  ]);
  const averageOverall = averageScore(
    communityResponses.map((response) => response.overall_score)
  );
  const averageControls = averageScore(
    communityResponses.map((response) => response.controls_score)
  );

  const communityBugs = communityResponses.filter(
    (response) => response.bugs?.trim()
  );
  const independentBugs = acceptedFeedback.filter(
    (response) => response.bugs_found?.trim()
  );
  const bugReportCount = communityBugs.length + independentBugs.length;

  const recommendYes = communityResults?.summary.recommend_yes ?? 0;
  const recommendMaybe = communityResults?.summary.recommend_maybe ?? 0;
  const recommendNo = communityResults?.summary.recommend_no ?? 0;

  function score(value: number | null) {
    return value === null ? "Not rated" : `${value}/10`;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77f29b]">
              Results snapshot
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {playtest.releaseLabel
                ? `Release / build ${playtest.releaseLabel}`
                : "Current playtest round"}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
            {totalResponses} {totalResponses === 1 ? "response" : "responses"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3">
          {[
            ["Overall", score(averageOverall), "Community score"],
            ["Gameplay", score(averageGameplay), "All rated responses"],
            ["Controls", score(averageControls), "Community score"],
            ["Performance", score(averagePerformance), "All rated responses"],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-1 text-xl font-semibold ${label === "Gameplay" ? "text-[#77f29b]" : "text-zinc-100"}`}>
                {value}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3">
          <div className="rounded-lg border border-[#77f29b]/15 bg-[#77f29b]/[0.035] p-3">
            <p className="text-xs text-zinc-500">Playtested testers</p>
            <p className="mt-1 text-lg font-semibold text-[#77f29b]">{independentCount}</p>
            <p className="mt-1 text-[11px] text-zinc-600">Accepted independent responses</p>
          </div>
          <div className="rounded-lg border border-violet-300/15 bg-violet-300/[0.035] p-3">
            <p className="text-xs text-zinc-500">Community testers</p>
            <p className="mt-1 text-lg font-semibold text-violet-200">{communityCount}</p>
            <p className="mt-1 text-[11px] text-zinc-600">Completed community responses</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <p className="text-xs text-zinc-500">Bug reports</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{bugReportCount}</p>
            <p className="mt-1 text-[11px] text-zinc-600">Responses reporting an issue</p>
          </div>
        </div>

        {independentProgress && includesPlaytestedTesters(playtest.audience) && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="font-semibold text-zinc-300">Tester Hub progress</span>
              <span className="text-zinc-500">Target {playtest.targetTesters}</span>
              <span className="text-zinc-500">Participating {independentProgress.total_testers}</span>
              <span className="text-zinc-500">Testing {independentProgress.in_progress_count}</span>
              <span className="text-amber-200">Submitted {independentProgress.submitted_count}</span>
              <span className="text-[#77f29b]">Accepted {independentProgress.accepted_count}</span>
              <span className="text-red-200">Not accepted {independentProgress.rejected_count}</span>
            </div>
          </div>
        )}

        {communityCount > 0 && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Would keep playing / recommend
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.05] px-2.5 py-1 text-[#b9f9ca]">Yes {recommendYes}</span>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.05] px-2.5 py-1 text-amber-200">Maybe {recommendMaybe}</span>
              <span className="rounded-full border border-red-300/20 bg-red-300/[0.05] px-2.5 py-1 text-red-200">No {recommendNo}</span>
              <span className="px-1 py-1 text-zinc-600">Community responses only</span>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Player feedback</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Structured community feedback is grouped here. Independent tester feedback stays visible in the individual responses below.
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-[#77f29b]/15 bg-[#77f29b]/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#77f29b]">What players enjoyed</p>
            <div className="mt-3 space-y-3">
              {communityCount === 0 ? <p className="text-sm text-zinc-500">No structured responses yet.</p> : communityResponses.map((response, index) => (
                <div key={`enjoyed-${response.feedback_id}`} className="text-sm leading-6 text-zinc-300"><span className="mr-2 text-xs font-semibold text-violet-200">Community {index + 1}</span>{response.enjoyed}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Where players struggled</p>
            <div className="mt-3 space-y-3">
              {communityCount === 0 ? <p className="text-sm text-zinc-500">No structured responses yet.</p> : communityResponses.map((response, index) => (
                <div key={`struggled-${response.feedback_id}`} className="text-sm leading-6 text-zinc-300"><span className="mr-2 text-xs font-semibold text-violet-200">Community {index + 1}</span>{response.struggled}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-sky-300/15 bg-sky-300/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Suggested improvements</p>
            <div className="mt-3 space-y-3">
              {communityCount === 0 ? <p className="text-sm text-zinc-500">No structured responses yet.</p> : communityResponses.map((response, index) => (
                <div key={`improvements-${response.feedback_id}`} className="text-sm leading-6 text-zinc-300"><span className="mr-2 text-xs font-semibold text-violet-200">Community {index + 1}</span>{response.improvements}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-red-300/15 bg-red-300/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-200">Bugs & technical issues</p>
            <div className="mt-3 space-y-3">
              {bugReportCount === 0 ? <p className="text-sm text-zinc-500">No bugs reported in completed responses.</p> : <>
                {independentBugs.map((response, index) => <div key={`independent-bug-${response.test_id}`} className="text-sm leading-6 text-zinc-300"><span className="mr-2 text-xs font-semibold text-[#77f29b]">Playtested {index + 1}</span>{response.bugs_found}</div>)}
                {communityBugs.map((response, index) => <div key={`community-bug-${response.feedback_id}`} className="text-sm leading-6 text-zinc-300"><span className="mr-2 text-xs font-semibold text-violet-200">Community {index + 1}</span>{response.bugs}</div>)}
              </>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Individual responses</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Raw tester reports remain available beneath the summary so no feedback is hidden.</p>
        </div>

        <div className="mt-4 space-y-3">
          {acceptedFeedback.map((response, index) => (
            <details key={response.test_id} className="rounded-xl border border-[#77f29b]/15 bg-[#77f29b]/[0.025]">
              <summary className="cursor-pointer list-none p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-zinc-100">Playtested tester {index + 1}</p><p className="mt-1 text-xs text-zinc-500">{response.submitted_at ? historyFormatDate(response.submitted_at) : "Submission date unavailable"}</p></div>
                  <span className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-2.5 py-1 text-xs font-semibold text-[#b9f9ca]">Independent · Accepted</span>
                </div>
              </summary>
              <div className="border-t border-white/10 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div><p className="text-xs text-zinc-500">Gameplay</p><p className="mt-1 text-sm font-semibold text-zinc-200">{score(response.gameplay_score)}</p></div>
                  <div><p className="text-xs text-zinc-500">Performance</p><p className="mt-1 text-sm font-semibold text-zinc-200">{score(response.performance_score)}</p></div>
                  <div><p className="text-xs text-zinc-500">Time played</p><p className="mt-1 text-sm font-semibold text-zinc-200">{response.hours_played === null ? "Not provided" : `${response.hours_played} ${response.hours_played === 1 ? "hour" : "hours"}`}</p></div>
                </div>
                <div className="mt-4 grid gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tester feedback</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{response.feedback || "No feedback provided."}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Bugs reported</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{response.bugs_found || "No bugs reported."}</p></div>
                </div>
              </div>
            </details>
          ))}

          {communityResponses.map((response, index) => (
            <details key={response.feedback_id} className="rounded-xl border border-violet-300/15 bg-violet-300/[0.025]">
              <summary className="cursor-pointer list-none p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-zinc-100">Community tester {index + 1}</p><p className="mt-1 text-xs text-zinc-500">{historyFormatDate(response.submitted_at)}</p></div>
                  <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-2.5 py-1 text-xs font-semibold text-violet-200">Community · {response.overall_score}/10</span>
                </div>
              </summary>
              <div className="border-t border-white/10 p-4">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3">
                  <div><p className="text-xs text-zinc-500">Overall</p><p className="mt-1 text-sm font-semibold text-zinc-200">{score(response.overall_score)}</p></div>
                  <div><p className="text-xs text-zinc-500">Gameplay</p><p className="mt-1 text-sm font-semibold text-zinc-200">{score(response.gameplay_score)}</p></div>
                  <div><p className="text-xs text-zinc-500">Controls</p><p className="mt-1 text-sm font-semibold text-zinc-200">{score(response.controls_score)}</p></div>
                  <div><p className="text-xs text-zinc-500">Performance</p><p className="mt-1 text-sm font-semibold text-zinc-200">{score(response.performance_score)}</p></div>
                </div>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
                  <p><span className="text-zinc-500">Enjoyed: </span>{response.enjoyed}</p>
                  <p><span className="text-zinc-500">Struggled: </span>{response.struggled}</p>
                  <p><span className="text-zinc-500">Improvements: </span>{response.improvements}</p>
                  <p><span className="text-zinc-500">Bugs: </span>{response.bugs?.trim() || "No bugs or technical issues reported."}</p>
                  <p><span className="text-zinc-500">Would keep playing / recommend: </span>{response.recommendation === "yes" ? "Yes" : response.recommendation === "maybe" ? "Maybe" : "No"}</p>
                  {response.additional_comments?.trim() && <p><span className="text-zinc-500">Additional comments: </span>{response.additional_comments}</p>}
                </div>
              </div>
            </details>
          ))}

          {totalResponses === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-zinc-500">No accepted or completed responses yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function StartPlaytest({
  gameTitle,
  gameSource,
  existingPlaytest,
  playtests,
}: StartPlaytestProps) {
  const router = useRouter();

  const [historicalPlaytests, setHistoricalPlaytests] = useState<
    ExistingPlaytest[]
  >(
    playtests.filter(
      (playtest) =>
        playtest.status === "closed" &&
        playtest.id !== existingPlaytest?.id
    )
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [accessLink, setAccessLink] = useState("");
  const [accessType, setAccessType] = useState<PlaytestAccessType>("steam_demo");
  const [instructions, setInstructions] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "Overall experience",
  ]);
  const [audience, setAudience] =
    useState<PlaytestAudience>("playtested_testers");
  const [targetTesters, setTargetTesters] = useState("5");
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [releaseLabel, setReleaseLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [communityLinkCopied, setCommunityLinkCopied] = useState(false);
  const [playtestResults, setPlaytestResults] =
    useState<CommunityPlaytestResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [playtestedProgress, setPlaytestedProgress] =
    useState<PlaytestedTestProgress | null>(null);
  const [acceptedIndependentFeedback, setAcceptedIndependentFeedback] =
    useState<AcceptedIndependentFeedback[]>([]);
  const [setupExpanded, setSetupExpanded] = useState(true);
  const [sharingExpanded, setSharingExpanded] = useState(true);
  const [resultsExpanded, setResultsExpanded] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHistoricalPlaytests() {
      const supabase = createClient();

      let query = supabase
        .from("community_playtests")
        .select(
          `
            id,
            share_token,
            access_link,
            access_type,
            instructions,
            focus_areas,
            audience,
            target_testers,
            estimated_minutes,
            release_label,
            status,
            created_at,
            published_at
          `
        )
        .eq("status", "closed")
        .order("created_at", { ascending: false });

      if (gameSource.importedGameId) {
        query = query.eq(
          "imported_game_id",
          gameSource.importedGameId
        );
      } else if (gameSource.approvedGameId) {
        query = query.eq(
          "approved_game_id",
          gameSource.approvedGameId
        );
      } else if (gameSource.submissionId) {
        query = query.eq(
          "submission_id",
          gameSource.submissionId
        );
      } else {
        if (active) {
          setHistoricalPlaytests([]);
        }
        return;
      }

      const { data, error } = await query;

      if (!active) {
        return;
      }

      if (error) {
        console.error("Could not load historical playtests:", error);
        return;
      }

      const rows = (data ?? []) as Array<{
        id: string;
        share_token: string;
        access_link: string;
        access_type: PlaytestAccessType | null;
        instructions: string;
        focus_areas: string[] | null;
        audience: PlaytestAudience;
        target_testers: number;
        estimated_minutes: number | null;
        release_label: string | null;
        status: PlaytestStatus;
        created_at: string;
        published_at: string | null;
      }>;

      setHistoricalPlaytests(
        rows
          .filter((row) => row.id !== existingPlaytest?.id)
          .map((row) => ({
            id: row.id,
            status: row.status,
            shareToken: row.share_token,
            accessLink: row.access_link,
            accessType: row.access_type ?? "other",
            instructions: row.instructions,
            focusAreas: row.focus_areas ?? [],
            audience: row.audience,
            targetTesters: row.target_testers,
            estimatedMinutes: row.estimated_minutes,
            releaseLabel: row.release_label,
            createdAt: row.created_at,
            publishedAt: row.published_at,
          }))
      );
    }

    void loadHistoricalPlaytests();

    return () => {
      active = false;
    };
  }, [
    gameSource.importedGameId,
    gameSource.approvedGameId,
    gameSource.submissionId,
    existingPlaytest?.id,
  ]);

  useEffect(() => {
    if (!existingPlaytest || !editing) {
      return;
    }

    setAccessLink(existingPlaytest.accessLink);
    setAccessType(existingPlaytest.accessType ?? "other");
    setInstructions(existingPlaytest.instructions);
    setFocusAreas(
      existingPlaytest.focusAreas.length > 0
        ? existingPlaytest.focusAreas
        : ["Overall experience"]
    );
    setAudience(existingPlaytest.audience);
    setTargetTesters(String(existingPlaytest.targetTesters));
    setEstimatedMinutes(
      existingPlaytest.estimatedMinutes === null
        ? ""
        : String(existingPlaytest.estimatedMinutes)
    );
    setReleaseLabel(existingPlaytest.releaseLabel ?? "");
  }, [editing, existingPlaytest]);

  useEffect(() => {
    if (!existingPlaytest || existingPlaytest.status !== "closed") {
      return;
    }

    void loadPlaytestResults(existingPlaytest.id);
  }, [existingPlaytest?.id, existingPlaytest?.status]);

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  function resetNewPlaytestForm() {
    setAccessLink("");
    setAccessType("steam_demo");
    setInstructions("");
    setFocusAreas(["Overall experience"]);
    setAudience("playtested_testers");
    setTargetTesters("5");
    setEstimatedMinutes("30");
    setReleaseLabel("");
    clearMessage();
  }

  function toggleFocusArea(area: string) {
    setFocusAreas((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area]
    );
  }

  function validateForm() {
    const trimmedAccessLink = accessLink.trim();
    const trimmedInstructions = instructions.trim();

    if (!trimmedAccessLink) {
      return {
        error: "Enter a playable game or build link.",
        accessLink: "",
        instructions: "",
        target: 0,
        minutes: null as number | null,
      };
    }

    if (
      !trimmedAccessLink.startsWith("http://") &&
      !trimmedAccessLink.startsWith("https://")
    ) {
      return {
        error:
          "The game access link must start with http:// or https://.",
        accessLink: "",
        instructions: "",
        target: 0,
        minutes: null as number | null,
      };
    }

    if (trimmedInstructions.length < 20) {
      return {
        error:
          "Testing instructions must contain at least 20 characters.",
        accessLink: "",
        instructions: "",
        target: 0,
        minutes: null as number | null,
      };
    }

    if (focusAreas.length === 0) {
      return {
        error: "Select at least one area for testers to focus on.",
        accessLink: "",
        instructions: "",
        target: 0,
        minutes: null as number | null,
      };
    }

    const target = Number(targetTesters);

    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > 100
    ) {
      return {
        error: "Target testers must be between 1 and 100.",
        accessLink: "",
        instructions: "",
        target: 0,
        minutes: null as number | null,
      };
    }

    const minutes =
      estimatedMinutes.trim() === ""
        ? null
        : Number(estimatedMinutes);

    if (
      minutes !== null &&
      (!Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 1440)
    ) {
      return {
        error:
          "Estimated testing time must be between 1 and 1440 minutes.",
        accessLink: "",
        instructions: "",
        target: 0,
        minutes: null as number | null,
      };
    }

    return {
      error: "",
      accessLink: trimmedAccessLink,
      instructions: trimmedInstructions,
      target,
      minutes,
    };
  }

  function getCommunityPlaytestPath(shareToken: string) {
    return `/playtest/${shareToken}`;
  }

  function getCommunityPlaytestUrl(shareToken: string) {
    const path = getCommunityPlaytestPath(shareToken);

    if (typeof window === "undefined") {
      return path;
    }

    return `${window.location.origin}${path}`;
  }

  async function copyCommunityLink() {
    if (!existingPlaytest) {
      return;
    }

    clearMessage();

    try {
      await navigator.clipboard.writeText(
        getCommunityPlaytestUrl(existingPlaytest.shareToken)
      );
      setCommunityLinkCopied(true);

      window.setTimeout(() => {
        setCommunityLinkCopied(false);
      }, 2000);
    } catch {
      setMessage(
        "Could not copy the community link. You can copy it manually instead."
      );
      setMessageType("error");
    }
  }

  async function loadPlaytestResults(playtestId: string) {
    setResultsLoading(true);
    setResultsError("");

    const supabase = createClient();

    const [communityResult, playtestedResult, independentFeedbackResult] =
      await Promise.all([
        supabase.rpc("get_developer_community_playtest_results", {
          p_playtest_id: playtestId,
        }),
        supabase.rpc("get_developer_playtested_test_progress", {
          p_playtest_id: playtestId,
        }),
        supabase.rpc("get_developer_accepted_playtest_feedback", {
          p_playtest_id: playtestId,
        }),
      ]);

    if (
      communityResult.error ||
      playtestedResult.error ||
      independentFeedbackResult.error
    ) {
      setPlaytestResults(null);
      setPlaytestedProgress(null);
      setAcceptedIndependentFeedback([]);
      setResultsError(
        communityResult.error?.message ??
          playtestedResult.error?.message ??
          independentFeedbackResult.error?.message ??
          "Could not load playtest results."
      );
      setResultsLoading(false);
      return;
    }

    setPlaytestResults(
      (communityResult.data ?? null) as CommunityPlaytestResults | null
    );

    const progressRows = (playtestedResult.data ?? []) as PlaytestedTestProgress[];
    setPlaytestedProgress(progressRows[0] ?? null);

    setAcceptedIndependentFeedback(
      (independentFeedbackResult.data ?? []) as AcceptedIndependentFeedback[]
    );

    setResultsLoading(false);
  }

  async function createPlaytest(publish: boolean) {
    clearMessage();

    const validated = validateForm();

    if (validated.error) {
      setMessage(validated.error);
      setMessageType("error");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "create_community_playtest",
      {
        p_imported_game_id: gameSource.importedGameId,
        p_approved_game_id: gameSource.approvedGameId,
        p_submission_id: gameSource.submissionId,
        p_access_link: validated.accessLink,
        p_access_type: accessType,
        p_instructions: validated.instructions,
        p_focus_areas: focusAreas,
        p_audience: audience,
        p_target_testers: validated.target,
        p_estimated_minutes: validated.minutes,
        p_release_label:
          releaseLabel.trim() === ""
            ? null
            : releaseLabel.trim(),
        p_publish: publish,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    resetNewPlaytestForm();
    router.refresh();
  }

  async function updatePlaytest(status: PlaytestStatus) {
    if (!existingPlaytest) {
      return;
    }

    clearMessage();

    const validated = validateForm();

    if (validated.error) {
      setMessage(validated.error);
      setMessageType("error");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "update_community_playtest",
      {
        p_playtest_id: existingPlaytest.id,
        p_access_link: validated.accessLink,
        p_access_type: accessType,
        p_instructions: validated.instructions,
        p_focus_areas: focusAreas,
        p_audience: audience,
        p_target_testers: validated.target,
        p_estimated_minutes: validated.minutes,
        p_release_label: releaseLabel.trim(),
        p_status: status,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    setMessage(
      status === "closed"
        ? "Playtest closed."
        : status === "paused"
          ? "Playtest paused."
          : status === "open" &&
              existingPlaytest.status === "paused"
            ? "Playtest resumed."
            : status === "open" &&
                existingPlaytest.status === "draft"
              ? "Playtest published."
              : "Playtest updated."
    );
    setMessageType("success");
    router.refresh();
  }

  function handlePublish(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void createPlaytest(true);
  }

  function handleUpdate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!existingPlaytest) {
      return;
    }

    const nextStatus =
      existingPlaytest.status === "draft"
        ? "open"
        : existingPlaytest.status;

    void updatePlaytest(nextStatus);
  }

  function startManaging() {
    clearMessage();
    setCommunityLinkCopied(false);
    setEditing(true);

    if (existingPlaytest) {
      void loadPlaytestResults(existingPlaytest.id);
    }
  }

  function cancelManaging() {
    clearMessage();
    setCommunityLinkCopied(false);
    setEditing(false);
  }

  if (existingPlaytest && editing) {
    return (
      <div className="mt-5 rounded-xl border border-[#77f29b]/20 bg-black/20 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
              Manage playtest
            </p>

            <h4 className="mt-2 text-xl font-semibold">{gameTitle}</h4>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Manage the current testing round, community sharing and player
              feedback from one place.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={cancelManaging}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setSetupExpanded((current) => !current)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                    Playtest setup
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Build access, instructions, focus and tester settings.
                  </p>
                </div>

                <span className="text-lg text-zinc-400">
                  {setupExpanded ? "−" : "+"}
                </span>
              </button>

              {setupExpanded && (
                <form
                  className="space-y-6 border-t border-white/10 p-5"
                  onSubmit={handleUpdate}
                >
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">
                      How will testers access this build?
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      This controls the action testers see when they start testing.
                    </span>
                    <select
                      value={accessType}
                      onChange={(event) =>
                        setAccessType(event.target.value as PlaytestAccessType)
                      }
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                    >
                      <option value="steam_demo">Steam demo</option>
                      <option value="steam_game">Steam game</option>
                      <option value="browser_game">Browser game</option>
                      <option value="download_build">Downloadable build</option>
                      <option value="other">Other external access</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">
                      Tester access link
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      The exact page or download location testers should use for this round.
                      Do not replace it with a materially different build once results have
                      been collected. Start a new playtest for a new release instead.
                    </span>

                    <input
                      type="url"
                      required
                      value={accessLink}
                      onChange={(event) => setAccessLink(event.target.value)}
                      placeholder="https://..."
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">
                      Testing instructions
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      Explain what testers should play and anything they need
                      to know.
                    </span>

                    <textarea
                      required
                      minLength={20}
                      maxLength={5000}
                      rows={4}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      placeholder="For this test, please play through the opening section and focus on how clear the controls and objectives feel."
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                    />
                  </label>

                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      What should testers focus on?
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Select as many areas as you need.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {focusOptions.map((area) => {
                        const selected = focusAreas.includes(area);

                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleFocusArea(area)}
                            className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                              selected
                                ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]"
                                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Testing audience
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Choose independent Playtested testers, your own community,
                      or both.
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAudience(
                            includesPlaytestedTesters(audience)
                              ? audience === "both"
                                ? "own_community"
                                : "own_community"
                              : "both"
                          )
                        }
                        className={`rounded-lg border p-4 text-left transition ${
                          includesPlaytestedTesters(audience)
                            ? "border-[#77f29b]/40 bg-[#77f29b]/[0.07]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              includesPlaytestedTesters(audience)
                                ? "border-[#77f29b] bg-[#77f29b] text-black"
                                : "border-white/20 text-transparent"
                            }`}
                          >
                            ✓
                          </span>

                          <div>
                            <p className="text-sm font-semibold text-zinc-100">
                              Playtested testers
                            </p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              Available in Tester Hub.
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAudience(
                            includesOwnCommunity(audience)
                              ? audience === "both"
                                ? "playtested_testers"
                                : "playtested_testers"
                              : "both"
                          )
                        }
                        className={`rounded-lg border p-4 text-left transition ${
                          includesOwnCommunity(audience)
                            ? "border-[#77f29b]/40 bg-[#77f29b]/[0.07]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              includesOwnCommunity(audience)
                                ? "border-[#77f29b] bg-[#77f29b] text-black"
                                : "border-white/20 text-transparent"
                            }`}
                          >
                            ✓
                          </span>

                          <div>
                            <p className="text-sm font-semibold text-zinc-100">
                              My own community
                            </p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              Invite players with the share link.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {includesPlaytestedTesters(audience) && (
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-200">
                        Target Playtested testers
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        Community responses are counted separately.
                      </span>

                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={targetTesters}
                        onChange={(event) =>
                          setTargetTesters(event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                      />
                    </label>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-200">
                        Estimated test time
                      </span>

                      <select
                        value={estimatedMinutes}
                        onChange={(event) =>
                          setEstimatedMinutes(event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                      >
                        <option value="">Not specified</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1 hour 30 minutes</option>
                        <option value="120">2 hours</option>
                        <option value="180">3+ hours</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-200">
                        Build / release label
                      </span>

                      <input
                        type="text"
                        maxLength={100}
                        value={releaseLabel}
                        onChange={(event) =>
                          setReleaseLabel(event.target.value)
                        }
                        placeholder="Demo 0.3"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
                      />
                    </label>
                  </div>

                  {message && (
                    <div
                      role={messageType === "error" ? "alert" : "status"}
                      className={`rounded-lg border p-4 text-sm ${
                        messageType === "error"
                          ? "border-red-400/40 bg-red-400/10 text-red-200"
                          : "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#b9f9ca]"
                      }`}
                    >
                      {message}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : existingPlaytest.status === "draft"
                          ? "Publish playtest"
                          : "Save changes"}
                    </button>

                    {existingPlaytest.status === "open" && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void updatePlaytest("paused")}
                        className="rounded-lg border border-sky-300/20 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:border-sky-300/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Pause playtest
                      </button>
                    )}

                    {existingPlaytest.status === "paused" && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void updatePlaytest("open")}
                        className="rounded-lg border border-[#77f29b]/25 px-5 py-3 text-sm font-semibold text-[#77f29b] transition hover:border-[#77f29b]/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Resume playtest
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Close this playtest? Existing results will be preserved, but new testers will no longer be able to join."
                          )
                        ) {
                          void updatePlaytest("closed");
                        }
                      }}
                      className="rounded-lg border border-red-400/20 px-5 py-3 text-sm font-semibold text-red-300 transition hover:border-red-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Close playtest
                    </button>
                  </div>
                </form>
              )}
            </section>

            {includesOwnCommunity(audience) && (
              <section className="rounded-xl border border-violet-300/20 bg-violet-300/[0.04]">
                <button
                  type="button"
                  onClick={() => setSharingExpanded((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                      Community sharing
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Share this Playtested link with your own players.
                    </p>
                  </div>

                  <span className="text-lg text-zinc-400">
                    {sharingExpanded ? "−" : "+"}
                  </span>
                </button>

                {sharingExpanded && (
                  <div className="border-t border-white/10 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        readOnly
                        value={getCommunityPlaytestUrl(
                          existingPlaytest.shareToken
                        )}
                        onFocus={(event) => event.currentTarget.select()}
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-zinc-300 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => void copyCommunityLink()}
                        className="rounded-lg border border-violet-300/25 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:border-violet-300/50 hover:text-violet-100"
                      >
                        {communityLinkCopied ? "Copied" : "Copy link"}
                      </button>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-zinc-500">
                      Share it in Discord, Reddit, social media, email or your
                      existing community.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          <section className="rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setResultsExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                  Playtest results
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Snapshot, player feedback and individual responses.
                </p>
              </div>
              <span className="text-lg text-zinc-400">{resultsExpanded ? "−" : "+"}</span>
            </button>

            {resultsExpanded && (
              <div className="border-t border-white/10 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-zinc-500">
                    Community feedback remains separate from independent Playtested verification evidence.
                  </p>
                  <button
                    type="button"
                    disabled={resultsLoading}
                    onClick={() => void loadPlaytestResults(existingPlaytest.id)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                  >
                    {resultsLoading ? "Refreshing..." : "Refresh results"}
                  </button>
                </div>

                {resultsError && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
                    {resultsError}
                  </div>
                )}

                {resultsLoading && !playtestResults && !playtestedProgress ? (
                  <p className="text-sm text-zinc-400">Loading playtest results...</p>
                ) : (
                  <ResultsDashboard
                    playtest={existingPlaytest}
                    communityResults={playtestResults}
                    independentProgress={playtestedProgress}
                    acceptedFeedback={acceptedIndependentFeedback}
                  />
                )}
              </div>
            )}
          </section>
        </div>

        {historicalPlaytests.length > 0 && (
          <section className="mt-6 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Playtest history
            </p>

            <h5 className="mt-2 text-base font-semibold text-zinc-100">
              Previous rounds
            </h5>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Closed playtests and their results stay attached to this game.
              Starting a new round does not overwrite earlier feedback.
            </p>

            <div className="mt-4 space-y-3">
              {historicalPlaytests.map((playtest) => (
                <HistoricalPlaytestCard
                  key={playtest.id}
                  playtest={playtest}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (!open && existingPlaytest) {
    return (
      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${playtestStatusClasses(
                  existingPlaytest.status
                )}`}
              >
                {existingPlaytest.status === "open" && (
                  <span className="mr-1.5">●</span>
                )}

                {playtestStatusLabel(existingPlaytest.status)}
              </span>

              {existingPlaytest.releaseLabel && (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                  {existingPlaytest.releaseLabel}
                </span>
              )}
            </div>

            <h4 className="mt-4 text-lg font-semibold text-zinc-100">
              {existingPlaytest.status === "open"
                ? "Players can test this game"
                : existingPlaytest.status === "draft"
                  ? "Playtest setup in progress"
                  : existingPlaytest.status === "paused"
                    ? "This playtest is paused"
                    : "Previous playtest"}
            </h4>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {existingPlaytest.status === "open"
                ? "This playtest is published and available to the selected testing audience."
                : existingPlaytest.status === "draft"
                  ? "This playtest has been saved but is not visible to testers yet."
                  : existingPlaytest.status === "paused"
                    ? "This playtest is currently unavailable to new testers."
                    : "This playtest has finished and is no longer accepting new testers."}
            </p>
          </div>

          {existingPlaytest.status !== "closed" && (
            <button
              type="button"
              onClick={startManaging}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-[#77f29b]/40 hover:text-[#77f29b]"
            >
              Manage playtest
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {includesPlaytestedTesters(existingPlaytest.audience)
                ? "Playtested target"
                : "Target"}
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {includesPlaytestedTesters(existingPlaytest.audience)
                ? `${existingPlaytest.targetTesters} ${
                    existingPlaytest.targetTesters === 1
                      ? "tester"
                      : "testers"
                  }`
                : "Community testers"}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Test time
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {existingPlaytest.estimatedMinutes
                ? `~${existingPlaytest.estimatedMinutes} minutes`
                : "Not specified"}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Audience
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {audienceLabel(existingPlaytest.audience)}
            </p>
          </div>
        </div>

        {includesOwnCommunity(existingPlaytest.audience) && (
          <div className="mt-5 rounded-lg border border-violet-300/20 bg-violet-300/[0.05] p-4">
            <p className="font-semibold text-violet-200">
              Community testing link
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Share this Playtested link in Discord, Reddit, social
              media, email or anywhere else your community gathers.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                readOnly
                value={getCommunityPlaytestUrl(
                  existingPlaytest.shareToken
                )}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-zinc-300 outline-none"
              />

              <button
                type="button"
                onClick={() => void copyCommunityLink()}
                className="rounded-lg border border-violet-300/25 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:border-violet-300/50 hover:text-violet-100"
              >
                {communityLinkCopied ? "Copied" : "Copy link"}
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-amber-200/80">
              The public playtest page is being added next. Keep this
              link private until that page is ready.
            </p>
          </div>
        )}

        {existingPlaytest.focusAreas.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Testing focus
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {existingPlaytest.focusAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs text-[#b9f9ca]"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div
            role={
              messageType === "error" ? "alert" : "status"
            }
            className={`mt-5 rounded-lg border p-4 text-sm ${
              messageType === "error"
                ? "border-red-400/40 bg-red-400/10 text-red-200"
                : "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#b9f9ca]"
            }`}
          >
            {message}
          </div>
        )}

        {existingPlaytest.status === "closed" && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77f29b]">
                  Results
                </p>
                <h5 className="mt-2 text-base font-semibold text-zinc-100">
                  Final playtest results
                </h5>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                  These results belong to this closed playtest and remain
                  attached to this release when you start another round.
                </p>
              </div>

              <button
                type="button"
                disabled={resultsLoading}
                onClick={() => void loadPlaytestResults(existingPlaytest.id)}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                {resultsLoading ? "Refreshing..." : "Refresh results"}
              </button>
            </div>

            {resultsError && (
              <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
                {resultsError}
              </div>
            )}

            {resultsLoading && !playtestResults && !playtestedProgress && (
              <p className="mt-4 text-sm text-zinc-400">
                Loading final results...
              </p>
            )}

            <div className="mt-5">
              <ResultsDashboard
                playtest={existingPlaytest}
                communityResults={playtestResults}
                independentProgress={playtestedProgress}
                acceptedFeedback={acceptedIndependentFeedback}
              />
            </div>

          </div>
        )}

        {historicalPlaytests.length > 0 && (
          <section className="mt-6 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Playtest history
            </p>
            <h5 className="mt-2 text-base font-semibold text-zinc-100">
              Previous rounds
            </h5>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Closed playtests and their results stay attached to this
              game. Starting a new round does not overwrite earlier
              feedback.
            </p>

            <div className="mt-4 space-y-3">
              {historicalPlaytests.map((playtest) => (
                <HistoricalPlaytestCard
                  key={playtest.id}
                  playtest={playtest}
                />
              ))}
            </div>
          </section>
        )}

        {existingPlaytest.status === "closed" && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => {
                resetNewPlaytestForm();
                setOpen(true);
              }}
              className="rounded-lg bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
            >
              Start another playtest
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black/10 p-5">
        <p className="font-semibold text-zinc-200">
          No active playtest
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Start a playtest to collect structured feedback from
          players about this game.
        </p>

        <button
          type="button"
          onClick={() => {
            resetNewPlaytestForm();
            setOpen(true);
          }}
          className="mt-4 rounded-lg bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
        >
          Start playtest
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-[#77f29b]/20 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
            New playtest
          </p>

          <h4 className="mt-2 text-lg font-semibold">
            Start testing {gameTitle}
          </h4>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Give testers access to the game and tell them what you
            want feedback on.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
        >
          Close
        </button>
      </div>

      <form
        className="mt-6 space-y-6"
        onSubmit={handlePublish}
      >
        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            How will testers access this build?
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Choose the access method so Playtested can show testers the right action.
          </span>
          <select
            value={accessType}
            onChange={(event) =>
              setAccessType(event.target.value as PlaytestAccessType)
            }
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          >
            <option value="steam_demo">Steam demo</option>
            <option value="steam_game">Steam game</option>
            <option value="browser_game">Browser game</option>
            <option value="download_build">Downloadable build</option>
            <option value="other">Other external access</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Tester access link
          </span>

          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Paste the exact Steam page, browser game, private build or download
            location testers should use for this playtest round.
          </span>

          <input
            type="url"
            required
            value={accessLink}
            onChange={(event) =>
              setAccessLink(event.target.value)
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Testing instructions
          </span>

          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Explain what testers should play and anything they need
            to know.
          </span>

          <textarea
            required
            minLength={20}
            maxLength={5000}
            rows={5}
            value={instructions}
            onChange={(event) =>
              setInstructions(event.target.value)
            }
            placeholder="For this test, please play through the opening section and focus on how clear the controls and objectives feel."
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        <div>
          <p className="text-sm font-medium text-zinc-200">
            What should testers focus on?
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Select as many areas as you need.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {focusOptions.map((area) => {
              const selected = focusAreas.includes(area);

              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleFocusArea(area)}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    selected
                      ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Testing audience
          </span>

          <select
            value={audience}
            onChange={(event) =>
              setAudience(
                event.target.value as PlaytestAudience
              )
            }
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          >
            <option value="playtested_testers">
              Playtested testers
            </option>

            <option value="own_community">
              My own community
            </option>

            <option value="both">
              Playtested testers + my community
            </option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-200">
              Target Playtested testers
            </span>

            <input
              type="number"
              required
              min="1"
              max="100"
              value={targetTesters}
              onChange={(event) =>
                setTargetTesters(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-200">
              Estimated test time
            </span>

            <select
              value={estimatedMinutes}
              onChange={(event) =>
                setEstimatedMinutes(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
            >
              <option value="">Not specified</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1 hour 30 minutes</option>
              <option value="120">2 hours</option>
              <option value="180">3+ hours</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Build / release label
          </span>

          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Optional. For example: Demo 0.3, Alpha 2 or October
            build.
          </span>

          <input
            type="text"
            maxLength={100}
            value={releaseLabel}
            onChange={(event) =>
              setReleaseLabel(event.target.value)
            }
            placeholder="Demo 0.3"
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        {message && (
          <div
            role={
              messageType === "error" ? "alert" : "status"
            }
            className={`rounded-lg border p-4 text-sm ${
              messageType === "error"
                ? "border-red-400/40 bg-red-400/10 text-red-200"
                : "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#b9f9ca]"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Publishing..."
              : "Publish playtest"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void createPlaytest(false)}
            className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

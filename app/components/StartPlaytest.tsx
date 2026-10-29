"use client";
import {intentCounts,intentText} from "@/lib/intent-counts";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "../../lib/supabase";

import { CampaignPlaces, FeedbackSignal, useTestingCapacityPolicy, PlacesRules } from "./TestingPolicy";
import { CampaignAudienceFields, audienceSelectionKey, type AudienceAvailability } from "./CampaignAudienceFields";
import {useDeveloperPlan,allowanceError} from "./DeveloperPlan";
import {openGameTraffic} from "./GameLinksEngagement";
import { FeedbackActions } from "./FeedbackActions";
import { summarizePlaytime, formatPlaytime } from "@/lib/playtime";

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
  overall_score: number | null;
  gameplay_score: number | null;
  performance_score: number | null;
  continue_playing: string | null;
  recommend_game: string | null;
  enjoyed_most: string | null;
  frustrations: string | null;
  bugs_found: string | null;
  biggest_improvement: string | null;
  feedback: string | null;
  hours_played: number | null;
  focus_responses: Record<string, unknown> | null;
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

type PlaytestEligibility = {
  has_active_playtest: boolean;
  active_playtest_id: string | null;
  active_playtest_status: string | null;
  tester_hub_eligible: boolean;
  tester_hub_reason: string;
  next_tester_hub_at: string | null;
  tester_hub_rounds_last_30_days: number;
};

function CampaignAllowancePanel({eligibility,loading,error,currentPlaytest,onRetry}:{eligibility:PlaytestEligibility|null;loading:boolean;error:string;currentPlaytest:ExistingPlaytest|null;onRetry:()=>void}){
 const active=currentPlaytest?.status==="open"||currentPlaytest?.status==="paused"||(eligibility?.has_active_playtest&&["open","paused"].includes(eligibility.active_playtest_status||""));
 return <>{active&&<p className="my-3 text-sm text-amber-200">This game's current round must be closed before another round can launch.</p>}{error&&<p role="alert" className="my-3 text-sm text-amber-200">{error} <button type="button" onClick={onRetry} disabled={loading} className="rounded border border-amber-300/30 px-3 py-2">Retry eligibility</button></p>}</>;
}

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
                Free Hub capacity
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">
                {includesPlaytestedTesters(playtest.audience)
                  ? `${playtest.targetTesters} Tester Hub places`
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
                            Test history
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
                                <FeedbackSignal testId={response.test_id} />
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


const FEEDBACK_STRESS_TEST_PLAYTEST_ID =
  "a2fe9b0b-f556-4517-86c5-9687c33c8f40";

const feedbackStressTestReviews: AcceptedIndependentFeedback[] = [
  {
    test_id: "preview-negative-1",
    overall_score: 3,
    gameplay_score: 4,
    performance_score: 5,
    continue_playing: "definitely_not",
    recommend_game: "probably_not",
    enjoyed_most:
      "Some of the environments have a nice atmosphere and the basic idea has potential.",
    frustrations:
      "I spent too much time trying to work out what I was meant to do. The opening gives very little direction and I never felt properly introduced to the mechanics.",
    bugs_found:
      "The game froze when changing areas and there was noticeable stuttering during movement.",
    biggest_improvement:
      "Add a proper introduction or tutorial that explains the objective and basic mechanics before leaving the player on their own.",
    feedback: null,
    hours_played: 0.8,
    focus_responses: { preview_stress_test: true },
    submitted_at: "2026-10-20T18:00:00.000Z",
  },
  {
    test_id: "preview-negative-2",
    overall_score: 2,
    gameplay_score: 3,
    performance_score: 4,
    continue_playing: "definitely_not",
    recommend_game: "definitely_not",
    enjoyed_most:
      "The premise sounded interesting and a few individual scenes looked good.",
    frustrations:
      "The dialogue felt generic and disconnected from what was happening. Characters often sounded like they were delivering filler rather than reacting to the situation.",
    bugs_found:
      "I had two crashes in the first hour and one loading screen hung until I restarted.",
    biggest_improvement:
      "The writing needs a substantial pass. Give the characters clearer personalities and make conversations feel connected to what the player is doing.",
    feedback:
      "At the moment the different parts do not feel connected into a finished game with a consistent identity.",
    hours_played: 1.1,
    focus_responses: { preview_stress_test: true },
    submitted_at: "2026-10-21T18:00:00.000Z",
  },
  {
    test_id: "preview-negative-3",
    overall_score: 3,
    gameplay_score: 3,
    performance_score: 6,
    continue_playing: "probably_not",
    recommend_game: "probably_not",
    enjoyed_most:
      "Some of the artwork looks good individually and performance was reasonable once I was actually playing.",
    frustrations:
      "The gameplay became repetitive quickly. I kept doing similar actions without enough progression or new mechanics being introduced.",
    bugs_found:
      "There were several short freezes and some animation glitches, although I did not have a full crash.",
    biggest_improvement:
      "Add more gameplay depth and a stronger sense of progression so there is a reason to keep playing beyond seeing the next environment.",
    feedback: null,
    hours_played: 1.4,
    focus_responses: { preview_stress_test: true },
    submitted_at: "2026-10-22T18:00:00.000Z",
  },
  {
    test_id: "preview-negative-4",
    overall_score: 4,
    gameplay_score: 5,
    performance_score: 5,
    continue_playing: "maybe",
    recommend_game: "probably_not",
    enjoyed_most:
      "I liked the colour palette and there were a few moments where exploring was enjoyable.",
    frustrations:
      "The presentation feels inconsistent. Some areas look polished while others have a noticeably different visual style, so the world does not feel cohesive.",
    bugs_found:
      "Performance dipped badly in one larger area and objects sometimes popped into view close to the player.",
    biggest_improvement:
      "Make the visual direction more consistent so the assets feel like they belong to the same game.",
    feedback: null,
    hours_played: 0.9,
    focus_responses: { preview_stress_test: true },
    submitted_at: "2026-10-23T18:00:00.000Z",
  },
  {
    test_id: "preview-negative-5",
    overall_score: 2,
    gameplay_score: 2,
    performance_score: 3,
    continue_playing: "definitely_not",
    recommend_game: "definitely_not",
    enjoyed_most:
      "There are some decent ideas underneath the current build.",
    frustrations:
      "Technical problems kept interrupting the session. After several restarts I stopped trusting that I could make progress without losing it.",
    bugs_found:
      "Three crashes, one failed startup and a section where the game stopped responding completely.",
    biggest_improvement:
      "Stability should be the priority. Fix the crashes and startup reliability before adding more content.",
    feedback:
      "I would not recommend the current build because the technical problems interfere with actually playing it.",
    hours_played: 0.7,
    focus_responses: { preview_stress_test: true },
    submitted_at: "2026-10-24T18:00:00.000Z",
  },
  {
    test_id: "preview-negative-6",
    overall_score: 4,
    gameplay_score: 4,
    performance_score: 6,
    continue_playing: "probably_not",
    recommend_game: "maybe",
    enjoyed_most:
      "The environments can look striking and I can see the type of experience the developer is aiming for.",
    frustrations:
      "The story did not give me enough reason to care about what was happening. Objectives were vague and several conversations felt unnatural.",
    bugs_found:
      "There was stuttering and a couple of interactions did not respond on the first attempt.",
    biggest_improvement:
      "Give the game a clearer opening, stronger objectives and more deliberate writing so the player understands why they should care.",
    feedback:
      "There are promising pieces here, but they do not yet feel connected into a convincing complete experience.",
    hours_played: 1.2,
    focus_responses: { preview_stress_test: true },
    submitted_at: "2026-10-25T18:00:00.000Z",
  },
];

type FeedbackTab="said"|"follow-up"|"individual";
const feedbackTabs=[["said","What testers said"],["follow-up","Feedback to follow up"],["individual","Individual responses"]] as const;

function ResultsDashboard({
  playtest,
  communityResults,
  independentProgress,
  acceptedFeedback,feedbackTab,onFeedbackTabChange,actionFilter,onActionFilterChange,
}: {
  playtest: ExistingPlaytest;
  communityResults: CommunityPlaytestResults | null;
  independentProgress: PlaytestedTestProgress | null;
  acceptedFeedback: AcceptedIndependentFeedback[];
  feedbackTab?:FeedbackTab;onFeedbackTabChange?:(tab:FeedbackTab)=>void;actionFilter?:string;onActionFilterChange?:(filter:string)=>void;
}) {
  const [snapshotExpanded,setSnapshotExpanded]=useState(true);
  const [localTab,setLocalTab]=useState<FeedbackTab>('said');
  const [localActionFilter,setLocalActionFilter]=useState('All reports');
  const activeTab=feedbackTab??localTab;
  const changeTab=onFeedbackTabChange??setLocalTab;
  const feedbackTabRefs=useRef<Array<HTMLButtonElement|null>>([]);
  const feedbackPanelRef=useRef<HTMLElement>(null);
  const issueResponsesRef=useRef<HTMLDivElement>(null);
  const feedbackId=useId();
  const issueResponsesId=useId();
  const individualResponsesId=feedbackId+'-panel-individual';
  const [navigation,setNavigation]=useState<{target:'issues'|'individual'}|null>(null);
  const handledNavigation=useRef<typeof navigation>(null);
  function revealFeedback(target:'issues'|'individual'){changeTab(target==='issues'?'said':'individual');setNavigation({target});}
  useEffect(()=>{if(!navigation||navigation===handledNavigation.current)return;const target=navigation.target==='issues'?issueResponsesRef.current:feedbackPanelRef.current;if(!target)return;handledNavigation.current=navigation;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[navigation,activeTab,playtest.id]);

  const isFeedbackStressTest =
    process.env.NODE_ENV === "development" && playtest.id === FEEDBACK_STRESS_TEST_PLAYTEST_ID;

  const displayedAcceptedFeedback = isFeedbackStressTest
    ? [...acceptedFeedback, ...feedbackStressTestReviews]
    : acceptedFeedback;

  const communityResponses = communityResults?.responses ?? [];
  const independentCount = displayedAcceptedFeedback.length;
  const communityCount = communityResponses.length;
  const totalResponses = independentCount + communityCount;
  // Real accepted evidence only: preview fixtures never complete a target.
  const acceptedForTarget = independentProgress?.accepted_count ?? acceptedFeedback.length;



  const averageGameplay = averageScore([
    ...displayedAcceptedFeedback.map((response) => response.gameplay_score),
    ...communityResponses.map((response) => response.gameplay_score),
  ]);

  const averagePerformance = averageScore([
    ...displayedAcceptedFeedback.map((response) => response.performance_score),
    ...communityResponses.map((response) => response.performance_score),
  ]);

  const averageOverall = averageScore([
    ...displayedAcceptedFeedback.map((response) => response.overall_score),
    ...communityResponses.map((response) => response.overall_score),
  ]);

  const playtime = summarizePlaytime(displayedAcceptedFeedback.map(response => response.hours_played));

  const independentBugs = displayedAcceptedFeedback.filter(
    (response) => response.bugs_found?.trim()
  );
  const communityBugs = communityResponses.filter(
    (response) => response.bugs?.trim()
  );
  const bugReportCount = independentBugs.length + communityBugs.length;

  const continueAnswers = displayedAcceptedFeedback
    .map((response) => response.continue_playing?.trim().toLowerCase())
    .filter((value): value is string => ["definitely","probably","maybe","probably_not","definitely_not"].includes(value||""));

  const recommendAnswers = displayedAcceptedFeedback
    .map((response) => response.recommend_game?.trim().toLowerCase())
    .filter((value): value is string => ["definitely","probably","maybe","probably_not","definitely_not"].includes(value||""));

  function positiveIntentPercent(values: string[]) {
    if (values.length === 0) {
      return null;
    }

    const positive = values.filter(
      (value) => value === "definitely" || value === "probably"
    ).length;

    return Math.round((positive / values.length) * 100);
  }

  const continuePercent = positiveIntentPercent(continueAnswers);
  const recommendPercent = positiveIntentPercent(recommendAnswers);

  const ratedOverallCount = displayedAcceptedFeedback.filter(
    (response) => response.overall_score !== null
  ).length;

  const hasReliableReceptionSample = ratedOverallCount >= 5;
  const poorReception =
    hasReliableReceptionSample &&
    averageOverall !== null &&
    averageOverall < 5 &&
    (continuePercent ?? 100) < 40 &&
    (recommendPercent ?? 100) < 40;

  function score(value: number | null) {
    return value === null ? "—" : `${value}/10`;
  }

  function intent(value: string | null) {
    if (!value) {
      return "Not answered";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const enjoyedResponses = [
    ...displayedAcceptedFeedback
      .filter((response) => response.enjoyed_most?.trim())
      .map((response, index) => ({
        id: `independent-enjoyed-${response.test_id}`,
        source: `Playtested ${index + 1}`,
        sourceClass: "text-[#77f29b]",
        text: response.enjoyed_most as string,
      })),
    ...communityResponses
      .filter((response) => response.enjoyed?.trim())
      .map((response, index) => ({
        id: `community-enjoyed-${response.feedback_id}`,
        source: `Community ${index + 1}`,
        sourceClass: "text-violet-200",
        text: response.enjoyed,
      })),
  ];

  const frustrationResponses = [
    ...displayedAcceptedFeedback
      .filter((response) => response.frustrations?.trim())
      .map((response, index) => ({
        id: `independent-frustration-${response.test_id}`,
        source: `Playtested ${index + 1}`,
        sourceClass: "text-[#77f29b]",
        text: response.frustrations as string,
      })),
    ...communityResponses
      .filter((response) => response.struggled?.trim())
      .map((response, index) => ({
        id: `community-frustration-${response.feedback_id}`,
        source: `Community ${index + 1}`,
        sourceClass: "text-violet-200",
        text: response.struggled,
      })),
  ];

  const improvementResponses = [
    ...displayedAcceptedFeedback
      .filter((response) => response.biggest_improvement?.trim())
      .map((response, index) => ({
        id: `independent-improvement-${response.test_id}`,
        source: `Playtested ${index + 1}`,
        sourceClass: "text-[#77f29b]",
        text: response.biggest_improvement as string,
      })),
    ...communityResponses
      .filter((response) => response.improvements?.trim())
      .map((response, index) => ({
        id: `community-improvement-${response.feedback_id}`,
        source: `Community ${index + 1}`,
        sourceClass: "text-violet-200",
        text: response.improvements,
      })),
  ];

  return (
    <div className="space-y-5">
      {playtest.focusAreas.length>0&&<div aria-label="Testing focus" className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-zinc-300">Testing focus</span>{playtest.focusAreas.map(focus=><span key={focus} className="rounded bg-white/5 px-2 py-1 text-zinc-300">{focus}</span>)}</div>}
      <section aria-label="Results snapshot" className="overflow-hidden rounded-xl border border-[#77f29b]/20 bg-[#0c100e]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0"><h5 className="text-sm font-semibold text-[#77f29b]">Results snapshot</h5><p className="mt-1 break-words text-sm text-zinc-400">{playtest.releaseLabel?`Build: ${playtest.releaseLabel}`:"Current playtest round"}</p><p className="mt-1 text-sm text-zinc-400">{independentCount} accepted independent | {communityCount} community{isFeedbackStressTest?" | Includes labelled preview responses":""}</p></div>
          <button type="button" aria-expanded={snapshotExpanded} aria-controls={feedbackId+'-snapshot'} onClick={()=>setSnapshotExpanded(value=>!value)} className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-emerald-300">{snapshotExpanded?"Hide results":"Show results"} <span aria-hidden="true">{snapshotExpanded?'\u25b4':'\u25be'}</span></button>
        </div>
        <div id={feedbackId+'-snapshot'} hidden={!snapshotExpanded} className="p-3 sm:p-4">

          {poorReception && (
            <div className="mb-4 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-red-300/25 bg-red-300/[0.08] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-red-200">
                  Poor reception
                </span>
                <span className="text-xs text-zinc-500">
                  Based on {ratedOverallCount} rated accepted responses
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-300">
                Tester sentiment is currently negative across multiple independent responses.
                Review the feedback below for the specific issues testers reported.
              </p>
            </div>
          )}

          <p className="mt-2 text-sm text-zinc-500">{totalResponses<10?"Early feedback: results are directional while the sample is small.":"Feedback sample for this build."}</p>

          <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]">
            <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.04] p-4">
              <p className="text-xs text-zinc-500">Overall experience</p>
              <p className="mt-2 text-2xl font-semibold text-[#77f29b]">
                {score(averageOverall)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {displayedAcceptedFeedback.filter((response) => response.overall_score !== null).length} rated response{displayedAcceptedFeedback.filter((response) => response.overall_score !== null).length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.035] p-4">
              <p className="text-xs text-zinc-500">Would continue playing</p>
              <p className="mt-2 text-xl font-semibold text-cyan-200">
                {intentText(intentCounts(continueAnswers))}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {continueAnswers.length === 0
                  ? "No answers yet"
                  : `${continueAnswers.filter((value) => value === "definitely").length} definitely · ${continueAnswers.filter((value) => value === "probably").length} probably`}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">Independent testers who answered</p>
            </div>

            <div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.035] p-4">
              <p className="text-xs text-zinc-500">Would recommend</p>
              <p className="mt-2 text-xl font-semibold text-violet-200">
                {intentText(intentCounts(recommendAnswers))}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {recommendAnswers.length === 0
                  ? "No answers yet"
                  : `${recommendAnswers.filter((value) => value === "definitely").length} definitely · ${recommendAnswers.filter((value) => value === "probably").length} probably`}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">Independent testers who answered</p>
            </div>

            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4">
              <p className="text-xs text-zinc-500">Average play time</p>
              <p className="mt-2 text-xl font-semibold text-amber-200 [overflow-wrap:normal]">
                {formatPlaytime(playtime.averageHours)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">
                Playtested tester reports
              </p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4">
              <p className="text-xs text-zinc-500">Total reported playtime</p>
              <p className="mt-2 text-xl font-semibold text-amber-200 [overflow-wrap:normal]">{formatPlaytime(playtime.totalHours)}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Sum of {playtime.count} accepted independent report{playtime.count === 1 ? "" : "s"} for this build</p>
            </div>
          </div>


          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs text-zinc-500">Gameplay</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {score(averageGameplay)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs text-zinc-500">Performance</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {score(averagePerformance)}
              </p>
            </div>
            <div className="rounded-xl border border-red-300/15 bg-red-300/[0.025] p-4">
              <p className="text-xs text-zinc-500">Issue responses</p>
              <p className="mt-1 text-lg font-semibold text-red-200">
                {bugReportCount}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {totalResponses === 0
                  ? "No feedback yet"
                  : `${bugReportCount} of ${totalResponses} reports include issue notes`}
              </p>
              {bugReportCount > 0 && (
                <button
                  type="button"
                  aria-controls={issueResponsesId}
                  onClick={() => revealFeedback("issues")}
                  className="mt-2 text-xs font-semibold text-red-200 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  Read issue responses →
                </button>
              )}
            </div>
          </div>



        </div>
      </section>
      {includesPlaytestedTesters(playtest.audience)&&<section aria-label="Tester Hub feedback progress" className="space-y-2 border-y border-white/10 py-3 text-sm">
        <CampaignPlaces id={playtest.id} compact/>
        <div className="flex flex-wrap items-center justify-between gap-3"><p>{acceptedForTarget} quality-accepted reports{independentProgress&&independentProgress.total_testers!==acceptedForTarget?` | ${independentProgress.total_testers} participating testers`:""}</p><button type="button" aria-controls={individualResponsesId} onClick={()=>revealFeedback('individual')} className="rounded-lg border border-white/20 px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-emerald-300">View individual responses</button></div>
        <details className="text-sm text-zinc-400"><summary className="w-fit cursor-pointer py-2 font-semibold">How places and review work</summary><PlacesRules inline/><p className="mt-2">Quality review measures feedback usefulness. Submitted reports consume capacity regardless of acceptance; community responses are separate.</p>{independentProgress&&<p className="mt-2">Tester Hub statuses: {independentProgress.submitted_count} submitted | {independentProgress.accepted_count} accepted | {independentProgress.rejected_count} not accepted.</p>}<p className="mt-2">Campaigns do not close automatically. {playtest.status==='closed'?'This round is closed.':'Review the responses before deciding when to close this round.'}</p></details>
      </section>}

      <div role="tablist" aria-label="Build feedback" className="grid grid-cols-3 gap-1 border-b border-white/10">{feedbackTabs.map(([tab,label],index)=><button key={tab} ref={node=>{feedbackTabRefs.current[index]=node;}} type="button" role="tab" id={feedbackId+'-tab-'+tab} aria-selected={activeTab===tab} aria-controls={feedbackId+'-panel-'+tab} tabIndex={activeTab===tab?0:-1} onClick={()=>changeTab(tab)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;changeTab(feedbackTabs[next][0]);feedbackTabRefs.current[next]?.focus();}} className={`min-w-0 whitespace-normal border-b-2 px-2 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-emerald-300 sm:text-sm ${activeTab===tab?'border-emerald-300 text-emerald-200':'border-transparent text-zinc-400 hover:text-white'}`}>{label}</button>)}</div>
      <section key={playtest.id+activeTab} ref={feedbackPanelRef} role="tabpanel" id={feedbackId+'-panel-'+activeTab} aria-labelledby={feedbackId+'-tab-'+activeTab} tabIndex={0} className="min-w-0 w-full scroll-mt-6 py-4 focus-visible:outline-2 focus-visible:outline-emerald-300 sm:py-5">
       {activeTab==='said'&&<><p className="text-xs leading-5 text-zinc-400">Verbatim feedback for this build, grouped without rewriting tester responses.</p><div className="mt-4 grid gap-4">
          <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#77f29b]">
              Enjoyed most
            </p>
            <div className="mt-3 space-y-3">
              {enjoyedResponses.length === 0 ? (
                <p className="text-sm text-zinc-500">No responses yet.</p>
              ) : (
                enjoyedResponses.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <p className={`text-[11px] font-semibold ${item.sourceClass}`}>
                      {item.source}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-amber-200">
              Frustrations
            </p>
            <div className="mt-3 space-y-3">
              {frustrationResponses.length === 0 ? (
                <p className="text-sm text-zinc-500">No responses yet.</p>
              ) : (
                frustrationResponses.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <p className={`text-[11px] font-semibold ${item.sourceClass}`}>
                      {item.source}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-sky-300/20 bg-sky-300/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-sky-200">
              Suggested improvements
            </p>
            <div className="mt-3 space-y-3">
              {improvementResponses.length === 0 ? (
                <p className="text-sm text-zinc-500">No responses yet.</p>
              ) : (
                improvementResponses.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <p className={`text-[11px] font-semibold ${item.sourceClass}`}>
                      {item.source}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div ref={issueResponsesRef} id={issueResponsesId} tabIndex={-1} className="scroll-mt-6 rounded-xl border border-red-300/20 bg-red-300/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-red-200">
              Technical feedback
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Verbatim issue notes. Different testers may describe the same issue; these are not counts of unique bugs.</p>
            <div className="mt-3 space-y-3">
              {bugReportCount === 0 ? (
                <p className="text-sm text-zinc-500">
                  No bugs or technical issues reported.
                </p>
              ) : (
                <>
                  {independentBugs.map((response, index) => (
                    <div
                      key={`independent-bug-${response.test_id}`}
                      className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                      <p className="text-[11px] font-semibold text-[#77f29b]">
                        Playtested {index + 1}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {response.bugs_found}
                      </p>
                    </div>
                  ))}
                  {communityBugs.map((response, index) => (
                    <div
                      key={`community-bug-${response.feedback_id}`}
                      className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                      <p className="text-[11px] font-semibold text-violet-200">
                        Community {index + 1}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {response.bugs}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div></>}
       {activeTab==='follow-up'&&<FeedbackActions campaignId={playtest.id} filter={actionFilter??localActionFilter} onFilterChange={onActionFilterChange??setLocalActionFilter} compactHeading reports={[
        ...displayedAcceptedFeedback.map((response,index)=>({id:`independent:${response.test_id}`,source:`Playtested tester ${index+1}${isFeedbackStressTest ? " · includes preview data" : ""}`,date:response.submitted_at,enjoyed:response.enjoyed_most || response.feedback,frustration:response.frustrations,improvement:response.biggest_improvement,bugs:response.bugs_found})),
        ...communityResponses.map((response,index)=>({id:`community:${response.feedback_id}`,source:`Community tester ${index+1}`,date:response.submitted_at,enjoyed:response.enjoyed,frustration:response.struggled,improvement:response.improvements,bugs:response.bugs})),
      ]}/>}
       {activeTab==='individual'&&<><p className="text-xs leading-5 text-zinc-400">Open a report to read the complete response as submitted.</p><div className="mt-4 space-y-3">
          {displayedAcceptedFeedback.map((response, index) => (
            <details
              key={response.test_id}
              className="rounded-xl border border-[#77f29b]/15 bg-[#77f29b]/[0.025]"
            >
              <summary className="cursor-pointer list-none p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      Playtested tester {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {response.submitted_at
                        ? historyFormatDate(response.submitted_at)
                        : "Submission date unavailable"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-2.5 py-1 text-xs font-semibold text-[#b9f9ca]">
                    Independent · Accepted
                  </span>
                </div>
              </summary>

              <div className="border-t border-white/10 p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div>
                    <p className="text-xs text-zinc-500">Overall</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.overall_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Gameplay</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.gameplay_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Performance</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.performance_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Continue playing</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-200">
                      {intent(response.continue_playing)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Recommend</p>
                    <p className="mt-1 text-sm font-semibold text-violet-200">
                      {intent(response.recommend_game)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Time played</p>
                    <p className="mt-1 text-sm font-semibold text-amber-200">
                      {response.hours_played === null
                        ? "Not provided"
                        : `${response.hours_played} ${
                            response.hours_played === 1 ? "hour" : "hours"
                          }`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 ">
                  <div className="rounded-lg border border-[#77f29b]/15 bg-[#77f29b]/[0.025] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#77f29b]">
                      Enjoyed most
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {response.enjoyed_most || "Not answered."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.025] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                      Frustrations
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {response.frustrations || "Not answered."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-red-300/15 bg-red-300/[0.025] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-200">
                      Bugs & technical issues
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {response.bugs_found || "No bugs reported."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-sky-300/15 bg-sky-300/[0.025] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                      Biggest improvement
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {response.biggest_improvement || "Not answered."}
                    </p>
                  </div>
                </div>

                {response.feedback?.trim() && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Anything else
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {response.feedback}
                    </p>
                  </div>
                )}
              </div>
            </details>
          ))}

          {communityResponses.map((response, index) => (
            <details
              key={response.feedback_id}
              className="rounded-xl border border-violet-300/15 bg-violet-300/[0.025]"
            >
              <summary className="cursor-pointer list-none p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      Community tester {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {historyFormatDate(response.submitted_at)}
                    </p>
                  </div>
                  <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-2.5 py-1 text-xs font-semibold text-violet-200">
                    Community · {response.overall_score}/10
                  </span>
                </div>
              </summary>

              <div className="border-t border-white/10 p-4">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">Overall</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.overall_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Gameplay</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.gameplay_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Controls</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.controls_score)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Performance</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {score(response.performance_score)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
                  <p>
                    <span className="text-zinc-500">Enjoyed: </span>
                    {response.enjoyed}
                  </p>
                  <p>
                    <span className="text-zinc-500">Struggled: </span>
                    {response.struggled}
                  </p>
                  <p>
                    <span className="text-zinc-500">Improvements: </span>
                    {response.improvements}
                  </p>
                  <p>
                    <span className="text-zinc-500">Bugs: </span>
                    {response.bugs?.trim() ||
                      "No bugs or technical issues reported."}
                  </p>
                  <p>
                    <span className="text-zinc-500">Would recommend: </span>
                    {response.recommendation === "yes"
                      ? "Yes"
                      : response.recommendation === "maybe"
                        ? "Maybe"
                        : "No"}
                  </p>
                  {response.additional_comments?.trim() && (
                    <p>
                      <span className="text-zinc-500">
                        Additional comments:{" "}
                      </span>
                      {response.additional_comments}
                    </p>
                  )}
                </div>
              </div>
            </details>
          ))}

          {totalResponses === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-zinc-500">
              No accepted or completed responses yet.
            </div>
          )}
        </div></>}
      </section>
    </div>
  );
}


function BuildResultsPanel({
  currentPlaytest,
  playtests,
}: {
  currentPlaytest: ExistingPlaytest;
  playtests: ExistingPlaytest[];
}) {
  const allBuilds = [currentPlaytest, ...playtests.filter((p) => p.id !== currentPlaytest.id)]
    .filter((playtest, index, items) => items.findIndex((item) => item.id === playtest.id) === index)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [selectedId, setSelectedId] = useState(currentPlaytest.id);
  const [feedbackTab,setFeedbackTab]=useState<FeedbackTab>("said");
  const [actionFilters,setActionFilters]=useState<Record<string,string>>({});
  const resultsRoot=useRef<HTMLElement>(null);
  useEffect(()=>{const item=resultsRoot.current?.closest("[data-workspace-item]");if(!item)return;const observer=new MutationObserver(()=>{if(!item.hasAttribute("hidden"))setFeedbackTab("said");});observer.observe(item,{attributes:true,attributeFilter:["hidden"]});return()=>observer.disconnect();},[]);
  const [communityResults, setCommunityResults] = useState<CommunityPlaytestResults | null>(null);
  const [independentProgress, setIndependentProgress] = useState<PlaytestedTestProgress | null>(null);
  const [acceptedFeedback, setAcceptedFeedback] = useState<AcceptedIndependentFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedBuildId,setLoadedBuildId] = useState<string|null>(null);
  const resultRequest = useRef(0);

  const selectedPlaytest = allBuilds.find((playtest) => playtest.id === selectedId) ?? currentPlaytest;
  const isCurrent = selectedPlaytest.id === currentPlaytest.id;

  async function loadResults(playtestId: string) {
    const request=++resultRequest.current;
    setLoading(true);
    setError("");

    const supabase = createClient();
    try {
    const [communityResult, progressResult, feedbackResult] = await Promise.all([
      supabase.rpc("get_developer_community_playtest_results", { p_playtest_id: playtestId }),
      supabase.rpc("get_developer_playtested_test_progress", { p_playtest_id: playtestId }),
      supabase.rpc("get_developer_accepted_playtest_feedback", { p_playtest_id: playtestId }),
    ]);
    if(request!==resultRequest.current)return;
    setLoadedBuildId(playtestId);

    if (communityResult.error || progressResult.error || feedbackResult.error) {
      setCommunityResults(null);
      setIndependentProgress(null);
      setAcceptedFeedback([]);
      setError(
        communityResult.error?.message ??
          progressResult.error?.message ??
          feedbackResult.error?.message ??
          "Could not load results for this build."
      );
      setLoading(false);
      return;
    }

    setCommunityResults((communityResult.data ?? null) as CommunityPlaytestResults | null);
    const progressRows = (progressResult.data ?? []) as PlaytestedTestProgress[];
    setIndependentProgress(progressRows[0] ?? null);
    setAcceptedFeedback((feedbackResult.data ?? []) as AcceptedIndependentFeedback[]);
    setLoading(false);
    } catch {
      if(request!==resultRequest.current)return;
      setLoadedBuildId(playtestId);
      setError("Results could not be loaded. Use Refresh results to try again.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResults(selectedId);
    return()=>{resultRequest.current++;};
  }, [selectedId]);

  return (
    <section ref={resultsRoot} data-build-feedback tabIndex={-1} className="min-w-0 scroll-mt-6">
      <div className="border-b border-white/10 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-zinc-100">
              Feedback by build
            </h4>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Switch between tested builds to compare exactly what players reported in each round.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadResults(selectedPlaytest.id)}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh results"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {allBuilds.map((playtest) => {
            const selected = playtest.id === selectedPlaytest.id;
            const current = playtest.id === currentPlaytest.id;
            return (
              <button
                key={playtest.id}
                type="button"
                onClick={() => setSelectedId(playtest.id)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  selected
                    ? "border-[#77f29b]/45 bg-[#77f29b]/10 text-[#b9f9ca]"
                    : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                <span className="font-semibold">
                  {playtest.releaseLabel?.trim() || "Unlabelled build"}
                </span>
                {current && (
                  <span className="ml-2 rounded-full border border-[#77f29b]/25 bg-[#77f29b]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#77f29b]">
                    CURRENT
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{isCurrent ? "Current build" : "Historical build"}</span>
          <span>·</span>
          <span>{playtestStatusLabel(selectedPlaytest.status)}</span>
          <span>·</span>
          <span>{historyFormatDate(selectedPlaytest.publishedAt ?? selectedPlaytest.createdAt)}</span>
        </div>
      </div>

      <div className="py-4">
        {error && loadedBuildId===selectedPlaytest.id && (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading || loadedBuildId!==selectedPlaytest.id ? (
          <p className="text-sm text-zinc-400">Loading results for this build...</p>
        ) : !error ? (
          <ResultsDashboard
            feedbackTab={feedbackTab} onFeedbackTabChange={setFeedbackTab} actionFilter={actionFilters[selectedPlaytest.id]??"All reports"} onActionFilterChange={filter=>setActionFilters(previous=>({...previous,[selectedPlaytest.id]:filter}))}
            playtest={selectedPlaytest}
            communityResults={communityResults}
            independentProgress={independentProgress}
            acceptedFeedback={acceptedFeedback}
          />
        ) : null}
      </div>
    </section>
  );
}

export default function StartPlaytest({
  gameTitle,
  gameSource,
  existingPlaytest,
  playtests,
}: StartPlaytestProps) {
  const router = useRouter();
  const capacityPolicy=useTestingCapacityPolicy();
  const developerPlan=useDeveloperPlan();
  const [eligibilityRetry,setEligibilityRetry]=useState(0);
  const retryAllowance=()=>{void developerPlan.refresh();setEligibilityRetry(v=>v+1);};

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
  const [minimumRank,setMinimumRank] = useState(0);
  const [audienceAvailability,setAudienceAvailability] = useState<AudienceAvailability|null>(null);
  const [savedAudienceKey,setSavedAudienceKey] = useState<string|null>(null);
  const [settingsCampaignId,setSettingsCampaignId] = useState<string|null>(null);
  const [settingsError,setSettingsError] = useState("");
  const [testingGenre,setTestingGenre] = useState("");
  const [genreRestricted,setGenreRestricted] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [releaseLabel, setReleaseLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const [playtestResults, setPlaytestResults] =
    useState<CommunityPlaytestResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [playtestedProgress, setPlaytestedProgress] =
    useState<PlaytestedTestProgress | null>(null);
  const [acceptedIndependentFeedback, setAcceptedIndependentFeedback] =
    useState<AcceptedIndependentFeedback[]>([]);
  const [setupExpanded, setSetupExpanded] = useState(false);

  const [resultsExpanded, setResultsExpanded] = useState(true);
  const [eligibility, setEligibility] = useState<PlaytestEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [eligibilityError, setEligibilityError] = useState("");

  const [evidenceLocked,setEvidenceLocked] = useState(false);
  const buildLocked = evidenceLocked || acceptedIndependentFeedback.length > 0;
  const testerHubSelected = includesPlaytestedTesters(audience);
  const selectedAudienceKey = audienceSelectionKey(minimumRank,testingGenre,genreRestricted);
  const needsAudienceCheck = testerHubSelected && (!existingPlaytest || existingPlaytest.status !== "open" || !includesPlaytestedTesters(existingPlaytest.audience) || savedAudienceKey !== selectedAudienceKey);
  const audienceBlocked = needsAudienceCheck && (audienceAvailability?.key !== selectedAudienceKey || !audienceAvailability.available);
  const testerHubBlocked =
    testerHubSelected && (
      developerPlan.loading ||
      Boolean(developerPlan.error) ||
      developerPlan.data === null ||
      eligibilityLoading ||
      Boolean(eligibilityError) ||
      eligibility === null ||
      !eligibility.tester_hub_eligible
    );

  useEffect(()=>{if(!existingPlaytest || existingPlaytest.status === "closed")return; let active=true;void createClient().rpc("get_campaign_testing_details",{p_id:existingPlaytest.id}).then(({data,error})=>{if(active){setSettingsError(error?.message||(!data?"Campaign eligibility settings unavailable.":""));if(data){setSavedAudienceKey(audienceSelectionKey(data.minimum_rank,data.testing_genre||"",data.genre_restricted));setEvidenceLocked(data.build_locked);setMinimumRank(data.minimum_rank);setTestingGenre(data.testing_genre||"");setGenreRestricted(data.genre_restricted);setSettingsCampaignId(existingPlaytest.id);}}});return()=>{active=false;};},[existingPlaytest]);
  useEffect(() => {
    let active = true;

    async function loadEligibility() {
      setEligibilityLoading(true);
      setEligibilityError("");

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_playtest_eligibility", {
        p_imported_game_id: gameSource.importedGameId,
        p_approved_game_id: gameSource.approvedGameId,
        p_submission_id: gameSource.submissionId,
      });

      if (!active) {
        return;
      }

      if (error) {
        setEligibility(null);
        setEligibilityError(allowanceError("get_playtest_eligibility",error));
        setEligibilityLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? data as PlaytestEligibility[] : [];
      const row=rows[0];
      if(!row||typeof row.tester_hub_eligible!=="boolean"||typeof row.has_active_playtest!=="boolean"){setEligibility(null);setEligibilityError("Allowance unavailable: unexpected get_playtest_eligibility response. Check the deployed RPC version.");}else setEligibility(row);
      setEligibilityLoading(false);
    }

    void loadEligibility();

    return () => {
      active = false;
    };
  }, [
    gameSource.importedGameId,
    gameSource.approvedGameId,
    gameSource.submissionId,
    existingPlaytest?.id,
    existingPlaytest?.status,
    developerPlan.data,
    eligibilityRetry,
  ]);

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
    setMinimumRank(0); setTestingGenre(""); setGenreRestricted(false);
    setFocusAreas(["Overall experience"]);
    setAudience("playtested_testers");
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

    const target = 2;

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

    if (publish && audienceBlocked) { setMessage(audienceAvailability?.key === selectedAudienceKey ? audienceAvailability.message : "Wait for the tester availability check before publishing."); setMessageType("error"); return; }
    if (publish && includesPlaytestedTesters(audience)) {
      if (developerPlan.loading || developerPlan.error || !developerPlan.data || eligibilityLoading || eligibilityError || !eligibility) {
        setMessage("Your launch allowance could not be confirmed. Use Retry allowance before publishing.");
        setMessageType("error");
        return;
      }
      if (!eligibility.tester_hub_eligible) {
        setMessage(eligibility.tester_hub_reason);
        setMessageType("error");
        return;
      }
    }

    if(!capacityPolicy){setMessage("Capacity rules are unavailable. Enable the reservation migration before creating a campaign.");setMessageType("error");return;}
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
        p_target_testers: capacityPolicy?.places ?? 0,
        p_minimum_rank: minimumRank, p_testing_genre: testingGenre || null, p_genre_restricted: genreRestricted,
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
    await developerPlan.refresh();
    router.refresh();
  }

  async function updatePlaytest(status: PlaytestStatus) {
    if (status === "open" && audienceBlocked) { setMessage(audienceAvailability?.key === selectedAudienceKey ? audienceAvailability.message : "Wait for the tester availability check before publishing."); setMessageType("error"); return; }
    if (existingPlaytest && settingsCampaignId !== existingPlaytest.id) { setMessage(settingsError || "Wait for campaign eligibility settings to load before saving."); setMessageType("error"); return; }
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
        p_target_testers: existingPlaytest?.targetTesters ?? 0,
        p_minimum_rank: minimumRank, p_testing_genre: testingGenre || null, p_genre_restricted: genreRestricted,
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
    await developerPlan.refresh();
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

    setSetupExpanded(false);
    setResultsExpanded(true);
    setEditing(true);

    if (existingPlaytest) {
      void loadPlaytestResults(existingPlaytest.id);
    }
  }

  function cancelManaging() {
    clearMessage();

    setEditing(false);
  }

  const shareSource={kind:gameSource.importedGameId?'imported' as const:gameSource.approvedGameId?'approved' as const:'submission' as const,id:(gameSource.importedGameId||gameSource.approvedGameId||gameSource.submissionId)!};
  const shareControls=existingPlaytest?.status==='open'&&existingPlaytest.publishedAt?<div className="my-3 flex flex-wrap gap-3">{(['share','traffic'] as const).map(target=><button key={target} type="button" onClick={event=>{if(!openGameTraffic(event.currentTarget,shareSource,existingPlaytest.id,target)){setMessage('Open Traffic & playtest results in My Games.');setMessageType('error');}}} className="rounded-lg border border-white/25 px-3 py-2 text-sm">{target==='share'?'Share':'View traffic & results'}</button>)}</div>:null;
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

        <CampaignAllowancePanel
          eligibility={eligibility}
          loading={eligibilityLoading}
          error={eligibilityError}
          currentPlaytest={existingPlaytest}
          onRetry={retryAllowance}
        />
        {shareControls}

        <div className="mt-6 grid items-start gap-5">
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

              <CampaignAudienceFields minimumRank={minimumRank} setMinimumRank={setMinimumRank} genre={testingGenre} setGenre={setTestingGenre} restricted={genreRestricted} setRestricted={setGenreRestricted} onAvailability={setAudienceAvailability} enabled={testerHubSelected} publishedTargeting={existingPlaytest?.publishedAt&&includesPlaytestedTesters(existingPlaytest.audience)&&savedAudienceKey?JSON.parse(savedAudienceKey) as [number,string,boolean]:undefined} />
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
                      disabled={buildLocked}
                      onChange={(event) =>
                        setAccessType(event.target.value as PlaytestAccessType)
                      }
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:cursor-not-allowed disabled:opacity-60"
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
                      disabled={buildLocked}
                      onChange={(event) => setAccessLink(event.target.value)}
                      placeholder="https://..."
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:cursor-not-allowed disabled:opacity-60"
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
                        {existingPlaytest?.targetTesters ?? capacityPolicy?.places ?? "Checking"} Tester Hub places
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        Community responses are counted separately.
                      </span>

                      <PlacesRules/>
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
                        disabled={buildLocked}
                        onChange={(event) =>
                          setReleaseLabel(event.target.value)
                        }
                        placeholder="Demo 0.3"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  </div>

                  {buildLocked && (
                    <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.06] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
                          Build locked
                        </span>
                        <span className="text-xs text-zinc-500">
                          Accepted tester evidence has been collected
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        The access method, build link and release label are now fixed for this round so its feedback always remains tied to the exact build testers played. Instructions, focus areas and other management settings can still be updated.
                      </p>
                    </div>
                  )}

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
                      disabled={saving || audienceBlocked}
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
                        disabled={saving || audienceBlocked}
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


          </div>

          <section className="rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setResultsExpanded((current) => !current)}
              data-results-toggle
              aria-expanded={resultsExpanded}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                  Playtest results
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Feedback, scores and individual responses for each tested build.
                </p>
              </div>

              <span className="text-lg text-zinc-400">
                {resultsExpanded ? "−" : "+"}
              </span>
            </button>


            {resultsExpanded && (
              <div className="border-t border-white/10 p-5">
                <BuildResultsPanel
                  currentPlaytest={existingPlaytest}
          playtests={[existingPlaytest, ...historicalPlaytests]}
                />
              </div>
            )}
          </section>
        </div>
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

        <CampaignAllowancePanel
          eligibility={eligibility}
          loading={eligibilityLoading}
          error={eligibilityError}
          currentPlaytest={existingPlaytest}
          onRetry={retryAllowance}
        />
        {shareControls}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {includesPlaytestedTesters(existingPlaytest.audience)
                ? "Tester Hub capacity"
                : "Target"}
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {includesPlaytestedTesters(existingPlaytest.audience)
                ? `${existingPlaytest.targetTesters} Tester Hub places`
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

        <div className="mt-6 border-t border-white/10 pt-6">
          <BuildResultsPanel
            currentPlaytest={existingPlaytest}
          playtests={[existingPlaytest, ...historicalPlaytests]}
          />
        </div>

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
        <CampaignAllowancePanel
          eligibility={eligibility}
          loading={eligibilityLoading}
          error={eligibilityError}
          currentPlaytest={existingPlaytest}
          onRetry={retryAllowance}
        />
        {shareControls}

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

        <CampaignAudienceFields minimumRank={minimumRank} setMinimumRank={setMinimumRank} genre={testingGenre} setGenre={setTestingGenre} restricted={genreRestricted} setRestricted={setGenreRestricted} onAvailability={setAudienceAvailability} enabled={testerHubSelected} />
        <div className="grid gap-4 sm:grid-cols-2">
          {includesPlaytestedTesters(audience) && (<label className="block">
            <span className="text-sm font-medium text-zinc-200">
              {capacityPolicy?.places ?? "Checking"} Tester Hub places
            </span>

            <PlacesRules/>
          </label>)}

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
            disabled={saving || testerHubBlocked || audienceBlocked}
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

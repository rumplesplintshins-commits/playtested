"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "../../../lib/supabase";
import {currentJourney} from "@/lib/share-links";
import {TrackedAccessLink} from "@/app/components/ShareJourney";

type CommunityPlaytestJoinProps = {
  token: string;
};

type JoinedPlaytest = {
  participant_id: string;
  playtest_id: string;
  game_title: string;
  access_link: string;
  instructions: string;
  focus_areas: string[] | null;
  estimated_minutes: number | null;
  release_label: string | null;
  participant_status: string;
  joined_at: string;
  completed_at?: string | null;
};

type RpcError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type Recommendation = "" | "yes" | "maybe" | "no";

function formatRpcError(error: RpcError) {
  const parts: string[] = [];

  if (error.message) {
    parts.push(`Message: ${error.message}`);
  }

  if (error.details) {
    parts.push(`Details: ${error.details}`);
  }

  if (error.hint) {
    parts.push(`Hint: ${error.hint}`);
  }

  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }

  if (parts.length === 0) {
    try {
      return `Raw error: ${JSON.stringify(error)}`;
    } catch {
      return "The database returned an unknown error.";
    }
  }

  return parts.join("\n");
}

function ScoreSelect({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-200">
        {label}
        {required && (
          <span className="ml-1 text-[#77f29b]">*</span>
        )}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#77f29b]/50"
      >
        <option value="">
          {required ? "Select a score" : "Not rated"}
        </option>

        {Array.from({ length: 10 }, (_, index) => {
          const score = index + 1;

          return (
            <option key={score} value={score}>
              {score} / 10
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function CommunityPlaytestJoin({
  token,
}: CommunityPlaytestJoinProps) {
  const [checkingParticipation, setCheckingParticipation] =
    useState(true);
  const [joining, setJoining] = useState(false);
  const [joinedPlaytest, setJoinedPlaytest] =
    useState<JoinedPlaytest | null>(null);
  const [error, setError] = useState("");
  const [trackingWarning,setTrackingWarning]=useState("");

  const [showFeedbackForm, setShowFeedbackForm] =
    useState(false);
  const [submittingFeedback, setSubmittingFeedback] =
    useState(false);

  const [overallScore, setOverallScore] = useState("");
  const [gameplayScore, setGameplayScore] = useState("");
  const [controlsScore, setControlsScore] = useState("");
  const [performanceScore, setPerformanceScore] =
    useState("");

  const [enjoyed, setEnjoyed] = useState("");
  const [struggled, setStruggled] = useState("");
  const [improvements, setImprovements] = useState("");
  const [bugs, setBugs] = useState("");
  const [recommendation, setRecommendation] =
    useState<Recommendation>("");
  const [additionalComments, setAdditionalComments] =
    useState("");

  useEffect(() => {
    let active = true;

    async function checkExistingParticipation() {
      setCheckingParticipation(true);
      setError("");

      try {
        const supabase = createClient();

        const {
          data,
          error: participationError,
        } = await supabase.rpc(
          "get_my_community_playtest_participation",
          {
            p_share_token: token,
          }
        );

        if (!active) {
          return;
        }

        if (participationError) {
          setError(formatRpcError(participationError));
          return;
        }

        const rows = (data ?? []) as JoinedPlaytest[];

        if (rows.length > 0) {
          setJoinedPlaytest(rows[0]);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        if (caughtError instanceof Error) {
          setError(`Unexpected error: ${caughtError.message}`);
        } else {
          setError(
            "An unexpected error occurred while checking your playtest."
          );
        }
      } finally {
        if (active) {
          setCheckingParticipation(false);
        }
      }
    }

    void checkExistingParticipation();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleStartTesting() {
    if (joining) {
      return;
    }

    setJoining(true);
    setError("");

    const supabase = createClient();

    try {
      const {
        data,
        error: joinError,
      } = await supabase.rpc("join_community_playtest", {
        p_share_token: token,
      });

      if (joinError) {
        setError(formatRpcError(joinError));
        return;
      }

      const rows = (data ?? []) as JoinedPlaytest[];

      if (rows.length === 0) {
        setError(
          "The database call succeeded, but no participation record was returned."
        );
        return;
      }

      const joined = rows[0];

      if (!joined.access_link) {
        setError(
          "The playtest was joined successfully, but no game/build link was returned."
        );
        return;
      }

      setJoinedPlaytest(joined);
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError(`Unexpected error: ${caughtError.message}`);
      } else {
        setError(
          "An unexpected error occurred while starting the playtest."
        );
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmitFeedback(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!joinedPlaytest || submittingFeedback) {
      return;
    }

    setError("");

    if (!overallScore) {
      setError("Please provide an overall experience score.");
      return;
    }

    if (enjoyed.trim().length < 5) {
      setError(
        "Please tell the developer what you enjoyed."
      );
      return;
    }

    if (struggled.trim().length < 5) {
      setError(
        "Please tell the developer where you struggled."
      );
      return;
    }

    if (improvements.trim().length < 5) {
      setError(
        "Please tell the developer what could be improved."
      );
      return;
    }

    if (!recommendation) {
      setError(
        "Please tell us whether you would recommend or keep playing the game."
      );
      return;
    }

    setSubmittingFeedback(true);

    try {
      const supabase = createClient();

      const feedbackFields={
          p_participant_id:
            joinedPlaytest.participant_id,
          p_overall_score: Number(overallScore),
          p_gameplay_score: gameplayScore
            ? Number(gameplayScore)
            : null,
          p_controls_score: controlsScore
            ? Number(controlsScore)
            : null,
          p_performance_score: performanceScore
            ? Number(performanceScore)
            : null,
          p_enjoyed: enjoyed,
          p_struggled: struggled,
          p_improvements: improvements,
          p_bugs: bugs,
          p_recommendation: recommendation,
          p_additional_comments: additionalComments,
      };
      const visit=currentJourney();
      let result=await supabase.rpc(visit?"submit_community_feedback_with_attribution":"submit_community_playtest_feedback",visit?{...feedbackFields,p_visit:visit}:feedbackFields);
      if(visit&&result.error&&["PGRST202","42883"].includes(result.error.code)){
        result=await supabase.rpc("submit_community_playtest_feedback",feedbackFields);
        if(!result.error)setTrackingWarning("Feedback saved. Link reporting is unavailable for this submission; the developer may need the campaign-sharing update.");
      }
      const feedbackError=result.error;

      if (feedbackError) {
        setError(formatRpcError(feedbackError));
        return;
      }

      setJoinedPlaytest((current) =>
        current
          ? {
              ...current,
              participant_status: "completed",
              completed_at: new Date().toISOString(),
            }
          : current
      );

      setShowFeedbackForm(false);
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError(`Unexpected error: ${caughtError.message}`);
      } else {
        setError(
          "An unexpected error occurred while submitting your feedback."
        );
      }
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (checkingParticipation) {
    return (
      <div className="mt-5">
        <button
          type="button"
          disabled
          className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] opacity-50"
        >
          Checking playtest...
        </button>
      </div>
    );
  }

  if (joinedPlaytest) {
    const completed =
      joinedPlaytest.participant_status === "completed";

    if (completed) {
      return (
        <div className="mt-5 rounded-xl border border-[#77f29b]/20 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
            Testing completed
          </p>

          <h3 className="mt-2 text-lg font-semibold text-zinc-100">
            {joinedPlaytest.game_title}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            You have completed this community playtest. Your
            feedback has been recorded for the developer.
          </p>

          {trackingWarning&&<p role="status" className="mt-3 text-sm text-amber-200">{trackingWarning}</p>}
          <div className="mt-5 rounded-lg border border-[#77f29b]/15 bg-[#77f29b]/[0.05] px-4 py-3 text-sm text-zinc-300">
            Thanks for testing. Community feedback is kept
            separate from independent Playtested verification
            results.
          </div>
        </div>
      );
    }

    return (
      <div className="mt-5 rounded-xl border border-[#77f29b]/20 bg-black/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
          Testing started
        </p>

        <h3 className="mt-2 text-lg font-semibold text-zinc-100">
          {joinedPlaytest.game_title}
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Your participation has been recorded as a community
          test. Open the game or build below, follow the testing
          instructions and return to Playtested when you are
          ready to submit your feedback.
        </p>

        {!showFeedbackForm && (
          <div className="mt-5 flex flex-wrap gap-3">
            <TrackedAccessLink campaignId={joinedPlaytest.playtest_id}
              href={joinedPlaytest.access_link}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
            >
              Open game / build ↗
            </TrackedAccessLink>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowFeedbackForm(true);
              }}
              className="rounded-lg border border-[#77f29b]/30 px-5 py-3 text-sm font-semibold text-[#77f29b] transition hover:bg-[#77f29b]/10"
            >
              Submit feedback
            </button>
          </div>
        )}

        {showFeedbackForm && (
          <form
            onSubmit={handleSubmitFeedback}
            className="mt-7 border-t border-white/10 pt-7"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                Playtest feedback
              </p>

              <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                Tell the developer what you thought
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Focus on your actual experience with this build.
                Specific examples are more useful than general
                comments.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ScoreSelect
                label="Overall experience"
                value={overallScore}
                onChange={setOverallScore}
                required
              />

              <ScoreSelect
                label="Gameplay"
                value={gameplayScore}
                onChange={setGameplayScore}
              />

              <ScoreSelect
                label="Controls"
                value={controlsScore}
                onChange={setControlsScore}
              />

              <ScoreSelect
                label="Performance"
                value={performanceScore}
                onChange={setPerformanceScore}
              />
            </div>

            <div className="mt-7 space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-zinc-200">
                  What did you enjoy?
                  <span className="ml-1 text-[#77f29b]">
                    *
                  </span>
                </span>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  What worked well or made you want to keep
                  playing?
                </p>

                <textarea
                  value={enjoyed}
                  onChange={(event) =>
                    setEnjoyed(event.target.value)
                  }
                  rows={4}
                  required
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#111412] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
                  placeholder="For example: I liked the progression, combat felt responsive..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">
                  Where did you struggle?
                  <span className="ml-1 text-[#77f29b]">
                    *
                  </span>
                </span>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Tell the developer where you felt confused,
                  frustrated or unsure what to do.
                </p>

                <textarea
                  value={struggled}
                  onChange={(event) =>
                    setStruggled(event.target.value)
                  }
                  rows={4}
                  required
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#111412] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
                  placeholder="For example: I wasn't sure what the objective was after..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">
                  What should be improved?
                  <span className="ml-1 text-[#77f29b]">
                    *
                  </span>
                </span>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  What changes would most improve the experience?
                </p>

                <textarea
                  value={improvements}
                  onChange={(event) =>
                    setImprovements(event.target.value)
                  }
                  rows={4}
                  required
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#111412] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
                  placeholder="For example: The tutorial could explain..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-200">
                  Bugs or technical issues
                </span>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Optional. Include what happened and what you
                  were doing when possible.
                </p>

                <textarea
                  value={bugs}
                  onChange={(event) =>
                    setBugs(event.target.value)
                  }
                  rows={4}
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#111412] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
                  placeholder="No bugs found, or describe any issues here..."
                />
              </label>
            </div>

            <fieldset className="mt-7">
              <legend className="text-sm font-medium text-zinc-200">
                Based on this build, would you recommend or
                keep playing?
                <span className="ml-1 text-[#77f29b]">*</span>
              </legend>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "yes" as const,
                    label: "Yes",
                    description: "I would keep playing",
                  },
                  {
                    value: "maybe" as const,
                    label: "Maybe",
                    description: "With some improvements",
                  },
                  {
                    value: "no" as const,
                    label: "No",
                    description: "Not in its current state",
                  },
                ].map((option) => {
                  const selected =
                    recommendation === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        selected
                          ? "border-[#77f29b]/50 bg-[#77f29b]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="recommendation"
                        value={option.value}
                        checked={selected}
                        onChange={() =>
                          setRecommendation(option.value)
                        }
                        className="sr-only"
                      />

                      <span
                        className={`block text-sm font-semibold ${
                          selected
                            ? "text-[#77f29b]"
                            : "text-zinc-200"
                        }`}
                      >
                        {option.label}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-7 block">
              <span className="text-sm font-medium text-zinc-200">
                Anything else?
              </span>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Optional additional feedback for the developer.
              </p>

              <textarea
                value={additionalComments}
                onChange={(event) =>
                  setAdditionalComments(event.target.value)
                }
                rows={4}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#111412] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
                placeholder="Any other thoughts..."
              />
            </label>

            {error && (
              <div className="mt-6 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-4">
                <p className="text-sm font-semibold text-red-200">
                  Could not submit feedback
                </p>

                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-200">
                  {error}
                </pre>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingFeedback}
                className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingFeedback
                  ? "Submitting..."
                  : "Submit feedback"}
              </button>

              <button
                type="button"
                disabled={submittingFeedback}
                onClick={() => {
                  setError("");
                  setShowFeedbackForm(false);
                }}
                className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Community feedback is shared with the developer
              but does not count as independent Playtested
              verification evidence or award Tester Hub XP.
            </p>
          </form>
        )}

        {!showFeedbackForm && error && (
          <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-4">
            <p className="text-sm font-semibold text-red-200">
              Playtest error
            </p>

            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-200">
              {error}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleStartTesting}
        disabled={joining}
        className="mt-5 rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {joining ? "Starting..." : "Start testing"}
      </button>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-4">
          <p className="text-sm font-semibold text-red-200">
            Could not load playtest
          </p>

          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-200">
            {error}
          </pre>
        </div>
      )}
    </>
  );
}

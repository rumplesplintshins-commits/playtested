"use client";

import { useMemo, useState } from "react";
import IntentSummary from "./IntentSummary";
import type {IntentCounts} from "@/lib/intent-counts";

export type CommunityReceptionBuild = {
  recommendCounts?:IntentCounts|null;
  continueCounts?:IntentCounts|null;
  id: string;
  releaseLabel: string;
  createdAt: string;
  acceptedTests: number;
  ratedTests: number;
  averageOverall: number | null;
  averageGameplay: number | null;
  averagePerformance: number | null;
  recommendPositivePercent: number | null;
  continuePositivePercent: number | null;
  technicalFeedbackCount: number;
  averageHoursPlayed: number | null;
};

export type CommunityReceptionFeedback = {
  id: string;
  playtestId: string;
  releaseLabel: string;
  enjoyedMost: string | null;
  frustrations: string | null;
  bugsFound: string | null;
  biggestImprovement: string | null;
  feedback: string | null;
};

type CommunityReceptionProps = {
  builds: CommunityReceptionBuild[];
  feedback: CommunityReceptionFeedback[];
  verificationLabel:
    | "Verified"
    | "Assessed"
    | "Not yet verified";
};

function receptionStatus(build: CommunityReceptionBuild) {
  if (
    build.acceptedTests < 5 ||
    build.ratedTests < 5
  ) {
    return "Early results";
  }

  const overall = build.averageOverall ?? 0;
  const recommend =
    build.recommendPositivePercent ?? 0;
  const continuing =
    build.continuePositivePercent ?? 0;

  if (
    overall >= 8 &&
    recommend >= 70 &&
    continuing >= 70
  ) {
    return "Excellent reception";
  }

  if (
    overall >= 6.5 &&
    recommend >= 60 &&
    continuing >= 60
  ) {
    return "Positive reception";
  }

  if (
    overall < 5 &&
    recommend < 40 &&
    continuing < 40
  ) {
    return "Poor reception";
  }

  return "Mixed reception";
}

function receptionBadgeClasses(status: string) {
  if (status === "Excellent reception") {
    return "border-[#77f29b]/40 bg-[#77f29b]/[0.08] text-[#8df5aa]";
  }

  if (status === "Positive reception") {
    return "border-emerald-300/35 bg-emerald-300/[0.07] text-emerald-200";
  }

  if (status === "Mixed reception") {
    return "border-sky-300/35 bg-sky-300/[0.07] text-sky-200";
  }

  if (status === "Poor reception") {
    return "border-red-300/40 bg-red-300/[0.07] text-red-200";
  }

  return "border-amber-300/35 bg-amber-300/[0.07] text-amber-200";
}

function verificationBadgeClasses(
  status:
    | "Verified"
    | "Assessed"
    | "Not yet verified"
) {
  if (status === "Verified") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Assessed") {
    return "border-amber-400/40 bg-amber-400/10 text-amber-200";
  }

  return "border-zinc-700 bg-white/[0.03] text-zinc-300";
}

function scoreText(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)}/10`;
}



export default function CommunityReception({
  builds,
  feedback,
  verificationLabel,
}: CommunityReceptionProps) {
  const currentBuild = builds[0] ?? null;

  const [selectedBuildId, setSelectedBuildId] =
    useState<string>(currentBuild?.id ?? "");

  const selectedBuild =
    builds.find(
      (build) => build.id === selectedBuildId
    ) ??
    currentBuild ??
    null;

  const selectedFeedback = useMemo(() => {
    if (!selectedBuild) return [];

    return feedback.filter(
      (response) =>
        response.playtestId === selectedBuild.id
    );
  }, [feedback, selectedBuild]);

  if (!selectedBuild) {
    return (
      <section className="mt-4 rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
              COMMUNITY RECEPTION
            </p>

            <h2 className="mt-1 text-lg font-bold">
              What Playtested testers thought
            </h2>
          </div>

          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${verificationBadgeClasses(
              verificationLabel
            )}`}
          >
            {verificationLabel}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium text-zinc-300">
            No accepted community reception available yet
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Community reception will appear after accepted
            Playtested tester responses are available.
          </p>
        </div>
      </section>
    );
  }

  const isCurrentBuild =
    currentBuild?.id === selectedBuild.id;

  const selectedReceptionStatus =
    receptionStatus(selectedBuild);

  return (
    <section className="mt-4 rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
            COMMUNITY RECEPTION
          </p>

          <h2 className="mt-1 text-lg font-bold">
            What Playtested testers thought
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Community reception comes from accepted
            Playtested tester responses for the selected
            build. It is separate from independent
            Playtested assessment and verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${receptionBadgeClasses(
              selectedReceptionStatus
            )}`}
          >
            {selectedReceptionStatus}
          </span>

          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${verificationBadgeClasses(
              verificationLabel
            )}`}
          >
            {verificationLabel}
          </span>
        </div>
      </div>

      {/* BUILD SELECTOR */}
      <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Viewing build
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-100">
                {selectedBuild.releaseLabel}
              </p>

              {isCurrentBuild ? (
                <span className="rounded-full border border-[#77f29b]/30 bg-[#77f29b]/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#77f29b]">
                  Current build
                </span>
              ) : (
                <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                  Historical build
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-zinc-500">
              {isCurrentBuild
                ? "Latest tested build · shown by default"
                : "Historical snapshot · statistics and feedback from this build only"}
            </p>
          </div>
        </div>

        {builds.length > 1 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Select tested build
            </p>

            <div className="flex flex-wrap gap-2">
              {builds.map((build, index) => {
                const selected =
                  build.id === selectedBuild.id;

                const current = index === 0;

                return (
                  <button
                    key={build.id}
                    type="button"
                    onClick={() =>
                      setSelectedBuildId(build.id)
                    }
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      selected
                        ? "border-[#77f29b]/50 bg-[#77f29b]/10 text-[#77f29b]"
                        : "border-white/10 bg-[#0b0e0c] text-zinc-300 hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span>
                      {build.releaseLabel}
                    </span>

                    {current && (
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
                          selected
                            ? "border-[#77f29b]/35 text-[#77f29b]"
                            : "border-white/10 text-zinc-500"
                        }`}
                      >
                        Current
                      </span>
                    )}

                    {selected && (
                      <span className="text-[#77f29b]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PRIMARY METRICS */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#77f29b]/25 bg-[#77f29b]/[0.05] p-4">
          <p className="text-xs text-zinc-500">
            Overall experience
          </p>

          <p className="mt-1 text-3xl font-bold text-[#77f29b]">
            {selectedBuild.averageOverall !== null
              ? selectedBuild.averageOverall.toFixed(1)
              : "—"}
            <span className="text-sm text-zinc-500">
              /10
            </span>
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {selectedBuild.ratedTests}{" "}
            {selectedBuild.ratedTests === 1
              ? "rating"
              : "ratings"}{" "}
            for this build
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">
            Would recommend
          </p>

          <p className="mt-1 text-2xl font-bold text-zinc-100">
            <IntentSummary counts={selectedBuild.recommendCounts}/>
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Accepted independent tester answers
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">
            Would continue playing
          </p>

          <p className="mt-1 text-2xl font-bold text-zinc-100">
            <IntentSummary counts={selectedBuild.continueCounts}/>
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Accepted independent tester answers
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">
            Accepted tests
          </p>

          <p className="mt-1 text-2xl font-bold text-zinc-100">
            {selectedBuild.acceptedTests}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            accepted responses for this build
          </p>
        </div>
      </div>

      {/* SECONDARY METRICS */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">
            Gameplay
          </p>

          <p className="mt-1 text-xl font-bold text-zinc-100">
            {scoreText(
              selectedBuild.averageGameplay
            )}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">
            Performance
          </p>

          <p className="mt-1 text-xl font-bold text-zinc-100">
            {scoreText(
              selectedBuild.averagePerformance
            )}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">
            Technical feedback
          </p>

          <p className="mt-1 text-xl font-bold text-zinc-100">
            {selectedBuild.technicalFeedbackCount}{" "}
            <span className="text-sm font-medium text-zinc-500">
              {selectedBuild.technicalFeedbackCount === 1
                ? "response"
                : "responses"}
            </span>
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {selectedBuild.averageHoursPlayed !== null
              ? `${selectedBuild.averageHoursPlayed.toFixed(
                  1
                )}h average play time`
              : "No play-time average yet"}
          </p>
        </div>
      </div>

      {/* CURRENT / HISTORICAL EXPLANATION */}
      <div
        className={`mt-4 rounded-lg border px-4 py-3 ${
          isCurrentBuild
            ? "border-[#77f29b]/15 bg-[#77f29b]/[0.025]"
            : "border-amber-300/20 bg-amber-300/[0.035]"
        }`}
      >
        <p className="text-xs leading-5 text-zinc-500">
          {isCurrentBuild ? (
            <>
              You are viewing the latest tested build,{" "}
              <span className="font-medium text-zinc-300">
                {selectedBuild.releaseLabel}
              </span>
              . All reception statistics and feedback shown
              here relate specifically to this build.
            </>
          ) : (
            <>
              You are viewing historical results for{" "}
              <span className="font-medium text-amber-200">
                {selectedBuild.releaseLabel}
              </span>
              . These statistics are preserved from that
              testing round and do not represent the
              game&apos;s current reception.
            </>
          )}
        </p>
      </div>

      {/* BUILD PROGRESSION */}
      {builds.length > 1 && (
        <details className="group mt-4 rounded-lg border border-white/10 bg-black/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                Build progression
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {builds.length} tested builds · compare
                reception across versions
              </p>
            </div>

            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition group-open:rotate-45 group-open:text-[#77f29b]">
              +
            </span>
          </summary>

          <div className="border-t border-white/10 p-4">
            <div className="space-y-2">
              {builds.map((build, index) => {
                const status =
                  receptionStatus(build);

                const current = index === 0;

                const selected =
                  build.id === selectedBuild.id;

                return (
                  <button
                    key={build.id}
                    type="button"
                    onClick={() =>
                      setSelectedBuildId(build.id)
                    }
                    className={`grid w-full gap-3 rounded-lg border p-4 text-left transition sm:grid-cols-[minmax(0,1fr)_110px_110px_110px] ${
                      selected
                        ? "border-[#77f29b]/35 bg-[#77f29b]/[0.05]"
                        : "border-white/10 bg-[#0b0e0c] hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-zinc-100">
                          {build.releaseLabel}
                        </p>

                        {current && (
                          <span className="rounded-full border border-[#77f29b]/30 bg-[#77f29b]/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#77f29b]">
                            Current build
                          </span>
                        )}

                        {selected && (
                          <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-300">
                            Viewing
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-zinc-500">
                        {status} ·{" "}
                        {build.acceptedTests} accepted{" "}
                        {build.acceptedTests === 1
                          ? "test"
                          : "tests"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                        Overall
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-100">
                        {scoreText(
                          build.averageOverall
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                        Recommend
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-100">
                        <IntentSummary counts={build.recommendCounts}/>
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                        Continue
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-100">
                        <IntentSummary counts={build.continueCounts}/>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      )}

      {/* TESTER FEEDBACK */}
      {selectedFeedback.length > 0 && (
        <details className="group mt-4 rounded-lg border border-white/10 bg-black/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                View tester feedback
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {selectedFeedback.length} detailed{" "}
                {selectedFeedback.length === 1
                  ? "response"
                  : "responses"}{" "}
                from {selectedBuild.releaseLabel} · comments
                shown as submitted
              </p>
            </div>

            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-sm text-zinc-400 transition group-open:rotate-45 group-open:border-[#77f29b]/30 group-open:text-[#77f29b]">
              +
            </span>
          </summary>

          <div className="border-t border-white/10 p-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {selectedFeedback.map(
                (response, index) => (
                  <article
                    key={response.id}
                    className="rounded-lg border border-white/10 bg-[#0b0e0c] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-[#77f29b]">
                        Playtested tester {index + 1}
                      </p>

                      <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                        Accepted
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="inline-flex rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-300">
                        Tested build ·{" "}
                        {response.releaseLabel}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3 text-sm">
                      {response.enjoyedMost && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                            Enjoyed most
                          </p>

                          <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                            {response.enjoyedMost}
                          </p>
                        </div>
                      )}

                      {response.frustrations && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                            Frustrations
                          </p>

                          <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                            {response.frustrations}
                          </p>
                        </div>
                      )}

                      {response.biggestImprovement && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                            Suggested improvement
                          </p>

                          <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                            {response.biggestImprovement}
                          </p>
                        </div>
                      )}

                      {response.bugsFound && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">
                            Bugs / technical feedback
                          </p>

                          <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                            {response.bugsFound}
                          </p>
                        </div>
                      )}

                      {response.feedback && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                            Additional feedback
                          </p>

                          <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                            {response.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-600">
              These are accepted tester comments for{" "}
              {selectedBuild.releaseLabel}. They are not
              independently confirmed findings or a
              Playtested verification verdict.
            </p>
          </div>
        </details>
      )}
    </section>
  );
}

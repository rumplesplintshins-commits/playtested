import {assessmentLabel,disclosureExplanation} from "../../../lib/review-labels";
import {publicIntentCounts} from "@/lib/intent-counts";
import {listingUpdates,listingNotice} from "@/lib/listing-updates";
import {ShareJourneyBanner,TrackedAccessLink} from "@/app/components/ShareJourney";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SiteHeader from "../../components/SiteHeader";
import CommunityReception, {
  type CommunityReceptionBuild,
  type CommunityReceptionFeedback,
} from "../../components/CommunityReception";
import { createClient } from "../../../lib/supabase-server";

export const instant = false;

type SubmissionPageProps = {
  params: Promise<{ id: string }>;
};

const checklistItems = [
  ["ai_claims_checked", "AI claims reviewed"],
  ["evidence_checked", "Evidence inspected"],
  ["game_launched", "Game launched"],
  ["core_gameplay_tested", "Core gameplay tested"],
  ["bugs_recorded", "Bugs recorded"],
  ["performance_checked", "Performance checked"],
] as const;

type VerificationStatus =
  | "Verified"
  | "Assessed"
  | "Not yet verified";

type PublicPlaytestHistoryRow = {
  playtest_id: string;
  release_label: string;
  created_at: string;
  accepted_test_count: number | string | null;
  rated_test_count: number | string | null;
  average_overall_score: number | string | null;
  average_gameplay_score: number | string | null;
  average_performance_score: number | string | null;
  recommend_positive_percent: number | string | null;
  continue_positive_percent: number | string | null;
  technical_feedback_count: number | string | null;
  average_hours_played: number | string | null;
};

type PublicFeedbackRow = {
  id: string;
  playtest_id: string;
  release_label: string;
  enjoyed_most: string | null;
  frustrations: string | null;
  bugs_found: string | null;
  biggest_improvement: string | null;
  feedback: string | null;
};

function toNumber(
  value: number | string | null | undefined
) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(
  value: number | string | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function SubmissionPage({
  params,
}: SubmissionPageProps) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: originalGame, error } = await supabase
    .from("approved_games")
    .select(
      "id, title, developer_name, genre, description, game_link, image_url, ai_type, ai_areas, ai_explanation, evidence_link"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !originalGame) {
    notFound();
  }

  const updates=await listingUpdates(supabase,[{kind:"approved",id}]);
  const listingUpdate=updates?.[0];
  const game={...originalGame,...listingUpdate?.fields};
  const disclosureNotice=listingNotice(listingUpdate);

  const { data: submission } = await supabase
    .from("game_submissions")
    .select("steam_url")
    .eq("id", id)
    .maybeSingle();

  const steamUrl =
    listingUpdate&&Object.hasOwn(listingUpdate.fields,"steam_url")?(listingUpdate.fields.steam_url||null):(submission?.steam_url ?? null);

  const externalUrl =
    steamUrl || game.game_link;

  const externalUrlLabel = steamUrl
    ? "Visit Steam page ↗"
    : "Visit or play game ↗";

  const { data: recordedVerification } = await supabase
    .from("published_game_verifications")
    .select(
      "verification_status, ai_status, quality_status, quality_score, public_summary, evidence_summary, ai_claims_checked, evidence_checked, game_launched, core_gameplay_tested, bugs_recorded, performance_checked, limitations, updated_at"
    )
    .eq("game_id", id)
    .maybeSingle();

  const verification=updates===null||listingUpdate?.reassessment||listingUpdate?.disputed?null:recordedVerification;
  /*
   * BUILD-SPECIFIC COMMUNITY RECEPTION
   *
   * This RPC returns one row per tested build,
   * newest first.
   *
   * All statistics are calculated only from
   * accepted tester responses belonging to that
   * exact playtest/build.
   */
  const {
    data: playtestHistoryData,
    error: playtestHistoryError,
  } = await supabase.rpc(
    "get_public_submission_playtest_history",
    {
      p_submission_id: id,
    }
  );

  if (playtestHistoryError) {
    console.error(
      "Could not load public playtest history:",
      playtestHistoryError
    );
  }

  const historyRows =
    (playtestHistoryData ??
      []) as PublicPlaytestHistoryRow[];

  const intentData=await publicIntentCounts(supabase,[{kind:"approved",id}]);
  const intentGame=intentData?.[0];
  const receptionBuilds: CommunityReceptionBuild[] =
    historyRows.map((row) => ({
      id: row.playtest_id,
      recommendCounts:intentGame?.builds.find(build=>build.playtest_id===row.playtest_id)?.recommend,
      continueCounts:intentGame?.builds.find(build=>build.playtest_id===row.playtest_id)?.continue,

      releaseLabel:
        row.release_label ||
        "Unlabelled build",

      createdAt: row.created_at,

      acceptedTests: toNumber(
        row.accepted_test_count
      ),

      ratedTests: toNumber(
        row.rated_test_count
      ),

      averageOverall: toOptionalNumber(
        row.average_overall_score
      ),

      averageGameplay: toOptionalNumber(
        row.average_gameplay_score
      ),

      averagePerformance: toOptionalNumber(
        row.average_performance_score
      ),

      recommendPositivePercent:
        toOptionalNumber(
          row.recommend_positive_percent
        ),

      continuePositivePercent:
        toOptionalNumber(
          row.continue_positive_percent
        ),

      technicalFeedbackCount: toNumber(
        row.technical_feedback_count
      ),

      averageHoursPlayed: toOptionalNumber(
        row.average_hours_played
      ),
    }));

  /*
   * BUILD-LABELLED TESTER FEEDBACK
   *
   * This RPC returns accepted public feedback
   * across all tested builds.
   *
   * The client component filters this collection
   * when the visitor changes the selected build.
   */
  const {
    data: feedbackData,
    error: feedbackError,
  } = await supabase.rpc(
    "get_public_submission_playtest_feedback",
    {
      p_submission_id: id,
    }
  );

  if (feedbackError) {
    console.error(
      "Could not load public playtest feedback:",
      feedbackError
    );
  }

  const feedbackRows =
    (feedbackData ??
      []) as PublicFeedbackRow[];

  const receptionFeedback: CommunityReceptionFeedback[] =
    feedbackRows.map((row) => ({
      id: row.id,

      playtestId: row.playtest_id,

      releaseLabel:
        row.release_label ||
        "Unlabelled build",

      enjoyedMost:
        row.enjoyed_most,

      frustrations:
        row.frustrations,

      bugsFound:
        row.bugs_found,

      biggestImprovement:
        row.biggest_improvement,

      feedback:
        row.feedback,
    }));

  const rawVerificationStatus =
    verification?.verification_status;

  const verificationLabel: VerificationStatus =
    rawVerificationStatus === "Verified" ||
    rawVerificationStatus === "Assessed" ||
    rawVerificationStatus ===
      "Not yet verified"
      ? rawVerificationStatus
      : "Not yet verified";

  const isVerified =
    verificationLabel === "Verified";

  const isAssessed =
    verificationLabel === "Assessed";

  const verificationDescription =
    isVerified
      ? "The recorded checks support the AI disclosure, and the game has been launched and its core gameplay tested. This does not guarantee every AI use has been detected or every aspect of quality."
      : isAssessed
        ? "Some assessment work has been recorded, but the full criteria for Verified have not been met. Review the checks and limitations below."
        : "This game has an approved listing, but there is not yet enough recorded assessment work to classify it as independently assessed.";

  const statusStyle =
    isVerified
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
      : isAssessed
        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
        : "border-zinc-700 bg-white/[0.03] text-zinc-300";

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />
          <ShareJourneyBanner />

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
        {/* GAME HEADER */}
        <section className="mt-3 grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[260px_1fr] sm:items-center lg:grid-cols-[320px_1fr]">
          <div>
            {game.image_url ? (
              <img
                src={game.image_url}
                alt={`${game.title} artwork`}
                className="aspect-video w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-white/[0.04] text-sm text-zinc-500">
                No game artwork supplied
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#77f29b]">
              PLAYTESTED COMMUNITY GAME
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {game.title}
            </h1>

            <p className="mt-1 text-sm text-zinc-400">
              By {game.developer_name} ·{" "}
              {game.genre}
            </p>

            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-300">
              {game.description}
            </p>

            {externalUrl && (
              <div className="mt-3">
                <TrackedAccessLink
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-[#77f29b] px-4 py-2 text-sm font-semibold text-black hover:bg-[#9af9b3]"
                >
                  {externalUrlLabel}
                </TrackedAccessLink>
              </div>
            )}
          </div>
        </section>

        {/* INTERACTIVE BUILD-SPECIFIC RECEPTION */}
        <CommunityReception
          builds={receptionBuilds}
          feedback={receptionFeedback}
          verificationLabel={
            verificationLabel
          }
        />

        {/* AI + VERIFICATION */}
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section className="rounded-xl border border-violet-300/25 bg-violet-300/[0.045] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                    AI TRANSPARENCY
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    Developer AI disclosure
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {disclosureExplanation}
                  </p>
                </div>

                <span className="rounded-full border border-violet-300/35 bg-violet-300/[0.08] px-3 py-1.5 text-xs font-bold text-violet-200">
                  {disclosureNotice&&<span className="mb-2 block text-amber-200">{disclosureNotice}</span>}
                  {game.ai_type ||
                    "Not specified"}
                </span>
              </div>

              {game.ai_areas?.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Areas where AI was used
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {game.ai_areas.map(
                      (area: string) => (
                        <span
                          key={area}
                          className="rounded-md border border-violet-300/20 bg-black/20 px-2.5 py-1.5 text-xs font-medium text-zinc-200"
                        >
                          {area}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {game.ai_explanation && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Developer&apos;s
                    explanation
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                    {game.ai_explanation}
                  </p>
                </div>
              )}

              {game.evidence_link && (
                <a
                  href={
                    game.evidence_link
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-md border border-violet-300/25 bg-violet-300/[0.05] px-3 py-2 text-xs font-semibold text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-300/[0.09]"
                >
                  View developer-provided
                  evidence ↗
                </a>
              )}
            </section>
          </div>

          <div>
            {verification ? (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
                      Independent assessment
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      Independent gameplay assessment
                    </h2>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle}`}
                  >
                    {assessmentLabel(verificationLabel)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {
                    verificationDescription
                  }
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  Assessment published
                  {verification.updated_at
                    ? ` · Updated ${new Date(
                        verification.updated_at
                      ).toLocaleDateString(
                        "en-GB"
                      )}`
                    : ""}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      AI disclosure
                      assessment
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {
                        verification.ai_status
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Gameplay testing
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {
                        verification.quality_status
                      }
                    </p>
                  </div>
                </div>

                {verification.quality_score !==
                  null &&
                  verification.quality_score !==
                    undefined && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                      <div>
                        <p className="text-xs font-medium">
                          Playtested quality
                          score
                        </p>

                        <p className="text-[10px] text-zinc-500">
                          Editorial
                          assessment, out of 10
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-[#77f29b]">
                        {Number(
                          verification.quality_score
                        ).toFixed(1)}

                        <span className="text-sm text-zinc-500">
                          {" "}
                          / 10
                        </span>
                      </p>
                    </div>
                  )}

                {verification.public_summary && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">
                      Assessment summary
                    </h3>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {
                        verification.public_summary
                      }
                    </p>
                  </div>
                )}

                {verification.evidence_summary && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <h3 className="text-sm font-semibold">
                      Evidence reviewed
                    </h3>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                      {
                        verification.evidence_summary
                      }
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-white/10 pt-3">
                  <h3 className="text-sm font-semibold">
                    What we checked
                  </h3>

                  <ul className="mt-3 space-y-2">
                    {checklistItems.map(
                      ([key, label]) => {
                        const checked =
                          verification[key] ===
                          true;

                        return (
                          <li
                            key={key}
                            className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5"
                          >
                            <span
                              aria-label={
                                checked
                                  ? "Checked"
                                  : "Not checked"
                              }
                              className={`mt-0.5 font-bold ${
                                checked
                                  ? "text-[#77f29b]"
                                  : "text-amber-300"
                              }`}
                            >
                              {checked
                                ? "✓"
                                : "!"}
                            </span>

                            <span className="text-sm text-zinc-300">
                              {label}

                              {!checked && (
                                <span className="mt-0.5 block text-xs text-zinc-500">
                                  Not confirmed
                                  in this
                                  assessment
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      }
                    )}
                  </ul>
                </div>

                {verification.limitations && (
                  <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-4">
                    <h3 className="text-sm font-semibold text-amber-200">
                      Limitations and
                      outstanding checks
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {
                        verification.limitations
                      }
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-xs leading-5 text-zinc-500">
                    Playtested reports the
                    evidence and checks
                    recorded at the time of
                    assessment. It cannot
                    guarantee that every
                    instance of AI use has
                    been detected, that every
                    bug has been found, or
                    that future updates will
                    behave the same.
                  </p>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Independent gameplay assessment
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  No independent
                  assessment
                </h2>

                <p className="mt-2 text-sm leading-5 text-zinc-400">
                  This game has an approved
                  listing, but no published
                  verification assessment is
                  available yet.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
import {gameMetadata} from "@/lib/public-game-seo";
export async function generateMetadata({params}:{params:Promise<{id:string}>}) {
  return gameMetadata("approved",(await params).id);
}

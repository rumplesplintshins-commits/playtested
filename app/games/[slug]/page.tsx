import IntentSummary from "@/app/components/IntentSummary";
import {publicIntentCounts} from "@/lib/intent-counts";
import {listingUpdates,listingNotice} from "@/lib/listing-updates";
import {ShareJourneyBanner,TrackedAccessLink} from "@/app/components/ShareJourney";
import { connection } from "next/server";
import SiteHeader from "../../components/SiteHeader";
import { games } from "../../data/games";
import { createClient } from "../../../lib/supabase-server";

export const instant = false;

type VerificationStatus = "Verified" | "Assessed" | "Not yet verified";

type ImportedGame = {
  id: string;
  steam_app_id: string | number | null;
  title: string | null;
  developer_name: string | null;
  genre: string | null;
  description: string | null;
  steam_url: string | null;
  image_url: string | null;
};

type PlaytestRow = {
  id: string;
  release_label: string | null;
  status: string;
  audience: string;
  created_at: string;
};

type PlaytestedProgressRow = {
  accepted_count?: number | string | null;
  total_testers?: number | string | null;
};

type CommunityReceptionRow = {
  imported_game_id: string | null;
  approved_game_id: string | null;
  submission_id: string | null;
  game_title: string | null;
  accepted_test_count: number | string | null;
  rated_test_count: number | string | null;
  average_overall_score: number | string | null;
  average_gameplay_score: number | string | null;
  average_performance_score: number | string | null;
  recommend_positive_count: number | string | null;
  recommend_answered_count: number | string | null;
  recommend_positive_percent: number | string | null;
  continue_positive_count: number | string | null;
  continue_answered_count: number | string | null;
  continue_positive_percent: number | string | null;
  bug_report_count: number | string | null;
  average_hours_played: number | string | null;
  reception_status: string | null;
};

type AcceptedCommunityFeedback = {
  id: string;
  playtest_id: string | null;
  enjoyed_most: string | null;
  frustrations: string | null;
  bugs_found: string | null;
  biggest_improvement: string | null;
  feedback: string | null;
};

type PlaytestRoundSummary = {
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
  bugReportCount: number;
  averageHours: number | null;
};

function formatStatus(status: string) {
  if (status === "open") return "Testing in progress";
  if (status === "paused") return "Testing paused";
  if (status === "closed") return "Completed";
  if (status === "draft") return "Draft";
  return status;
}

function formatReleaseLabel(value: string | null, fallback: number) {
  const label = value?.trim();
  return label ? label : `Round ${fallback}`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function receptionBadgeClasses(status: string | null) {
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

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();

  const { slug } = await params;

  if (slug.startsWith("steam-")) {
    const steamAppId = slug.slice("steam-".length).trim();
    const supabase = await createClient();

    const { data: importedGameData, error: importedGameError } = await supabase
      .from("imported_games")
      .select(
        "id, steam_app_id, title, developer_name, genre, description, steam_url, image_url"
      )
      .eq("steam_app_id", steamAppId)
      .maybeSingle();

    const originalImportedGame = importedGameData as ImportedGame | null;
    const updates=originalImportedGame?await listingUpdates(supabase,[{kind:"imported",id:originalImportedGame.id}]):[];
    const listingUpdate=updates?.[0];
    const importedGame=originalImportedGame?{...originalImportedGame,...listingUpdate?.fields}:null;
    const disclosureNotice=listingNotice(listingUpdate);

    if (importedGameError || !importedGame) {
      return (
        <main className="min-h-screen bg-[#090b0a] text-zinc-100">
          <SiteHeader />
          <ShareJourneyBanner />
          <section className="mx-auto max-w-6xl px-6 py-20">
            <h1 className="text-3xl font-bold">Game not found</h1>
            <a href="/" className="mt-6 inline-block text-[#77f29b]">
              Back to Game Discovery
            </a>
          </section>
        </main>
      );
    }

    const { data: developerLink, error: developerLinkError } = await supabase
      .from("game_developer_links")
      .select("id, relationship")
      .eq("imported_game_id", importedGame.id)
      .limit(1)
      .maybeSingle();

    if (developerLinkError) {
      console.error(
        "Could not check imported game developer relationship:",
        developerLinkError
      );
    }

    // Raw Steam imports deliberately do not get a Playtested profile.
    // If the relationship is later removed, this URL stops behaving like a
    // Playtested game page and the catalogue will return to the Steam action.
    if (!developerLink) {
      return (
        <main className="min-h-screen bg-[#090b0a] text-zinc-100">
          <SiteHeader />
          <ShareJourneyBanner />
          <section className="mx-auto max-w-6xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Steam catalogue listing
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              This game does not have a Playtested profile
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              This title is currently a catalogue-only Steam listing. A
              Playtested game profile becomes available when a developer
              relationship is established.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/"
                className="rounded-md border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                Back to Game Discovery
              </a>
              {importedGame.steam_url && (
                <TrackedAccessLink
                  href={importedGame.steam_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#8af5a8]"
                >
                  View Steam page ↗
                </TrackedAccessLink>
              )}
            </div>
          </section>
        </main>
      );
    }

    const { data: playtestData, error: playtestError } = await supabase
      .from("community_playtests")
      .select("id, release_label, status, audience, created_at")
      .eq("imported_game_id", importedGame.id)
      .order("created_at", { ascending: false });

    if (playtestError) {
      console.error("Could not load public playtest activity:", playtestError);
    }

    const playtests = (playtestData ?? []) as PlaytestRow[];
    const latestPlaytest = playtests[0] ?? null;
    const activePlaytest =
      playtests.find(
        (playtest) =>
          playtest.status === "open" ||
          playtest.status === "paused" ||
          playtest.status === "draft"
      ) ?? null;

    let acceptedIndependentTests = 0;
    let independentParticipants = 0;

    for (const playtest of playtests) {
      const { data: progressData, error: progressError } = await supabase.rpc(
        "get_developer_playtested_test_progress",
        {
          p_playtest_id: playtest.id,
        }
      );

      if (progressError) {
        console.error(
          `Could not load Tester Hub progress for playtest ${playtest.id}:`,
          progressError
        );
        continue;
      }

      const progress = Array.isArray(progressData)
        ? (progressData[0] as PlaytestedProgressRow | undefined)
        : (progressData as PlaytestedProgressRow | null);

      acceptedIndependentTests += toNumber(progress?.accepted_count);
      independentParticipants += toNumber(progress?.total_testers);
    }

    const { data: receptionData, error: receptionError } = await supabase.rpc(
      "get_game_community_reception"
    );

    if (receptionError) {
      console.error("Could not load community reception:", receptionError);
    }

    const receptionRows = (receptionData ?? []) as CommunityReceptionRow[];
    const communityReception =
      receptionRows.find(
        (row) => row.imported_game_id === importedGame.id
      ) ?? null;

    const lifetimeAcceptedReceptionCount = toNumber(
      communityReception?.accepted_test_count
    );
    const lifetimeRatedReceptionCount = toNumber(communityReception?.rated_test_count);
    const lifetimeOverallScore = toOptionalNumber(
      communityReception?.average_overall_score
    );
    const lifetimeGameplayScore = toOptionalNumber(
      communityReception?.average_gameplay_score
    );
    const lifetimePerformanceScore = toOptionalNumber(
      communityReception?.average_performance_score
    );
    const lifetimeAverageHours = toOptionalNumber(
      communityReception?.average_hours_played
    );
    const lifetimeBugReportCount = toNumber(communityReception?.bug_report_count);
    const lifetimeReceptionStatus =
      communityReception?.reception_status || "Early results";

    const playtestIds = playtests
      .map((playtest) => playtest.id)
      .filter((playtestId): playtestId is string => Boolean(playtestId));

    let acceptedFeedback: AcceptedCommunityFeedback[] = [];

    if (playtestIds.length > 0) {
      const { data: acceptedFeedbackData, error: acceptedFeedbackError } =
        await supabase
          .from("community_game_tests")
          .select(
            "id, playtest_id, enjoyed_most, frustrations, bugs_found, biggest_improvement, feedback"
          )
          .in("playtest_id", playtestIds)
          .eq("review_outcome", "accepted")
          .order("reviewed_at", { ascending: true });

      if (acceptedFeedbackError) {
        console.error(
          "Could not load accepted community feedback:",
          acceptedFeedbackError
        );
      }

      acceptedFeedback =
        (acceptedFeedbackData ?? []) as AcceptedCommunityFeedback[];
    }

    const detailedFeedback = acceptedFeedback.filter(
      (response) =>
        response.enjoyed_most ||
        response.frustrations ||
        response.bugs_found ||
        response.biggest_improvement ||
        response.feedback
    );

    let playtestRoundSummaries: PlaytestRoundSummary[] = [];

    if (playtestIds.length > 0) {
      const { data: roundTestsData, error: roundTestsError } = await supabase
        .from("community_game_tests")
        .select(
          "playtest_id, overall_score, gameplay_score, performance_score, recommend_game, continue_playing, bugs_found, hours_played"
        )
        .in("playtest_id", playtestIds)
        .eq("review_outcome", "accepted");

      if (roundTestsError) {
        console.error("Could not load playtest round history:", roundTestsError);
      }

      const positiveIntent = (value: string | null) =>
        value === "definitely" || value === "probably";

      playtestRoundSummaries = playtests
        .map((playtest) => {
          const tests = (roundTestsData ?? []).filter(
            (test) => test.playtest_id === playtest.id
          );
          const rated = tests.filter((test) => test.overall_score !== null);
          const recommendAnswered = tests.filter(
            (test) => test.recommend_game !== null
          );
          const continueAnswered = tests.filter(
            (test) => test.continue_playing !== null
          );
          const gameplayRated = tests.filter(
            (test) => test.gameplay_score !== null
          );
          const performanceRated = tests.filter(
            (test) => test.performance_score !== null
          );
          const hoursReported = tests.filter(
            (test) => test.hours_played !== null
          );
          const bugsReported = tests.filter(
            (test) => Boolean(test.bugs_found?.trim())
          );

          return {
            id: playtest.id,
            releaseLabel: formatReleaseLabel(playtest.release_label, 1),
            createdAt: playtest.created_at,
            acceptedTests: tests.length,
            ratedTests: rated.length,
            averageOverall:
              rated.length > 0
                ? rated.reduce(
                    (sum, test) => sum + Number(test.overall_score ?? 0),
                    0
                  ) / rated.length
                : null,
            averageGameplay:
              gameplayRated.length > 0
                ? gameplayRated.reduce(
                    (sum, test) => sum + Number(test.gameplay_score ?? 0),
                    0
                  ) / gameplayRated.length
                : null,
            averagePerformance:
              performanceRated.length > 0
                ? performanceRated.reduce(
                    (sum, test) => sum + Number(test.performance_score ?? 0),
                    0
                  ) / performanceRated.length
                : null,
            recommendPositivePercent:
              recommendAnswered.length > 0
                ? Math.round(
                    (recommendAnswered.filter((test) =>
                      positiveIntent(test.recommend_game)
                    ).length /
                      recommendAnswered.length) *
                      100
                  )
                : null,
            continuePositivePercent:
              continueAnswered.length > 0
                ? Math.round(
                    (continueAnswered.filter((test) =>
                      positiveIntent(test.continue_playing)
                    ).length /
                      continueAnswered.length) *
                      100
                  )
                : null,
            bugReportCount: bugsReported.length,
            averageHours:
              hoursReported.length > 0
                ? hoursReported.reduce(
                    (sum, test) => sum + Number(test.hours_played ?? 0),
                    0
                  ) / hoursReported.length
                : null,
          };
        })
        .filter((round) => round.acceptedTests > 0)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }

    // A build needs 5 accepted tests before it can replace an established
    // public reception. This gives developers a real redemption path without
    // letting one or two fresh reviews erase a well-supported older result.
    const qualifiedRounds = playtestRoundSummaries.filter(
      (round) => round.acceptedTests >= 5 && round.ratedTests > 0
    );

    const currentQualifiedRound =
      qualifiedRounds.length > 0
        ? qualifiedRounds[qualifiedRounds.length - 1]
        : null;

    const latestRound =
      playtestRoundSummaries.length > 0
        ? playtestRoundSummaries[playtestRoundSummaries.length - 1]
        : null;

    const currentReceptionRound = currentQualifiedRound ?? latestRound;

    const acceptedReceptionCount =
      currentReceptionRound?.acceptedTests ?? lifetimeAcceptedReceptionCount;
    const ratedReceptionCount =
      currentReceptionRound?.ratedTests ?? lifetimeRatedReceptionCount;
    const overallScore =
      currentReceptionRound?.averageOverall ?? lifetimeOverallScore;
    const gameplayScore =
      currentReceptionRound?.averageGameplay ?? lifetimeGameplayScore;
    const performanceScore =
      currentReceptionRound?.averagePerformance ?? lifetimePerformanceScore;
    const averageHours =
      currentReceptionRound?.averageHours ?? lifetimeAverageHours;
    const bugReportCount =
      currentReceptionRound?.bugReportCount ?? lifetimeBugReportCount;

    const hasCommunityReception =
      acceptedReceptionCount > 0 && ratedReceptionCount > 0;

    const receptionStatus = (() => {
      if (!currentReceptionRound) return lifetimeReceptionStatus;
      if (currentReceptionRound.acceptedTests < 5) return "Early results";

      const overall = currentReceptionRound.averageOverall ?? 0;
      const recommend = currentReceptionRound.recommendPositivePercent ?? 0;
      const continuing = currentReceptionRound.continuePositivePercent ?? 0;

      if (overall >= 8 && recommend >= 70 && continuing >= 70) {
        return "Excellent reception";
      }
      if (overall >= 6.5 && recommend >= 60 && continuing >= 60) {
        return "Positive reception";
      }
      if (overall < 5 && recommend < 40 && continuing < 40) {
        return "Poor reception";
      }
      return "Mixed reception";
    })();

    const latestRoundIsUnqualified =
      latestRound !== null &&
      currentQualifiedRound !== null &&
      latestRound.id !== currentQualifiedRound.id &&
      latestRound.acceptedTests < 5;

    const currentDetailedFeedback = currentReceptionRound
      ? detailedFeedback.filter(
          (response) => response.playtest_id === currentReceptionRound.id
        )
      : detailedFeedback;

    const intentData=await publicIntentCounts(supabase,[{kind:"imported",id:importedGame.id}]);
    const intentGame=intentData?.[0];
    const selectedIntent=currentReceptionRound?intentGame?.builds.find(build=>build.playtest_id===currentReceptionRound.id):intentGame?.lifetime;
    const verificationStatus: VerificationStatus = "Not yet verified";
    const steamUrl =
      importedGame.steam_url ||
      (importedGame.steam_app_id
        ? `https://store.steampowered.com/app/${importedGame.steam_app_id}/`
        : null);

    return (
      <main className="min-h-screen bg-[#090b0a] text-zinc-100">
        <SiteHeader />
          <ShareJourneyBanner />

        <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">
          <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                {verificationStatus}
              </span>
              <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-3 py-1.5 text-xs font-semibold text-violet-200">
                {listingUpdate?.fields.ai_type||"AI Use Unknown"}
              </span>
              <span className="inline-flex rounded-full border border-[#77f29b]/25 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b9f9ca]">
                Developer claimed
              </span>
            </div>

            <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <p className="text-sm text-zinc-500">
                  {importedGame.genre || "Uncategorised"} · Game profile
                </p>

                <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-6xl">
                  {importedGame.title || "Untitled game"}
                </h1>

                <p className="mt-3 text-lg text-zinc-400">
                  by {importedGame.developer_name || "Unknown developer"}
                </p>

                <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">
                  {importedGame.description ||
                    "No description is currently available for this game."}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {steamUrl && (
                    <TrackedAccessLink
                      href={steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-[#77f29b] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#8af5a8]"
                    >
                      View Steam page ↗
                    </TrackedAccessLink>
                  )}
                  <a
                    href="/"
                    className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                  >
                    Back to catalogue
                  </a>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101311]">
                {importedGame.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={importedGame.image_url}
                    alt={importedGame.title || "Game artwork"}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#253b2b] to-[#151815] text-sm text-zinc-500">
                    Game artwork
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                    Community reception
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
                    {hasCommunityReception
                      ? "What Playtested testers thought"
                      : activePlaytest
                        ? "Currently being playtested"
                        : playtests.length > 0
                          ? "Playtesting history"
                          : "Developer claimed on Playtested"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Community reception comes from accepted Playtested tester
                    responses. It is separate from independent Playtested
                    assessment and verification.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasCommunityReception && (
                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${receptionBadgeClasses(
                        receptionStatus
                      )}`}
                    >
                      {receptionStatus}
                    </span>
                  )}

                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                    {verificationStatus}
                  </span>
                </div>
              </div>

              {hasCommunityReception ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-[#77f29b]/25 bg-[#77f29b]/[0.05] p-4">
                      <p className="text-xs text-zinc-500">Overall experience</p>
                      <p className="mt-1 text-3xl font-bold text-[#77f29b]">
                        {overallScore !== null ? overallScore.toFixed(1) : "—"}
                        <span className="text-sm text-zinc-500">/10</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {ratedReceptionCount}{" "}
                        {ratedReceptionCount === 1 ? "rating" : "ratings"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">Would recommend</p>
                      <p className="mt-1 text-2xl font-bold text-zinc-100">
                        <IntentSummary counts={selectedIntent?.recommend}/>
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
                        <IntentSummary counts={selectedIntent?.continue}/>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Accepted independent tester answers
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">Accepted tests</p>
                      <p className="mt-1 text-2xl font-bold text-zinc-100">
                        {acceptedReceptionCount}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        from current build
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">Gameplay</p>
                      <p className="mt-1 text-xl font-bold text-zinc-100">
                        {gameplayScore !== null
                          ? `${gameplayScore.toFixed(1)}/10`
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">Performance</p>
                      <p className="mt-1 text-xl font-bold text-zinc-100">
                        {performanceScore !== null
                          ? `${performanceScore.toFixed(1)}/10`
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">Reported issues</p>
                      <p className="mt-1 text-xl font-bold text-zinc-100">
                        {bugReportCount}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {averageHours !== null
                          ? `${averageHours.toFixed(1)}h average play time`
                          : "No play-time average yet"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs leading-5 text-zinc-500">
                      Current reception reflects{" "}
                      <span className="font-medium text-zinc-400">
                        {currentReceptionRound?.releaseLabel ||
                          "the latest tested build"}
                      </span>
                      {currentQualifiedRound
                        ? " after reaching the minimum evidence threshold of 5 accepted tests."
                        : " and is still considered early evidence."}{" "}
                      Older builds remain visible in Playtest history.
                    </p>

                    {latestRoundIsUnqualified && latestRound && (
                      <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.04] px-3 py-2">
                        <p className="text-xs font-semibold text-amber-200">
                          Retest in progress · {latestRound.releaseLabel}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {latestRound.acceptedTests}/5 accepted tests. The
                          previous qualified reception remains public until
                          this build reaches 5 accepted responses.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-zinc-500">Playtest rounds</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-100">
                      {playtests.length}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-zinc-500">
                      Independent testers
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-100">
                      {independentParticipants}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-zinc-500">Accepted tests</p>
                    <p className="mt-1 text-2xl font-bold text-[#77f29b]">
                      {acceptedIndependentTests}
                    </p>
                  </div>
                </div>
              )}

              {playtestRoundSummaries.length > 1 && (
                <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77f29b]">
                        Playtest history
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-100">
                        Reception by build
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Accepted tester responses only
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {playtestRoundSummaries.map((round, index) => {
                      const previous =
                        index > 0 ? playtestRoundSummaries[index - 1] : null;
                      const delta =
                        previous?.averageOverall != null &&
                        round.averageOverall != null
                          ? round.averageOverall - previous.averageOverall
                          : null;

                      return (
                        <div
                          key={round.id}
                          className="grid gap-3 rounded-lg border border-white/10 bg-[#0b0e0c] p-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(72px,0.7fr))]"
                        >
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">
                              {round.releaseLabel}
                              {currentReceptionRound?.id === round.id && (
                                <span className="ml-2 rounded-full border border-[#77f29b]/25 bg-[#77f29b]/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#b9f9ca]">
                                  Current
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {round.acceptedTests} accepted{" "}
                              {round.acceptedTests === 1 ? "test" : "tests"} ·{" "}
                              {round.acceptedTests < 5
                                ? "Early results"
                                : (round.averageOverall ?? 0) >= 8 &&
                                    (round.recommendPositivePercent ?? 0) >= 70 &&
                                    (round.continuePositivePercent ?? 0) >= 70
                                  ? "Excellent reception"
                                  : (round.averageOverall ?? 0) >= 6.5 &&
                                      (round.recommendPositivePercent ?? 0) >= 60 &&
                                      (round.continuePositivePercent ?? 0) >= 60
                                    ? "Positive reception"
                                    : (round.averageOverall ?? 0) < 5 &&
                                        (round.recommendPositivePercent ?? 0) < 40 &&
                                        (round.continuePositivePercent ?? 0) < 40
                                      ? "Poor reception"
                                      : "Mixed reception"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                              Overall
                            </p>
                            <p className="mt-1 text-sm font-semibold text-zinc-100">
                              {round.averageOverall != null
                                ? `${round.averageOverall.toFixed(1)}/10`
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                              Recommend
                            </p>
                            <p className="mt-1 text-sm font-semibold text-zinc-100">
                              <IntentSummary counts={intentGame?.builds.find(build=>build.playtest_id===round.id)?.recommend}/>
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                              Continue
                            </p>
                            <p className="mt-1 text-sm font-semibold text-zinc-100">
                              <IntentSummary counts={intentGame?.builds.find(build=>build.playtest_id===round.id)?.continue}/>
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                              Change
                            </p>
                            <p
                              className={`mt-1 text-sm font-semibold ${
                                delta == null
                                  ? "text-zinc-500"
                                  : delta > 0
                                    ? "text-[#77f29b]"
                                    : delta < 0
                                      ? "text-red-300"
                                      : "text-zinc-300"
                              }`}
                            >
                              {delta == null
                                ? "Baseline"
                                : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-zinc-600">
                    Build-to-build changes use accepted community responses.
                    Different tester groups and sample sizes can affect comparisons.
                  </p>
                </div>
              )}

              {currentDetailedFeedback.length > 0 && (
                <details className="group mt-5 rounded-lg border border-white/10 bg-black/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        View tester feedback
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {currentDetailedFeedback.length} detailed{" "}
                        {currentDetailedFeedback.length === 1 ? "response" : "responses"} ·{" "}
                        {acceptedReceptionCount} accepted{" "}
                        {acceptedReceptionCount === 1 ? "test" : "tests"} ·
                        comments shown as submitted
                      </p>
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-sm text-zinc-400 transition group-open:rotate-45 group-open:border-[#77f29b]/30 group-open:text-[#77f29b]">
                      +
                    </span>
                  </summary>

                  <div className="border-t border-white/10 p-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      {currentDetailedFeedback.map((response, index) => (
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

                          <div className="mt-3 space-y-3 text-sm">
                            {response.enjoyed_most && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                                  Enjoyed most
                                </p>
                                <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                                  {response.enjoyed_most}
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

                            {response.biggest_improvement && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                                  Suggested improvement
                                </p>
                                <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                                  {response.biggest_improvement}
                                </p>
                              </div>
                            )}

                            {response.bugs_found && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">
                                  Bugs / technical feedback
                                </p>
                                <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-300">
                                  {response.bugs_found}
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
                      ))}
                    </div>

                    <p className="mt-4 text-xs leading-5 text-zinc-600">
                      These are accepted tester comments, not independently
                      confirmed findings or a Playtested verification verdict.
                    </p>
                  </div>
                </details>
              )}

              {latestPlaytest ? (
                <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Latest playtest
                      </p>
                      <p className="mt-2 font-semibold text-zinc-100">
                        {formatReleaseLabel(
                          latestPlaytest.release_label,
                          playtests.length
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        latestPlaytest.status === "open"
                          ? "border-[#77f29b]/25 bg-[#77f29b]/[0.06] text-[#b9f9ca]"
                          : latestPlaytest.status === "paused"
                            ? "border-amber-300/25 bg-amber-300/[0.06] text-amber-200"
                            : "border-white/15 bg-white/[0.04] text-zinc-300"
                      }`}
                    >
                      {formatStatus(latestPlaytest.status)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-white/15 p-4">
                  <p className="text-sm text-zinc-400">
                    The developer has claimed this game, but no public
                    playtesting activity has been recorded yet.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                Developer relationship
              </p>
              <h2 className="mt-3 text-lg font-bold">Claimed on Playtested</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                A developer relationship for this game has been approved on
                Playtested. This confirms the account&apos;s relationship to
                the listing. It does not mean the game itself has been
                assessed or verified.
              </p>
              {"relationship" in developerLink &&
                developerLink.relationship && (
                  <p className="mt-4 text-sm text-zinc-300">
                    Relationship:{" "}
                    <span className="font-semibold text-zinc-100">
                      {developerLink.relationship}
                    </span>
                  </p>
                )}
            </div>

            <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                AI transparency
              </p>
              <h2 className="mt-3 text-lg font-bold">{listingUpdate?.fields.ai_type||"AI Use Unknown"}</h2>{disclosureNotice&&<p className="mt-2 text-amber-200">{disclosureNotice}</p>}
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {listingUpdate?.fields.ai_type?"This is a developer declaration, not independent verification.":"No developer AI-use disclosure is currently available. Playtested does not infer AI use from a Steam listing."}
              </p>
            </div>

            <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                The principle
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                How a game was made is useful context. Whether it is worth
                playing is what matters.
              </p>
            </div>
          </aside>
        </div>

        <p className="px-6 py-6 text-center text-xs text-zinc-400">
          PLAYTESTED_ · Game information sourced from the catalogue. Playtested
          activity reflects activity recorded on Playtested.
        </p>
      </main>
    );
  }

  const game = games.find((item) => item.slug === slug);

  if (!game) {
    return (
      <main className="min-h-screen bg-[#090b0a] text-zinc-100">
        <SiteHeader />
          <ShareJourneyBanner />
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h1 className="text-3xl font-bold">Game not found</h1>
          <a href="/" className="mt-6 inline-block text-[#77f29b]">
            Back to Game Discovery
          </a>
        </section>
      </main>
    );
  }

  const reviews = game.reviews ?? [];
  const score = game.score;

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />
          <ShareJourneyBanner />

      <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="inline-flex rounded border border-[#77f29b]/30 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#77f29b]">
            {game.aiType}
          </span>

          <p className="mt-6 text-sm text-zinc-500">
            {game.genre} · Game profile
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold md:text-6xl">
              {game.title}
            </h1>

            <div className="rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.06] p-4">
              <p className="text-xs text-zinc-500">PLAYER SCORE</p>
              <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#77f29b]">
                {score !== null ? score.toFixed(1) : "Unrated"}
                {score !== null && (
                  <span className="text-sm text-zinc-500"> /10</span>
                )}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl leading-7 text-zinc-400">
            {game.description}
          </p>

          <p className="mt-5 text-xs text-amber-300">
            DEMO CONTENT · Classifications, scores and reviews are illustrative
            examples, not verified claims.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            Player review feed
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            What players like, what needs work, and where opinions differ.
          </p>

          <div className="mt-6 space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article
                  key={review.user}
                  className="rounded-xl border border-white/[0.09] bg-[#101311] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{review.user}</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Sample review · {review.tag}
                      </p>
                    </div>
                    <span className="rounded bg-[#77f29b]/10 px-2.5 py-1 text-sm font-semibold text-[#77f29b]">
                      {review.rating}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-zinc-300">
                    {review.text}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
                <p className="text-sm leading-7 text-zinc-400">
                  Detailed reviews have not been added to this demo game yet.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5">
            <h3 className="font-semibold">Add your review</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Real review submission and user accounts will be added in a later
              version.
            </p>
            <button
              type="button"
              disabled
              className="mt-4 cursor-not-allowed rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-500"
            >
              Coming later
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Quick verdict
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {game.verdict ??
                "A detailed assessment has not yet been added for this game."}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              What works
            </h2>
            {game.strengths && game.strengths.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {game.strengths.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-zinc-300">
                    <span className="text-[#77f29b]">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                No assessment available yet.
              </p>
            )}

            <div className="my-5 border-t border-white/[0.08]" />

            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Needs work
            </h2>
            {game.weaknesses && game.weaknesses.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {game.weaknesses.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-zinc-300">
                    <span className="text-amber-300">−</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                No assessment available yet.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
            <p className="text-xs tracking-widest text-[#77f29b]">
              AI TRANSPARENCY
            </p>
            <h2 className="mt-3 text-lg font-bold">What this label means</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              This is a sample classification for the prototype. In a live
              version, the label should be supported by a developer disclosure
              and evidence where available. It does not indicate that Playtested
              has independently verified the claim.
            </p>
          </div>

          <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.04] p-5">
            <p className="text-xs tracking-widest text-[#77f29b]">
              THE PRINCIPLE
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              How a game was made is useful context. Whether it is worth playing
              is what matters.
            </p>
          </div>
        </aside>
      </div>


    </main>
  );
}

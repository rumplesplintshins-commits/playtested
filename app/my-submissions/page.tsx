import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import SiteHeader from "../components/SiteHeader";
import GameLinksEngagement from "../components/GameLinksEngagement";
import StartPlaytest from "../components/StartPlaytest";
import {listingUpdates,listingNotice} from "@/lib/listing-updates";
import DeveloperWorkspace, {WorkspaceRetry} from "../components/DeveloperWorkspace";
import {submissionIssues,completenessMessage} from "../../lib/submission-completeness";
import { createClient } from "../../lib/supabase-server";

type ClaimStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Needs More Information";

type PlaytestStatus =
  | "draft"
  | "open"
  | "paused"
  | "closed";

type PlaytestAudience =
  | "playtested_testers"
  | "own_community"
  | "both";

type PlaytestAccessType =
  | "steam_demo"
  | "steam_game"
  | "browser_game"
  | "download_build"
  | "other";

type SubmissionRow = {
  review_reason: string | null;
  id: string;
  title: string;
  genre: string;
  status: string;
  submitted_at: string;
};

type PulseJobRow = {
  id: string;
  submission_id: string;
  technical_run_id: string | null;
  status: string;
  engine_version: string;
  worker_version: string;
  test_suite_version: string;
  build_sha256: string | null;
  error_message: string | null;
  report_json: unknown | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getPulseReportSummary(reportJson: unknown) {
  const report = asRecord(reportJson);
  const build = asRecord(report.build);
  const security = asRecord(report.securityScan);

  const totalChecks = asNumber(report.totalChecks);
  const successfulLoads = asNumber(build.successfulLoads);
  const launchPassed = asNumber(report.launchPassed);
  const launchTotal = asNumber(report.launchTotal);
  const restartPassed = asNumber(report.restartPassed);
  const restartTotal = asNumber(report.restartTotal);
  const runtimeErrors = asNumber(report.sessionsWithErrors);
  const failedRequests = asNumber(report.sessionsWithFailedRequests);
  const stalls = asNumber(report.sessionsWithStalls);
  const workerErrors = asNumber(report.workerSessionErrors);
  const immediateCrashes = asNumber(report.immediateCrashes);
  const issueCount = asNumber(report.issueCount);
  const durationMs = asNumber(report.durationMs);
  const medianLoadMs = asNumber(build.medianLoadMs);
  const interactionConfirmed = asNumber(report.interactionConfirmed);
  const interactionFailed = asNumber(report.interactionFailed);
  const interactionInconclusive = asNumber(report.interactionInconclusive);

  return {
    available: Object.keys(report).length > 0,
    summary: asString(
      report.summary,
      issueCount === 0 ? "No technical issues detected." : "PULSE run completed."
    ),
    totalChecks,
    successfulLoads,
    launchPassed,
    launchTotal,
    restartPassed,
    restartTotal,
    runtimeErrors,
    failedRequests,
    stalls,
    workerErrors,
    immediateCrashes,
    issueCount,
    durationMs,
    medianLoadMs,
    interactionConfirmed,
    interactionFailed,
    interactionInconclusive,
    securityStatus: asString(security.status),
    securityBlocked: security.blocked === true,
    packageValid: build.packageValid === true,
    entryPointFound: build.entryPointFound === true,
  };
}

type GameClaimRow = {
  id: string;
  imported_game_id: string | null;
  approved_game_id: string | null;
  submission_id: string | null;
  relationship: string;
  claim_reason: string;
  evidence_url: string | null;
  status: ClaimStatus;
  admin_notes: string | null;
  created_at: string;
};

type DeveloperClaim = GameClaimRow & {
  gameTitle: string;
  developerName: string;
};

type GameDeveloperLinkRow = {
  id: string;
  developer_id: string;
  imported_game_id: string | null;
  approved_game_id: string | null;
  submission_id: string | null;
  relationship: string;
  source_claim_id: string | null;
  created_at: string;
};

type CommunityPlaytestRow = {
  id: string;
  developer_id: string;
  imported_game_id: string | null;
  approved_game_id: string | null;
  submission_id: string | null;
  title: string;
  share_token: string;
  access_link: string;
  access_type: PlaytestAccessType;
  instructions: string;
  focus_areas: string[] | null;
  audience: PlaytestAudience;
  target_testers: number;
  estimated_minutes: number | null;
  release_label: string | null;
  status: PlaytestStatus;
  created_at: string;
  published_at: string | null;
};

type LinkedPlaytest = {
  id: string;
  status: PlaytestStatus;
  shareToken: string;
  accessLink: string;
  accessType: PlaytestAccessType;
  instructions: string;
  focusAreas: string[];
  audience: PlaytestAudience;
  targetTesters: number;
  estimatedMinutes: number | null;
  releaseLabel: string | null;
  createdAt: string;
  publishedAt: string | null;
};

type DeveloperReceptionRow = {
  playtest_id: string;
  imported_game_id: string | null;
  approved_game_id: string | null;
  submission_id: string | null;
  release_label: string;
  playtest_status: string;
  target_testers: number;
  accepted_test_count: number | string;
  rated_test_count: number | string;
  average_overall_score: number | string | null;
  average_gameplay_score: number | string | null;
  average_performance_score: number | string | null;
  recommend_positive_percent: number | string | null;
  continue_positive_percent: number | string | null;
  technical_feedback_count: number | string;
  average_hours_played: number | string | null;
  created_at: string;
};

type DeveloperReception = {
  playtestId: string;
  releaseLabel: string;
  playtestStatus: string;
  targetTesters: number;
  acceptedTests: number;
  ratedTests: number;
  overallScore: number | null;
  gameplayScore: number | null;
  performanceScore: number | null;
  recommendPercent: number | null;
  continuePercent: number | null;
  technicalFeedbackCount: number;
  averageHoursPlayed: number | null;
};

type LinkedGame = {
  listingNotice?: string;
  approvedClaimIds: string[];
  identity: string;
  linkId: string;
  gameId: string;
  importedGameId: string | null;
  approvedGameId: string | null;
  submissionId: string | null;
  gameTitle: string;
  developerName: string;
  genre: string;
  relationship: string;
  sourceType:
    | "Imported Steam game"
    | "Approved game"
    | "Submitted game";
  verificationStatus:
    | "Verified"
    | "Assessed"
    | "Not yet verified";
  linkedAt: string;
  imageUrl: string | null;
  latestPlaytest: LinkedPlaytest | null;
  playtests: LinkedPlaytest[];
  currentReception: DeveloperReception | null;
};

function LoadingDashboard() {
  return (
    <p role="status" className="mt-8 text-zinc-400">
      Loading your developer dashboard...
    </p>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function claimStatusClasses(status: ClaimStatus) {
  if (status === "Rejected") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (status === "Needs More Information") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }

  if (status === "Approved") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  return "border-sky-300/30 bg-sky-300/10 text-sky-200";
}

function submissionStatusClasses(status: string) {
  if (status === "Approved") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  if (status === "Rejected") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (status === "Needs More Information") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }

  if (status === "Pending Review") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-200";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

function pulseStatusClasses(status: string) {
  if (status === "COMPLETE") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  if (status === "FAILED" || status === "BLOCKED") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (status === "QUEUED") {
    return "border-white/10 bg-white/[0.04] text-zinc-300";
  }

  return "border-sky-300/30 bg-sky-300/10 text-sky-200";
}

function toLinkedPlaytest(playtest: CommunityPlaytestRow): LinkedPlaytest {
  return {
    id: playtest.id,
    status: playtest.status,
    shareToken: playtest.share_token,
    accessLink: playtest.access_link,
    accessType: playtest.access_type ?? "other",
    instructions: playtest.instructions,
    focusAreas: playtest.focus_areas ?? [],
    audience: playtest.audience,
    targetTesters: playtest.target_testers,
    estimatedMinutes: playtest.estimated_minutes,
    releaseLabel: playtest.release_label,
    createdAt: playtest.created_at,
    publishedAt: playtest.published_at,
  };
}

function findPlaytestsForGame(
  game: {
    importedGameId: string | null;
    approvedGameId: string | null;
    submissionId: string | null;
  },
  playtests: CommunityPlaytestRow[]
): LinkedPlaytest[] {
  return playtests
    .filter((playtest) => {
      if (
        game.importedGameId &&
        playtest.imported_game_id === game.importedGameId
      ) {
        return true;
      }

      if (
        game.approvedGameId &&
        playtest.approved_game_id === game.approvedGameId
      ) {
        return true;
      }

      if (
        game.submissionId &&
        playtest.submission_id === game.submissionId
      ) {
        return true;
      }

      return false;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .map(toLinkedPlaytest);
}


function nullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumber(value: number | string | null | undefined) {
  return nullableNumber(value) ?? 0;
}

function receptionStatus(reception: DeveloperReception) {
  if (reception.acceptedTests < 5 || reception.ratedTests < 5) {
    return "Early results";
  }

  const overall = reception.overallScore ?? 0;
  const recommend = reception.recommendPercent ?? 0;
  const continued = reception.continuePercent ?? 0;

  if (overall >= 8 && recommend >= 70 && continued >= 70) {
    return "Excellent reception";
  }

  if (overall >= 6.5 && recommend >= 60 && continued >= 60) {
    return "Positive reception";
  }

  if (overall < 5 && recommend < 40 && continued < 40) {
    return "Poor reception";
  }

  return "Mixed reception";
}

function receptionStatusClasses(status: string) {
  if (status === "Excellent reception") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  if (status === "Positive reception") {
    return "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200";
  }

  if (status === "Poor reception") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (status === "Mixed reception") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }

  return "border-sky-300/25 bg-sky-300/[0.08] text-sky-200";
}

function receptionForGame(
  game: {
    importedGameId: string | null;
    approvedGameId: string | null;
    submissionId: string | null;
  },
  receptions: DeveloperReceptionRow[]
): DeveloperReception | null {
  const row = receptions.find((item) => {
    if (game.submissionId && item.submission_id === game.submissionId) return true;
    if (game.approvedGameId && item.approved_game_id === game.approvedGameId) return true;
    if (game.importedGameId && item.imported_game_id === game.importedGameId) return true;
    return false;
  });

  if (!row) return null;

  return {
    playtestId: row.playtest_id,
    releaseLabel: row.release_label || "Unlabelled build",
    playtestStatus: row.playtest_status,
    targetTesters: row.target_testers ?? 0,
    acceptedTests: requiredNumber(row.accepted_test_count),
    ratedTests: requiredNumber(row.rated_test_count),
    overallScore: nullableNumber(row.average_overall_score),
    gameplayScore: nullableNumber(row.average_gameplay_score),
    performanceScore: nullableNumber(row.average_performance_score),
    recommendPercent: nullableNumber(row.recommend_positive_percent),
    continuePercent: nullableNumber(row.continue_positive_percent),
    technicalFeedbackCount: requiredNumber(row.technical_feedback_count),
    averageHoursPlayed: nullableNumber(row.average_hours_played),
  };
}

function xpRequiredForNextLevel(level: number) {
  return 100 + (level - 1) * 50;
}

function getDeveloperProgress(totalXp: number) {
  let level = 1;
  let xpIntoLevel = Math.max(0, totalXp);

  while (xpIntoLevel >= xpRequiredForNextLevel(level)) {
    xpIntoLevel -= xpRequiredForNextLevel(level);
    level += 1;
  }

  const xpForNextLevel = xpRequiredForNextLevel(level);

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent: Math.min(
      100,
      Math.round((xpIntoLevel / xpForNextLevel) * 100)
    ),
  };
}

function getDeveloperTitle(level: number) {
  if (level >= 50) return "Playtested Creator";
  if (level >= 40) return "Veteran Developer";
  if (level >= 30) return "Master Developer";
  if (level >= 25) return "Accomplished Developer";
  if (level >= 20) return "Proven Developer";
  if (level >= 15) return "Experienced Developer";
  if (level >= 10) return "Established Developer";
  if (level >= 5) return "Indie Developer";
  return "New Developer";
}


async function DeveloperDashboard() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/my-submissions");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("roles, developer_xp")
      .eq("id", user.id)
      .single();

  if(profileError) return <WorkspaceRetry message="Could not verify your developer access. Please retry."/>;
  if (
    !profile ||
    !Array.isArray(profile.roles) ||
    !profile.roles.includes("developer")
  ) {
    redirect("/account");
  }

  const [
    { data: submissions, error: submissionsError },
    { data: claimRows, error: claimsError },
    { data: linkRows, error: linksError },
    { data: playtestRows, error: playtestsError },
    { data: pulseJobRows, error: pulseJobsError },
    { data: receptionRows, error: receptionError },
  ] = await Promise.all([
    supabase
      .from("game_submissions")
      .select("*")
      .eq("developer_id", user.id)
      .order("submitted_at", { ascending: false }),

    supabase
      .from("game_claims")
      .select(
        `
          id,
          imported_game_id,
          approved_game_id,
          submission_id,
          relationship,
          claim_reason,
          evidence_url,
          status,
          admin_notes,
          created_at
        `
      )
      .eq("claimant_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("game_developer_links")
      .select(
        `
          id,
          developer_id,
          imported_game_id,
          approved_game_id,
          submission_id,
          relationship,
          source_claim_id,
          created_at
        `
      )
      .eq("developer_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("community_playtests")
      .select(
        `
          id,
          developer_id,
          imported_game_id,
          approved_game_id,
          submission_id,
          title,
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
      .eq("developer_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("pulse_jobs")
      .select(
        `
          id,
          submission_id,
          technical_run_id,
          status,
          engine_version,
          worker_version,
          test_suite_version,
          build_sha256,
          error_message,
          report_json,
          created_at,
          started_at,
          completed_at
        `
      )
      .eq("developer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase.rpc("get_developer_current_reception"),
  ]);

  if (submissionsError) {
    console.error(
      "Could not load developer submissions:",
      submissionsError
    );

    return (
      <WorkspaceRetry message={"Could not load your submissions. Please try again."} />
    );
  }

  if (claimsError) {
    console.error(
      "Could not load developer claims:",
      claimsError
    );

    return (
      <WorkspaceRetry message={"Could not load your developer claims. Please try again."} />
    );
  }

  if (linksError) {
    console.error(
      "Could not load linked developer games:",
      linksError
    );

    return (
      <WorkspaceRetry message={"Could not load your linked games. Please try again."} />
    );
  }

  if (playtestsError) {
    console.error(
      "Could not load developer playtests:",
      playtestsError
    );

    return (
      <WorkspaceRetry message={"Could not load your playtests. Please try again."} />
    );
  }

  if (receptionError) {
    console.error(
      "Could not load current community reception:",
      receptionError
    );
  }

  const games = (submissions ?? []) as SubmissionRow[];
  const rawClaims = (claimRows ?? []) as GameClaimRow[];
  const rawLinks =
    (linkRows ?? []) as GameDeveloperLinkRow[];
  const rawPlaytests =
    (playtestRows ?? []) as CommunityPlaytestRow[];
  const pulseJobs =
    (pulseJobRows ?? []) as PulseJobRow[];
  const rawReceptions =
    (receptionRows ?? []) as DeveloperReceptionRow[];

  const importedIds = Array.from(
    new Set(
      [...rawClaims, ...rawLinks]
        .map((item) => item.imported_game_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const approvedIds = Array.from(
    new Set(
      [...rawClaims, ...rawLinks]
        .map((item) => item.approved_game_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const submissionIds = Array.from(
    new Set(
      [...rawClaims, ...rawLinks]
        .map((item) => item.submission_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [
    importedResult,
    approvedResult,
    submissionResult,
  ] = await Promise.all([
    importedIds.length > 0
      ? supabase
          .from("imported_games")
          .select("id, title, developer_name, genre, image_url, steam_app_id")
          .in("id", importedIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string;
            developer_name: string | null;
            genre: string | null;
            image_url: string | null;
          }[],
          error: null,
        }),

    approvedIds.length > 0
      ? supabase
          .from("approved_games")
          .select("id, title, developer_name, genre, image_url, steam_app_id")
          .in("id", approvedIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string | null;
            developer_name: string | null;
            genre: string | null;
            image_url: string | null;
          }[],
          error: null,
        }),

    submissionIds.length > 0
      ? supabase
          .from("game_submissions")
          .select("id, title, developer_name, genre, image_url, steam_app_id")
          .in("id", submissionIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string;
            developer_name: string | null;
            genre: string | null;
            image_url: string | null;
          }[],
          error: null,
        }),
  ]);

  if (importedResult.error) {
    console.error(
      "Could not resolve imported developer games:",
      importedResult.error
    );
  }

  if (approvedResult.error) {
    console.error(
      "Could not resolve approved developer games:",
      approvedResult.error
    );
  }

  if (submissionResult.error) {
    console.error(
      "Could not resolve submitted developer games:",
      submissionResult.error
    );
  }

  const importedMap = new Map(
    (importedResult.data ?? []).map((game) => [
      game.id,
      {
        title: game.title,
        developerName:
          game.developer_name ?? "Unknown developer",
        genre: game.genre ?? "Genre not listed",
        imageUrl: game.image_url ?? null,
        steamAppId: "steam_app_id" in game && /^[0-9]+$/.test(String(game.steam_app_id||"")) ? String(game.steam_app_id) : null,
      },
    ])
  );

  const approvedMap = new Map(
    (approvedResult.data ?? []).map((game) => [
      game.id,
      {
        title: game.title ?? "Unknown game",
        developerName:
          game.developer_name ?? "Unknown developer",
        genre: game.genre ?? "Genre not listed",
        imageUrl: game.image_url ?? null,
        steamAppId: "steam_app_id" in game && /^[0-9]+$/.test(String(game.steam_app_id||"")) ? String(game.steam_app_id) : null,
      },
    ])
  );

  const submissionMap = new Map(
    (submissionResult.data ?? []).map((game) => [
      game.id,
      {
        title: game.title,
        developerName:
          game.developer_name ?? "Unknown developer",
        genre: game.genre ?? "Genre not listed",
        imageUrl: game.image_url ?? null,
        steamAppId: "steam_app_id" in game && /^[0-9]+$/.test(String(game.steam_app_id||"")) ? String(game.steam_app_id) : null,
      },
    ])
  );

  const claims: DeveloperClaim[] = rawClaims.map(
    (claim) => {
      let target:
        | {
            title: string;
            developerName: string;
          }
        | undefined;

      if (claim.imported_game_id) {
        target = importedMap.get(
          claim.imported_game_id
        );
      }

      if (!target && claim.approved_game_id) {
        target = approvedMap.get(
          claim.approved_game_id
        );
      }

      if (!target && claim.submission_id) {
        target = submissionMap.get(
          claim.submission_id
        );
      }

      return {
        ...claim,
        gameTitle: target?.title ?? "Unknown game",
        developerName:
          target?.developerName ?? "Unknown developer",
      };
    }
  );

  const linkedGamesWithoutPlaytests = rawLinks.map(
    (link) => {
      const approvedClaimIds=claims.filter(claim=>claim.status==="Approved"
        && (!link.source_claim_id || claim.id===link.source_claim_id)
        && ((!!link.imported_game_id && claim.imported_game_id===link.imported_game_id)
          || (!!link.approved_game_id && claim.approved_game_id===link.approved_game_id)
          || (!!link.submission_id && claim.submission_id===link.submission_id)))
        .map(claim=>claim.id);
      if (link.imported_game_id) {
        const target = importedMap.get(
          link.imported_game_id
        );

        return {
          linkId: link.id,
          approvedClaimIds,
          identity: target?.steamAppId ? `steam:${target.steamAppId}` : `game:${link.imported_game_id}`,
          gameId: link.imported_game_id,
          importedGameId: link.imported_game_id,
          approvedGameId: null,
          submissionId: null,
          gameTitle: target?.title ?? "Unknown game",
          developerName:
            target?.developerName ?? "Unknown developer",
          genre: target?.genre ?? "Genre not listed",
          imageUrl: target?.imageUrl ?? null,
          relationship: link.relationship,
          sourceType: "Imported Steam game" as const,
          verificationStatus: "Not yet verified" as const,
          linkedAt: link.created_at,
        };
      }

      if (link.approved_game_id) {
        const target = approvedMap.get(
          link.approved_game_id
        );

        return {
          linkId: link.id,
          approvedClaimIds,
          identity: target?.steamAppId ? `steam:${target.steamAppId}` : `game:${link.approved_game_id}`,
          gameId: link.approved_game_id,
          importedGameId: null,
          approvedGameId: link.approved_game_id,
          submissionId: null,
          gameTitle: target?.title ?? "Unknown game",
          developerName:
            target?.developerName ?? "Unknown developer",
          genre: target?.genre ?? "Genre not listed",
          imageUrl: target?.imageUrl ?? null,
          relationship: link.relationship,
          sourceType: "Approved game" as const,
          verificationStatus: "Not yet verified" as const,
          linkedAt: link.created_at,
        };
      }

      const target = link.submission_id
        ? submissionMap.get(link.submission_id)
        : undefined;

      return {
        linkId: link.id,
          approvedClaimIds,
        identity: target?.steamAppId ? `steam:${target.steamAppId}` : `game:${link.submission_id||link.id}`,
        gameId: link.submission_id ?? link.id,
        importedGameId: null,
        approvedGameId: null,
        submissionId: link.submission_id,
        gameTitle: target?.title ?? "Unknown game",
        developerName:
          target?.developerName ?? "Unknown developer",
        genre: target?.genre ?? "Genre not listed",
        imageUrl: target?.imageUrl ?? null,
        relationship: link.relationship,
        sourceType: "Submitted game" as const,
        verificationStatus: "Not yet verified" as const,
        linkedAt: link.created_at,
      };
    }
  );

  const linkedGameCandidates: LinkedGame[] =
    linkedGamesWithoutPlaytests
      .map((game) => {
        const playtests = findPlaytestsForGame(game, rawPlaytests);

        return {
          ...game,
          latestPlaytest: playtests.find(p=>p.status!=="closed") ?? playtests[0] ?? null,
          playtests,
          currentReception: receptionForGame(game, rawReceptions),
        };
      })
      .sort((a, b) => {
        const aHasOpenPlaytest = a.playtests.some(
          (playtest) => playtest.status === "open"
        );
        const bHasOpenPlaytest = b.playtests.some(
          (playtest) => playtest.status === "open"
        );

        if (aHasOpenPlaytest !== bHasOpenPlaytest) {
          return aHasOpenPlaytest ? -1 : 1;
        }

        const aLatestPlaytestTime = a.latestPlaytest
          ? new Date(a.latestPlaytest.createdAt).getTime()
          : 0;
        const bLatestPlaytestTime = b.latestPlaytest
          ? new Date(b.latestPlaytest.createdAt).getTime()
          : 0;

        if (aLatestPlaytestTime !== bLatestPlaytestTime) {
          return bLatestPlaytestTime - aLatestPlaytestTime;
        }

        return (
          new Date(b.linkedAt).getTime() -
          new Date(a.linkedAt).getTime()
        );
      });

  const linkedGames = Array.from(linkedGameCandidates.reduce((groups,game)=>{
    const key=Array.from(groups.entries()).find(([,other])=>other.gameId===game.gameId||other.identity===game.identity)?.[0]||game.identity;
    const previous=groups.get(key);
    if(!previous){groups.set(key,game);return groups;}
    const playtests=Array.from(new Map([...previous.playtests,...game.playtests].map(p=>[p.id,p])).values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    const active=playtests.find(p=>p.status!=="closed");
    const representative=active&&game.playtests.some(p=>p.id===active.id)?game:previous;
    groups.set(key,{...representative,approvedClaimIds:[...new Set([...previous.approvedClaimIds,...game.approvedClaimIds])],playtests,latestPlaytest:active||playtests[0]||null,currentReception:representative.currentReception||previous.currentReception||game.currentReception});return groups;
  },new Map<string,LinkedGame>()).values());

  for(let start=0;start<linkedGames.length;start+=12){
    const batch=linkedGames.slice(start,start+12);
    const changes=await listingUpdates(supabase,batch.map(game=>({kind:game.importedGameId?"imported":game.approvedGameId?"approved":"submission",id:(game.importedGameId||game.approvedGameId||game.submissionId)!})));
    for(const game of batch){const update=changes?.find(row=>row.id===(game.importedGameId||game.approvedGameId||game.submissionId));if(update){game.gameTitle=update.fields.title||game.gameTitle;game.developerName=update.fields.developer_name||game.developerName;game.genre=update.fields.genre||game.genre;game.imageUrl=Object.hasOwn(update.fields,"image_url")?update.fields.image_url:game.imageUrl;game.listingNotice=listingNotice(update);}}
  }
  const developerXp =
    typeof profile.developer_xp === "number"
      ? profile.developer_xp
      : 0;

  const developerProgress =
    getDeveloperProgress(developerXp);

  const developerTitle =
    getDeveloperTitle(developerProgress.level);

  const submissionTitleById = new Map(
    games.map((game) => [game.id, game.title])
  );

  const completedPulseRuns = pulseJobs.filter(
    (job) => job.status === "COMPLETE"
  );

  return <DeveloperWorkspace showPlan feedbackCountsReady={!receptionError}
 warnings={[...(pulseJobsError?["PULSE diagnostics could not be loaded. Your games and campaign actions remain available."]:[]),...(receptionError?["Feedback totals could not be loaded. Open a game to retry its build results."]:[]),...((importedResult.error||approvedResult.error||submissionResult.error)?["Some game details could not be loaded; titles or covers may be unavailable."]:[])]}
 games={linkedGames.map(game=>({id:game.linkId,title:game.gameTitle,image:game.imageUrl,status:game.latestPlaytest?`Playtest ${game.latestPlaytest.status}`:"No playtest",context:game.relationship+(game.latestPlaytest?.releaseLabel?` ? ${game.latestPlaytest.releaseLabel}`:""),hasPlaytest:game.playtests.length>0,active:game.playtests.some(p=>p.status==="open"||p.status==="paused"),hasFeedback:!!game.currentReception?.acceptedTests,feedback:receptionError?undefined:game.currentReception?`${game.currentReception.acceptedTests} accepted independent ? ${game.currentReception.releaseLabel}. Community totals in results.`:undefined,content:((game) => {
              const reception = game.currentReception;
              const status = reception ? receptionStatus(reception) : null;
              const hasPulse = completedPulseRuns.some(
                (run) => run.submission_id === game.submissionId
              );

              return (
              <article
                key={game.linkId}
                className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <header className="cursor-pointer list-none p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                      {game.imageUrl ? (
                        <img
                          src={game.imageUrl}
                          alt={`${game.gameTitle} thumbnail`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-zinc-600">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold">
                        {game.gameTitle}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        {game.developerName}
                      </p>

                      <p className="mt-2 text-sm text-zinc-500">
                        {game.genre}
                      </p>
                    </div>
                  </div>

                    <div className="flex items-center gap-3">
                      {game.listingNotice&&<span className="text-xs text-zinc-500">{game.listingNotice}</span>}

                    </div>
                  </div>

                  {reception ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                        {reception.releaseLabel}
                      </span>
                      <span
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${receptionStatusClasses(
                          status ?? "Early results"
                        )}`}
                      >
                        {status}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-200">
                        {reception.overallScore !== null
                          ? `${reception.overallScore.toFixed(1)}/10`
                          : "No score yet"}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {reception.acceptedTests} accepted
                        {reception.targetTesters > 0
                          ? ` / ${reception.targetTesters} target`
                          : ""}
                      </span>
                      {reception.recommendPercent !== null && (
                        <span className="text-xs text-zinc-500">
                          · {Math.round(reception.recommendPercent)}% recommend
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-zinc-500">
                      No community reception yet
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>
                      {game.latestPlaytest
                        ? `Playtest: ${game.latestPlaytest.status}`
                        : "No playtest"}
                    </span>
                    <span>·</span>
                    <span>{hasPulse ? "PULSE complete" : "No PULSE run"}</span>
                  </div>
                </header>

                <div className="border-t border-white/10 p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Relationship
                    </p>

                    <p className="mt-2 text-sm text-zinc-200">
                      {game.relationship}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Added to My Games
                    </p>

                    <p className="mt-2 text-sm text-zinc-200">
                      {formatDate(game.linkedAt)}
                    </p>
                  </div>
                </div>

                {game.approvedClaimIds.length>0 && <div className="mt-5 max-w-2xl rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.05] p-4">
                  <p className="font-semibold text-[#77f29b]">
                    Developer claim approved
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Your developer claim for this game was approved.
                    Playtesting is separate from
                    optional independent gameplay assessment.
                  </p>
                </div>}

                  <a href={`/submit?edit=${encodeURIComponent(game.importedGameId||game.approvedGameId||game.submissionId||"")}&listing=${game.importedGameId?"imported":game.approvedGameId?"approved":"submission"}`} className="my-4 inline-block rounded-lg border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-200">Edit listing</a>
                  <StartPlaytest
                    gameTitle={game.gameTitle}
                    gameSource={{
                      importedGameId: game.importedGameId,
                      approvedGameId: game.approvedGameId,
                      submissionId: game.submissionId,
                    }}
                    existingPlaytest={game.latestPlaytest}
                    playtests={game.playtests}
                  />
                  <GameLinksEngagement playtest={game.latestPlaytest||undefined} source={{kind:game.importedGameId?"imported":game.approvedGameId?"approved":"submission",id:(game.importedGameId||game.approvedGameId||game.submissionId)!}} />
                </div>
              </article>
              );
            })(game)}))}
 submissions={games.map(game=>({id:game.id,title:game.title,status:game.status,missingCount:submissionIssues(game as unknown as Record<string,unknown>).length,correctionHref:(["Needs More Information","Rejected"].includes(game.status)||(game.status==="Pending Review"&&submissionIssues(game as unknown as Record<string,unknown>).length>0))?`/submit?edit=${encodeURIComponent(game.id)}`:undefined,context:formatDate(game.submitted_at),content:<>{((game) => (
              <article
                key={game.id}
                className="rounded-lg border border-white/[0.08] bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.025]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {game.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-400">
                      {game.genre}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      Submitted{" "}
                      {formatDate(game.submitted_at)}
                    </p>
                  </div>

                  <span
                    className={`rounded-md border px-3 py-2 text-sm ${submissionStatusClasses(
                      game.status
                    )}`}
                  >
                    {game.status}
                  </span>
                </div>
              </article>
            ))(game)}<aside className="mt-3 rounded-xl border border-amber-300/20 p-4 text-sm text-zinc-300"><h3 className="font-semibold">Automatic completeness check</h3><p className="mt-2 whitespace-pre-wrap">{completenessMessage(submissionIssues(game as unknown as Record<string,unknown>))||"Required developer details are complete. Approval still requires admin review."}</p>{(["Needs More Information","Rejected"].includes(game.status)||(game.status==="Pending Review"&&submissionIssues(game as unknown as Record<string,unknown>).length>0))&&<a className="mt-4 inline-block rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-black" href={`/submit?edit=${encodeURIComponent(game.id)}`}>Complete information</a>}</aside><div className="mt-3 rounded-xl border border-white/10 p-4 text-sm text-zinc-300"><p className="font-semibold">Human reviewer notes</p><p className="mt-2 whitespace-pre-wrap">{game.review_reason||"No review reason recorded."}</p>{game.status==="Pending Review"&&<p className="mt-2 text-zinc-400">Awaiting listing review. No action is needed unless more information is requested.</p>}{game.status==="Approved"&&<p className="mt-2 text-zinc-400">Listing approval is separate from a game-quality assessment. Use My games to manage an approved developer relationship.</p>}</div></>}))}
 claims={claims.map(claim=>({id:claim.id,title:claim.gameTitle,status:claim.status,context:claim.relationship,content:((claim) => (
              <article
                key={claim.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold">
                          {claim.gameTitle}
                        </h3>

                        <span className="rounded-md border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-xs font-medium text-violet-200">
                          Developer claim
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-zinc-400">
                        {claim.developerName}
                      </p>

                      <p className="mt-2 text-xs text-zinc-500">
                        Claim submitted{" "}
                        {formatDate(claim.created_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-md border px-3 py-2 text-xs font-medium ${claimStatusClasses(
                        claim.status
                      )}`}
                    >
                      {claim.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Relationship
                      </p>

                      <p className="mt-2 text-sm text-zinc-200">
                        {claim.relationship}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Claim reason
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {claim.claim_reason}
                      </p>
                    </div>
                  </div>

                  {claim.evidence_url && (
                    <div className="mt-4">
                      <a
                        href={claim.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[#77f29b] hover:underline"
                      >
                        View submitted evidence ↗
                      </a>
                    </div>
                  )}

                  {claim.status === "Pending" && (
                    <div className="mt-5 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] p-4">
                      <p className="font-semibold text-sky-200">
                        Awaiting admin review
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Playtested is reviewing your relationship
                        with this game. No further action is
                        required unless more information is
                        requested.
                      </p>
                    </div>
                  )}

                  {claim.status ===
                    "Needs More Information" && (
                    <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
                      <p className="font-semibold text-amber-200">
                        More information required
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {claim.admin_notes ||
                          "Playtested needs some additional information before this claim can be approved."}
                      </p>
                    </div>
                  )}

                  {claim.status === "Rejected" && (
                    <div className="mt-5 rounded-lg border border-red-400/25 bg-red-400/[0.07] p-4">
                      <p className="font-semibold text-red-200">
                        Claim rejected
                      </p>

                      {claim.admin_notes && (
                        <p className="mt-2 text-sm leading-6 text-red-100/80">
                          {claim.admin_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {claim.status === "Approved" && (
                    <div className="mt-5 rounded-lg border border-[#77f29b]/25 bg-[#77f29b]/[0.07] p-4">
                      <p className="font-semibold text-[#77f29b]">
                        Developer relationship approved
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        This game is now connected to your
                        developer account and appears in My Games
                        above.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Ownership approval does not mean the game
                        has a completed independent gameplay assessment.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))(claim)}))}
 diagnostics={pulseJobs.map(job=>{
 const latestPulseRun=job;
 const latestPulseSummary=getPulseReportSummary(job.report_json);
 const completedPulseRuns=pulseJobs.filter(run=>run.submission_id===job.submission_id&&run.status==="COMPLETE");
 const gameJobs=pulseJobs.filter(run=>run.submission_id===job.submission_id);
 return {id:job.id,title:submissionTitleById.get(job.submission_id)||"Submitted game unavailable",status:job.status,context:formatDate(job.created_at)+(job.build_sha256?` | Build ${job.build_sha256.slice(0,12)}`:" | Build identifier not recorded"),content:(()=>{const pulseJobs=gameJobs;return (<details open className="group mt-8 overflow-hidden rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.025]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                PULSE diagnostics
              </p>
              {latestPulseRun && (
                <span className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/10 px-2 py-0.5 text-[11px] font-semibold text-[#77f29b]">
                  Stored run
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {latestPulseRun
                ? `${completedPulseRuns.length} completed run${completedPulseRuns.length === 1 ? "" : "s"} · ${latestPulseSummary.available ? latestPulseSummary.summary : "No detailed report stored"}`
                : "Automated build, launch, stability and security diagnostics."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-500">
            <span>{pulseJobs.length} loaded for this game</span>
            <span className="transition group-open:rotate-180">▼</span>
          </div>
        </summary>

        <div className="border-t border-white/10 px-5 py-5 sm:px-6">
          {latestPulseRun ? (
            <>
              <p className="mb-4 text-sm text-zinc-400">Technical diagnostics for this submitted game and stored build only. They are not a gameplay-quality assessment or a guarantee of safety.</p>
              <p className="mb-3 break-all text-xs text-zinc-400">Run: {latestPulseRun.id} | Build SHA-256: {latestPulseRun.build_sha256 || "Not recorded"}</p>
              {latestPulseRun.error_message && <p role="alert" className="mb-4 rounded-lg border border-red-300/30 p-3 text-sm text-red-200">{latestPulseRun.error_message}</p>}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Selected run
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                    {submissionTitleById.get(latestPulseRun.submission_id) ?? "Submitted game"}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {latestPulseRun.completed_at
                      ? formatDate(latestPulseRun.completed_at)
                      : "Completion time not recorded"}
                    {latestPulseRun.worker_version
                      ? ` · Worker ${latestPulseRun.worker_version}`
                      : ""}
                  </p>
                </div>

                <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${pulseStatusClasses(latestPulseRun.status)}`}>
                  {latestPulseRun.status}
                </span>
              </div>

              {latestPulseSummary.available ? (
                <>
                  <div className="mt-5 rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.04] px-4 py-3">
                    <p className="font-medium text-zinc-100">
                      {latestPulseSummary.summary}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {latestPulseRun.status !== "COMPLETE" ? "This run is not complete; stored metrics may be partial." : latestPulseSummary.issueCount === 0
                        ? "PULSE found no repeatable technical failures in this run."
                        : `${latestPulseSummary.issueCount} technical warning${latestPulseSummary.issueCount === 1 ? "" : "s"} recorded.`}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-[#090b0a] p-4">
                      <p className="text-xs uppercase tracking-wider text-zinc-600">Checks</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {latestPulseSummary.successfulLoads}/{latestPulseSummary.totalChecks}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Build loads completed</p>
                    </div>
                    <div className="bg-[#090b0a] p-4">
                      <p className="text-xs uppercase tracking-wider text-zinc-600">Launch</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {latestPulseSummary.launchPassed}/{latestPulseSummary.launchTotal}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Successful starts</p>
                    </div>
                    <div className="bg-[#090b0a] p-4">
                      <p className="text-xs uppercase tracking-wider text-zinc-600">Restart</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {latestPulseSummary.restartPassed}/{latestPulseSummary.restartTotal}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Successful restarts</p>
                    </div>
                    <div className="bg-[#090b0a] p-4">
                      <p className="text-xs uppercase tracking-wider text-zinc-600">Runtime issues</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {latestPulseSummary.runtimeErrors +
                          latestPulseSummary.failedRequests +
                          latestPulseSummary.stalls +
                          latestPulseSummary.workerErrors}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Errors, requests, stalls</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <div className={`rounded-lg border p-3 ${
                      latestPulseSummary.securityBlocked
                        ? "border-red-400/30 bg-red-400/[0.07]"
                        : "border-[#77f29b]/25 bg-[#77f29b]/[0.055]"
                    }`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Malware scan
                      </p>
                      <p className={`mt-1 text-xs font-semibold ${
                        latestPulseSummary.securityBlocked ? "text-red-300" : "text-[#77f29b]"
                      }`}>
                        {latestPulseSummary.securityBlocked
                          ? "Blocked"
                          : latestPulseSummary.securityStatus || "Not recorded"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Package
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">
                        {latestPulseSummary.packageValid ? "Valid" : "Not confirmed"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Entry point
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">
                        {latestPulseSummary.entryPointFound ? "Found" : "Not confirmed"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Immediate crashes
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">
                        {latestPulseSummary.immediateCrashes}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Median load
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-200">
                        {latestPulseSummary.medianLoadMs
                          ? `${latestPulseSummary.medianLoadMs} ms`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-zinc-600">
                    PULSE run duration:{" "}
                    {latestPulseSummary.durationMs
                      ? `${(latestPulseSummary.durationMs / 1000).toFixed(1)} seconds`
                      : "—"}
                  </p>
                </>
              ) : (
                <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
                  {latestPulseRun.status === "COMPLETE" ? "This run completed, but a detailed report is not stored." : "A completed report is not available for this run. Check its status and any error below."}
                </div>
              )}


            </>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/20 p-5">
              <p className="font-semibold text-zinc-200">No PULSE diagnostics yet</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                PULSE runs will appear here after you submit a build for technical diagnostics.
              </p>
            </div>
          )}
        </div>
      </details>);})()};
 })}
 diagnosticsReady={!pulseJobsError}
 extras={<><details open className="group mt-5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.025] to-[#77f29b]/[0.025]">
        <summary className="cursor-pointer list-none px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Developer progression
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="whitespace-nowrap text-lg font-semibold text-zinc-100">
                  Level {developerProgress.level}
                </span>

                <span className="whitespace-nowrap rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-4 py-1.5 text-xs font-semibold text-[#77f29b]">
                  {developerTitle}
                </span>

                <span className="whitespace-nowrap text-xs text-zinc-500">
                  {developerXp} XP total
                </span>
              </div>
            </div>

            <span className="shrink-0 text-sm text-zinc-400 transition group-open:rotate-180">
              ▼
            </span>
          </div>

          <div className="mt-6 rounded-lg border border-white/[0.07] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-300">
                  XP to Level {developerProgress.level + 1}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Keep building experience to unlock the next developer level.
                </p>
              </div>

              <span className="shrink-0 rounded-md border border-[#77f29b]/20 bg-[#77f29b]/[0.07] px-2.5 py-1 text-xs font-semibold text-[#77f29b]">
                {developerProgress.xpIntoLevel} / {developerProgress.xpForNextLevel} XP
              </span>
            </div>

            <div role="progressbar" aria-label="Developer XP toward next level" aria-valuemin={0} aria-valuemax={developerProgress.xpForNextLevel} aria-valuenow={developerProgress.xpIntoLevel} className="mt-4 h-3 w-full overflow-hidden rounded-full border border-white/[0.08] bg-[#151a17]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${developerProgress.progressPercent}%`,
                  backgroundColor: "#77f29b",
                  boxShadow: "0 0 14px rgba(119, 242, 155, 0.35)",
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
              <span>Level {developerProgress.level}</span>
              <span>{developerProgress.progressPercent}%</span>
              <span>Level {developerProgress.level + 1}</span>
            </div>
          </div>
        </summary>

        <div className="grid gap-3 border-t border-white/10 px-5 py-5 sm:grid-cols-3 sm:px-6">
          <div className="rounded-lg bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              Current level
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              Level {developerProgress.level}
            </p>
          </div>

          <div className="rounded-lg bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              Total experience
            </p>
            <p className="mt-1 text-lg font-semibold text-[#77f29b]">
              {developerXp} XP
            </p>
          </div>

          <div className="rounded-lg bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              Next milestone
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              Level {developerProgress.level + 1}
            </p>
          </div>

          <p className="text-xs leading-5 text-zinc-400 sm:col-span-3">
            Build your Playtested developer experience through validated milestones and meaningful participation.
          </p>
        </div>
      </details></>}
 />;
}

export default function MySubmissionsPage() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs tracking-[0.2em] text-[#77f29b]">
          DEVELOPER DASHBOARD
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          My Games
        </h1>

        <p className="mt-3 max-w-3xl text-zinc-400">
          Manage your games, run playtests and track developer
          activity.
        </p>

        <Suspense fallback={<LoadingDashboard />}>
          <DeveloperDashboard />
        </Suspense>
      </section>
    </main>
  );
}

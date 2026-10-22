import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import SiteHeader from "../components/SiteHeader";
import StartPlaytest from "../components/StartPlaytest";
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

type SubmissionRow = {
  id: string;
  title: string;
  genre: string;
  status: string;
  submitted_at: string;
};

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
  focusAreas: string[];
  audience: PlaytestAudience;
  targetTesters: number;
  estimatedMinutes: number | null;
  releaseLabel: string | null;
  createdAt: string;
  publishedAt: string | null;
};

type LinkedGame = {
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
  latestPlaytest: LinkedPlaytest | null;
};

function LoadingDashboard() {
  return (
    <p className="mt-8 text-zinc-400">
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

function verificationStatusClasses(
  status: "Verified" | "Assessed" | "Not yet verified"
) {
  if (status === "Verified") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  if (status === "Assessed") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-200";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

function findLatestPlaytest(
  game: {
    importedGameId: string | null;
    approvedGameId: string | null;
    submissionId: string | null;
  },
  playtests: CommunityPlaytestRow[]
): LinkedPlaytest | null {
  const matches = playtests.filter((playtest) => {
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
  });

  if (matches.length === 0) {
    return null;
  }

  const sorted = [...matches].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  const latest = sorted[0];

  return {
    id: latest.id,
    status: latest.status,
    focusAreas: latest.focus_areas ?? [],
    audience: latest.audience,
    targetTesters: latest.target_testers,
    estimatedMinutes: latest.estimated_minutes,
    releaseLabel: latest.release_label,
    createdAt: latest.created_at,
    publishedAt: latest.published_at,
  };
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
      .select("roles")
      .eq("id", user.id)
      .single();

  if (
    profileError ||
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
  ] = await Promise.all([
    supabase
      .from("game_submissions")
      .select("id, title, genre, status, submitted_at")
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
  ]);

  if (submissionsError) {
    console.error(
      "Could not load developer submissions:",
      submissionsError
    );

    return (
      <p className="mt-8 text-red-400">
        Could not load your submissions. Please try again.
      </p>
    );
  }

  if (claimsError) {
    console.error(
      "Could not load developer claims:",
      claimsError
    );

    return (
      <p className="mt-8 text-red-400">
        Could not load your developer claims. Please try again.
      </p>
    );
  }

  if (linksError) {
    console.error(
      "Could not load linked developer games:",
      linksError
    );

    return (
      <p className="mt-8 text-red-400">
        Could not load your linked games. Please try again.
      </p>
    );
  }

  if (playtestsError) {
    console.error(
      "Could not load developer playtests:",
      playtestsError
    );

    return (
      <p className="mt-8 text-red-400">
        Could not load your playtests. Please try again.
      </p>
    );
  }

  const games = (submissions ?? []) as SubmissionRow[];
  const rawClaims = (claimRows ?? []) as GameClaimRow[];
  const rawLinks =
    (linkRows ?? []) as GameDeveloperLinkRow[];
  const rawPlaytests =
    (playtestRows ?? []) as CommunityPlaytestRow[];

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
          .select("id, title, developer_name, genre")
          .in("id", importedIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string;
            developer_name: string | null;
            genre: string | null;
          }[],
          error: null,
        }),

    approvedIds.length > 0
      ? supabase
          .from("approved_games")
          .select("id, title, developer_name, genre")
          .in("id", approvedIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string | null;
            developer_name: string | null;
            genre: string | null;
          }[],
          error: null,
        }),

    submissionIds.length > 0
      ? supabase
          .from("game_submissions")
          .select("id, title, developer_name, genre")
          .in("id", submissionIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title: string;
            developer_name: string | null;
            genre: string | null;
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
      if (link.imported_game_id) {
        const target = importedMap.get(
          link.imported_game_id
        );

        return {
          linkId: link.id,
          gameId: link.imported_game_id,
          importedGameId: link.imported_game_id,
          approvedGameId: null,
          submissionId: null,
          gameTitle: target?.title ?? "Unknown game",
          developerName:
            target?.developerName ?? "Unknown developer",
          genre: target?.genre ?? "Genre not listed",
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
          gameId: link.approved_game_id,
          importedGameId: null,
          approvedGameId: link.approved_game_id,
          submissionId: null,
          gameTitle: target?.title ?? "Unknown game",
          developerName:
            target?.developerName ?? "Unknown developer",
          genre: target?.genre ?? "Genre not listed",
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
        gameId: link.submission_id ?? link.id,
        importedGameId: null,
        approvedGameId: null,
        submissionId: link.submission_id,
        gameTitle: target?.title ?? "Unknown game",
        developerName:
          target?.developerName ?? "Unknown developer",
        genre: target?.genre ?? "Genre not listed",
        relationship: link.relationship,
        sourceType: "Submitted game" as const,
        verificationStatus: "Not yet verified" as const,
        linkedAt: link.created_at,
      };
    }
  );

  const linkedGames: LinkedGame[] =
    linkedGamesWithoutPlaytests.map((game) => ({
      ...game,
      latestPlaytest: findLatestPlaytest(
        game,
        rawPlaytests
      ),
    }));

  const openPlaytests = rawPlaytests.filter(
    (playtest) => playtest.status === "open"
  ).length;

  const attentionClaims = claims.filter(
    (claim) =>
      claim.status === "Pending" ||
      claim.status === "Needs More Information"
  );

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">
            My games
          </p>

          <p className="mt-2 text-3xl font-bold text-[#77f29b]">
            {linkedGames.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">
            Open playtests
          </p>

          <p className="mt-2 text-3xl font-bold text-[#77f29b]">
            {openPlaytests}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">
            Games submitted
          </p>

          <p className="mt-2 text-3xl font-bold">
            {games.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">
            Claims needing attention
          </p>

          <p className="mt-2 text-3xl font-bold text-sky-200">
            {attentionClaims.length}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
              Developer games
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              My Games
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Manage your games and run structured
              playtests with real players.
            </p>
          </div>

          <Link
            href="/submit"
            className="rounded-lg bg-[#77f29b] px-5 py-3 font-semibold text-black transition hover:bg-[#91ffb0]"
          >
            Add or claim a game
          </Link>
        </div>

        {linkedGames.length === 0 ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-8">
            <h3 className="text-lg font-semibold">
              No games linked to your developer account yet
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Add a new game or claim an existing Playtested
              catalogue listing. Once your developer relationship
              is approved, the game will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {linkedGames.map((game) => (
              <article
                key={game.linkId}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
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

                  <span
                    className={`rounded-md border px-3 py-2 text-xs font-medium ${verificationStatusClasses(
                      game.verificationStatus
                    )}`}
                  >
                    {game.verificationStatus}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

                <div className="mt-5 rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.05] p-4">
                  <p className="font-semibold text-[#77f29b]">
                    Developer access active
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Your developer relationship with this game is
                    approved. Playtesting is separate from
                    Playtested assessment and verification.
                  </p>
                </div>

                <StartPlaytest
                  gameTitle={game.gameTitle}
                  gameSource={{
                    importedGameId: game.importedGameId,
                    approvedGameId: game.approvedGameId,
                    submissionId: game.submissionId,
                  }}
                  existingPlaytest={game.latestPlaytest}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      {claims.length > 0 && (
        <section className="mt-12 border-t border-white/10 pt-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Ownership & representation
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Developer claims
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Track the review history of claims for games that
              already existed in the Playtested catalogue.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {claims.map((claim) => (
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
                        itself is Assessed or Verified.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 border-t border-white/10 pt-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Submitted games
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Submission history
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Track new game submissions and their review progress.
          </p>
        </div>

        {games.length === 0 ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-8">
            <h3 className="text-lg font-semibold">
              No new games submitted yet
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Games submitted through Playtested will appear here
              with their review status.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {games.map((game) => (
              <article
                key={game.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
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
            ))}
          </div>
        )}
      </section>
    </>
  );
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
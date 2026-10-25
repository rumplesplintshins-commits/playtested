"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import SiteHeader from "../components/SiteHeader";

type TestAccessType =
  | "steam_demo"
  | "steam_game"
  | "browser_game"
  | "download_build"
  | "other";

type TestGame = {
  submission_id: string;
  title: string;
  developer_name: string;
  genre: string;
  description: string;
  game_link: string | null;
  access_type: TestAccessType;
  image_url: string | null;
  ai_type: string | null;
};

type TestClaim = {
  id: string;
  submission_id: string | null;
  playtest_id: string | null;
  status: "claimed" | "in_progress" | "submitted" | "reviewed";
  review_outcome: "pending" | "accepted" | "rejected";
};

type TesterProgress = {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
};

function xpRequiredForNextLevel(level: number) {
  return 100 + (level - 1) * 50;
}

function getTesterTitle(level: number) {
  if (level >= 50) return "Playtested Legend";
  if (level >= 40) return "Veteran Tester";
  if (level >= 30) return "Master Tester";
  if (level >= 25) return "Elite Tester";
  if (level >= 20) return "Expert Tester";
  if (level >= 15) return "Senior Tester";
  if (level >= 10) return "Experienced Tester";
  if (level >= 5) return "Playtester";

  return "New Tester";
}

function calculateTesterProgress(totalXp: number): TesterProgress {
  const safeXp = Math.max(0, totalXp);

  let level = 1;
  let remainingXp = safeXp;
  let xpNeededForLevel = xpRequiredForNextLevel(level);

  while (remainingXp >= xpNeededForLevel) {
    remainingXp -= xpNeededForLevel;
    level += 1;
    xpNeededForLevel = xpRequiredForNextLevel(level);
  }

  return {
    level,
    title: getTesterTitle(level),
    xpIntoLevel: remainingXp,
    xpNeededForLevel,
    xpToNextLevel: xpNeededForLevel - remainingXp,
    progressPercent:
      xpNeededForLevel > 0
        ? Math.min(100, (remainingXp / xpNeededForLevel) * 100)
        : 0,
  };
}

function getAccessLabel(accessType: TestAccessType) {
  switch (accessType) {
    case "steam_demo":
      return "Steam demo";
    case "steam_game":
      return "Steam game";
    case "browser_game":
      return "Browser game";
    case "download_build":
      return "Downloadable build";
    default:
      return "External game access";
  }
}

function getAccessButtonLabel(accessType: TestAccessType) {
  switch (accessType) {
    case "steam_demo":
      return "Open Steam demo ↗";
    case "steam_game":
      return "Open on Steam ↗";
    case "browser_game":
      return "Play in browser ↗";
    case "download_build":
      return "Download / access build ↗";
    default:
      return "Open game access ↗";
  }
}

function getAccessInstructions(accessType: TestAccessType) {
  switch (accessType) {
    case "steam_demo":
      return "This playtest uses the free Steam demo. Open the Steam page and select Download or Add to Library to install it.";
    case "steam_game":
      return "This playtest uses the game's Steam version. You may need to install, purchase or otherwise have access to the game through Steam.";
    case "browser_game":
      return "This playtest uses a browser build. Open the link below to launch the game in your browser.";
    case "download_build":
      return "Use the developer-provided link below to download or access the build for this playtest.";
    default:
      return "Use the developer-provided link below to access the game or build for this playtest.";
  }
}

export default function TesterPage() {
  const [games, setGames] = useState<TestGame[]>([]);
  const [claims, setClaims] = useState<TestClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [testerXp, setTesterXp] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  const alertRef = useRef<HTMLDivElement>(null);

  const [gameplayScore, setGameplayScore] = useState("7");
  const [performanceScore, setPerformanceScore] = useState("7");
  const [bugsFound, setBugsFound] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hoursPlayed, setHoursPlayed] = useState("1");

  const router = useRouter();

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  function claimMatchesGame(claim: TestClaim, game: TestGame) {
    return (
      claim.submission_id === game.submission_id ||
      claim.playtest_id === game.submission_id
    );
  }

  useEffect(() => {
    if (message && messageType === "error") {
      alertRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [message, messageType]);

  useEffect(() => {
    let active = true;

    async function loadGames() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login?next=/tester");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("roles")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (
        profileError ||
        !profile ||
        !Array.isArray(profile.roles) ||
        !profile.roles.includes("tester")
      ) {
        router.replace("/account");
        return;
      }

      const [
        { data: gamesData, error: gamesError },
        { data: claimsData, error: claimsError },
        { data: progressData, error: progressError },
      ] = await Promise.all([
        supabase.rpc("get_available_community_test_games"),
        supabase
          .from("community_game_tests")
          .select(
            "id, submission_id, playtest_id, status, review_outcome"
          )
          .eq("tester_id", user.id),
        supabase
          .from("profiles")
          .select("tester_xp, completed_tests")
          .eq("id", user.id)
          .single(),
      ]);

      if (!active) return;

      if (gamesError) {
        showMessage(
          "Could not load available games: " + gamesError.message,
          "error"
        );
        setLoading(false);
        setProfileLoading(false);
        return;
      }

      if (claimsError) {
        showMessage(
          "Could not load your test history: " + claimsError.message,
          "error"
        );
        setLoading(false);
        setProfileLoading(false);
        return;
      }

      setGames((gamesData ?? []) as TestGame[]);
      setClaims((claimsData ?? []) as TestClaim[]);

      if (progressError) {
        showMessage(
          "Could not load your tester XP: " + progressError.message,
          "error"
        );
      } else {
        setTesterXp(progressData?.tester_xp ?? 0);
        setCompletedTests(progressData?.completed_tests ?? 0);
      }

      setLoading(false);
      setProfileLoading(false);
    }

    void loadGames();

    return () => {
      active = false;
    };
  }, [router]);

  async function claimGame(game: TestGame) {
    setMessage("");
    setClaimingId(game.submission_id);

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setClaimingId(null);
      router.push("/login?next=/tester");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !Array.isArray(profile.roles) ||
      !profile.roles.includes("tester")
    ) {
      setClaimingId(null);
      router.replace("/account");
      return;
    }

    const { data, error } = await supabase.rpc(
      "claim_community_game_test",
      {
        p_submission_id: game.submission_id,
      }
    );

    if (error) {
      showMessage(
        error.code === "23505"
          ? "You've already claimed or tested this game."
          : "Could not claim this game: " + error.message,
        "error"
      );
      setClaimingId(null);
      return;
    }

    const { data: createdClaim, error: createdClaimError } = await supabase
      .from("community_game_tests")
      .select(
        "id, submission_id, playtest_id, status, review_outcome"
      )
      .eq("id", data as string)
      .eq("tester_id", user.id)
      .single();

    if (createdClaimError || !createdClaim) {
      showMessage(
        `You've claimed "${game.title}", but the claim could not be refreshed. Refresh the page to continue.`,
        "success"
      );

      setClaimingId(null);
      router.refresh();
      return;
    }

    setClaims((previous) => [
      ...previous.filter((item) => item.id !== createdClaim.id),
      createdClaim as TestClaim,
    ]);

    showMessage(`You've claimed "${game.title}".`, "success");
    setClaimingId(null);
  }

  async function releaseGame(game: TestGame, claim: TestClaim) {
    const confirmed = window.confirm(
      `Release "${game.title}"? Your current testing progress will not be submitted, and another tester may claim this game.`
    );

    if (!confirmed) return;

    setMessage("");
    setReleasingId(game.submission_id);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "release_community_game_test",
      {
        p_submission_id: game.submission_id,
      }
    );

    if (error) {
      showMessage(
        "Could not release this game: " + error.message,
        "error"
      );
    } else {
      setClaims((previous) =>
        previous.filter((item) => item.id !== claim.id)
      );

      if (activeTestId === claim.id) {
        setActiveTestId(null);
      }

      setFormErrors((previous) => {
        const next = { ...previous };
        delete next[claim.id];
        return next;
      });

      showMessage(
        `You've released "${game.title}". You can claim it again later.`,
        "success"
      );
    }

    setReleasingId(null);
  }

  async function startTesting(game: TestGame, claim: TestClaim) {
    setMessage("");
    setStartingId(game.submission_id);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "start_community_game_test",
      {
        p_test_id: claim.id,
      }
    );

    if (error) {
      showMessage(
        "Could not start testing: " + error.message,
        "error"
      );
    } else {
      setClaims((previous) =>
        previous.map((item) =>
          item.id === claim.id
            ? { ...item, status: "in_progress" }
            : item
        )
      );

      showMessage(
        `Testing started for "${game.title}".`,
        "success"
      );
    }

    setStartingId(null);
  }

  async function submitTest(
    event: FormEvent<HTMLFormElement>,
    game: TestGame,
    claim: TestClaim
  ) {
    event.preventDefault();
    setMessage("");
    setFormErrors((previous) => ({
      ...previous,
      [claim.id]: "",
    }));

    if (feedback.trim().length < 80) {
      setFormErrors((previous) => ({
        ...previous,
        [claim.id]:
          "Please provide at least 80 characters of feedback.",
      }));
      return;
    }

    setSubmittingId(claim.id);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "submit_community_game_test",
      {
        p_test_id: claim.id,
        p_gameplay_score: Number(gameplayScore),
        p_performance_score: Number(performanceScore),
        p_bugs_found: bugsFound,
        p_feedback: feedback,
        p_hours_played: Number(hoursPlayed),
      }
    );

    if (error) {
      setFormErrors((previous) => ({
        ...previous,
        [claim.id]: error.message,
      }));
    } else {
      setClaims((previous) =>
        previous.map((item) =>
          item.id === claim.id
            ? {
                ...item,
                status: "submitted",
                review_outcome: "pending",
              }
            : item
        )
      );

      setActiveTestId(null);
      setBugsFound("");
      setFeedback("");
      setGameplayScore("7");
      setPerformanceScore("7");
      setHoursPlayed("1");

      showMessage(
        `Your test of "${game.title}" has been submitted for review. XP is awarded only if it is accepted.`,
        "success"
      );
    }

    setSubmittingId(null);
  }

  const testerProgress = calculateTesterProgress(testerXp);

  const inputClass =
    "mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]";

  const activeGames = games.filter((game) => {
    const claim = claims.find((item) =>
      claimMatchesGame(item, game)
    );

    return (
      !claim ||
      claim.status === "claimed" ||
      claim.status === "in_progress"
    );
  });

  const historyClaims = claims.filter(
    (claim) =>
      claim.status === "submitted" ||
      claim.status === "reviewed"
  );

  function getStatusLabel(claim: TestClaim) {
    if (claim.status === "submitted") {
      return "Awaiting admin review";
    }

    if (claim.review_outcome === "accepted") {
      return "Accepted";
    }

    if (claim.review_outcome === "rejected") {
      return "Not accepted";
    }

    return "Reviewed";
  }

  return (
    <main className="min-h-screen bg-[#090b0a] text-white">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
          Community testing
        </p>

        <h1 className="mt-3 text-3xl font-bold">Tester Hub</h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Claim a game, play it, and submit useful, evidence-based feedback.
          Honest criticism is just as valuable as praise.
        </p>

        <section className="mt-8 rounded-2xl border border-[#77f29b]/20 bg-gradient-to-br from-[#77f29b]/10 to-transparent p-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
                Tester progress
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {profileLoading
                  ? "Loading level..."
                  : `Level ${testerProgress.level}`}
              </h2>

              {!profileLoading && (
                <p className="mt-1 text-sm font-semibold text-[#77f29b]">
                  {testerProgress.title}
                </p>
              )}

              <p className="mt-2 text-sm text-zinc-400">
                Earn 100 XP for every test accepted by an admin. Higher
                levels require progressively more XP.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-64">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-400">Total XP</p>
                <p className="mt-1 text-2xl font-bold text-[#77f29b]">
                  {profileLoading ? "..." : testerXp}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-400">
                  Accepted tests
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {profileLoading ? "..." : completedTests}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-300">
                {profileLoading
                  ? "Calculating progress..."
                  : `${testerProgress.xpIntoLevel}/${testerProgress.xpNeededForLevel} XP towards Level ${testerProgress.level + 1}`}
              </span>

              <span className="text-zinc-400">
                {profileLoading
                  ? ""
                  : `${testerProgress.xpToNextLevel} XP to go`}
              </span>
            </div>

            <div
              className="h-3 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Progress towards next tester level"
              aria-valuemin={0}
              aria-valuemax={testerProgress.xpNeededForLevel}
              aria-valuenow={
                profileLoading ? 0 : testerProgress.xpIntoLevel
              }
            >
              <div
                className="h-full rounded-full bg-[#77f29b] transition-all duration-500"
                style={{
                  width: `${
                    profileLoading
                      ? 0
                      : testerProgress.progressPercent
                  }%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              XP is awarded only after an admin accepts your test.
              Tester titles improve at milestone levels as your
              experience grows.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Available games</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Games can be tested by multiple independent testers.
              </p>
            </div>
          </div>

          {message && (
            <div
              ref={alertRef}
              role={messageType === "error" ? "alert" : "status"}
              aria-live={
                messageType === "error" ? "assertive" : "polite"
              }
              className={`mt-5 rounded-lg border p-4 text-sm ${
                messageType === "error"
                  ? "border-red-400/50 bg-red-400/10 text-red-200"
                  : "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#b9f9ca]"
              }`}
            >
              <p className="font-semibold">
                {messageType === "error"
                  ? "Action unsuccessful"
                  : "Success"}
              </p>
              <p className="mt-1 break-words">{message}</p>
            </div>
          )}

          {loading ? (
            <p className="mt-6 text-zinc-400">
              Loading available games...
            </p>
          ) : activeGames.length === 0 ? (
            <p className="mt-6 rounded-lg border border-white/10 p-6 text-zinc-400">
              No new games are available for you to claim right now.
              Your previous tests remain in your activity history below.
            </p>
          ) : (
            <div className="mt-6 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeGames.map((game) => {
                const claim = claims.find(
                  (item) =>
                    claimMatchesGame(item, game) &&
                    (item.status === "claimed" ||
                      item.status === "in_progress")
                );

                return (
                  <article
                    key={game.submission_id}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    {game.image_url && (
                      <img
                        src={game.image_url}
                        alt=""
                        className="h-48 w-full shrink-0 object-cover"
                      />
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs uppercase tracking-wider text-[#77f29b]">
                        {game.genre || "Uncategorised"}
                      </p>

                      <h3 className="mt-2 text-xl font-semibold">
                        {game.title}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        By {game.developer_name}
                      </p>

                      <p className="mt-4 text-sm leading-6 text-zinc-300">
                        {game.description}
                      </p>

                      {game.ai_type && (
                        <div className="mt-4">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                            {game.ai_type}
                          </span>
                        </div>
                      )}

                      <div className="mt-auto space-y-3 pt-6">
                        {!claim ? (
                          <button
                            type="button"
                            disabled={
                              claimingId === game.submission_id
                            }
                            onClick={() => void claimGame(game)}
                            className="w-full rounded-lg bg-[#77f29b] px-4 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4] disabled:opacity-50"
                          >
                            {claimingId === game.submission_id
                              ? "Claiming..."
                              : "Claim game"}
                          </button>
                        ) : claim.status === "claimed" ? (
                          <>
                            <p className="text-center text-sm font-medium text-[#77f29b]">
                              Game claimed
                            </p>

                            <button
                              type="button"
                              disabled={
                                startingId === game.submission_id
                              }
                              onClick={() =>
                                void startTesting(game, claim)
                              }
                              className="w-full rounded-lg bg-[#77f29b] px-4 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4] disabled:opacity-50"
                            >
                              {startingId === game.submission_id
                                ? "Starting..."
                                : "Start testing"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                releasingId === game.submission_id
                              }
                              onClick={() =>
                                void releaseGame(game, claim)
                              }
                              className="w-full rounded-lg border border-red-400/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                            >
                              {releasingId === game.submission_id
                                ? "Releasing..."
                                : "Release game"}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-center text-sm font-medium text-amber-300">
                              Testing in progress
                            </p>

                            {game.game_link && (
                              <div className="rounded-xl border border-[#77f29b]/25 bg-[#77f29b]/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                  Game access
                                </p>

                                <p className="mt-2 text-sm font-semibold text-white">
                                  {getAccessLabel(game.access_type)}
                                </p>

                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                  {getAccessInstructions(game.access_type)}
                                </p>

                                <a
                                  href={game.game_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-4 block w-full rounded-lg border border-[#77f29b]/30 bg-[#77f29b]/10 px-4 py-3 text-center text-sm font-semibold text-[#b9f9ca] hover:bg-[#77f29b]/15"
                                >
                                  {getAccessButtonLabel(game.access_type)}
                                </a>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveTestId(
                                  activeTestId === claim.id
                                    ? null
                                    : claim.id
                                );

                                setFormErrors((previous) => ({
                                  ...previous,
                                  [claim.id]: "",
                                }));
                              }}
                              className="w-full rounded-lg bg-[#77f29b] px-4 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4]"
                            >
                              {activeTestId === claim.id
                                ? "Close feedback form"
                                : "Submit test feedback"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                releasingId === game.submission_id
                              }
                              onClick={() =>
                                void releaseGame(game, claim)
                              }
                              className="w-full rounded-lg border border-red-400/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                            >
                              {releasingId === game.submission_id
                                ? "Releasing..."
                                : "Release game"}
                            </button>

                            {activeTestId === claim.id && (
                              <form
                                onSubmit={(event) =>
                                  void submitTest(
                                    event,
                                    game,
                                    claim
                                  )
                                }
                                className="mt-4 space-y-4 border-t border-white/10 pt-5"
                              >
                                <p className="text-sm text-zinc-400">
                                  Give an honest assessment. Scores
                                  must be between 1 and 10. Feedback
                                  must contain at least 80 characters
                                  and describe your actual experience.
                                </p>

                                <label className="block text-sm font-medium">
                                  Gameplay score (1 to 10)
                                  <select
                                    required
                                    value={gameplayScore}
                                    onChange={(event) =>
                                      setGameplayScore(
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  >
                                    {Array.from(
                                      { length: 10 },
                                      (_, i) => i + 1
                                    ).map((score) => (
                                      <option
                                        key={score}
                                        value={score}
                                      >
                                        {score}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="block text-sm font-medium">
                                  Performance score (1 to 10)
                                  <select
                                    required
                                    value={performanceScore}
                                    onChange={(event) =>
                                      setPerformanceScore(
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  >
                                    {Array.from(
                                      { length: 10 },
                                      (_, i) => i + 1
                                    ).map((score) => (
                                      <option
                                        key={score}
                                        value={score}
                                      >
                                        {score}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="block text-sm font-medium">
                                  Hours played
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    max="1000"
                                    step="0.25"
                                    value={hoursPlayed}
                                    onChange={(event) =>
                                      setHoursPlayed(
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </label>

                                <label className="block text-sm font-medium">
                                  Bugs or problems found
                                  <textarea
                                    value={bugsFound}
                                    onChange={(event) =>
                                      setBugsFound(
                                        event.target.value
                                      )
                                    }
                                    rows={3}
                                    maxLength={5000}
                                    placeholder="Describe bugs, crashes, glitches, or enter None found."
                                    className={inputClass}
                                  />
                                </label>

                                <label className="block text-sm font-medium">
                                  Your feedback
                                  <textarea
                                    required
                                    minLength={80}
                                    maxLength={10000}
                                    value={feedback}
                                    onChange={(event) => {
                                      setFeedback(
                                        event.target.value
                                      );

                                      setFormErrors(
                                        (previous) => ({
                                          ...previous,
                                          [claim.id]: "",
                                        })
                                      );
                                    }}
                                    rows={5}
                                    placeholder="What worked well? What needs improvement? Describe your experience."
                                    aria-invalid={Boolean(
                                      formErrors[claim.id]
                                    )}
                                    aria-describedby={
                                      formErrors[claim.id]
                                        ? `feedback-error-${claim.id}`
                                        : `feedback-count-${claim.id}`
                                    }
                                    className={`${inputClass} ${
                                      formErrors[claim.id]
                                        ? "border-red-400 focus:border-red-400"
                                        : ""
                                    }`}
                                  />

                                  <span
                                    id={`feedback-count-${claim.id}`}
                                    className="mt-1 block text-xs text-zinc-500"
                                  >
                                    {feedback.trim().length}{" "}
                                    characters. Minimum 80.
                                  </span>
                                </label>

                                {formErrors[claim.id] && (
                                  <div
                                    id={`feedback-error-${claim.id}`}
                                    role="alert"
                                    aria-live="assertive"
                                    className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200"
                                  >
                                    <p className="font-semibold">
                                      Your review could not be
                                      submitted
                                    </p>

                                    <p className="mt-1 break-words">
                                      {formErrors[claim.id]}
                                    </p>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={
                                    submittingId === claim.id
                                  }
                                  className="w-full rounded-lg bg-[#77f29b] px-4 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {submittingId === claim.id
                                    ? "Submitting..."
                                    : "Submit review"}
                                </button>
                              </form>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
              Your record
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Testing activity
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Keep track of every submitted test, its review outcome
              and your progress as a tester.
            </p>
          </div>

          {loading ? (
            <p className="mt-6 text-zinc-400">
              Loading your activity...
            </p>
          ) : historyClaims.length === 0 ? (
            <p className="mt-6 rounded-lg border border-white/10 p-6 text-zinc-400">
              Your submitted and reviewed tests will appear here.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {historyClaims.map((claim) => {
                const game = games.find((item) =>
                  claimMatchesGame(claim, item)
                );

                const accepted =
                  claim.review_outcome === "accepted";
                const rejected =
                  claim.review_outcome === "rejected";
                const pending = claim.status === "submitted";

                return (
                  <article
                    key={claim.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {game?.title ??
                          "Previously tested game"}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        {game
                          ? `By ${game.developer_name}`
                          : "Game details are no longer available in the current catalogue."}
                      </p>

                      <p className="mt-2 text-xs text-zinc-500">
                        {pending
                          ? "Your feedback has been submitted and is awaiting admin review."
                          : accepted
                            ? "Your test was accepted and earned 100 XP."
                            : rejected
                              ? "Your test was reviewed but was not accepted for XP."
                              : "Your test has been reviewed."}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        pending
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                          : accepted
                            ? "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]"
                            : rejected
                              ? "border-red-400/30 bg-red-400/10 text-red-300"
                              : "border-white/15 text-zinc-300"
                      }`}
                    >
                      {getStatusLabel(claim)}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
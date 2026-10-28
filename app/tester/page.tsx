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
  focus_areas: string[];
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
      return "Steam Store";
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
      return "Open Steam Store ↗";
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

function resolveTestAccess(game: TestGame): { link: string | null; type: TestAccessType } {
  const rawLink = game.game_link?.trim();
  if (!rawLink) return { link: null, type: game.access_type };
  try {
    const url = new URL(rawLink);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { link: null, type: game.access_type };
    }
    const steamStore = url.hostname.toLowerCase() === "store.steampowered.com";
    return {
      link: url.href,
      type: steamStore
        ? (game.access_type === "steam_demo" ? "steam_demo" : "steam_game")
        : game.access_type,
    };
  } catch {
    return { link: null, type: game.access_type };
  }
}

function claimMatchesGame(claim: TestClaim, game: TestGame) {
    return (
      claim.submission_id === game.submission_id ||
      claim.playtest_id === game.submission_id
    );
  }

function getTesterGameGroups(games: TestGame[], claims: TestClaim[]) {
  const activeClaims = claims.filter(
    (claim) => claim.status === "claimed" || claim.status === "in_progress"
  );
  const activeGames = games.filter((game) =>
    activeClaims.some((claim) => claimMatchesGame(claim, game))
  );
  const availableGames = games.filter((game) =>
    !claims.some((claim) => claimMatchesGame(claim, game))
  );
  const unavailableActiveClaims = activeClaims.filter((claim) =>
    !games.some((game) => claimMatchesGame(claim, game))
  );
  return { activeGames, availableGames, unavailableActiveClaims };
}

type FeedbackDraft = {
  overallScore: string;
  gameplayScore: string;
  performanceScore: string;
  continuePlaying: string;
  recommendGame: string;
  enjoyedMost: string;
  frustrations: string;
  bugsFound: string;
  biggestImprovement: string;
  feedback: string;
  hoursPlayed: string;
};

type FeedbackDraftController = { canClose: () => boolean };

function emptyFeedbackDraft(): FeedbackDraft {
  return {
    overallScore: "", gameplayScore: "", performanceScore: "",
    continuePlaying: "", recommendGame: "", enjoyedMost: "",
    frustrations: "", bugsFound: "", biggestImprovement: "",
    feedback: "", hoursPlayed: "",
  };
}

function feedbackDraftKey(accountId: string, testId: string) {
  return `playtested:feedback-draft:v1:${accountId}:${testId}`;
}

function readFeedbackDraft(raw: string, accountId: string, testId: string): FeedbackDraft {
  const saved = JSON.parse(raw);
  if (!saved || saved.version !== 1 || saved.accountId !== accountId || saved.testId !== testId || !saved.values) {
    throw new Error("Unrecognised draft");
  }
  const fields = emptyFeedbackDraft();
  for (const field of Object.keys(fields) as (keyof FeedbackDraft)[]) {
    const value = saved.values[field];
    const maximum = field === "feedback" ? 10000 : ["enjoyedMost", "frustrations", "bugsFound", "biggestImprovement"].includes(field) ? 5000 : 100;
    if (typeof value !== "string" || value.length > maximum) throw new Error("Invalid draft field");
    fields[field] = value;
  }
  return fields;
}

function removeFeedbackDraft(accountId: string, testId: string) {
  try {
    const key = feedbackDraftKey(accountId, testId);
    window.localStorage.removeItem(key);
    return window.localStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

function feedbackRequiredAnswers(draft: FeedbackDraft) {
  const scoreValid = (value: string) => /^(10|[1-9])$/.test(value);
  const intentValid = (value: string) => ["definitely", "probably", "maybe", "probably_not", "definitely_not"].includes(value);
  const hours = Number(draft.hoursPlayed);
  const hoursValid = draft.hoursPlayed.trim() !== "" && Number.isFinite(hours) && hours >= 0 && hours <= 1000 && Math.abs(hours * 4 - Math.round(hours * 4)) < 0.000001;
  const textValid = (value: string) => value.trim().length >= 10 && value.length <= 5000;
  return [
    scoreValid(draft.overallScore), intentValid(draft.continuePlaying), intentValid(draft.recommendGame),
    scoreValid(draft.gameplayScore), scoreValid(draft.performanceScore), hoursValid,
    textValid(draft.enjoyedMost), textValid(draft.frustrations), textValid(draft.biggestImprovement),
  ];
}

function FeedbackForm({
  accountId, game, claim, busy, serverError, onClearError, onClose, onSubmit, controllerRef,
}: {
  accountId: string;
  game: TestGame;
  claim: TestClaim;
  busy: boolean;
  serverError: string;
  onClearError: () => void;
  onClose: () => void;
  onSubmit: (draft: FeedbackDraft) => Promise<boolean>;
  controllerRef: { current: FeedbackDraftController | null };
}) {
  const [draft, setDraft] = useState<FeedbackDraft>(emptyFeedbackDraft);
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"loading" | "empty" | "saved" | "unavailable" | "invalid">("loading");
  const [validationError, setValidationError] = useState("");
  const draftRef = useRef<FeedbackDraft>(emptyFeedbackDraft());
  const unsavedRef = useRef(false);
  const readyRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const { overallScore, gameplayScore, performanceScore, continuePlaying, recommendGame, enjoyedMost, frustrations, bugsFound, biggestImprovement, feedback, hoursPlayed } = draft;
  const inputClass = "mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]";
  const answers = feedbackRequiredAnswers(draft);
  const completedAnswers = answers.filter(Boolean).length;
  const errorMessage = validationError || serverError;

  useEffect(() => {
    let restored = emptyFeedbackDraft();
    try {
      const raw = window.localStorage.getItem(feedbackDraftKey(accountId, claim.id));
      if (raw !== null) {
        try {
          restored = readFeedbackDraft(raw, accountId, claim.id);
          setDraftStatus("saved");
        } catch {
          setDraftStatus("invalid");
        }
      } else {
        setDraftStatus("empty");
      }
    } catch {
      setDraftStatus("unavailable");
    }
    draftRef.current = restored;
    setDraft(restored);
    readyRef.current = true;
    setReady(true);
    const controller = {
      canClose: () => !unsavedRef.current || window.confirm("Draft saving is unavailable. Closing will discard your unsaved answers. Close anyway?"),
    };
    controllerRef.current = controller;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (unsavedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [accountId, claim.id, controllerRef]);

  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage]);

  function updateField(field: keyof FeedbackDraft, value: string) {
    if (!readyRef.current || submittingRef.current || busy) return;
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    setDraft(next);
    setValidationError("");
    onClearError();
    // Save synchronously on each edit: no pending debounce is lost on refresh.
    try {
      window.localStorage.setItem(feedbackDraftKey(accountId, claim.id), JSON.stringify({
        version: 1, accountId, testId: claim.id,
        updatedAt: new Date().toISOString(), values: next,
      }));
      unsavedRef.current = false;
      setDraftStatus("saved");
    } catch {
      unsavedRef.current = true;
      setDraftStatus("unavailable");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readyRef.current || submittingRef.current || busy) return;
    const values = draftRef.current;
    if (feedbackRequiredAnswers(values).some((answered) => !answered)) {
      setValidationError("Please choose each rating and answer, enter your actual play time, and write at least 10 characters for each required written response.");
      return;
    }
    if (values.bugsFound.length > 5000 || values.feedback.length > 10000) {
      setValidationError("Please shorten the optional responses to fit the field limits.");
      return;
    }
    submittingRef.current = true;
    try {
      const success = await onSubmit(values);
      if (success) unsavedRef.current = false;
    } catch {
      setValidationError("Your feedback could not be submitted. Your answers are still here; please try again.");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="w-full space-y-6 rounded-2xl border border-[#77f29b]/25 bg-[#0d100e] p-6 sm:p-8 lg:p-10">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                      Playtest feedback
                                    </p>
                                    <h4 className="mt-2 text-xl font-bold text-white">
                                      {game.title}
                                    </h4>
                                    <p className="mt-1 text-sm text-zinc-400">
                                      Four short sections · usually a few minutes
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={busy}
                                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:bg-white/5 hover:text-white"
                                  >
                                    Close
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                                    <span>{completedAnswers} of {answers.length} required answers complete</span>
                                    <span>{Math.round(completedAnswers / answers.length * 100)}%</span>
                                  </div>
                                  <div role="progressbar" aria-label="Feedback form completion" aria-valuemin={0} aria-valuemax={answers.length} aria-valuenow={completedAnswers} className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-[#77f29b]" style={{ width: `${completedAnswers / answers.length * 100}%` }} />
                                  </div>
                                  <p role="status" className={`text-xs leading-5 ${draftStatus === "unavailable" || draftStatus === "invalid" ? "text-amber-200" : "text-zinc-500"}`}>
                                    {draftStatus === "loading" ? "Checking for a saved draft…"
                                      : draftStatus === "saved" ? "Draft saved on this device. You can close this form and return later."
                                      : draftStatus === "unavailable" ? "Draft saving is unavailable in this browser. Keep this tab open so you don’t lose your answers."
                                      : draftStatus === "invalid" ? "A saved draft could not be read. It has not been overwritten; new answers will replace it when you start typing."
                                      : "Your answers will save automatically on this device as you type."}
                                  </p>
                                </div>

                                <fieldset disabled={!ready || busy} className="min-w-0 space-y-6 border-0 p-0">
                                <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/5 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                    Your playtest
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                                    Answer from your actual experience. There are no
                                    right answers — specific criticism is useful.
                                  </p>
                                </div>

                                <div className="space-y-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                    1 · Overall experience
                                  </p>

                                  <label className="block text-sm font-medium">
                                    Overall, how was your experience? (1 to 10)
                                    <select
                                      required
                                      value={overallScore}
                                      onChange={(event) =>
                                        updateField("overallScore", event.target.value)
                                      }
                                      className={inputClass}
                                    >
                                      <option value="" disabled>Select an answer</option>
                                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                                        (score) => (
                                          <option key={score} value={score}>
                                            {score}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </label>

                                  <label className="block text-sm font-medium">
                                    Would you continue playing this game?
                                    <select
                                      required
                                      value={continuePlaying}
                                      onChange={(event) =>
                                        updateField("continuePlaying", event.target.value)
                                      }
                                      className={inputClass}
                                    >
                                      <option value="" disabled>Select an answer</option>
                                      <option value="definitely">Definitely</option>
                                      <option value="probably">Probably</option>
                                      <option value="maybe">Maybe</option>
                                      <option value="probably_not">Probably not</option>
                                      <option value="definitely_not">Definitely not</option>
                                    </select>
                                  </label>

                                  <label className="block text-sm font-medium">
                                    Would you recommend it to someone who likes this type of game?
                                    <select
                                      required
                                      value={recommendGame}
                                      onChange={(event) =>
                                        updateField("recommendGame", event.target.value)
                                      }
                                      className={inputClass}
                                    >
                                      <option value="" disabled>Select an answer</option>
                                      <option value="definitely">Definitely</option>
                                      <option value="probably">Probably</option>
                                      <option value="maybe">Maybe</option>
                                      <option value="probably_not">Probably not</option>
                                      <option value="definitely_not">Definitely not</option>
                                    </select>
                                  </label>
                                </div>

                                <div className="grid gap-5 border-t border-white/10 pt-6 md:grid-cols-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 md:col-span-2">
                                    2 · How it played
                                  </p>

                                  <label className="block text-sm font-medium">
                                    Gameplay score (1 to 10)
                                    <select
                                      required
                                      value={gameplayScore}
                                      onChange={(event) =>
                                        updateField("gameplayScore", event.target.value)
                                      }
                                      className={inputClass}
                                    >
                                      <option value="" disabled>Select an answer</option>
                                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                                        (score) => (
                                          <option key={score} value={score}>
                                            {score}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </label>

                                  <label className="block text-sm font-medium">
                                    Performance score (1 to 10)
                                    <select
                                      required
                                      value={performanceScore}
                                      onChange={(event) =>
                                        updateField("performanceScore", event.target.value)
                                      }
                                      className={inputClass}
                                    >
                                      <option value="" disabled>Select an answer</option>
                                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                                        (score) => (
                                          <option key={score} value={score}>
                                            {score}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </label>

                                  <label className="block text-sm font-medium">
                                    How long did you actually play?
                                    <div className="relative">
                                      <input
                                        type="number"
                                        required
                                        min="0"
                                        max="1000"
                                        step="0.25"
                                        placeholder="Enter hours played"
                                        value={hoursPlayed}
                                        onChange={(event) =>
                                          updateField("hoursPlayed", event.target.value)
                                        }
                                        className={`${inputClass} pr-20`}
                                      />
                                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">
                                        hours
                                      </span>
                                    </div>
                                    <span className="mt-1 block text-xs text-zinc-500">
                                      Example: 0.5 = 30 minutes
                                    </span>
                                  </label>
                                </div>

                                <div className="grid gap-5 border-t border-white/10 pt-6 md:grid-cols-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 md:col-span-2">
                                    3 · What stood out
                                  </p>

                                  <label className="block text-sm font-medium">
                                    What did you enjoy most?
                                    <textarea
                                      required
                                      minLength={10}
                                      maxLength={5000}
                                      value={enjoyedMost}
                                      onChange={(event) => updateField("enjoyedMost", event.target.value)}
                                      rows={3}
                                      placeholder="What worked particularly well for you?"
                                      className={inputClass}
                                    />
                                  </label>

                                  <label className="block text-sm font-medium">
                                    What frustrated you or got in the way?
                                    <textarea
                                      required
                                      minLength={10}
                                      maxLength={5000}
                                      value={frustrations}
                                      onChange={(event) => updateField("frustrations", event.target.value)}
                                      rows={3}
                                      placeholder="Confusing moments, friction, difficulty spikes, awkward controls, or anything else."
                                      className={inputClass}
                                    />
                                  </label>

                                  <label className="block text-sm font-medium">
                                    Did you encounter bugs or technical problems?
                                    <textarea
                                      value={bugsFound}
                                      onChange={(event) =>
                                        updateField("bugsFound", event.target.value)
                                      }
                                      rows={3}
                                      maxLength={5000}
                                      placeholder="Describe crashes, glitches or technical issues. Leave blank if you found none."
                                      className={inputClass}
                                    />
                                  </label>
                                </div>

                                <div className="grid gap-5 border-t border-white/10 pt-6 md:grid-cols-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 md:col-span-2">
                                    4 · Final thoughts
                                  </p>

                                  <label className="block text-sm font-medium">
                                    What is the single biggest thing you would improve?
                                    <textarea
                                      required
                                      minLength={10}
                                      maxLength={5000}
                                      value={biggestImprovement}
                                      onChange={(event) => updateField("biggestImprovement", event.target.value)}
                                      rows={3}
                                      placeholder="If the developer changed one thing, what should it be?"
                                      className={inputClass}
                                    />
                                  </label>

                                  <label className="block text-sm font-medium">
                                    Anything else? <span className="text-zinc-500">(optional)</span>
                                    <textarea
                                      maxLength={10000}
                                      value={feedback}
                                      onChange={(event) =>
                                        updateField("feedback", event.target.value)
                                      }
                                      rows={4}
                                      placeholder="Add anything important that the questions above did not cover."
                                      className={inputClass}
                                    />
                                  </label>
                                </div>

                                {errorMessage && (
                                  <div
                                    id={`feedback-error-${claim.id}`}
                                    ref={errorRef}
                                    tabIndex={-1}
                                    role="alert"
                                    aria-live="assertive"
                                    className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200"
                                  >
                                    <p className="font-semibold">
                                      Your review could not be
                                      submitted
                                    </p>

                                    <p className="mt-1 break-words">
                                      {errorMessage}
                                    </p>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={
                                    busy
                                  }
                                  className="w-full rounded-lg bg-[#77f29b] px-4 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busy
                                    ? "Submitting..."
                                    : "Submit review"}
                                </button>

                                </fieldset>
    </form>
  );
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

  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null);
  const loadedAccountRef = useRef<string | null>(null);
  const feedbackDraftControllerRef = useRef<FeedbackDraftController | null>(null);

  const router = useRouter();
  const activeClaimCount = claims.filter(
    (claim) => claim.status === "claimed" || claim.status === "in_progress"
  ).length;
  const hasActiveTest = activeClaimCount > 0;


  function closeFeedback() {
    if (submittingId !== null) return;
    if (feedbackDraftControllerRef.current && !feedbackDraftControllerRef.current.canClose()) return;
    setActiveTestId(null);
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
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
    const authClient = createClient();
    const { data: authListener } = authClient.auth.onAuthStateChange((event: string, session: { user: { id: string } } | null) => {
      if (event === "SIGNED_OUT" || (loadedAccountRef.current && session?.user.id !== loadedAccountRef.current)) {
        active = false;
        loadedAccountRef.current = null;
        setActiveTestId(null);
        setDraftOwnerId(null);
        setGames([]);
        setClaims([]);
        router.replace("/login?next=/tester");
      }
    });

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

      loadedAccountRef.current = user.id;

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
      setDraftOwnerId(user.id);

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
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function claimGame(game: TestGame) {
    if (hasActiveTest) {
      showMessage("Finish or release your current test before choosing another.", "error");
      return;
    }
    if (claimingId !== null) return;
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
      `Release "${game.title}"? Your saved feedback draft for this test will be discarded after release succeeds. No feedback will be submitted and there is no XP penalty.`
    );

    if (!confirmed) return;

    setMessage("");
    setReleasingId(game.submission_id);

    const supabase = createClient();

    let error: { message: string } | null = null;
    try {
      const result = await supabase.rpc("release_community_game_test", { p_submission_id: game.submission_id });
      error = result.error;
    } catch {
      error = { message: "Release could not be confirmed. Your draft has been kept. Refresh the page to check the test before trying again." };
    }

    if (error) {
      showMessage(
        "Could not release this game: " + error.message,
        "error"
      );
    } else {
      const draftCleared = draftOwnerId ? removeFeedbackDraft(draftOwnerId, claim.id) : false;
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
        `You've released "${game.title}". You can claim it again later.${draftCleared ? "" : " The test was released, but this browser could not remove its local draft."}`,
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

  async function submitTest(game: TestGame, claim: TestClaim, values: FeedbackDraft): Promise<boolean> {
    if (submittingId !== null) return false;
    if (!draftOwnerId || feedbackRequiredAnswers(values).some((answered) => !answered) || values.bugsFound.length > 5000 || values.feedback.length > 10000) {
      setFormErrors((previous) => ({ ...previous, [claim.id]: "Please complete all required answers before submitting." }));
      return false;
    }
    setMessage("");
    setFormErrors((previous) => ({ ...previous, [claim.id]: "" }));
    setSubmittingId(claim.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("submit_community_game_test", {
        p_test_id: claim.id,
        p_gameplay_score: Number(values.gameplayScore),
        p_performance_score: Number(values.performanceScore),
        p_bugs_found: values.bugsFound,
        p_feedback: values.feedback,
        p_hours_played: Number(values.hoursPlayed),
        p_overall_score: Number(values.overallScore),
        p_continue_playing: values.continuePlaying,
        p_recommend_game: values.recommendGame,
        p_enjoyed_most: values.enjoyedMost,
        p_frustrations: values.frustrations,
        p_biggest_improvement: values.biggestImprovement,
        p_focus_responses: {},
      });
      if (error) {
        setFormErrors((previous) => ({ ...previous, [claim.id]: error.message }));
        return false;
      }
      const draftCleared = removeFeedbackDraft(draftOwnerId, claim.id);
      setClaims((previous) => previous.map((item) => item.id === claim.id
        ? { ...item, status: "submitted", review_outcome: "pending" }
        : item));
      setActiveTestId(null);
      showMessage(`Your test of "${game.title}" has been submitted for review. XP is awarded only if it is accepted.${draftCleared ? "" : " This browser could not remove its local draft."}`, "success");
      return true;
    } catch {
      setFormErrors((previous) => ({ ...previous, [claim.id]: "Submission could not be confirmed. Your answers are still here. Refresh to check Testing activity before trying again." }));
      return false;
    } finally {
      setSubmittingId(null);
    }
  }

  const testerProgress = calculateTesterProgress(testerXp);

  const { activeGames, availableGames, unavailableActiveClaims } =
    getTesterGameGroups(games, claims);

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

  function renderGameCard(game: TestGame) {
    const { link: accessLink, type: accessType } = resolveTestAccess(game);

                const claim = claims.find(
                  (item) =>
                    claimMatchesGame(item, game) &&
                    (item.status === "claimed" ||
                      item.status === "in_progress")
                );

                return (
                  <article
                    key={game.submission_id}
                    className={`flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${
                      activeTestId
                        ? claim?.id === activeTestId
                          ? "w-full"
                          : "hidden"
                        : ""
                    }`}
                  >
                    {game.image_url && activeTestId !== claim?.id && (
                      <img
                        src={game.image_url}
                        alt=""
                        className="h-48 w-full shrink-0 object-cover"
                      />
                    )}

                    <div
                      className={`flex flex-1 flex-col ${
                        activeTestId === claim?.id
                          ? "w-full p-6 sm:p-8"
                          : "p-5"
                      }`}
                    >
                      {activeTestId === claim?.id ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
                          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:items-start">
                            <div className="flex min-w-0 gap-5">
                              {game.image_url && (
                                <img
                                  src={game.image_url}
                                  alt=""
                                  className="h-24 w-40 shrink-0 rounded-xl border border-white/10 object-cover sm:h-28 sm:w-48"
                                />
                              )}

                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                  {game.genre || "Uncategorised"}
                                </p>

                                <h3 className="mt-2 text-2xl font-bold text-white">
                                  {game.title}
                                </h3>

                                <p className="mt-1 text-sm text-zinc-400">
                                  By {game.developer_name}
                                </p>

                                {game.ai_type && (
                                  <span className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                                    {game.ai_type}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/5 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                Developer wants feedback on
                              </p>

                              {game.focus_areas?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {game.focus_areas.map((area) => (
                                    <span
                                      key={area}
                                      className="rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-3 py-1.5 text-xs font-semibold text-[#b9f9ca]"
                                    >
                                      {area}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                  No specific focus areas were selected. Give balanced feedback on your overall experience.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 border-t border-white/10 pt-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Developer instructions
                            </p>
                            <p className="mt-2 text-sm leading-6 text-zinc-300">
                              {game.description}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}

                      <div className="mt-auto space-y-3 pt-6">
                        {!claim ? (
                          <button
                            type="button"
                            disabled={
                              claimingId !== null || hasActiveTest
                            }
                            aria-describedby={hasActiveTest ? "one-active-test-note" : undefined}
                            onClick={() => void claimGame(game)}
                            className="w-full rounded-lg bg-[#77f29b] px-4 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {claimingId === game.submission_id
                              ? "Starting..."
                              : hasActiveTest
                                ? "Finish or release current test"
                                : "Test game"}
                          </button>
                        ) : claim.status === "claimed" ? (
                          <>
                            <p className="text-center text-sm font-medium text-[#77f29b]">
                              Ready to test
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
                                ? "Opening test..."
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

                            {accessLink ? (
                              <div className="rounded-xl border border-[#77f29b]/25 bg-[#77f29b]/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                  Game access
                                </p>

                                <p className="mt-2 text-sm font-semibold text-white">
                                  {getAccessLabel(accessType)}
                                </p>

                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                  {getAccessInstructions(accessType)}
                                </p>

                                <a
                                  href={accessLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-4 block w-full rounded-lg border border-[#77f29b]/30 bg-[#77f29b]/10 px-4 py-3 text-center text-sm font-semibold text-[#b9f9ca] hover:bg-[#77f29b]/15"
                                >
                                  {getAccessButtonLabel(accessType)}
                                </a>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <p className="text-sm font-semibold text-zinc-200">No game link added yet</p>
                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                  A build or Steam Store link isn’t available for this test yet. If you already have the game, you can still play and finish your feedback. Otherwise, you can release this test and choose another.
                                </p>
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={submittingId === claim.id}
                              onClick={() => {
                                if (activeTestId === claim.id) closeFeedback();
                                else setActiveTestId(claim.id);

                                setFormErrors((previous) => ({
                                  ...previous,
                                  [claim.id]: "",
                                }));
                              }}
                              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${
                                activeTestId === claim.id
                                  ? "border border-white/10 text-zinc-300 hover:bg-white/5"
                                  : "bg-[#77f29b] text-[#09100b] hover:bg-[#9af8b4]"
                              }`}
                            >
                              {activeTestId === claim.id
                                ? "Back to your active tests"
                                : "Finish feedback"}
                            </button>

                            {activeTestId !== claim.id && (
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
                            )}

                            {activeTestId === claim.id && (
                              <div className="mt-6">
                                {draftOwnerId ? (
                                  <FeedbackForm
                                    key={`${draftOwnerId}:${claim.id}`}
                                    accountId={draftOwnerId}
                                    game={game}
                                    claim={claim}
                                    busy={submittingId === claim.id}
                                    serverError={formErrors[claim.id] || ""}
                                    onClearError={() => setFormErrors((previous) => ({ ...previous, [claim.id]: "" }))}
                                    onClose={closeFeedback}
                                    onSubmit={(values) => submitTest(game, claim, values)}
                                    controllerRef={feedbackDraftControllerRef}
                                  />
                                ) : <p className="text-sm text-zinc-400">Checking your account before opening feedback…</p>}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
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
          <p className="mt-10 text-zinc-400">Loading your tests and available games...</p>
        ) : (
          <>
            <section className="mt-10" aria-labelledby="active-tests-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="active-tests-heading" className="text-2xl font-bold">Your active tests</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Pick up a claimed test, continue playing, or finish your feedback.
                  </p>
                </div>
                <span className="rounded-full border border-[#77f29b]/25 bg-[#77f29b]/[0.06] px-3 py-1 text-xs font-semibold text-[#b9f9ca]">
                  {activeGames.length + unavailableActiveClaims.length} active
                </span>
              </div>

              {activeGames.length === 0 && unavailableActiveClaims.length === 0 ? (
                <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
                  You have no active tests. Choose a game from Available to test below to get started.
                </p>
              ) : (
                <>
                  <div className={`mt-6 grid items-stretch gap-6 ${activeTestId ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {activeGames.map(renderGameCard)}
                  </div>
                  {!activeTestId && unavailableActiveClaims.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {unavailableActiveClaims.map((claim) => (
                        <article key={claim.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-5">
                          <h3 className="text-sm font-semibold text-zinc-100">Active test details unavailable</h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                            This test is still recorded as {claim.status === "claimed" ? "claimed" : "in progress"}, but its game details were not returned by the catalogue. Reload the page to check again. It has not been released or submitted.
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {!activeTestId && (
              <section className="mt-10" aria-labelledby="available-tests-heading">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="available-tests-heading" className="text-2xl font-bold">Available to test</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Choose your next game. Tests you have already claimed appear above.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                    {availableGames.length} available
                  </span>
                </div>

                {hasActiveTest && (
                  <div id="one-active-test-note" className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-zinc-400">
                    <p className="font-semibold text-zinc-200">One test at a time</p>
                    <p className="mt-1">
                      {activeClaimCount > 1
                        ? "You already have multiple active tests. You can finish or release them at your own pace; choose another once none remain active."
                        : "Submit your feedback or release your current test to choose another. You can still browse the games below."}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Submitting frees your slot immediately; you do not need to wait for admin review. Releasing a test has no XP penalty.</p>
                  </div>
                )}

                {availableGames.length === 0 ? (
                  <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
                    No new games are available for you to claim right now. You can continue any active tests above; submitted tests remain in Testing activity below.
                  </p>
                ) : (
                  <div className="mt-6 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {availableGames.map(renderGameCard)}
                  </div>
                )}
              </section>
            )}
          </>
        )}

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
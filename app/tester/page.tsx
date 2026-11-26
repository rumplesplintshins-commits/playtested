"use client";
import TestingActivityHeader from '../components/TestingActivityHeader';
import TesterTipHistory from '../components/TesterTipHistory';
import ActivityStorefrontLink from '../components/ActivityStorefrontLink';
import {type ActivityMedia} from '@/lib/testing-activity';
import GamePcRequirements from "../components/GamePcRequirements";
import {PrivatePcProvider} from "../components/AccountPcSpecifications";
import DisclosureControl from "../components/DisclosureControl";
import TestBriefPreview from "../components/TestBriefPreview";
import MinimisedTestGame from "../components/MinimisedTestGame";

import {currentJourney} from "@/lib/share-links";
import {TrackedAccessLink,ShareJourneyBanner} from "../components/ShareJourney";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { GAME_GENRES, matchesGenrePreferences } from "../../lib/genres";
import { platformDisplayName, platformOf } from "../../lib/platforms";
import { preserveTesterGamePlatforms, testerGamePlatformKey } from "../../lib/tester-game-platforms";
import {feedbackQualityLabel,type FeedbackQualityRecord} from "@/lib/feedback-review";
import SiteHeader from "../components/SiteHeader";
import PaginationControls from "../components/PaginationControls";
import {pageCount,pagedItems,safePage} from "@/lib/pagination";
import {sortTesterGamesOldestFirst} from "@/lib/tester-game-order";

import { TesterRankPanel, QualityGuidance, Reconsideration, CampaignPlaces, PlacesRules, ReservationNotice, useTestingCapacityPolicy } from "../components/TestingPolicy";

function receivedReservationClock(serverNow:string){return {server:Date.parse(serverNow),local:Date.now()};}

type TestAccessType =
  | "steam_demo"
  | "steam_game"
  | "browser_game"
  | "download_build"
  | "other";

type TestGame = {
  can_claim?: boolean;
  restriction_reason?: string | null;
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
  platform?: string | null;
  published_at?: string | null;
};

type TestClaim = FeedbackQualityRecord & {
  activity_media?:ActivityMedia;
  feedback_usefulness?:string|null;
  id: string;
  submission_id: string | null;
  playtest_id: string | null;
  status: "claimed" | "in_progress" | "submitted" | "reviewed" | "expired";
  reservation_expires_at?:string|null;
  reservation_started_at?:string|null;
  game_title?:string;
  reclaim_campaign_id?:string|null;
  review_outcome: "pending" | "accepted" | "rejected";
  review_reason: string | null;
  xp_awarded: boolean;
  submitted_at?: string | null;
  overall_score?: number | null;
  gameplay_score?: number | null;
  performance_score?: number | null;
  continue_playing?: string | null;
  recommend_game?: string | null;
  enjoyed_most?: string | null;
  frustrations?: string | null;
  bugs_found?: string | null;
  biggest_improvement?: string | null;
  feedback?: string | null;
  hours_played?: number | null;
};

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

// Display all recorded platforms. Legacy listings without a platform are
// clearly labelled as unclassified rather than incorrectly labelled Steam.
function testerPlatformLabel(value?: string | null) {
  const label = platformDisplayName(value);
  return <span
    aria-label={label ? `Platform: ${label}` : "Platform not listed"}
    className={label
      ? "inline-flex max-w-full items-center rounded-md border border-[#77f29b]/25 bg-[#77f29b]/[0.045] px-2 py-0.5 text-[11px] font-medium text-[#b9f9ca]"
      : "inline-flex max-w-full items-center rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-zinc-500"}
  >{label ?? "Platform not listed"}</span>;
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
    !claims.some((claim) => claimMatchesGame(claim, game) && !claim.retry_available)
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
  additionalDocumentUrl: string;
  gameplayRecordingUrl: string;
  hoursPlayed: string;
};

type FeedbackDraftController = { canClose: () => boolean };

function emptyFeedbackDraft(): FeedbackDraft {
  return {
    overallScore: "", gameplayScore: "", performanceScore: "",
    continuePlaying: "", recommendGame: "", enjoyedMost: "",
    frustrations: "", bugsFound: "", biggestImprovement: "",
    feedback: "", additionalDocumentUrl: "", gameplayRecordingUrl: "", hoursPlayed: "",
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
    // Old v1 drafts predate private evidence: preserve every existing answer.
    if (value === undefined && (field === "additionalDocumentUrl" || field === "gameplayRecordingUrl")) continue;
    const maximum = field === "feedback" ? 10000 : ["additionalDocumentUrl", "gameplayRecordingUrl"].includes(field) ? 2048 : ["enjoyedMost", "frustrations", "bugsFound", "biggestImprovement"].includes(field) ? 5000 : 100;
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
  const textValid = (value: string) => value.trim().length > 0 && value.length <= 5000;
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
  const [evidenceAcknowledged, setEvidenceAcknowledged] = useState(false);
  const draftRef = useRef<FeedbackDraft>(emptyFeedbackDraft());
  const unsavedRef = useRef(false);
  const readyRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const { overallScore, gameplayScore, performanceScore, continuePlaying, recommendGame, enjoyedMost, frustrations, bugsFound, biggestImprovement, feedback, additionalDocumentUrl, gameplayRecordingUrl, hoursPlayed } = draft;
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
          setTimeout(() => setDraftStatus("saved"), 0);
        } catch {
          setTimeout(() => setDraftStatus("invalid"), 0);
        }
      } else {
        setTimeout(() => setDraftStatus("empty"), 0);
      }
    } catch {
      setTimeout(() => setDraftStatus("unavailable"), 0);
    }
    draftRef.current = restored;
    setTimeout(() => setDraft(restored), 0);
    readyRef.current = true;
    setTimeout(() => setReady(true), 0);
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
      setValidationError("Please choose each rating and answer, enter your actual play time, and complete each required written response.");
      return;
    }
    if (values.bugsFound.length > 5000 || values.feedback.length > 10000 ||
        values.additionalDocumentUrl.length > 2048 || values.gameplayRecordingUrl.length > 2048) {
      setValidationError("Please shorten the optional responses to fit the field limits.");
      return;
    }
    const evidenceUrls = [values.additionalDocumentUrl, values.gameplayRecordingUrl].map(value => value.trim()).filter(Boolean);
    if (evidenceUrls.some(url => !/^https:\/\/[^/?#@\s]+\/.+/i.test(url))) {
      setValidationError("Supporting documents and recordings must be valid HTTPS links.");
      return;
    }
    if (evidenceUrls.length > 0 && !evidenceAcknowledged) {
      setValidationError("Please confirm you have checked the personal information and sharing permissions for your supporting evidence.");
      return;
    }
    const publicAnswers = [values.enjoyedMost, values.frustrations, values.bugsFound, values.biggestImprovement, values.feedback];
    if (publicAnswers.some(value => /https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value))) {
      setValidationError("Written feedback may be shown publicly. Move links and personal contact details to the private supporting-evidence fields.");
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
    <form data-playtested-feedback-form="true" onSubmit={(event) => void handleSubmit(event)} className="w-full space-y-6 rounded-2xl border border-[#77f29b]/25 bg-[#0d100e] p-6 sm:p-8 lg:p-10">
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
                                    Answer from your actual experience, specific criticism is useful.
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                                    Developers may choose to tip feedback they find particularly useful. Clear, specific and constructive feedback gives them more to act on. Tips are optional and never guaranteed.
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

                                <section aria-label="Additional private supporting evidence" className="space-y-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h5 className="font-semibold text-white">Additional supporting evidence</h5>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-300">These links are private to your account, Playtested admins and the owning game developer after approval. They will not appear on public game pages. External file sharing permissions may reveal your name, email, voice or other details to the developer.</p>
                </div>
                <a href="/Playtested_Game_Playtest_Report_Template.docx" download="Playtested_Game_Playtest_Report_Template.docx" className="shrink-0 rounded-lg border border-[#77f29b]/40 px-3 py-2 text-xs font-semibold text-[#77f29b] hover:bg-[#77f29b]/10">Download editable Playtested report</a>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">Additional Playtested report <span className="font-normal text-zinc-400">(optional)</span>
                  <input type="url" maxLength={2048} value={additionalDocumentUrl} onChange={event=>updateField("additionalDocumentUrl",event.target.value)} placeholder="https://docs.google.com/document/d/..." className={inputClass} />
                  <span className="mt-1 block text-xs font-normal text-zinc-400">Google Docs, Drive, Dropbox, OneDrive or a direct PDF/Word file link.</span>
                </label>
                <label className="text-sm font-semibold">Gameplay recording <span className="font-normal text-zinc-400">(optional)</span>
                  <input type="url" maxLength={2048} value={gameplayRecordingUrl} onChange={event=>updateField("gameplayRecordingUrl",event.target.value)} placeholder="https://drive.google.com/file/d/..." className={inputClass} />
                  <span className="mt-1 block text-xs font-normal text-zinc-400">A short clip can help developers understand bugs, confusing moments or unexpected behaviour. Sharing is optional. Check access settings and personal information before sharing.</span>
                </label>
              </div>
              <p className="text-xs text-amber-200">Before sharing, check the document owner, filename, access permissions and any personal details visible in the recording. Only link files you have permission to share.</p>
                          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-200">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[#77f29b]"
                  checked={evidenceAcknowledged}
                  onChange={(event) => { setEvidenceAcknowledged(event.target.checked); setValidationError(""); }}
                  required={Boolean(additionalDocumentUrl.trim() || gameplayRecordingUrl.trim())}
                />
                <span>
                  I confirm I have checked the linked documents or recordings for personal information and agree to share them with Playtested admins and, after approval, the game&apos;s developer. I understand I am responsible for checking external file contents and sharing settings. Playtested cannot control personal information exposed through third-party files or links.
                  <span className="mt-1 block text-zinc-400">Required when you add a document or video link; optional otherwise.</span>
                </span>
              </label>
            </section>

            <div className="grid gap-5 border-t border-white/10 pt-6 md:grid-cols-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 md:col-span-2">
                                    4 · Final thoughts
                                  </p>

                                  <label className="block text-sm font-medium">
                                    What is the single biggest thing you would improve?
                                    <textarea
                                      required

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
                                      placeholder="Add public-safe comments. Use the private fields above for document links or recordings."
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
                                    busy || claim.status==="expired"
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

type TesterHistoryEvidence = { document_url: string | null; recording_url: string | null };

function TesterHistoryPrivateEvidence({ testId }: { testId: string }) {
  const [evidence, setEvidence] = useState<TesterHistoryEvidence | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data, error } = await createClient().rpc('get_my_private_playtest_evidence', { p_test_id: testId });
        if (!mounted) return;
        if (error) { setLoadError(true); return; }
        const record = Array.isArray(data) ? (data[0] as TesterHistoryEvidence | undefined) : undefined;
        setEvidence(record ?? null);
      } catch {
        if (mounted) setLoadError(true);
      }
    })();
    return () => { mounted = false; };
  }, [testId]);

  const documentUrl = evidence?.document_url?.startsWith('https://') ? evidence.document_url : null;
  const recordingUrl = evidence?.recording_url?.startsWith('https://') ? evidence.recording_url : null;
  if (!documentUrl && !recordingUrl) {
    return loadError ? <p role="status" className="mt-3 text-xs text-amber-200">Your private supporting links could not be loaded. Reopen this report to retry.</p> : null;
  }
  return (
    <section aria-label="Your private supporting evidence" className="mt-3 space-y-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.035] p-4" onClick={event => event.stopPropagation()}>
      <h4 className="text-sm font-semibold text-emerald-200">Your private supporting evidence</h4>
      <p className="text-xs text-zinc-400">Saved with this report for your reference. External document and video hosts may reveal your account identity to viewers.</p>
      {documentUrl && <div><p className="text-xs font-semibold text-zinc-300">Additional Playtested report</p><a href={documentUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-sm text-emerald-300 underline underline-offset-2">Open your report</a></div>}
      {recordingUrl && <div><p className="text-xs font-semibold text-zinc-300">Gameplay recording</p><a href={recordingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-sm text-emerald-300 underline underline-offset-2">Watch your recording</a></div>}
    </section>
  );
}

function TesterPage() {
  const [games, setGames] = useState<TestGame[]>([]);
  const platformCacheRef = useRef<Map<string,string>>(new Map());
  const setGamesWithPlatforms = useCallback((incoming: TestGame[]) => {
    setGames(previous => preserveTesterGamePlatforms(incoming, previous, platformCacheRef.current));
  }, []);
  useEffect(()=>{const campaign=new URLSearchParams(window.location.search).get("campaign");if(campaign)document.getElementById("tester-campaign-"+campaign)?.scrollIntoView({block:"center"});},[games]);
  const [reviewHistory,setReviewHistory]=useState<{id:number;test_id:string;kind:string;reason:string;xp_delta:number;rubric_version?:number|null;quality_score?:number|null;actual_xp_award?:number|null;created_at?:string}[]>([]);
  const [reviewHistoryError,setReviewHistoryError]=useState("");
  const [feedbackUsefulness,setFeedbackUsefulness]=useState<Record<string,"useful"|"not_useful">>({});
  const [storedClaims, setClaims] = useState<TestClaim[]>([]);
  const capacityPolicy=useTestingCapacityPolicy();
  const [clock,setClock]=useState<{server:number;local:number}|null>(null);
  // Prerender must be deterministic; live time is read by the effects below.
  const [clockTick,setClockTick]=useState(0);
  const now=clock?clock.server+Math.max(0,clockTick-clock.local):null;
  const claims=useMemo(()=>storedClaims.map(claim=>claim.reservation_expires_at&&now!==null&&Date.parse(claim.reservation_expires_at)<=now&&["claimed","in_progress"].includes(claim.status)?{...claim,status:"expired" as const}:claim),[storedClaims,now]);
  useEffect(()=>{if(!clock)return;const serverNow=clock.server+Date.now()-clock.local;const deadlines=storedClaims.filter(claim=>["claimed","in_progress"].includes(claim.status)&&claim.reservation_expires_at).flatMap(claim=>[Date.parse(claim.reservation_expires_at!)-86400000,Date.parse(claim.reservation_expires_at!)]).filter(deadline=>deadline>serverNow);if(!deadlines.length)return;const timer=setTimeout(()=>setClockTick(Date.now()),Math.min(2147483647,Math.max(1,Math.min(...deadlines)-serverNow+1)));return()=>clearTimeout(timer);},[clock,storedClaims,clockTick]);
  useEffect(()=>{const tick=()=>setClockTick(Date.now());const timer=setInterval(tick,60000);window.addEventListener("focus",tick);document.addEventListener("visibilitychange",tick);return()=>{clearInterval(timer);window.removeEventListener("focus",tick);document.removeEventListener("visibilitychange",tick);};},[]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeTestId) return;
    let frame = 0;
    let attempts = 0;
    const scrollToFeedbackObjectives = () => {
      const form = document.querySelector<HTMLFormElement>('form[data-playtested-feedback-form="true"]');
      if (!form) {
        if (attempts++ < 60) frame = requestAnimationFrame(scrollToFeedbackObjectives);
        return;
      }
      const card = form.closest('article');
      const heading = card ? Array.from(card.querySelectorAll<HTMLElement>('h2,h3,h4,h5,p,span,div'))
        .find(node => node.children.length === 0 && /^testing objectives$/i.test(node.textContent?.trim() || '')) : null;
      const target = heading || form;
      target.style.scrollMarginTop = '110px';
      target.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    };
    frame = requestAnimationFrame(scrollToFeedbackObjectives);
    return () => cancelAnimationFrame(frame);
  }, [activeTestId]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [, setTesterXp] = useState(0);
  const [, setCompletedTests] = useState(0);
  const [, setProfileLoading] = useState(true);

  const alertRef = useRef<HTMLDivElement>(null);

  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null);
  const loadedAccountRef = useRef<string | null>(null);
  const feedbackDraftControllerRef = useRef<FeedbackDraftController | null>(null);

  const [preferredGenres,setPreferredGenres] = useState<string[]>([]);
  const [savedTesterReturn, setSavedTesterReturn] = useState<{ genre?: string; expanded?: Record<string, boolean> } | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("playtested:tester-return");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        expanded?: Record<string, boolean>;
        genre?: string;
        scrollY?: number;
        savedAt?: number;
      };
      if (!parsed.savedAt || Date.now() - parsed.savedAt > 30 * 60 * 1000) {
        sessionStorage.removeItem("playtested:tester-return");
        return null;
      }
      return { genre: parsed.genre, expanded: parsed.expanded };
    } catch {
      sessionStorage.removeItem("playtested:tester-return");
      return null;
    }
  });
  const [genreFilter,setGenreFilter] = useState(savedTesterReturn?.genre ?? "all");
  const [platformFilter,setPlatformFilter] = useState("all");
  const [availableSearch,setAvailableSearch] = useState("");
  const [availablePage,setAvailablePage] = useState(1);
  const [justClaimedId,setJustClaimedId] = useState<string|null>(null);
  const [minimisedActiveGames, setMinimisedActiveGames] = useState<Record<string, boolean>>({});
  const [expandedAvailableGames, setExpandedAvailableGames] = useState<Record<string, boolean>>(
    savedTesterReturn?.expanded && typeof savedTesterReturn.expanded === "object"
      ? savedTesterReturn.expanded
      : {}
  );
  const [expandedHistoryClaims, setExpandedHistoryClaims] = useState<Record<string, boolean>>({});
  const [historyPage,setHistoryPage]=useState(1),[historyPagingReady,setHistoryPagingReady]=useState(false);
  const [discoveryReady,setDiscoveryReady] = useState(false);
  useEffect(()=>{const n=Number(new URLSearchParams(window.location.search).get("activityPage"));
    if(Number.isSafeInteger(n)&&n>0)setHistoryPage(n);setHistoryPagingReady(true);
  },[]);
  useEffect(()=>{if(!historyPagingReady)return;const url=new URL(window.location.href);
    if(historyPage>1)url.searchParams.set("activityPage",String(historyPage));
    else url.searchParams.delete("activityPage");
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  },[historyPage,historyPagingReady]);

  useEffect(() => {
    if (!games.length) return;
    const raw = sessionStorage.getItem("playtested:tester-return");
    if (!raw) return;
    let saved: { campaignId?: string; savedAt?: number };
    try {
      saved = JSON.parse(raw) as typeof saved;
    } catch {
      sessionStorage.removeItem("playtested:tester-return");
      return;
    }
    if (!saved.savedAt || Date.now() - saved.savedAt > 30 * 60 * 1000 || !saved.campaignId) {
      sessionStorage.removeItem("playtested:tester-return");
      return;
    }
    // The list is loaded asynchronously. Restore to the game, not a pixel offset
    // measured before the page was reconstructed.
    let frame = 0;
    let attempts = 0;
    const restore = () => {
      const target = document.getElementById("tester-campaign-" + saved.campaignId);
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
        sessionStorage.removeItem("playtested:tester-return");
      } else if (attempts++ < 45) {
        frame = requestAnimationFrame(restore);
      }
    };
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(restore); });
    return () => cancelAnimationFrame(frame);
  }, [games, genreFilter, expandedAvailableGames]);


  const [reviewRevision,setReviewRevision] = useState(0);
  const onTestingProgress = useCallback((data: {genres: string[]}) => setPreferredGenres(data.genres || []), []);
  useEffect(() => {
    if (loading) return;
    let frame = 0;
    const openReport = () => {
      const match = /^#testing-activity-([0-9a-f-]{36})$/i.exec(window.location.hash);
      if (!match || !claims.some(claim => claim.id === match[1])) return;
      const records=claims.filter(claim=>["submitted","reviewed","expired"].includes(claim.status))
        .sort((a,b)=>(Date.parse(b.submitted_at??b.reservation_started_at??"")||0)-(Date.parse(a.submitted_at??a.reservation_started_at??"")||0)||b.id.localeCompare(a.id));
      const index=records.findIndex(claim=>claim.id===match[1]);
      if(index>=0)setHistoryPage(Math.floor(index/10)+1);
      setExpandedHistoryClaims(previous=>previous[match[1]]?previous:{...previous,[match[1]]:true});
      frame=requestAnimationFrame(()=>document.getElementById("testing-activity-"+match[1])?.scrollIntoView({block:"start"}));
    };
    openReport();
    window.addEventListener("hashchange", openReport);
    return () => {cancelAnimationFrame(frame);window.removeEventListener("hashchange", openReport);};
  }, [loading, claims]);
  const refreshFeedbackState=useCallback(async()=>{
    if(!loadedAccountRef.current)return;
    const client=createClient();const result=await client.rpc("get_my_test_reservations");
    if(result.error||!result.data?.claims)return;
    setClaims(result.data.claims);if(result.data.server_now)setClock(receivedReservationClock(result.data.server_now));
    setReviewRevision(value=>value+1);
    const catalogue=await client.rpc("get_discoverable_community_test_games");if(!catalogue.error)setGamesWithPlatforms((catalogue.data || []) as TestGame[]);
    const ids=result.data.claims.map((claim:TestClaim)=>claim.id);if(ids.length){const history=await client.from("test_review_events").select("*").in("test_id",ids).order("created_at",{ascending:false}).order("id",{ascending:false});if(!history.error)setReviewHistory(history.data||[]);}
  },[setGamesWithPlatforms]);
  useEffect(()=>{const refresh=()=>{void refreshFeedbackState();};window.addEventListener("playtested-notifications-changed",refresh);window.addEventListener("focus",refresh);return()=>{window.removeEventListener("playtested-notifications-changed",refresh);window.removeEventListener("focus",refresh);};},[refreshFeedbackState]);
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
        platformCacheRef.current.clear();
        setGames([]);
        setClaims([]);
        setReviewHistory([]);
        router.replace("/login?next="+encodeURIComponent(window.location.pathname+window.location.search));
      }
    });

    async function loadGames() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login?next="+encodeURIComponent(window.location.pathname+window.location.search));
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
        { data: approvedPlatformRows, error: approvedPlatformsError },
      ] = await Promise.all([
        (async () => {
          const discovery = await supabase.rpc("get_discoverable_community_test_games");
          if (!discovery.error) { setDiscoveryReady(true); return discovery; }
          if (!["PGRST202", "42883"].includes(discovery.error.code)) return discovery;
          return supabase.rpc("get_available_community_test_games");
        })(),
        (async()=>{const result=await supabase.rpc("get_my_test_reservations");if(!result.error&&result.data?.server_now){setClock(receivedReservationClock(result.data.server_now));return {data:result.data.claims,error:null};}if(result.error&&!["PGRST202","42883"].includes(result.error.code))return result;return supabase.from("community_game_tests").select("id, submission_id, playtest_id, status, review_outcome, review_reason, xp_awarded, submitted_at, overall_score, gameplay_score, performance_score, continue_playing, recommend_game, enjoyed_most, frustrations, bugs_found, biggest_improvement, feedback, hours_played").eq("tester_id",user.id);})(),
        supabase
          .from("profiles")
          .select("tester_xp, completed_tests")
          .eq("id", user.id)
          .single(),
        // The existing discovery RPC does not return platform. Approved listings
        // are public and can be fetched in parallel; no new privileged RPC needed.
        supabase.from("approved_games")
          .select("title, developer_name, platform")
          .not("platform", "is", null),
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

      // Match the same title + developer pair used for public detail navigation.
      // If different approved records disagree on platform, leave it unknown.
      const knownPlatforms = new Map<string, string>();
      const ambiguousPlatforms = new Set<string>();
      if (!approvedPlatformsError) {
        for (const row of approvedPlatformRows ?? []) {
          const validPlatform = platformOf(row.platform);
          if (!validPlatform || !row.title || !row.developer_name) continue;
          const key = testerGamePlatformKey(row.title, row.developer_name);
          if (knownPlatforms.has(key) && knownPlatforms.get(key) !== validPlatform) {
            ambiguousPlatforms.add(key);
          } else if (!ambiguousPlatforms.has(key)) {
            knownPlatforms.set(key, validPlatform);
          }
        }
      }
      for (const key of ambiguousPlatforms) knownPlatforms.delete(key);
      if (!approvedPlatformsError) platformCacheRef.current = knownPlatforms;
      setGamesWithPlatforms((gamesData ?? []) as TestGame[]);
      if(new URLSearchParams(window.location.search).has("campaign")) setGenreFilter("all");
      const mediaResult=await supabase.rpc("get_my_testing_activity_media");
      if(!active)return;
      const mediaByTest=new Map<string,ActivityMedia>((mediaResult.error?[]:mediaResult.data??[]).filter(Boolean).map((row:ActivityMedia)=>[row.test_id,row]));
      setClaims((claimsData ?? []).map((claim:TestClaim)=>({...claim,activity_media:mediaByTest.get(claim.id)})) as TestClaim[]);
      const usefulness=await supabase.rpc("get_my_feedback_usefulness");
      if(active&&!usefulness.error){
        const mapped:Record<string,"useful"|"not_useful">={};
        for(const row of usefulness.data??[]){if(row?.test_id&&(row.usefulness==="useful"||row.usefulness==="not_useful"))mapped[row.test_id]=row.usefulness;}
        setFeedbackUsefulness(mapped);
      }
      if(claimsData?.length){const history=await supabase.from("test_review_events").select("*").in("test_id",claimsData.map((claim:{id:string})=>claim.id)).order("created_at",{ascending:false}).order("id",{ascending:false});if(!active)return;setReviewHistory(history.data||[]);setReviewHistoryError(history.error?"Review history unavailable. Your recorded totals are unchanged.":"");}else setReviewHistory([]);
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
  }, [router, setGamesWithPlatforms]);

  function clearStaleTestingActivityDeepLink() {
    if (/^#testing-activity-[0-9a-f-]{36}$/i.test(window.location.hash)) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      );
    }
  }

  async function claimGame(game: TestGame) {
    clearStaleTestingActivityDeepLink();
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
      router.push("/login?next="+encodeURIComponent(window.location.pathname+window.location.search));
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

    const journey=currentJourney();
    const { data, error } = await supabase.rpc(
      journey ? "claim_with_share_attribution" : "claim_community_game_test",
      {p_submission_id:game.submission_id,...(journey?{p_visit:journey}:{})}
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
        "id, submission_id, playtest_id, status, review_outcome, review_reason, xp_awarded, reservation_expires_at, reservation_started_at, submitted_at, overall_score, gameplay_score, performance_score, continue_playing, recommend_game, enjoyed_most, frustrations, bugs_found, biggest_improvement, feedback, hours_played"
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

    const confirmed=await supabase.rpc("get_my_test_reservations");
    if(!confirmed.error&&confirmed.data?.server_now)setClock(receivedReservationClock(confirmed.data.server_now));
    const catalogue=await supabase.rpc("get_discoverable_community_test_games");
    if(!catalogue.error&&Array.isArray(catalogue.data))setGamesWithPlatforms(catalogue.data as TestGame[]);
    setClaims((previous) => [
      ...previous.filter((item) => item.id !== createdClaim.id),
      createdClaim as TestClaim,
    ]);

    showMessage(`You've claimed "${game.title}".`, "success");
    setJustClaimedId(game.submission_id);
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
    clearStaleTestingActivityDeepLink();
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
      setJustClaimedId(game.submission_id);
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
    if(claim.status==="expired"){setFormErrors(previous=>({...previous,[claim.id]:"Reservation expired. Reclaim a place before submitting. Your draft is kept."}));return false;}
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
      const { error } = await supabase.rpc("submit_community_game_test_with_evidence", {
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
        p_document_url: values.additionalDocumentUrl.trim() || null,
        p_recording_url: values.gameplayRecordingUrl.trim() || null,
      });
      if (error) {
        setFormErrors((previous) => ({ ...previous, [claim.id]: error.message }));
        return false;
      }
      const draftCleared = removeFeedbackDraft(draftOwnerId, claim.id);
      setClaims((previous) => previous.map((item) => item.id === claim.id
        ? { ...item, status: "submitted", review_outcome: "pending" }
        : item));
      // Refresh authoritative timestamp and safe media after a newly submitted report.
      // A secondary history fetch must never turn a confirmed submission into a failure.
      void(async()=>{try{const [reservations,media]=await Promise.all([supabase.rpc('get_my_test_reservations'),supabase.rpc('get_my_testing_activity_media')]);const row=reservations.data?.claims?.find((item:TestClaim)=>item.id===claim.id);const artwork=media.data?.find((item:ActivityMedia)=>item.test_id===claim.id);setClaims(previous=>previous.map(item=>item.id===claim.id?{...item,...(reservations.error?{}:row),activity_media:artwork??item.activity_media}:item));}catch{/* Reload recovers optional history metadata. */}})();
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



  const { activeGames, availableGames: eligibleGames, unavailableActiveClaims } =
    getTesterGameGroups(games, claims);
  const expiredEditorClaim=claims.find(claim=>claim.id===activeTestId&&claim.status==="expired");
  const editorGame=expiredEditorClaim?(games.find(game=>claimMatchesGame(expiredEditorClaim,game))??{submission_id:expiredEditorClaim.playtest_id??expiredEditorClaim.submission_id!,title:expiredEditorClaim.game_title??"Historical test",developer_name:"Developer",genre:"",description:"The campaign is not currently available. Your saved draft is still accessible.",game_link:null,access_type:"other",image_url:null,ai_type:null,focus_areas:[]} as TestGame):undefined;
  const displayedActiveGames=editorGame&&!activeGames.includes(editorGame)?[...activeGames,editorGame]:activeGames;

  const historyClaims=useMemo(()=>claims.filter(claim=>
    claim.status==="submitted"||claim.status==="reviewed"||claim.status==="expired"
  ).sort((a,b)=>(Date.parse(b.submitted_at??b.reservation_started_at??"")||0)
    -(Date.parse(a.submitted_at??a.reservation_started_at??"")||0)||b.id.localeCompare(a.id)),[claims]);
  const displayedHistoryClaims=pagedItems(historyClaims,historyPage,10);
  useEffect(()=>{if(!loading)setHistoryPage(p=>Math.min(p,pageCount(historyClaims.length,10)));},[historyClaims.length,loading]);
  useEffect(()=>{
    if(loading)return;
    const match=window.location.hash.match(/^#testing-activity-([0-9a-f-]{36})$/i);
    if(!match||!displayedHistoryClaims.some(claim=>claim.id===match[1]))return;
    const timer=window.setTimeout(()=>document.getElementById("testing-activity-"+match[1])?.scrollIntoView({block:"start"}),125);
    return()=>window.clearTimeout(timer);
  },[historyPage,historyClaims,loading]);

  const availableGames=sortTesterGamesOldestFirst(eligibleGames.filter(g=>(platformFilter==="all" || (platformFilter==="mobile" ? ["android","ios"].includes(g.platform??"") : g.platform===platformFilter)) && (genreFilter==="all" || (genreFilter==="preferred" ? g.can_claim !== false && (preferredGenres.length===0 || matchesGenrePreferences(g.genre, preferredGenres)) : matchesGenrePreferences(g.genre, [genreFilter]))) && (!availableSearch.trim() || [g.title,g.developer_name,g.genre,g.description].some(value=>value.toLowerCase().includes(availableSearch.trim().toLowerCase())))));
  const currentAvailablePage=safePage(availablePage,availableGames.length,9);
  const pageAvailableGames=pagedItems(availableGames,currentAvailablePage,9);
  const changeAvailablePage=(next:number)=>{
    setAvailablePage(next);
    requestAnimationFrame(()=>document.getElementById("available-tests-heading")?.scrollIntoView({block:"start",behavior:"smooth"}));
  };
  const minimisedAvailableGames = pageAvailableGames.filter(game => expandedAvailableGames[game.submission_id] === false);
  const expandedAvailableList = pageAvailableGames.filter(game => expandedAvailableGames[game.submission_id] !== false);
  useEffect(()=>{if(!justClaimedId)return;const target=document.getElementById("active-test-"+justClaimedId);if(!target)return;target.scrollIntoView({behavior:"smooth",block:"center"});const t=setTimeout(()=>setJustClaimedId(null),0);return () => clearTimeout(t);},[justClaimedId,displayedActiveGames]);
  const unmetRequirementsCount = availableGames.filter(game => game.can_claim === false).length;
  const testableGamesCount = availableGames.length - unmetRequirementsCount;
  function getStatusLabel(claim: TestClaim) {
    if(claim.status==="expired")return "Reservation expired";
    if(claim.appeal?.state==="provisional_rejection")return "Provisional rejection ? dispute window open";
    if(claim.appeal?.state==="disputed")return "Dispute awaiting admin decision";
    if (claim.status === "submitted") {
      return "Awaiting admin review";
    }

    if (claim.review_outcome === "accepted") {
      return "Accepted";
    }

    if (claim.review_outcome === "rejected") {
      return "Final rejection";
    }

    return "Reviewed";
  }

  function minimiseGame(game: TestGame, group: "available" | "active") {
    if (group === "available") setExpandedAvailableGames(previous => ({ ...previous, [game.submission_id]: false }));
    else setMinimisedActiveGames(previous => ({ ...previous, [game.submission_id]: true }));
    requestAnimationFrame(() => document.getElementById(`expand-${group}-${game.submission_id}`)?.focus());
  }

  function renderMinimisedGames(items: TestGame[], group: "available" | "active") {
    if (!items.length) return null;
    return <section className="mt-5" aria-labelledby={`minimised-${group}-heading`}>
      <h3 id={`minimised-${group}-heading`} className="text-sm font-semibold text-zinc-300">{group === "active" ? "Minimised active tests" : "Minimised games"} <span className="text-zinc-500">({items.length})</span></h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(game => {
          const claim = group === "active" ? claims.find(item => claimMatchesGame(item, game) && (item.status === "claimed" || item.status === "in_progress")) : undefined;
          const status = claim ? `${claim.status === "claimed" ? "Place reserved" : "Testing in progress"}${claim.reservation_expires_at ? ` · Due ${new Date(claim.reservation_expires_at).toLocaleString()}` : ""}` : undefined;
          return <MinimisedTestGame key={game.submission_id} game={game} status={status} group={group} onExpand={() => {
            if (group === "available") setExpandedAvailableGames(previous => ({ ...previous, [game.submission_id]: true }));
            else setMinimisedActiveGames(previous => ({ ...previous, [game.submission_id]: false }));
            requestAnimationFrame(() => document.getElementById(`minimise-${group}-${game.submission_id}`)?.focus());
          }} />;
        })}
      </div>
    </section>;
  }
  function renderGameCard(game: TestGame) {
    const { link: accessLink, type: accessType } = resolveTestAccess(game);

                const claim = claims.find(
                  (item) =>
                    claimMatchesGame(item, game) &&
                    (item.status === "claimed" ||
                      item.status === "in_progress" || (item.status === "expired" && activeTestId===item.id))
                );

                return (
                  <article
                    key={claim?.id||game.submission_id}
                    id={claim?.status==="claimed"||claim?.status==="in_progress"?"active-test-"+game.submission_id:"tester-campaign-"+game.submission_id}
                    className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${
                      activeTestId
                        ? claim?.id === activeTestId
                          ? "w-full"
                          : "hidden"
                        : ""
                    }`}
                  >
                    {claim && activeTestId !== claim.id && (
                      <div data-active-test-header className="flex min-h-10 items-center justify-between gap-4 px-4 py-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs text-zinc-400">Active test</span>
                          {testerPlatformLabel(game.platform)}
                        </div>
                        <button id={`minimise-active-${game.submission_id}`} type="button" aria-label="Minimise active test" aria-expanded={true} onClick={() => minimiseGame(game, "active")} className="inline-flex shrink-0 items-center justify-center rounded p-1 text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-[#77f29b]">
                          <DisclosureControl expanded />
                        </button>
                      </div>
                    )}
                    {activeTestId !== claim?.id && (game.image_url ? (
                      <a
                        href={`/tester?campaign=${encodeURIComponent(game.submission_id)}`}
                        onClick={async (event) => {
                          event.preventDefault();
                          const supabase = createClient();
                          const { data, error } = await supabase
                            .from("approved_games")
                            .select("id")
                            .eq("title", game.title)
                            .eq("developer_name", game.developer_name)
                            .limit(2);
                          if (error || !data || data.length !== 1) {
                            showMessage("Could not find a unique public game details page for this playtest.", "error");
                            return;
                          }
                          sessionStorage.setItem("playtested:tester-return", JSON.stringify({
                            expanded: expandedAvailableGames,
                            genre: genreFilter,
                            campaignId: game.submission_id,
                            savedAt: Date.now(),
                          }));
                          window.location.assign(`/submissions/${data[0].id}`);
                        }}
                        aria-label={`View ${game.title} game details`}
                        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#77f29b]"
                      >
                        <img
                          src={game.image_url}
                          alt={`View details for ${game.title}`}
                          className="h-32 w-full shrink-0 object-cover"
                        />
                      </a>
                    ) : <div aria-hidden="true" className="flex h-32 shrink-0 items-center justify-center border-b border-white/10 bg-black/20 text-sm text-zinc-500">No thumbnail provided</div>)}

                    <div
                      className={`flex min-h-0 min-w-0 flex-1 flex-col ${
                        activeTestId === claim?.id
                          ? "w-full p-6 sm:p-8"
                          : "p-4"
                      }`}
                    >
                      {activeTestId === claim?.id ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
                          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:items-start">
                            <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                              {game.image_url && (
                                <img
                                  src={game.image_url}
                                  alt=""
                                  className="h-28 w-full max-w-48 shrink-0 rounded-xl border border-white/10 object-cover sm:w-40"
                                />
                              )}

                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                                  {game.genre || "Uncategorised"}
                                </p>
                                <h3 title={game.title} className="mt-2 line-clamp-2 break-words text-2xl font-bold text-white [overflow-wrap:anywhere]">
                                  {game.title}
                                </h3>

                                <div className="mt-2 flex min-h-6 min-w-0 flex-wrap items-center gap-2">{testerPlatformLabel(game.platform)}</div>
                                <p title={game.developer_name} className="mt-1 truncate text-sm text-zinc-400">
                                  By {game.developer_name}
                                </p>

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

                        </div>
                      ) : (
                        <>
                          <div className="flex min-h-6 min-w-0 items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-xs uppercase tracking-wider text-[#77f29b]">
                            {game.genre || "Uncategorised"}
                          </p>
                          </div>

                          <h3 title={game.title} className="mt-2 line-clamp-2 h-12 break-words text-xl font-semibold leading-6 [overflow-wrap:anywhere]">
                            {game.title}
                          </h3>

                          <p title={game.developer_name} className="mt-1 truncate text-sm text-zinc-400">
                            By {game.developer_name}
                          </p>

                        </>
                      )}

                      <div className="mt-3 min-w-0 shrink-0 border-t border-white/10 pt-2 [&>section]:my-0 [&_summary]:px-3 [&_summary]:py-2">
                        <GamePcRequirements id={game.submission_id} kind="campaign" compact/>
                        <CampaignPlaces id={game.submission_id} showRules={false} availabilityOptIn canRequestAvailability={!hasActiveTest&&(!claim||claim.status==="expired")} refreshKey={claims.map(c=>c.id+c.status+c.reservation_expires_at).join("|")} />
                        {claim && <ReservationNotice claimed expiresAt={claim.reservation_expires_at} now={now??(capacityPolicy?Date.parse(capacityPolicy.server_now):null)} hours={capacityPolicy?.reservation_hours}/>}
                        {claim?.status==="expired"&&<button type="button" disabled={claimingId!==null||hasActiveTest||!(claim.playtest_id||claim.reclaim_campaign_id)} onClick={()=>void claimGame({...game,submission_id:claim.playtest_id||claim.reclaim_campaign_id!})} className="mt-2 rounded-lg border border-amber-200/30 px-3 py-2 text-sm text-amber-200">Reclaim place</button>}
                        {!claim && game.can_claim === false && <div className="text-sm text-amber-200"><p>{game.restriction_reason || "Testing requirements not met"}</p>{/^Requires .+ interest$/.test(game.restriction_reason || "") && <p className="mt-1 text-zinc-400">If this genre genuinely suits you, <a href="/account#testing-interests" className="underline underline-offset-2 hover:text-white">Edit interests</a>.</p>}</div>}
                      </div>
                      <TestBriefPreview instructions={game.description} />
                      <div className="mt-3 flex min-h-8 shrink-0 flex-wrap items-start gap-2" aria-label="Playtest badges">
                        {game.ai_type && <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{game.ai_type}</span>}
                        {activeTestId !== claim?.id && game.focus_areas?.map(area => <span key={area} className="rounded-full border border-[#77f29b]/20 px-3 py-1 text-xs text-[#b9f9ca]">{area}</span>)}
                      </div>
                      <div className="mt-auto shrink-0 space-y-3 pt-4">

                        {!claim ? (
                          <button
                            type="button"
                            disabled={
                              claimingId !== null || hasActiveTest || game.can_claim === false || !capacityPolicy
                            }
                            aria-describedby={hasActiveTest ? "one-active-test-note" : undefined}
                            onClick={() => void claimGame(game)}
                            className="min-h-12 w-full rounded-lg bg-[#77f29b] px-3 py-2 text-sm font-semibold leading-4 text-[#09100b] hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {claimingId === game.submission_id
                              ? "Starting..."
                              : game.can_claim === false
                                ? "Requirements not met"
                              : hasActiveTest
                                ? "Finish or release current test"
                                : !capacityPolicy ? "Reservation rules unavailable" : "Test game"}
                          </button>
                        ) : claim.status === "claimed" && activeTestId!==claim.id ? (
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

                                <TrackedAccessLink campaignId={game.submission_id}
                                  href={accessLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-4 block w-full rounded-lg border border-[#77f29b]/30 bg-[#77f29b]/10 px-4 py-3 text-center text-sm font-semibold text-[#b9f9ca] hover:bg-[#77f29b]/15"
                                >
                                  {getAccessButtonLabel(accessType)}
                                </TrackedAccessLink>
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
                                else {
                                  clearStaleTestingActivityDeepLink();
                                  setActiveTestId(claim.id);
                                }

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
      <ShareJourneyBanner />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
          Community testing
        </p>

        <h1 className="mt-3 text-3xl font-bold">Tester Hub</h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Discover a game, share useful feedback, and build your tester experience.
        </p>

        <TesterRankPanel onProgress={onTestingProgress} revision={reviewRevision} />
        <QualityGuidance collapsible />

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

              {displayedActiveGames.length === 0 && unavailableActiveClaims.length === 0 ? (
                <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
                  You have no active tests. Choose a game from Available to test below to get started.
                </p>
              ) : (
                <>
                  {!activeTestId && renderMinimisedGames(displayedActiveGames.filter(game => minimisedActiveGames[game.submission_id]), "active")}
                  <div className={`mt-6 grid items-stretch gap-6 ${activeTestId ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {displayedActiveGames.filter(game => activeTestId || !minimisedActiveGames[game.submission_id]).map(renderGameCard)}
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
                  <div className="flex flex-wrap gap-2 text-xs" aria-live="polite">
                    <span className="rounded-full border border-[#77f29b]/30 px-3 py-1 text-[#77f29b]">
                      {testableGamesCount} {testableGamesCount === 1 ? "game" : "games"} you can test
                    </span>
                    <span className="rounded-full border border-amber-200/30 px-3 py-1 text-amber-200">
                      {unmetRequirementsCount} {unmetRequirementsCount === 1 ? "game" : "games"} with unmet requirements
                    </span>
                  </div>
                </div>

                <label className="mt-4 ml-3 inline-block">Platform <select aria-label="Filter test games by platform" className="rounded bg-black p-2" value={platformFilter} onChange={e=>{setPlatformFilter(e.target.value);setAvailablePage(1);}}><option value="all">All platforms</option><option value="steam">Steam</option><option value="pc">PC / Other</option><option value="browser">Web / Browser</option><option value="roblox">Roblox</option><option value="android">Android</option><option value="ios">iPhone / iPad</option><option value="mobile">All mobile</option></select></label>
                <label className="mt-4 block">Testing genre <select className="rounded bg-black p-2" value={genreFilter} onChange={e=>{setGenreFilter(e.target.value);setAvailablePage(1);}}><option value="preferred">My preferred genres</option><option value="all">{discoveryReady ? "All games" : "All eligible games"}</option>{GAME_GENRES.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
                <label className="mt-4 block text-sm">Search games <input aria-label="Search available games" type="search" value={availableSearch} onChange={e=>{setAvailableSearch(e.target.value);setAvailablePage(1);}} className="mt-2 block w-full max-w-md rounded-lg border border-white/15 bg-black p-3" placeholder="Title, developer, genre or description" /></label>
                <p className="mt-2 text-sm text-zinc-400">{preferredGenres.length===0?"No preferences selected: showing all eligible games. Set your interests in Account.":"All games includes games outside your interests."} Restricted games show their requirements and cannot be claimed.</p>
                <div className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-2 [&_summary]:text-xs [&_summary]:underline [&_summary]:underline-offset-4" aria-label="Testing information">
                  <PlacesRules hours={capacityPolicy?.reservation_hours}/>
                  <details className="mt-2 text-sm leading-6 text-zinc-400">
                    <summary className="w-fit cursor-pointer py-2 underline underline-offset-4">Reservation deadlines</summary>
                    <div className="mt-2 max-w-prose rounded-lg border border-white/10 bg-white/[0.025] p-3">
                      <ReservationNotice now={now??(capacityPolicy?Date.parse(capacityPolicy.server_now):null)} hours={capacityPolicy?.reservation_hours}/>
                      <p className="mt-2 text-xs">Each confirmed reservation keeps its original server-issued deadline. Starting testing or refreshing places does not extend it. Your active test shows its own submission deadline.</p>
                    </div>
                  </details>
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

                {renderMinimisedGames(minimisedAvailableGames, "available")}
                {availableGames.length === 0 ? (
                  <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
                    No new games are available for you to claim right now. You can continue any active tests above; submitted tests remain in Testing activity below.
                  </p>
                ) : expandedAvailableList.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-400">All matching games are minimised. Expand a tile above to see its testing actions.</p>
                ) : (
                  <div className="mt-6 grid items-stretch gap-6 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
                    {expandedAvailableList.map((game) => (
                      <div key={game.submission_id} data-tester-game={game.submission_id} className="flex h-full min-w-0 flex-col rounded-xl border border-white/10 bg-white/[0.02]">
                        <button id={`minimise-available-${game.submission_id}`} type="button" aria-label={`Minimise ${game.title}`} aria-expanded={true} aria-controls={`tester-card-${game.submission_id}`} onClick={() => minimiseGame(game, "available")} className="flex min-h-10 shrink-0 items-center justify-between gap-3 rounded-t-xl px-4 py-2 text-left text-xs text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-[#77f29b]">
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span>Minimise game</span>
                            {testerPlatformLabel(game.platform)}
                          </span>
                          <DisclosureControl expanded />
                        </button>
                        <div id={`tester-card-${game.submission_id}`} className="flex min-h-0 min-w-0 flex-1 flex-col p-2 pt-0">{renderGameCard(game)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {availableGames.length>0&&<PaginationControls label="Available games" page={currentAvailablePage} pageSize={9} total={availableGames.length} onPageChange={changeAvailablePage}/>}
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
              Keep track of expired reservations, submitted tests, review outcomes
              and your progress as a tester.
            </p>
          </div>

          {loading ? (
            <p className="mt-6 text-zinc-400">
              Loading your activity...
            </p>
          ) : historyClaims.length === 0 ? (
            <p className="mt-6 rounded-lg border border-white/10 p-6 text-zinc-400">
              Your expired reservations, submitted and reviewed tests will appear here.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {displayedHistoryClaims.map((claim) => {
                const game = games.find((item) =>
                  claimMatchesGame(claim, item)
                );

                const media=claim.activity_media;
                const accepted =
                  claim.review_outcome === "accepted";
                const rejected =
                  claim.review_outcome === "rejected";
                const pending = claim.status === "submitted" && !claim.appeal;

                const isExpanded = expandedHistoryClaims[claim.id] ?? false;
                const toggleCard = () => setExpandedHistoryClaims(prev => ({ ...prev, [claim.id]: !prev[claim.id] }));

                return (
                  <article
                    id={`testing-activity-${claim.id}`}
                    key={claim.id}
                    className="scroll-mt-24 min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer"
                    onClick={(event) => { if (!(event.target as HTMLElement).closest("button, a, input, select, textarea, summary, details")) toggleCard(); }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <TestingActivityHeader title={media?.title??game?.title??claim.game_title??'Previously tested game'} developer={media?.developer_name??game?.developer_name} image={media?.image_url??game?.image_url} usefulness={(feedbackUsefulness[claim.id]??claim.feedback_usefulness)==='useful'?'useful':undefined} usefulOnly status={getStatusLabel(claim)}/>
                      <div className="flex flex-wrap items-center justify-end gap-2"><TesterTipHistory testId={claim.id} variant="badge"/><button type="button" aria-expanded={isExpanded} aria-label={`${isExpanded?"Collapse":"Expand"} testing history`} onClick={toggleCard}><DisclosureControl expanded={isExpanded}/></button></div>
                    </div>
                    <div className="mt-3 min-w-0">
                      {/* Submission details remain visible in either state. */}
                      {(
                        <>
                          {claim.submitted_at && <p className="mt-2 text-xs text-zinc-500">Submitted {new Date(claim.submitted_at).toLocaleString()}</p>}
                          {claim.hours_played != null && <p className="mt-1 text-xs text-zinc-500">Time played: {claim.hours_played} hours</p>}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {claim.overall_score != null && <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">Overall: {claim.overall_score}/10</span>}
                            {claim.gameplay_score != null && <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">Gameplay: {claim.gameplay_score}/10</span>}
                            {claim.performance_score != null && <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">Performance: {claim.performance_score}/10</span>}
                          </div>
                        </>
                      )}
                      {/* Expanded written feedback, XP history and secondary controls. */}
                      {isExpanded && (
                        <>
                          <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                            <ActivityStorefrontLink testId={claim.id} url={media?.store_url} />
                          </div>
                          <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3 text-sm space-y-3">
                            {claim.enjoyed_most && <div><p className="text-xs font-semibold uppercase tracking-wide text-[#77f29b]">Enjoyed most</p><p className="mt-1 whitespace-pre-wrap">{claim.enjoyed_most}</p></div>}
                            {claim.frustrations && <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Frustrations</p><p className="mt-1 whitespace-pre-wrap">{claim.frustrations}</p></div>}
                            {claim.bugs_found && <div><p className="text-xs font-semibold uppercase tracking-wide text-red-200">Bugs & technical issues</p><p className="mt-1 whitespace-pre-wrap">{claim.bugs_found}</p></div>}
                            {claim.biggest_improvement && <div><p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Biggest improvement</p><p className="mt-1 whitespace-pre-wrap">{claim.biggest_improvement}</p></div>}
                            {claim.feedback && <div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Anything else</p><p className="mt-1 whitespace-pre-wrap">{claim.feedback}</p></div>}
                          </div>
                          <TesterHistoryPrivateEvidence testId={claim.id} />
                          <TesterTipHistory testId={claim.id} variant="detail"/>
                          {reviewHistoryError && <p className="mt-2 text-xs text-zinc-400">{reviewHistoryError}</p>}
                          {reviewHistory.some(event=>event.test_id===claim.id) && (
                            <details className="group mt-4 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50 text-sm" onClick={(e) => e.stopPropagation()}>
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-zinc-100 [&::-webkit-details-marker]:hidden">
                                <span className="flex items-center gap-2"><span aria-hidden="true" className="text-emerald-400">◷</span> XP & review history <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-normal text-zinc-400">{reviewHistory.filter(event=>event.test_id===claim.id).length} events</span></span>
                                <span className="text-xs font-normal text-zinc-400"><span className="group-open:hidden">Show +</span><span className="hidden group-open:inline">Hide −</span></span>
                              </summary>
                              <ol className="space-y-3 border-t border-white/10 p-3 sm:p-4">
                                {reviewHistory.filter(event=>event.test_id===claim.id).map(event=><li key={event.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div><p className="font-semibold capitalize text-zinc-100">{event.kind.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-zinc-400">{event.created_at?new Date(event.created_at).toLocaleString():"Historical event"}</p></div>
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${event.xp_delta>0?"border-emerald-400/30 bg-emerald-400/10 text-emerald-300":event.xp_delta<0?"border-red-400/30 bg-red-400/10 text-red-300":"border-white/10 text-zinc-300"}`}>{event.xp_delta>0?"+":""}{event.xp_delta} XP change</span>
                                  </div>
                                  {event.rubric_version!=null?<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    <div className="rounded-lg bg-black/30 p-3"><p className="text-xs text-zinc-400">Feedback quality</p><p className="mt-1 text-lg font-semibold text-white">{event.quality_score??"—"}%</p></div>
                                    <div className="rounded-lg bg-black/30 p-3"><p className="text-xs text-zinc-400">XP awarded</p><p className="mt-1 text-lg font-semibold text-emerald-300">{event.actual_xp_award==null?"Not recorded":`${event.actual_xp_award} XP`}</p></div>
                                    <div className="col-span-2 rounded-lg bg-black/30 p-3 sm:col-span-1"><p className="text-xs text-zinc-400">Rubric</p><p className="mt-1 text-lg font-semibold text-white">Version {event.rubric_version}</p></div>
                                  </div>:<p className="mt-3 text-xs text-zinc-400">{event.kind === "tester_feedback_useful" ? "One-time Useful feedback bonus" : event.kind === "review_bonus_correction" ? "Previous review bonus correction" : event.kind === "developer_feedback_reviewed" ? "Previous review bonus" : event.kind === "reconsideration" ? "Written dispute submitted" : event.kind === "provisional_rejection" ? "Provisional rejection ? place retained" : "Legacy review · score not recorded"}</p>}
                                  {event.reason&&<div className="mt-3 border-t border-white/10 pt-3"><p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Review reason</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">{event.reason}</p></div>}
                                </li>)}
                              </ol>
                            </details>
                          )}
                          {(rejected||claim.appeal?.state==="provisional_rejection"||claim.appeal?.state==="disputed") && (<div onClick={(e) => e.stopPropagation()}>
                            <Reconsideration testId={claim.id} reason={claim.review_reason} appeal={claim.appeal} serverNow={now} onRefresh={refreshFeedbackState} />
                          </div>)}
                          <p className="mt-2 text-xs text-zinc-500">
                            {claim.status==="expired" ? "Your draft is kept. Reclaim a place to continue; expiry has no XP penalty." : pending
                              ? "Your feedback has been submitted and is awaiting admin review."
                              : accepted
                                ? `Accepted. ${feedbackQualityLabel(claim)}.`
                                : rejected
                                  ? "Your feedback was finally rejected. A 24-hour same-game cooldown applies; you may test other games immediately."
                                  : claim.appeal?.state === "provisional_rejection"
                                    ? "Your place is retained during the 24-hour dispute window."
                                    : claim.appeal?.state === "disputed"
                                      ? "Admin review of your clarification is pending. Your place is retained."
                                      : "Your test has been reviewed."}
                          </p>
                        </>
                      )}
                    </div>
                    {claim.status==="expired"&&<div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <button type="button" disabled={claimingId!==null||hasActiveTest||!(claim.playtest_id||claim.reclaim_campaign_id)} onClick={(e)=>{e.stopPropagation();void claimGame({...game,submission_id:claim.playtest_id||claim.reclaim_campaign_id!,title:claim.game_title??game?.title??"this game"} as TestGame)}} className="rounded-lg border border-amber-200/30 px-3 py-2 text-sm text-amber-200">Reclaim place</button>
                      <button type="button" onClick={(e)=>{e.stopPropagation();setActiveTestId(claim.id)}} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Open saved draft</button>
                      {!claim.playtest_id&&!claim.reclaim_campaign_id&&<p className="text-xs text-zinc-400">This historical test needs a published campaign before it can be reclaimed.</p>}
                    </div>}
                  </article>
                );
              })}
              <PaginationControls label="Testing activity" page={historyPage} pageSize={10} total={historyClaims.length}
                onPageChange={next=>{
                  setHistoryPage(next);
                  if(window.location.hash.startsWith("#testing-activity-"))window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
                }}/>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default function TesterPcPage(){return <PrivatePcProvider><TesterPage /></PrivatePcProvider>;}

"use client";



import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ChangeEvent, FormEvent, MouseEvent } from "react";

import SiteHeader from "../components/SiteHeader";

import { createClient } from "../../lib/supabase";



type ImageStatus = "empty" | "loading" | "loaded" | "error";

type AccessStatus = "checking" | "allowed" | "denied";

type ReleaseStatus = "Released" | "Upcoming" | "Not announced";



type ExistingSubmission = {

  id: string;

  developer_id: string;

  title: string;

  developer_name?: string;

  status: string;

};



type ApprovedGameMatch = {

  id: string;

  title: string | null;

  developer_name: string | null;

};



type ImportedGameMatch = {

  id: string;

  steam_app_id: string;

  title: string;

  developer_name: string | null;

};



type DuplicateSource = "submission" | "approved" | "imported";



type PossibleDuplicate = {

  source: DuplicateSource;

  recordId: string;

  title: string;

  developerName: string;

  status?: string;

  exactSteamMatch: boolean;

};



type DuplicateRpcRow = {

  source: "submission" | "approved";

  record_id: string;

  title: string;

  developer_name: string;

  status: string | null;

};



type ClaimRelationship =

  | "Solo developer"

  | "Studio member"

  | "Publisher"

  | "Other";



type PulseStage = "idle" | "connecting" | "running" | "complete" | "error";

type PulseIssueDetail = {
  type: string;
  severity: "warning";
  title: string;
  detail: string;
};

type PulseTechnicalSessionEvidence = {
  id: string;
  family: string;
  sessionNumber: number | null;
  startSucceeded: boolean | null;
  restartAttempted: boolean | null;
  restartSucceeded: boolean | null;
  stallDetected: boolean;
  durationMs: number | null;
  loadMs: number | null;
  consoleErrors: unknown[];
  pageErrors: unknown[];
  failedRequests: unknown[];
  fatalError: unknown;
  genericObservations: Record<string, unknown>;
  evidence: Record<string, unknown>;
};

type PulseDetailedEvidence = {
  runtimeErrors: PulseTechnicalSessionEvidence[];
  stalls: PulseTechnicalSessionEvidence[];
  launchFailures: PulseTechnicalSessionEvidence[];
  restartFailures: PulseTechnicalSessionEvidence[];
};

type PulseSecurityScan = {
  status:
    | "NO KNOWN THREATS DETECTED"
    | "THREAT DETECTED"
    | "SECURITY SCAN FAILED";
  blocked: boolean;
  scanner: string;
  scannerVersion: string | null;
  signatureVersion: string | null;
  detectionName: string | null;
  buildSha256: string;
  scanDurationMs: number | null;
};

type PulseReport = {
  runId: string;
  submissionId: string;
  status: string;
  result: string | null;
  workerVersion: string;
  pulseVersion: string;
  profile: string;
  totalChecks: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  build: {
    sourceUrl: string;
    finalUrl: string;
    bytes: number;
    packageValid: boolean;
    entryPointFound: boolean;
    loaded: boolean;
    successfulLoads: number;
    loadSuccessRate: number;
    medianLoadMs: number;
    allLoadsSuccessful: boolean;
  };
  launchPassed: number;
  launchTotal: number;
  launchFailures: number;
  restartPassed: number;
  restartTotal: number;
  restartFailures: number;
  immediateCrashChecked: number;
  immediateCrashes: number;
  immediateCrashObservationMs: number;
  interactionConfirmed: number;
  interactionFailed: number;
  interactionInconclusive: number;
  interactionTotal: number;
  sessionsWithErrors: number;
  sessionsWithFailedRequests: number;
  sessionsWithStalls: number;
  workerSessionErrors: number;
  familySummaries: Record<string, unknown>;
  issueCount: number;
  issueDetails: PulseIssueDetail[];
  issueReasons: string[];
  securityScan?: PulseSecurityScan;
  detailedEvidence?: PulseDetailedEvidence;
  summary: string | null;
  limitations: string | null;
  errorMessage: string | null;
};

function normalizeComparisonValue(value: string): string {

  return value

    .trim()

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, " ")

    .replace(/\s+/g, " ")

    .trim();

}



function createDuplicateKey(title: string, developerName: string): string {

  return `${normalizeComparisonValue(title)}::${normalizeComparisonValue(

    developerName

  )}`;

}




function pulseObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pulseString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pulseNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pulseCompactValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function pulseSessionLabel(session: PulseTechnicalSessionEvidence): string {
  const family =
    session.family && session.family !== "unknown"
      ? session.family.charAt(0).toUpperCase() + session.family.slice(1)
      : "Session";
  return session.sessionNumber !== null
    ? `${family} #${session.sessionNumber}`
    : family;
}

function pulseCollectErrorMessages(session: PulseTechnicalSessionEvidence): string[] {
  const values = [
    ...session.consoleErrors,
    ...session.pageErrors,
    ...session.failedRequests,
    ...(session.fatalError ? [session.fatalError] : []),
  ];

  return Array.from(
    new Set(
      values
        .map((value) => {
          if (typeof value === "string") return value.trim();
          const object = pulseObject(value);
          return (
            pulseString(object.message) ||
            pulseString(object.text) ||
            pulseString(object.error) ||
            pulseString(object.reason) ||
            pulseString(object.url) ||
            pulseCompactValue(value)
          );
        })
        .filter(Boolean)
    )
  );
}

function pulseFindNumber(
  sources: Record<string, unknown>[],
  keys: string[]
): number | null {
  for (const source of sources) {
    for (const key of keys) {
      const value = pulseNumber(source[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function pulseFindBoolean(
  sources: Record<string, unknown>[],
  keys: string[]
): boolean | null {
  for (const source of sources) {
    for (const key of keys) {
      if (typeof source[key] === "boolean") return source[key] as boolean;
    }
  }
  return null;
}

function pulseDescribeRuntimeEvidence(
  sessions: PulseTechnicalSessionEvidence[]
): string {
  if (sessions.length === 0) {
    return "Runtime/browser errors were detected, but no session-level error text was returned.";
  }

  return sessions
    .slice(0, 3)
    .map((session) => {
      const messages = pulseCollectErrorMessages(session);
      return `${pulseSessionLabel(session)} — ${
        messages.length > 0
          ? messages.slice(0, 2).join(" · ")
          : "Runtime/browser error evidence recorded for this session."
      }`;
    })
    .join("\n");
}

function pulseDescribeStallEvidence(
  sessions: PulseTechnicalSessionEvidence[]
): string {
  if (sessions.length === 0) {
    return "A stall was detected, but no session-level stall evidence was returned.";
  }

  return sessions
    .slice(0, 3)
    .map((session) => {
      const observations = pulseObject(session.genericObservations);
      const evidence = pulseObject(session.evidence);
      const sources = [observations, evidence];

      const maxGap = pulseFindNumber(sources, [
        "maxHeartbeatGapMs",
        "max_heartbeat_gap_ms",
        "maxHeartbeatGap",
      ]);
      const noProgress = pulseFindNumber(sources, [
        "longestNoProgressMs",
        "longest_no_progress_ms",
      ]);
      const recovered = pulseFindBoolean(sources, [
        "stallRecovered",
        "recovered",
        "stall_recovered",
      ]);

      const measurements = [
        maxGap !== null ? `max heartbeat gap ${Math.round(maxGap)} ms` : "",
        noProgress !== null ? `longest no-progress ${Math.round(noProgress)} ms` : "",
        recovered !== null ? `recovered: ${recovered ? "yes" : "no"}` : "",
      ].filter(Boolean);

      return `${pulseSessionLabel(session)} — ${
        measurements.length > 0
          ? measurements.join(" · ")
          : "A stall signal was detected in this session."
      }`;
    })
    .join("\n");
}

function pulseDescribeFailureEvidence(
  sessions: PulseTechnicalSessionEvidence[],
  kind: "launch" | "restart"
): string {
  if (sessions.length === 0) {
    return kind === "launch"
      ? "Launch failures were detected, but no session-level launch evidence was returned."
      : "Restart failures were detected, but no session-level restart evidence was returned.";
  }

  return sessions
    .slice(0, 4)
    .map((session) => {
      const messages = pulseCollectErrorMessages(session);
      return `${pulseSessionLabel(session)} — ${
        messages[0] ||
        (kind === "launch"
          ? "The dedicated launch check did not reach a successful start."
          : "The restart attempt did not return to a successful running state.")
      }`;
    })
    .join("\n");
}

export default function SubmitGamePage() {

  const [accessStatus, setAccessStatus] =

    useState<AccessStatus>("checking");



  const [submitted, setSubmitted] = useState(false);

  const [submittedTitle, setSubmittedTitle] = useState("");



  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const [claimedTitle, setClaimedTitle] = useState("");



  const [error, setError] = useState("");



  const [imageUrl, setImageUrl] = useState("");

  const [imageStatus, setImageStatus] =

    useState<ImageStatus>("empty");



  const [submitting, setSubmitting] = useState(false);

  const [submittingClaim, setSubmittingClaim] = useState(false);



  const [possibleDuplicate, setPossibleDuplicate] =

    useState<PossibleDuplicate | null>(null);



  const [confirmedDuplicateKey, setConfirmedDuplicateKey] =

    useState<string | null>(null);



  const [showClaimForm, setShowClaimForm] = useState(false);



  const [claimRelationship, setClaimRelationship] =

    useState<ClaimRelationship | "">("");



  const [claimReason, setClaimReason] = useState("");

  const [claimEvidenceUrl, setClaimEvidenceUrl] = useState("");



  const [releaseStatus, setReleaseStatus] =

    useState<ReleaseStatus | "">("");

  const [pulseOpen, setPulseOpen] = useState(false);
  const [pulseStage, setPulseStage] = useState<PulseStage>("idle");
  const [pulseReport, setPulseReport] = useState<PulseReport | null>(null);
  const [pulseError, setPulseError] = useState("");
  const [showPulseDetails, setShowPulseDetails] = useState(false);
  const [pulseDetailsPage, setPulseDetailsPage] = useState(0);
  const [pulseProgress, setPulseProgress] = useState(0);



  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const duplicateWarningRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {

    let active = true;



    async function checkAccess() {

      const supabase = createClient();



      const {

        data: { user },

        error: authError,

      } = await supabase.auth.getUser();



      if (!active) return;



      if (authError || !user) {

        window.location.href = "/login?next=/submit";

        return;

      }



      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("roles")

        .eq("id", user.id)

        .single();



      if (!active) return;



      if (profileError || !profile?.roles?.includes("developer")) {

        setAccessStatus("denied");

        return;

      }



      setAccessStatus("allowed");

    }



    checkAccess();



    return () => {

      active = false;

    };

  }, []);



  useEffect(() => {

    const target = error

      ? errorRef.current

      : possibleDuplicate

        ? duplicateWarningRef.current

        : null;



    if (!target) return;



    const timer = window.setTimeout(() => {

      target.scrollIntoView({

        behavior: "smooth",

        block: "center",

      });

    }, 50);



    return () => {

      window.clearTimeout(timer);

    };

  }, [error, possibleDuplicate, showClaimForm]);



  useEffect(() => {
    if (!pulseOpen || pulseStage === "idle") {
      setPulseProgress(0);
      return;
    }

    if (pulseStage === "complete") {
      setPulseProgress(100);
      return;
    }

    if (pulseStage === "error") {
      return;
    }

    setPulseProgress((current) => Math.max(current, pulseStage === "connecting" ? 8 : 22));

    const timer = window.setInterval(() => {
      setPulseProgress((current) => {
        if (pulseStage === "connecting") {
          const ceiling = 20;
          if (current >= ceiling) return current;
          const remaining = ceiling - current;
          return Math.min(
            ceiling,
            current + Math.max(1, Math.ceil(remaining * 0.12))
          );
        }

        // The worker is real asynchronous work, so never imply that 92% is a
        // known final step. Keep the display moving slowly up to 99% while the
        // run is active, then set it to 100% only when the API returns.
        if (current >= 99) return 99;
        if (current < 90) return Math.min(90, current + 2);
        return Math.min(99, current + 1);
      });
    }, pulseStage === "running" ? 900 : 220);

    return () => window.clearInterval(timer);
  }, [pulseOpen, pulseStage]);

  function resetDuplicateState() {

    setPossibleDuplicate(null);

    setConfirmedDuplicateKey(null);

    setShowClaimForm(false);

    setClaimRelationship("");

    setClaimReason("");

    setClaimEvidenceUrl("");

  }



  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {

    const url = event.target.value.trim();



    setImageUrl(url);

    setError("");

    setImageStatus(url ? "loading" : "empty");

  }



  function openDatePicker(event: MouseEvent<HTMLInputElement>) {

    const input = event.currentTarget;



    if (typeof input.showPicker === "function") {

      try {

        input.showPicker();

      } catch {

        // The browser may block showPicker in some circumstances.

        // The native date input remains usable normally.

      }

    }

  }



  function isValidSteamUrl(value: string): boolean {

    if (!value) return true;



    try {

      const url = new URL(value);



      return (

        url.protocol === "https:" &&

        (url.hostname === "store.steampowered.com" ||

          url.hostname === "www.store.steampowered.com")

      );

    } catch {

      return false;

    }

  }



  function extractSteamAppId(value: string): string | null {

    if (!value) return null;



    try {

      const url = new URL(value);



      if (

        url.protocol !== "https:" ||

        (url.hostname !== "store.steampowered.com" &&

          url.hostname !== "www.store.steampowered.com")

      ) {

        return null;

      }



      const match = url.pathname.match(/^\/app\/(\d+)(?:\/|$)/i);



      return match ? match[1] : null;

    } catch {

      return null;

    }

  }



  function handleDifferentGame() {

    if (!possibleDuplicate || possibleDuplicate.exactSteamMatch) {

      return;

    }



    const titleInput = document.querySelector<HTMLInputElement>(

      'input[name="title"]'

    );



    const developerInput = document.querySelector<HTMLInputElement>(

      'input[name="developer"]'

    );



    const title = titleInput?.value ?? "";

    const developerName = developerInput?.value ?? "";



    setConfirmedDuplicateKey(

      createDuplicateKey(title, developerName)

    );



    setPossibleDuplicate(null);

    setShowClaimForm(false);

    setClaimRelationship("");

    setClaimReason("");

    setClaimEvidenceUrl("");

    setError("");

  }



  async function handleClaimSubmit() {

    if (!possibleDuplicate || submittingClaim) return;



    setError("");



    if (!claimRelationship) {

      setError("Select your relationship to this game.");

      return;

    }



    if (!claimReason.trim()) {

      setError("Explain why you are claiming this game.");

      return;

    }



    if (claimReason.trim().length < 20) {

      setError(

        "Please provide a little more detail about your relationship to the game."

      );

      return;

    }



    if (claimEvidenceUrl.trim()) {

      try {

        const evidenceUrl = new URL(claimEvidenceUrl.trim());



        if (

          evidenceUrl.protocol !== "https:" &&

          evidenceUrl.protocol !== "http:"

        ) {

          setError("Enter a valid evidence URL.");

          return;

        }

      } catch {

        setError("Enter a valid evidence URL.");

        return;

      }

    }



    setSubmittingClaim(true);



    try {

      const supabase = createClient();



      const {

        data: { user },

        error: authError,

      } = await supabase.auth.getUser();



      if (authError || !user) {

        window.location.href = "/login?next=/submit";

        return;

      }



      const claimRecord = {

        claimant_id: user.id,

        imported_game_id:

          possibleDuplicate.source === "imported"

            ? possibleDuplicate.recordId

            : null,

        approved_game_id:

          possibleDuplicate.source === "approved"

            ? possibleDuplicate.recordId

            : null,

        submission_id:

          possibleDuplicate.source === "submission"

            ? possibleDuplicate.recordId

            : null,

        relationship: claimRelationship,

        claim_reason: claimReason.trim(),

        evidence_url: claimEvidenceUrl.trim() || null,

        status: "Pending",

      };



      const { error: claimError } = await supabase

        .from("game_claims")

        .insert(claimRecord);



      if (claimError) {

        console.error("Game claim failed:", {

          code: claimError.code,

          message: claimError.message,

          details: claimError.details,

          hint: claimError.hint,

        });



        if (claimError.code === "23505") {

          setError(

            "You already have an active claim for this game. You do not need to submit another one."

          );

        } else if (claimError.code === "42501") {

          setError(

            "Permission denied while creating the claim. Make sure you are signed in with the Game Developer role."

          );

        } else {

          setError(

            `Could not save your claim: ${

              claimError.message || "Please try again."

            }`

          );

        }



        return;

      }



      setClaimedTitle(possibleDuplicate.title);

      setClaimSubmitted(true);

      setPossibleDuplicate(null);

      setShowClaimForm(false);

      setClaimRelationship("");

      setClaimReason("");

      setClaimEvidenceUrl("");

    } catch (err) {

      console.error("Unexpected claim error:", err);

      setError("An unexpected error occurred. Please try again.");

    } finally {

      setSubmittingClaim(false);

    }

  }



  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();



    if (submitting) return;



    setError("");



    if (accessStatus !== "allowed") {

      setError("You need the Game Developer role to submit a game.");

      return;

    }



    const form = event.currentTarget;

    const formData = new FormData(form);



    const title = String(formData.get("title") ?? "").trim();



    const developerName = String(

      formData.get("developer") ?? ""

    ).trim();



    const submittedImageUrl = String(

      formData.get("imageUrl") ?? ""

    ).trim();



    const steamUrl = String(

      formData.get("steamUrl") ?? ""

    ).trim();



    const submittedReleaseStatus = String(

      formData.get("releaseStatus") ?? ""

    ) as ReleaseStatus;



    const submittedReleaseDate = String(

      formData.get("releaseDate") ?? ""

    ).trim();



    if (

      !["Released", "Upcoming", "Not announced"].includes(

        submittedReleaseStatus

      )

    ) {

      setError("Select the game's release status.");

      return;

    }



    if (

      submittedReleaseStatus === "Released" &&

      !submittedReleaseDate

    ) {

      setError("Enter the game's release date.");

      return;

    }



    if (

      submittedReleaseStatus === "Upcoming" &&

      submittedReleaseDate

    ) {

      const releaseDate = new Date(

        `${submittedReleaseDate}T00:00:00`

      );



      const today = new Date();

      today.setHours(0, 0, 0, 0);



      if (releaseDate < today) {

        setError(

          "An upcoming game's planned release date cannot be in the past."

        );

        return;

      }

    }



    if (

      submittedReleaseStatus === "Released" &&

      submittedReleaseDate

    ) {

      const releaseDate = new Date(

        `${submittedReleaseDate}T00:00:00`

      );



      const today = new Date();

      today.setHours(23, 59, 59, 999);



      if (releaseDate > today) {

        setError(

          "A released game's release date cannot be in the future. Choose Upcoming instead."

        );

        return;

      }

    }



    if (steamUrl && !isValidSteamUrl(steamUrl)) {

      setError(

        "Enter a valid Steam store URL beginning with https://store.steampowered.com/."

      );

      return;

    }



    if (submittedImageUrl && imageStatus !== "loaded") {

      setError(

        imageStatus === "error"

          ? "Your thumbnail could not be loaded. Check the URL or use another image."

          : "Please wait for your thumbnail preview to load."

      );

      return;

    }



    const steamAppId = extractSteamAppId(steamUrl);



    if (steamUrl && !steamAppId) {

      setError(

        "We couldn't identify the Steam App ID from that URL. Please use the game's main Steam store page."

      );

      return;

    }



    const currentDuplicateKey = createDuplicateKey(

      title,

      developerName

    );



    setSubmitting(true);



    try {

      const supabase = createClient();



      const {

        data: { user },

        error: authError,

      } = await supabase.auth.getUser();



      if (authError || !user) {

        window.location.href = "/login?next=/submit";

        return;

      }



      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("roles")

        .eq("id", user.id)

        .single();



      if (profileError || !profile?.roles?.includes("developer")) {

        setAccessStatus("denied");

        setError("You need the Game Developer role to submit a game.");

        return;

      }



      if (steamAppId) {

        resetDuplicateState();



        const {

          data: approvedGame,

          error: approvedLookupError,

        } = await supabase

          .from("approved_games")

          .select("id, title, developer_name")

          .eq("steam_app_id", steamAppId)

          .maybeSingle();



        if (approvedLookupError) {

          setError(

            `Unable to check whether this game is already on Playtested: ${approvedLookupError.message}`

          );

          return;

        }



        if (approvedGame) {

          const match = approvedGame as ApprovedGameMatch;



          setPossibleDuplicate({

            source: "approved",

            recordId: match.id,

            title: match.title ?? title,

            developerName:

              match.developer_name ?? developerName,

            status: "Approved",

            exactSteamMatch: true,

          });



          return;

        }



        const {

          data: existingSubmissions,

          error: submissionLookupError,

        } = await supabase

          .from("game_submissions")

          .select(

            "id, developer_id, title, developer_name, status"

          )

          .eq("steam_app_id", steamAppId)

          .order("submitted_at", { ascending: false });



        if (submissionLookupError) {

          setError(

            `Unable to check existing submissions: ${submissionLookupError.message}`

          );

          return;

        }



        const submissions =

          (existingSubmissions ?? []) as ExistingSubmission[];



        const activeSubmission = submissions.find(

          (submission) =>

            submission.status !== "Rejected" &&

            submission.status !== "Needs More Information"

        );



        if (activeSubmission) {

          if (activeSubmission.developer_id === user.id) {

            setError(

              `You have already submitted ${activeSubmission.title}. Its current status is ${activeSubmission.status}. You do not need to submit it again.`

            );

          } else {

            setPossibleDuplicate({

              source: "submission",

              recordId: activeSubmission.id,

              title: activeSubmission.title,

              developerName:

                activeSubmission.developer_name ??

                developerName,

              status: activeSubmission.status,

              exactSteamMatch: true,

            });

          }



          return;

        }



        const {

          data: importedGame,

          error: importedLookupError,

        } = await supabase

          .from("imported_games")

          .select(

            "id, steam_app_id, title, developer_name"

          )

          .eq("steam_app_id", steamAppId)

          .maybeSingle();



        if (importedLookupError) {

          setError(

            `Unable to check the Playtested catalogue: ${importedLookupError.message}`

          );

          return;

        }



        if (importedGame) {

          const match = importedGame as ImportedGameMatch;



          setPossibleDuplicate({

            source: "imported",

            recordId: match.id,

            title: match.title,

            developerName:

              match.developer_name ?? developerName,

            exactSteamMatch: true,

          });



          return;

        }

      } else if (confirmedDuplicateKey !== currentDuplicateKey) {

        const {

          data: duplicateRows,

          error: duplicateLookupError,

        } = await supabase.rpc(

          "find_possible_game_duplicates",

          {

            p_title: title,

            p_developer_name: developerName,

          }

        );



        if (duplicateLookupError) {

          setError(

            `Unable to check existing Playtested games: ${duplicateLookupError.message}`

          );

          return;

        }



        const duplicates =

          (duplicateRows ?? []) as DuplicateRpcRow[];



        const duplicate = duplicates[0];



        if (duplicate) {

          if (duplicate.source === "submission") {

            const {

              data: matchedSubmission,

              error: matchedSubmissionError,

            } = await supabase

              .from("game_submissions")

              .select(

                "id, developer_id, title, developer_name, status"

              )

              .eq("id", duplicate.record_id)

              .maybeSingle();



            if (matchedSubmissionError) {

              setError(

                `Unable to check the existing submission: ${matchedSubmissionError.message}`

              );

              return;

            }



            if (

              matchedSubmission &&

              matchedSubmission.developer_id === user.id

            ) {

              setError(

                `You have already submitted ${matchedSubmission.title}. Its current status is ${matchedSubmission.status}. You do not need to submit it again.`

              );

              return;

            }

          }



          setPossibleDuplicate({

            source: duplicate.source,

            recordId: duplicate.record_id,

            title: duplicate.title,

            developerName: duplicate.developer_name,

            status: duplicate.status ?? undefined,

            exactSteamMatch: false,

          });



          setShowClaimForm(false);

          return;

        }



        setPossibleDuplicate(null);

        setConfirmedDuplicateKey(null);

      }



      const { data: insertedSubmission, error: insertError } = await supabase

        .from("game_submissions")

        .insert({

          developer_id: user.id,

          title,

          developer_name: developerName,

          genre: String(formData.get("genre") ?? ""),

          description: String(

            formData.get("description") ?? ""

          ).trim(),

          game_link: String(

            formData.get("gameLink") ?? ""

          ).trim(),

          steam_url: steamUrl || null,

          steam_app_id: steamAppId,

          image_url: submittedImageUrl || null,

          release_status: submittedReleaseStatus,

          release_date:

            submittedReleaseStatus === "Not announced" ||

            !submittedReleaseDate

              ? null

              : submittedReleaseDate,

          ai_type: String(formData.get("aiType") ?? ""),

          ai_areas: formData.getAll("aiAreas").map(String),

          ai_explanation: String(

            formData.get("aiExplanation") ?? ""

          ).trim(),

          evidence_link: String(

            formData.get("evidenceLink") ?? ""

          ).trim(),

          status: "Pending Review",

        })

        .select("id")

        .single();



      if (insertError || !insertedSubmission) {

        console.error("Game submission failed:", {

          code: insertError?.code,

          message: insertError?.message,

          details: insertError?.details,

          hint: insertError?.hint,

        });



        if (insertError?.code === "42501") {

          setError(

            "Permission denied. Make sure Game Developer is selected in your account and saved."

          );

        } else {

          setError(

            `Could not save your submission: ${

              insertError?.message || "Please try again."

            }`

          );

        }



        return;

      }



      const submittedGameLink = String(
        formData.get("gameLink") ?? ""
      ).trim();
      const hasPulseBuildLink = /^https:\/\//i.test(submittedGameLink);

      setSubmittedTitle(title);
      setSubmitted(true);
      resetDuplicateState();
      setImageUrl("");
      setImageStatus("empty");
      setReleaseStatus("");
      form.reset();

      setPulseReport(null);
      setPulseError("");
      setShowPulseDetails(false);
      setPulseDetailsPage(0);
      setPulseProgress(5);

      // PULSE is optional. Only start a technical run when the developer
      // supplied an HTTPS game/build link. A submission without a build link
      // is still valid and should complete normally without a PULSE error.
      if (!hasPulseBuildLink) {
        setPulseStage("idle");
        setPulseOpen(false);
        return;
      }

      setPulseStage("connecting");
      setPulseOpen(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error(
            "Your application was saved, but PULSE could not authenticate this diagnostic run."
          );
        }

        setPulseStage("running");

        const pulseResponse = await fetch("/api/pulse/preflight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            submissionId: insertedSubmission.id,
          }),
        });

        const pulsePayload = (await pulseResponse.json().catch(() => null)) as
          | {
              success?: boolean;
              pulse?: PulseReport;
              error?: string;
            }
          | null;

        if (!pulseResponse.ok || !pulsePayload?.success || !pulsePayload.pulse) {
          throw new Error(
            pulsePayload?.error ||
              "Your submission was saved, but PULSE Worker could not complete this technical run."
          );
        }

        setPulseReport(pulsePayload.pulse);
        setPulseProgress(100);
        setPulseStage("complete");
      } catch (pulseRunError) {
        console.error("PULSE Worker run failed:", pulseRunError);
        setPulseError(
          pulseRunError instanceof Error
            ? pulseRunError.message
            : "Your submission was saved, but PULSE Worker could not complete this technical run."
        );
        setPulseStage("error");
      }

    } catch (err) {

      console.error("Unexpected submission error:", err);

      setError("An unexpected error occurred. Please try again.");

    } finally {

      setSubmitting(false);

    }

  }



  const inputClass =

    "mt-2 w-full rounded-lg border border-white/10 bg-[#101311] px-4 py-3 outline-none focus:border-[#77f29b]";



  const labelClass = "block text-sm text-zinc-300";



  return (

    <main className="min-h-screen bg-[#090b0a] text-zinc-100">

      <SiteHeader />

      {pulseOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 flex items-start justify-center overflow-hidden bg-[#050706] p-2 sm:p-3"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483647,
              backgroundColor: "#050706",
              isolation: "isolate",
            }}
          >
            <div className="flex h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#77f29b]/25 bg-[#090d0a] shadow-2xl shadow-black/80 sm:h-[calc(100dvh-1.5rem)]">
              <div className="sticky top-0 z-20 rounded-t-2xl border-b border-white/10 bg-[#0c1510] px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-semibold tracking-[0.24em] text-[#77f29b]">
                      PULSE // TECHNICAL DIAGNOSTICS
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      {pulseStage === "complete"
                        ? "PULSE run complete"
                        : pulseStage === "error"
                          ? "PULSE run interrupted"
                          : "PULSE is testing your build"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">{submittedTitle}</p>
                  </div>

                  {(pulseStage === "complete" || pulseStage === "error") && (
                    <button
                      type="button"
                      onClick={() => setPulseOpen(false)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:border-white/25 hover:text-white"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain p-3 sm:p-4">
                {pulseStage === "connecting" && (
                  <div className="space-y-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-[#77f29b]" />
                        <p className="font-mono text-sm text-[#77f29b]">
                          CONNECTING TO PULSE...
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-white">
                        {pulseProgress}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <div
                        className="h-full bg-[#77f29b] transition-[width] duration-300 ease-out"
                        style={{ width: `${pulseProgress}%` }}
                      />
                    </div>

                    <p className="text-sm leading-6 text-zinc-500">
                      Your submission is saved. A fresh PULSE worker run is being
                      prepared for this build.
                    </p>
                  </div>
                )}

                {pulseStage === "running" && (
                  <div className="space-y-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-[#77f29b]" />
                        <p className="font-mono text-sm text-[#77f29b]">
                          PULSE ACTIVE // TECHNICAL WORKER
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-white">
                        {pulseProgress}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <div
                        className="h-full bg-[#77f29b] transition-[width] duration-300 ease-out"
                        style={{ width: `${pulseProgress}%` }}
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ["01", "Acquire build", "Downloading the submitted ZIP"],
                        ["02", "Launch reliability", "50 fresh launch sessions"],
                        ["03", "Restart reliability", "50 fresh restart sessions"],
                        ["04", "Interaction evidence", "10 interaction sessions"],
                        ["05", "Runtime stability", "Errors, requests and stalls"],
                        ["06", "Evidence report", "Saving this unique run"],
                      ].map(([number, title, description], index) => {
                        const threshold = 18 + index * 13;
                        const active =
                          pulseProgress >= threshold &&
                          pulseProgress < threshold + 13;
                        const complete = pulseProgress >= threshold + 13;

                        return (
                          <div
                            key={number}
                            className={`rounded-lg border px-3 py-3 ${
                              active
                                ? "border-[#77f29b]/30 bg-[#77f29b]/5"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-[10px] ${
                                  complete || active
                                    ? "text-[#77f29b]"
                                    : "text-zinc-700"
                                }`}
                              >
                                {complete ? "✓" : number}
                              </span>
                              <p className="text-xs font-semibold text-zinc-200">
                                {title}
                              </p>
                            </div>
                            <p className="mt-1 pl-5 text-[10px] leading-4 text-zinc-600">
                              {description}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                        LIVE TEST
                      </p>
                      <p className="mt-2 text-xs leading-5 text-zinc-400">
                        This is a new technical-worker execution. PULSE is not reusing
                        the previous result; the completed report below will show
                        this run's own ID and measurements.
                      </p>
                    </div>
                  </div>
                )}

                {pulseStage === "complete" && pulseReport && (() => {
                  const durationSeconds =
                    pulseReport.durationMs !== null
                      ? (pulseReport.durationMs / 1000).toFixed(1)
                      : null;

                  const issueDetails =
                    pulseReport.issueDetails?.length > 0
                      ? pulseReport.issueDetails
                      : pulseReport.issueReasons.map((reason, index) => ({
                          type: `reported_issue_${index + 1}`,
                          severity: "warning" as const,
                          title: `Technical issue ${index + 1}`,
                          detail: reason,
                        }));

                  const hasIssues =
                    issueDetails.length > 0 ||
                    pulseReport.launchFailures > 0 ||
                    pulseReport.restartFailures > 0 ||
                    pulseReport.sessionsWithErrors > 0 ||
                    pulseReport.sessionsWithFailedRequests > 0 ||
                    pulseReport.sessionsWithStalls > 0 ||
                    pulseReport.workerSessionErrors > 0;

                  const detailedEvidence = pulseReport.detailedEvidence ?? {
                    runtimeErrors: [],
                    stalls: [],
                    launchFailures: [],
                    restartFailures: [],
                  };

                  const detailCards = [
                    {
                      label: "Malware scan",
                      value:
                        pulseReport.securityScan?.status ===
                        "NO KNOWN THREATS DETECTED"
                          ? "No known threats"
                          : pulseReport.securityScan?.status === "THREAT DETECTED"
                            ? "Threat detected"
                            : pulseReport.securityScan?.status ===
                                "SECURITY SCAN FAILED"
                              ? "Scan failed"
                              : "Not reported",
                      detail: pulseReport.securityScan
                        ? `${
                            pulseReport.securityScan.status ===
                            "NO KNOWN THREATS DETECTED"
                              ? "No known malware signatures were detected. The build was scanned before execution."
                              : pulseReport.securityScan.status ===
                                  "THREAT DETECTED"
                                ? `PULSE blocked this build before execution${
                                    pulseReport.securityScan.detectionName
                                      ? `: ${pulseReport.securityScan.detectionName}`
                                      : "."
                                  }`
                                : "The security scan could not complete, so the build was not executed."
                          }\n${pulseReport.securityScan.scanner}${
                            pulseReport.securityScan.scannerVersion
                              ? ` ${pulseReport.securityScan.scannerVersion}`
                              : ""
                          } · SHA-256 ${pulseReport.securityScan.buildSha256.slice(
                            0,
                            8
                          )}…${pulseReport.securityScan.buildSha256.slice(-8)}${
                            pulseReport.securityScan.scanDurationMs !== null
                              ? ` · ${(pulseReport.securityScan.scanDurationMs / 1000).toFixed(1)}s`
                              : ""
                          }`
                        : "No malware-scan result was returned for this run.",
                      warning:
                        !!pulseReport.securityScan &&
                        pulseReport.securityScan.status !==
                          "NO KNOWN THREATS DETECTED",
                    },
                    {
                      label: "ZIP package",
                      value: pulseReport.build.packageValid ? "Valid" : "Issue",
                      detail: pulseReport.build.packageValid
                        ? "The submitted file downloaded as a valid ZIP package."
                        : "PULSE could not validate the submitted ZIP package.",
                      warning: !pulseReport.build.packageValid,
                    },
                    {
                      label: "Entry point",
                      value: pulseReport.build.entryPointFound ? "Found" : "Not found",
                      detail: pulseReport.build.entryPointFound
                        ? "The required index.html entry point was found and accepted."
                        : "The required index.html entry point was not confirmed.",
                      warning: !pulseReport.build.entryPointFound,
                    },
                    {
                      label: "Build load",
                      value: pulseReport.build.loaded ? "Loaded" : "Load issue",
                      detail: `${pulseReport.build.successfulLoads}/${pulseReport.totalChecks} sessions loaded. Median load ${Math.round(
                        pulseReport.build.medianLoadMs
                      )} ms.`,
                      warning: !pulseReport.build.loaded,
                    },
                    {
                      label: "Immediate crashes",
                      value:
                        pulseReport.immediateCrashChecked > 0
                          ? `${pulseReport.immediateCrashes}`
                          : "Not checked",
                      detail:
                        pulseReport.immediateCrashChecked > 0
                          ? pulseReport.immediateCrashes > 0
                            ? `${pulseReport.immediateCrashes} immediate crash(es) were detected across ${pulseReport.immediateCrashChecked} successful launch checks during the first ${(pulseReport.immediateCrashObservationMs / 1000).toFixed(1)}s after launch.`
                            : `No immediate crashes were detected across ${pulseReport.immediateCrashChecked} successful launch checks during the first ${(pulseReport.immediateCrashObservationMs / 1000).toFixed(1)}s after launch.`
                          : "No successful launch sessions were available for the dedicated immediate-crash check.",
                      warning: pulseReport.immediateCrashes > 0,
                    },
                    {
                      label: "Launch reliability",
                      value: `${pulseReport.launchPassed}/${pulseReport.launchTotal}`,
                      detail:
                        pulseReport.launchFailures > 0
                          ? pulseDescribeFailureEvidence(
                              detailedEvidence.launchFailures,
                              "launch"
                            )
                          : "All dedicated launch checks completed successfully.",
                      warning: pulseReport.launchFailures > 0,
                    },
                    {
                      label: "Restart reliability",
                      value:
                        pulseReport.restartTotal > 0
                          ? `${pulseReport.restartPassed}/${pulseReport.restartTotal}`
                          : "Not tested",
                      detail:
                        pulseReport.restartTotal === 0
                          ? "No successful launch sessions were available for restart testing."
                          : pulseReport.restartFailures > 0
                            ? pulseDescribeFailureEvidence(
                                detailedEvidence.restartFailures,
                                "restart"
                              )
                            : "All attempted restart checks completed successfully.",
                      warning:
                        pulseReport.restartTotal > 0 &&
                        pulseReport.restartFailures > 0,
                    },
                    {
                      label: "Runtime/browser errors",
                      value: `${pulseReport.sessionsWithErrors}`,
                      detail:
                        pulseReport.sessionsWithErrors > 0
                          ? pulseDescribeRuntimeEvidence(detailedEvidence.runtimeErrors)
                          : "No runtime/browser errors were detected.",
                      warning: pulseReport.sessionsWithErrors > 0,
                    },
                    {
                      label: "Stalls / hangs",
                      value: `${pulseReport.sessionsWithStalls}`,
                      detail:
                        pulseReport.sessionsWithStalls > 0
                          ? pulseDescribeStallEvidence(detailedEvidence.stalls)
                          : "No runtime stalls or hangs were detected.",
                      warning: pulseReport.sessionsWithStalls > 0,
                    },
                    {
                      label: "Failed requests",
                      value: `${pulseReport.sessionsWithFailedRequests}`,
                      detail: `${pulseReport.sessionsWithFailedRequests} session(s) contained failed resource requests.`,
                      warning: pulseReport.sessionsWithFailedRequests > 0,
                    },
                    {
                      label: "Interaction evidence",
                      value: `${pulseReport.interactionConfirmed} confirmed`,
                      detail: `${pulseReport.interactionFailed} failed · ${pulseReport.interactionInconclusive} inconclusive · ${pulseReport.interactionTotal} total.`,
                      warning: pulseReport.interactionFailed > 0,
                    },
                    {
                      label: "Worker/session errors",
                      value: `${pulseReport.workerSessionErrors}`,
                      detail:
                        pulseReport.workerSessionErrors > 0
                          ? "PULSE encountered worker/session-level errors."
                          : "The PULSE worker completed without infrastructure/session errors.",
                      warning: pulseReport.workerSessionErrors > 0,
                    },
                    {
                      label: "Run information",
                      value: `${pulseReport.totalChecks} checks`,
                      detail: `${pulseReport.profile} profile · ${
                        durationSeconds ? `${durationSeconds}s` : "completed"
                      } · Worker ${pulseReport.workerVersion}.`,
                      warning: false,
                    },
                  ];

                  const cardsPerPage = 4;
                  const totalDetailPages = Math.ceil(detailCards.length / cardsPerPage);
                  const safeDetailsPage = Math.min(
                    pulseDetailsPage,
                    totalDetailPages - 1
                  );
                  const visibleDetailCards = detailCards.slice(
                    safeDetailsPage * cardsPerPage,
                    safeDetailsPage * cardsPerPage + cardsPerPage
                  );

                  if (showPulseDetails) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-3">
                          <div>
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#77f29b]">
                              PULSE // MORE DETAILS
                            </p>
                            <h3 className="mt-1 text-lg font-bold text-white">
                              Technical results
                            </h3>
                          </div>
                          <p className="font-mono text-[10px] text-zinc-500">
                            PAGE {safeDetailsPage + 1} / {totalDetailPages}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {visibleDetailCards.map((card) => (
                            <div
                              key={card.label}
                              className={`rounded-xl border p-4 ${
                                card.warning
                                  ? "border-amber-300/25 bg-amber-300/[0.035]"
                                  : "border-white/10 bg-black/20"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                  {card.label}
                                </p>
                                <span
                                  className={`font-mono text-xs ${
                                    card.warning ? "text-amber-200" : "text-[#77f29b]"
                                  }`}
                                >
                                  {card.warning ? "!" : "✓"}
                                </span>
                              </div>
                              <p className="mt-2 text-xl font-bold text-white">
                                {card.value}
                              </p>
                              <p className="mt-2 whitespace-pre-line break-words text-xs leading-5 text-zinc-400">
                                {card.detail}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPulseDetails(false);
                              setPulseDetailsPage(0);
                            }}
                            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-white/30 hover:text-white"
                          >
                            Back to summary
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={safeDetailsPage === 0}
                              onClick={() =>
                                setPulseDetailsPage((page) => Math.max(0, page - 1))
                              }
                              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              Previous
                            </button>
                            <button
                              type="button"
                              disabled={safeDetailsPage >= totalDetailPages - 1}
                              onClick={() =>
                                setPulseDetailsPage((page) =>
                                  Math.min(totalDetailPages - 1, page + 1)
                                )
                              }
                              className="rounded-lg bg-[#77f29b] px-4 py-2 text-xs font-semibold text-[#090b0a] hover:bg-[#91ffb0] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const summaryCards = [
                    {
                      label: "ZIP package",
                      value: pulseReport.build.packageValid ? "Valid" : "Issue",
                      warning: !pulseReport.build.packageValid,
                    },
                    {
                      label: "Entry point",
                      value: pulseReport.build.entryPointFound ? "Found" : "Not found",
                      warning: !pulseReport.build.entryPointFound,
                    },
                    {
                      label: "Build load",
                      value: pulseReport.build.loaded ? "Loaded" : "Issue",
                      warning: !pulseReport.build.loaded,
                    },
                    {
                      label: "Immediate crash",
                      value:
                        pulseReport.immediateCrashChecked > 0
                          ? `${pulseReport.immediateCrashes}`
                          : "Not checked",
                      warning: pulseReport.immediateCrashes > 0,
                    },
                    {
                      label: "Launch",
                      value: `${pulseReport.launchPassed}/${pulseReport.launchTotal}`,
                      warning: pulseReport.launchFailures > 0,
                    },
                    {
                      label: "Restart",
                      value:
                        pulseReport.restartTotal > 0
                          ? `${pulseReport.restartPassed}/${pulseReport.restartTotal}`
                          : "Not tested",
                      warning:
                        pulseReport.restartTotal > 0 &&
                        pulseReport.restartFailures > 0,
                    },
                    {
                      label: "Runtime errors",
                      value: `${pulseReport.sessionsWithErrors}`,
                      warning: pulseReport.sessionsWithErrors > 0,
                    },
                    {
                      label: "Stalls",
                      value: `${pulseReport.sessionsWithStalls}`,
                      warning: pulseReport.sessionsWithStalls > 0,
                    },
                  ];

                  return (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4 rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-3">
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#77f29b]">
                            PULSE TECHNICAL SNAPSHOT
                          </p>
                          <h3 className="mt-1 text-lg font-bold text-white">
                            {hasIssues
                              ? `${issueDetails.length} issue type${
                                  issueDetails.length === 1 ? "" : "s"
                                } detected`
                              : "No technical issues detected"}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {pulseReport.totalChecks} checks ·{" "}
                            {durationSeconds ? `${durationSeconds}s` : "completed"} ·
                            Worker {pulseReport.workerVersion}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                            UNIQUE RUN
                          </p>
                          <p className="mt-1 font-mono text-xs font-bold text-white">
                            {pulseReport.runId.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {summaryCards.map((item) => (
                          <div
                            key={item.label}
                            className={`rounded-lg border p-3 ${
                              item.warning
                                ? "border-amber-300/20 bg-amber-300/[0.035]"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                                {item.label}
                              </p>
                              <span
                                className={`font-mono text-xs ${
                                  item.warning ? "text-amber-200" : "text-[#77f29b]"
                                }`}
                              >
                                {item.warning ? "!" : "✓"}
                              </span>
                            </div>
                            <p className="mt-1 text-lg font-bold text-white">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {hasIssues && (
                        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
                          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200">
                            REVIEW ADVISED
                          </p>
                          <p className="mt-1 text-xs leading-5 text-zinc-300">
                            {issueDetails
                              .slice(0, 3)
                              .map((issue) => issue.title)
                              .join(" · ")}
                            {issueDetails.length > 3
                              ? ` · +${issueDetails.length - 3} more`
                              : ""}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPulseDetailsPage(0);
                            setShowPulseDetails(true);
                          }}
                          className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-[#77f29b]/40 hover:text-white"
                        >
                          View more details
                        </button>

                        <button
                          type="button"
                          onClick={() => setPulseOpen(false)}
                          className="rounded-lg bg-[#77f29b] px-5 py-2 text-sm font-semibold text-[#090b0a] hover:bg-[#91ffb0]"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  );
                })()}
                {pulseStage === "error" && (
                  <div className="space-y-4 py-4">
                    <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                        PULSE RUN NOTE
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-white">
                        The technical run could not complete
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {pulseError ||
                          "The submission is saved, but PULSE could not complete this technical run."}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPulseOpen(false)}
                        className="rounded-lg bg-[#77f29b] px-5 py-2.5 text-sm font-semibold text-[#090b0a] hover:bg-[#91ffb0]"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}



      <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">

        <div className="mx-auto max-w-4xl px-6 py-16">

          <p className="text-sm font-semibold tracking-widest text-[#77f29b]">

            DEVELOPERS

          </p>



          <h1 className="mt-4 text-4xl font-bold md:text-5xl">

            Submit your game.

          </h1>



          <p className="mt-5 max-w-2xl leading-7 text-zinc-400">

            Introduce your game to players who care about what they play, how

            it was made, and whether it is worth their time.

          </p>

        </div>

      </section>



      <section className="mx-auto max-w-4xl px-6 py-12">

        {accessStatus === "checking" ? (

          <p className="text-zinc-400">

            Checking account permissions...

          </p>

        ) : accessStatus === "denied" ? (

          <div className="rounded-xl border border-amber-300/20 bg-[#101311] p-8">

            <h2 className="text-2xl font-bold text-amber-200">

              Game Developer role required

            </h2>



            <p className="mt-4 leading-7 text-zinc-300">

              You need to enable the Game Developer role in your account before

              submitting a game.

            </p>



            <a

              href="/account"

              className="mt-6 inline-block rounded-lg bg-[#77f29b] px-5 py-3 font-semibold text-[#090b0a] hover:bg-[#91ffb0]"

            >

              Manage account roles

            </a>

          </div>

        ) : claimSubmitted ? (

          <div className="rounded-xl border border-[#77f29b]/30 bg-[#101311] p-8">

            <h2 className="text-2xl font-bold text-[#77f29b]">

              Claim submitted

            </h2>



            <p className="mt-4 leading-7 text-zinc-300">

              Your claim for {claimedTitle} has been saved and is awaiting

              review.

            </p>



            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5">

              <p className="font-semibold text-zinc-200">

                What happens now?

              </p>



              <p className="mt-2 text-sm leading-6 text-zinc-400">

                Playtested will review your relationship to the game and the

                evidence you supplied. The claim does not give your account

                control of the game until it has been approved.

              </p>



              <p className="mt-3 text-sm leading-6 text-zinc-500">

                Approval of the developer claim is separate from Playtested

                assessment and verification. Claiming a game does not make it

                Assessed or Verified.

              </p>

            </div>



            <button

              type="button"

              onClick={() => {

                setClaimSubmitted(false);

                setClaimedTitle("");

                setError("");

                resetDuplicateState();

              }}

              className="mt-6 rounded-md border border-white/15 px-5 py-3 text-sm hover:border-[#77f29b]/50"

            >

              Submit or claim another game

            </button>

          </div>

        ) : submitted && !pulseOpen ? (

          <div className="rounded-xl border border-[#77f29b]/30 bg-[#101311] p-8">

            <h2 className="text-2xl font-bold text-[#77f29b]">

              Submission saved

            </h2>



            <p className="mt-4 leading-7 text-zinc-300">

              Your application for {submittedTitle} has been saved to

              Playtested and is awaiting review.

            </p>



            <p className="mt-3 text-sm leading-6 text-zinc-500">

              Your submission has not yet been independently verified or

              approved.

            </p>



            <div className="mt-6 flex flex-wrap gap-3">

              <a

                href="/my-submissions"

                className="rounded-lg bg-[#77f29b] px-5 py-3 font-semibold text-[#090b0a] hover:bg-[#91ffb0]"

              >

                View my submissions

              </a>



              <button

                type="button"

                onClick={() => {

                  setSubmitted(false);

                  setReleaseStatus("");

                  setError("");

                  setPulseStage("idle");
                  setPulseReport(null);
                  setPulseError("");
                  setPulseOpen(false);

                  resetDuplicateState();

                }}

                className="rounded-md border border-white/15 px-5 py-3 text-sm hover:border-[#77f29b]/50"

              >

                Submit another game

              </button>

            </div>

          </div>

        ) : (

          <form onSubmit={handleSubmit} className="space-y-10">

            {error && (

              <p

                ref={errorRef}

                role="alert"

                className="scroll-mt-28 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300"

              >

                {error}

              </p>

            )}



            {possibleDuplicate && (

              <div

                ref={duplicateWarningRef}

                className="scroll-mt-28 rounded-xl border border-amber-300/30 bg-amber-300/[0.06] p-5"

              >

                <h3 className="font-semibold text-amber-200">

                  {possibleDuplicate.exactSteamMatch

                    ? "This game is already on Playtested"

                    : "Possible existing game"}

                </h3>



                <p className="mt-2 text-sm leading-6 text-zinc-300">

                  We found{" "}

                  <strong>{possibleDuplicate.title}</strong>

                  {possibleDuplicate.developerName ? (

                    <>

                      {" "}

                      by{" "}

                      <strong>

                        {possibleDuplicate.developerName}

                      </strong>

                    </>

                  ) : null}

                  .

                </p>



                {possibleDuplicate.status && (

                  <p className="mt-2 text-sm leading-6 text-zinc-400">

                    Existing status: {possibleDuplicate.status}.

                  </p>

                )}



                {possibleDuplicate.exactSteamMatch ? (

                  <p className="mt-3 text-sm leading-6 text-zinc-400">

                    The Steam App ID matches the existing game exactly, so

                    Playtested will not create another listing for it. If you

                    represent this game, submit a developer claim. If this is

                    not your game, correct the Steam URL before submitting.

                  </p>

                ) : (

                  <p className="mt-3 text-sm leading-6 text-zinc-400">

                    Playtested cannot be certain this is the same game because

                    there is no matching Steam App ID. If you represent the

                    existing game, claim it. If this is genuinely a different

                    game, you can continue with a separate submission.

                  </p>

                )}



                {!showClaimForm ? (

                  <div className="mt-5 flex flex-wrap gap-3">

                    <button

                      type="button"

                      onClick={() => {

                        setShowClaimForm(true);

                        setError("");

                      }}

                      className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#090b0a] hover:bg-[#91ffb0]"

                    >

                      Claim this game

                    </button>



                    {!possibleDuplicate.exactSteamMatch && (

                      <button

                        type="button"

                        onClick={handleDifferentGame}

                        className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-white/30"

                      >

                        This is a different game

                      </button>

                    )}

                  </div>

                ) : (

                  <div className="mt-6 rounded-xl border border-white/10 bg-[#090b0a]/70 p-5">

                    <h4 className="font-semibold text-zinc-100">

                      Claim {possibleDuplicate.title}

                    </h4>



                    <p className="mt-2 text-sm leading-6 text-zinc-400">

                      Tell us how you are connected to this game. Claims are

                      reviewed before any developer access is granted.

                    </p>



                    <div className="mt-5 space-y-5">

                      <label className={labelClass}>

                        Your relationship to the game *

                        <select

                          value={claimRelationship}

                          onChange={(event) =>

                            setClaimRelationship(

                              event.target

                                .value as ClaimRelationship | ""

                            )

                          }

                          className={inputClass}

                        >

                          <option value="" disabled>

                            Select your relationship

                          </option>

                          <option value="Solo developer">

                            Solo developer

                          </option>

                          <option value="Studio member">

                            Studio member

                          </option>

                          <option value="Publisher">

                            Publisher

                          </option>

                          <option value="Other">

                            Other

                          </option>

                        </select>

                      </label>



                      <label className={labelClass}>

                        Why are you claiming this game? *

                        <textarea

                          value={claimReason}

                          onChange={(event) =>

                            setClaimReason(event.target.value)

                          }

                          rows={4}

                          maxLength={1000}

                          placeholder="For example: I am the solo developer and creator of this game."

                          className={inputClass}

                        />



                        <span className="mt-2 block text-xs leading-5 text-zinc-500">

                          Briefly explain your role and connection to the game.

                        </span>

                      </label>



                      <label className={labelClass}>

                        Verification evidence

                        <input

                          type="url"

                          value={claimEvidenceUrl}

                          onChange={(event) =>

                            setClaimEvidenceUrl(

                              event.target.value

                            )

                          }

                          placeholder="https://..."

                          className={inputClass}

                        />



                        <span className="mt-2 block text-xs leading-5 text-zinc-500">

                          Link to an official developer website, studio page,

                          publisher page or another source that helps verify

                          your relationship to the game.

                        </span>

                      </label>



                      <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-4">

                        <p className="text-xs leading-5 text-zinc-400">

                          Submitting a claim does not immediately give you

                          control of the game. Playtested will review the claim

                          and may request additional evidence.

                        </p>

                      </div>



                      <div className="flex flex-wrap gap-3">

                        <button

                          type="button"

                          disabled={submittingClaim}

                          onClick={handleClaimSubmit}

                          className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#090b0a] hover:bg-[#91ffb0] disabled:cursor-not-allowed disabled:opacity-60"

                        >

                          {submittingClaim

                            ? "Submitting claim..."

                            : "Submit claim"}

                        </button>



                        <button

                          type="button"

                          disabled={submittingClaim}

                          onClick={() => {

                            setShowClaimForm(false);

                            setClaimRelationship("");

                            setClaimReason("");

                            setClaimEvidenceUrl("");

                            setError("");

                          }}

                          className="rounded-lg border border-white/15 px-5 py-3 text-sm text-zinc-300 hover:border-white/30 disabled:opacity-60"

                        >

                          Cancel

                        </button>

                      </div>

                    </div>

                  </div>

                )}

              </div>

            )}



            <section className="space-y-5">

              <div>

                <h2 className="text-xl font-bold">

                  1. Game details

                </h2>



                <p className="mt-2 text-sm text-zinc-500">

                  Tell players what you have built.

                </p>

              </div>



              <label className={labelClass}>

                Game title *

                <input

                  required

                  name="title"

                  placeholder="Enter your game title"

                  className={inputClass}

                  onChange={() => {

                    resetDuplicateState();

                  }}

                />

              </label>



              <label className={labelClass}>

                Developer or studio *

                <input

                  required

                  name="developer"

                  placeholder="Studio name"

                  className={inputClass}

                  onChange={() => {

                    resetDuplicateState();

                  }}

                />

              </label>



              <label className={labelClass}>

                Genre *

                <select

                  required

                  name="genre"

                  defaultValue=""

                  className={inputClass}

                >

                  <option value="" disabled>

                    Select a genre

                  </option>

                  <option>Action</option>

                  <option>Action RPG</option>

                  <option>Adventure</option>

                  <option>Casual</option>

                  <option>Horror</option>

                  <option>Platformer</option>

                  <option>Simulation</option>

                  <option>Strategy</option>

                  <option>Survival</option>

                  <option>Other</option>

                </select>

              </label>



              <label className={labelClass}>

                Release status *

                <select

                  required

                  name="releaseStatus"

                  value={releaseStatus}

                  onChange={(event) =>

                    setReleaseStatus(

                      event.target.value as ReleaseStatus | ""

                    )

                  }

                  className={inputClass}

                >

                  <option value="" disabled>

                    Select release status

                  </option>

                  <option value="Released">Released</option>

                  <option value="Upcoming">Upcoming</option>

                  <option value="Not announced">

                    Release date not announced

                  </option>

                </select>



                <span className="mt-2 block text-xs leading-5 text-zinc-500">

                  Tell us whether the game is already available or still in

                  development.

                </span>

              </label>



              {releaseStatus === "Released" && (

                <label className={labelClass}>

                  Release date *

                  <input

                    required

                    name="releaseDate"

                    type="date"

                    className={`${inputClass} cursor-pointer`}

                    onClick={openDatePicker}

                  />



                  <span className="mt-2 block text-xs leading-5 text-zinc-500">

                    Enter the date the game was first publicly released.

                  </span>

                </label>

              )}



              {releaseStatus === "Upcoming" && (

                <label className={labelClass}>

                  Planned release date

                  <input

                    name="releaseDate"

                    type="date"

                    className={`${inputClass} cursor-pointer`}

                    onClick={openDatePicker}

                  />



                  <span className="mt-2 block text-xs leading-5 text-zinc-500">

                    Optional. Leave this blank if the planned release date is

                    not confirmed yet.

                  </span>

                </label>

              )}



              {releaseStatus === "Not announced" && (

                <div className="rounded-lg border border-white/10 bg-[#101311] p-4">

                  <p className="text-sm leading-6 text-zinc-400">

                    No release date is required. You can provide one later when

                    your release plans are confirmed.

                  </p>

                </div>

              )}



              <label className={labelClass}>

                Game description *

                <textarea

                  required

                  name="description"

                  rows={5}

                  maxLength={1000}

                  placeholder="Describe the gameplay, key features and what makes your game different."

                  className={inputClass}

                />

              </label>



              <label className={labelClass}>
                Playable build / tester access link
                <input
                  name="gameLink"
                  type="url"
                  placeholder="https://..."
                  className={inputClass}
                />

                <span className="mt-2 block text-xs leading-5 text-zinc-500">
                  Optional. Add a link where Playtested testers could download or
                  access a playable build, such as itch.io, Google Drive,
                  Dropbox, a browser build, Steam Playtest or your own hosted
                  download. Playtested does not host the game file itself. You
                  can provide or replace the build link later when starting a
                  specific playtest round.
                </span>
              </label>



              <label className={labelClass}>

                Steam store page / public listing (optional)

                <input

                  name="steamUrl"

                  type="url"

                  placeholder="https://store.steampowered.com/app/..."

                  className={inputClass}

                  onChange={() => {

                    resetDuplicateState();

                  }}

                />



                <span className="mt-2 block text-xs leading-5 text-zinc-500">

                  Add the public Steam store page if the game has one. This is
                  separate from the playable build link above. If the game
                  already exists in the Playtested catalogue, we'll match it
                  using its Steam App ID. Existing games can be claimed rather
                  than duplicated. Unreleased games and games hosted elsewhere
                  are also welcome.

                </span>

              </label>



              <div>

                <label htmlFor="imageUrl" className={labelClass}>

                  Game thumbnail image URL

                  <input

                    id="imageUrl"

                    name="imageUrl"

                    type="url"

                    value={imageUrl}

                    onChange={handleImageChange}

                    placeholder="https://example.com/game-cover.jpg"

                    className={inputClass}

                  />

                </label>



                <p className="mt-2 text-xs leading-5 text-zinc-500">

                  Paste a direct link to your game's image.

                </p>



                {imageUrl && (

                  <div className="mt-4 rounded-xl border border-white/10 bg-[#101311] p-4">

                    <p className="mb-3 text-sm font-semibold text-zinc-300">

                      Thumbnail preview

                    </p>



                    {imageStatus === "loading" && (

                      <p className="text-sm text-amber-300">

                        Checking image...

                      </p>

                    )}



                    {imageStatus === "error" && (

                      <p className="text-sm text-red-300">

                        Image failed to load. Check the URL.

                      </p>

                    )}



                    <img

                      key={imageUrl}

                      src={imageUrl}

                      alt="Game thumbnail preview"

                      className={`max-h-72 w-full rounded-lg object-contain ${

                        imageStatus === "error" ? "hidden" : ""

                      }`}

                      onLoad={() => setImageStatus("loaded")}

                      onError={() => setImageStatus("error")}

                    />



                    {imageStatus === "loaded" && (

                      <p className="mt-3 text-sm text-[#77f29b]">

                        Image loaded successfully.

                      </p>

                    )}

                  </div>

                )}

              </div>

            </section>



            <div className="border-t border-white/10" />



            <section className="space-y-5">

              <div>

                <h2 className="text-xl font-bold">

                  2. AI disclosure

                </h2>



                <p className="mt-2 text-sm leading-6 text-zinc-500">

                  Disclose how AI was used. This is separate from independent

                  verification.

                </p>

              </div>



              <label className={labelClass}>

                Overall AI involvement *

                <select

                  required

                  name="aiType"

                  defaultValue=""

                  className={inputClass}

                >

                  <option value="" disabled>

                    Select a classification

                  </option>

                  <option value="AI-generated">

                    AI-generated content or code

                  </option>

                  <option value="AI-assisted">

                    AI-assisted development

                  </option>

                  <option value="No AI disclosed">

                    No AI use to disclose

                  </option>

                </select>

              </label>



              <fieldset>

                <legend className="mb-3 text-sm text-zinc-300">

                  Which areas involved AI?

                </legend>



                <div className="grid gap-3 sm:grid-cols-2">

                  {[

                    "Programming or code",

                    "Artwork or textures",

                    "Writing or dialogue",

                    "Voice or audio",

                    "Music or sound effects",

                    "Animation or video",

                    "Testing or development tools",

                    "Other",

                  ].map((area) => (

                    <label

                      key={area}

                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#101311] p-3 text-sm text-zinc-300"

                    >

                      <input

                        type="checkbox"

                        name="aiAreas"

                        value={area}

                        className="accent-[#77f29b]"

                      />

                      {area}

                    </label>

                  ))}

                </div>

              </fieldset>



              <label className={labelClass}>

                Explain how AI was used

                <textarea

                  name="aiExplanation"

                  rows={5}

                  maxLength={2000}

                  placeholder="Which tools were used, what did they produce, and how much was edited or created by humans?"

                  className={inputClass}

                />

              </label>



              <label className={labelClass}>

                Supporting evidence or documentation link

                <input

                  name="evidenceLink"

                  type="url"

                  placeholder="https://..."

                  className={inputClass}

                />



                <span className="mt-2 block text-xs leading-5 text-zinc-500">

                  Evidence might include tool disclosures, production notes or

                  asset records.

                </span>

              </label>

            </section>



            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-5">

              <h3 className="font-semibold text-amber-200">

                What happens next?

              </h3>



              <p className="mt-2 text-sm leading-6 text-zinc-400">

                Submissions start as Pending Review. Steam games are matched

                using their Steam App ID. Existing games can be claimed by a

                developer, but claims require review before access is granted.

                For games without Steam, Playtested checks the normalized game

                title and developer name for possible duplicates. A possible

                match can either be claimed or confirmed as a genuinely

                different game. Submitting or claiming a game does not make it

                Verified.

              </p>

            </div>



            <button

              type="submit"

              disabled={

                submitting ||

                submittingClaim ||

                Boolean(possibleDuplicate)

              }

              className="w-full rounded-lg bg-[#77f29b] px-6 py-4 font-bold text-[#090b0a] transition hover:bg-[#91ffb0] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"

            >

              {submitting

                ? "Checking and submitting..."

                : "Submit application"}

            </button>



            <p className="text-xs text-zinc-600">

              Submissions and developer claims are stored in the Playtested

              database.

            </p>

          </form>

        )}

      </section>



      <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">

        PLAYTESTED · Prototype

      </footer>

    </main>

  );

}
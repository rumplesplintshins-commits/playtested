"use client";

import { useEffect, useRef, useState } from "react";
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

      const { error: insertError } = await supabase
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
        });

      if (insertError) {
        console.error("Game submission failed:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });

        if (insertError.code === "42501") {
          setError(
            "Permission denied. Make sure Game Developer is selected in your account and saved."
          );
        } else {
          setError(
            `Could not save your submission: ${
              insertError.message || "Please try again."
            }`
          );
        }

        return;
      }

      setSubmittedTitle(title);
      setSubmitted(true);
      resetDuplicateState();
      setImageUrl("");
      setImageStatus("empty");
      setReleaseStatus("");
      form.reset();
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
        ) : submitted ? (
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
                Store or gameplay link
                <input
                  name="gameLink"
                  type="url"
                  placeholder="https://..."
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Steam store page (optional)
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
                  Add your Steam page if you have one. If the game already
                  exists in the Playtested catalogue, we'll match it using its
                  Steam App ID. Existing games can be claimed rather than
                  duplicated. Unreleased games and games hosted elsewhere are
                  also welcome.
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
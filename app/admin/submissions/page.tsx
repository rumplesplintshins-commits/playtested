"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "../../../lib/supabase";
import SteamImporter from "./SteamImporter";
import ImportedSteamCatalogue from "./ImportedSteamCatalogue";

type SubmissionStatus =
  | "Pending Review"
  | "Approved"
  | "Rejected"
  | "Needs More Information";

type SubmissionFilter =
  | "All"
  | "Needs attention"
  | "Approved with missing information"
  | SubmissionStatus;

type ClaimStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Needs More Information";

type ClaimFilter =
  | "All"
  | "Needs attention"
  | ClaimStatus;

type ReviewTab = "submissions" | "claims" | "playtests";

type AIStatus =
  | "Not Reviewed"
  | "In Review"
  | "Supported by Evidence"
  | "Partially Supported"
  | "Unable to Verify"
  | "Disclosure Concerns";

type QualityStatus = "Not Tested" | "In Testing" | "Tested";

type Submission = {
  id: string;
  title: string;
  developer: string;
  genre: string;
  description: string;
  gameLink: string;
  imageUrl: string;
  aiType: string;
  aiAreas: string[];
  aiExplanation: string;
  evidenceLink: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewReason: string;
};

type GameClaim = {
  id: string;
  claimantId: string;
  importedGameId: string | null;
  approvedGameId: string | null;
  submissionId: string | null;
  gameTitle: string;
  developerName: string;
  relationship: string;
  claimReason: string;
  evidenceUrl: string;
  status: ClaimStatus;
  adminNotes: string;
  createdAt: string;
  reviewedAt: string;
  reviewedBy: string;
};

type TestReview = {
  test_id: string;
  submission_id: string;
  tester_id: string;
  tester_name: string;
  game_title: string;
  status: string;
  overall_score: number | null;
  gameplay_score: number | null;
  performance_score: number | null;
  continue_playing: string | null;
  recommend_game: string | null;
  enjoyed_most: string | null;
  frustrations: string | null;
  bugs_found: string | null;
  biggest_improvement: string | null;
  feedback: string | null;
  hours_played: number | null;
  focus_responses: Record<string, unknown> | null;
  submitted_at: string | null;
  review_outcome: string;
  xp_awarded: boolean;
};

type Verification = {
  ai_status: AIStatus;
  quality_status: QualityStatus;
  quality_score: string;
  public_summary: string;
  evidence_summary: string;
  reviewer_notes: string;
  published: boolean;
  ai_claims_checked: boolean;
  evidence_checked: boolean;
  game_launched: boolean;
  core_gameplay_tested: boolean;
  bugs_recorded: boolean;
  performance_checked: boolean;
  testing_notes: string;
  limitations: string;
};

const emptyVerification: Verification = {
  ai_status: "Not Reviewed",
  quality_status: "Not Tested",
  quality_score: "",
  public_summary: "",
  evidence_summary: "",
  reviewer_notes: "",
  published: false,
  ai_claims_checked: false,
  evidence_checked: false,
  game_launched: false,
  core_gameplay_tested: false,
  bugs_recorded: false,
  performance_checked: false,
  testing_notes: "",
  limitations: "",
};

const submissionStatuses: SubmissionStatus[] = [
  "Pending Review",
  "Approved",
  "Rejected",
  "Needs More Information",
];

const claimStatuses: ClaimStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
  "Needs More Information",
];

const aiStatuses: AIStatus[] = [
  "Not Reviewed",
  "In Review",
  "Supported by Evidence",
  "Partially Supported",
  "Unable to Verify",
  "Disclosure Concerns",
];

const qualityStatuses: QualityStatus[] = [
  "Not Tested",
  "In Testing",
  "Tested",
];

const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500";

const panelClass =
  "rounded-xl border border-zinc-800 bg-zinc-900/60";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

const checklistItems = [
  {
    field: "ai_claims_checked",
    label: "Developer's AI claims reviewed",
    description: "Compared the declared AI use with available information.",
  },
  {
    field: "evidence_checked",
    label: "Supporting evidence inspected",
    description: "Reviewed the supplied links, materials or demonstrations.",
  },
  {
    field: "game_launched",
    label: "Game launched successfully",
    description: "Recorded whether the game was actually opened and run.",
  },
  {
    field: "core_gameplay_tested",
    label: "Core gameplay tested",
    description: "Played enough to assess the main gameplay loop.",
  },
  {
    field: "bugs_recorded",
    label: "Bugs and issues recorded",
    description:
      "Documented observed defects or explicitly recorded that no issues were observed.",
  },
  {
    field: "performance_checked",
    label: "Performance checked",
    description:
      "Considered performance on the hardware and settings tested.",
  },
] as const;

type ChecklistField = (typeof checklistItems)[number]["field"];

function getMissingInformation(submission: Submission): string[] {
  const missing: string[] = [];

  if (!submission.gameLink.trim()) {
    missing.push("Game or store link");
  }

  if (!submission.description.trim()) {
    missing.push("Game description");
  }

  if (!submission.aiExplanation.trim()) {
    missing.push("AI-use explanation");
  }

  if (!submission.evidenceLink.trim()) {
    missing.push("Supporting evidence link");
  }

  if (!submission.aiType.trim()) {
    missing.push("AI classification");
  }

  return missing;
}

function formatDate(value: string): string {
  if (!value) return "Date not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not recorded";
  }

  return date.toLocaleString();
}

function statusClasses(status: string): string {
  if (status === "Approved") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Rejected") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (
    status === "Needs More Information" ||
    status === "Pending" ||
    status === "Pending Review"
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div>
          <h3 className="font-semibold text-zinc-100">{title}</h3>

          {description && (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {description}
            </p>
          )}
        </div>

        <span className="shrink-0 text-lg text-zinc-500 transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="border-t border-zinc-800 p-5">{children}</div>
    </details>
  );
}

function ReadinessItem({
  complete,
  title,
  detail,
}: {
  complete: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          complete
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-amber-400/10 text-amber-300"
        }`}
      >
        {complete ? "✓" : "!"}
      </span>

      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

function formatIntent(value: string | null) {
  if (!value) return "Not answered";

  const labels: Record<string, string> = {
    definitely: "Definitely",
    probably: "Probably",
    maybe: "Maybe",
    probably_not: "Probably not",
    definitely_not: "Definitely not",
  };

  return labels[value] ?? value;
}

export default function AdminSubmissionsPage() {
  const [reviewTab, setReviewTab] =
    useState<ReviewTab>("submissions");

  const [catalogueOpen, setCatalogueOpen] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<GameClaim[]>([]);
  const [testReviews, setTestReviews] = useState<TestReview[]>([]);
  const [testReviewsLoaded, setTestReviewsLoaded] = useState(false);
  const [testReviewError, setTestReviewError] = useState("");
  const [testReviewMessage, setTestReviewMessage] = useState("");
  const [busyTestReviewId, setBusyTestReviewId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<SubmissionFilter>("Needs attention");

  const [claimFilter, setClaimFilter] =
    useState<ClaimFilter>("Needs attention");

  const [loaded, setLoaded] = useState(false);
  const [claimsLoaded, setClaimsLoaded] = useState(false);

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [pageError, setPageError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claimMessage, setClaimMessage] = useState("");

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingClaimId, setSavingClaimId] =
    useState<string | null>(null);

  const [draftStatus, setDraftStatus] =
    useState<SubmissionStatus>("Pending Review");

  const [reviewReasonDraft, setReviewReasonDraft] = useState("");

  const [claimStatusDraft, setClaimStatusDraft] =
    useState<ClaimStatus>("Pending");

  const [claimAdminNotesDraft, setClaimAdminNotesDraft] =
    useState("");

  const [verification, setVerification] =
    useState<Verification>(emptyVerification);

  const [verificationLoaded, setVerificationLoaded] =
    useState(false);

  const [verificationSaving, setVerificationSaving] =
    useState(false);

  const [verificationMessage, setVerificationMessage] =
    useState("");

  const [verificationError, setVerificationError] =
    useState("");

  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState("");
  const [backfillError, setBackfillError] = useState("");

  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedId) ??
    null;

  const selectedClaim =
    claims.find((claim) => claim.id === selectedClaimId) ?? null;

  const draftMissingInformation = selectedSubmission
    ? getMissingInformation({
        ...selectedSubmission,
        status: draftStatus,
      })
    : [];

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function checkAdmin() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      setIsAdmin(!error && profile?.role === "admin");
      setCheckingAdmin(false);
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;
    const supabase = createClient();

    async function loadSubmissions() {
      setLoaded(false);

      const { data, error } = await supabase
        .from("game_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Could not load submissions:", error);

        setPageError(
          "Could not load submissions from the database. Check the database permissions and try refreshing."
        );

        setLoaded(true);
        return;
      }

      const mapped: Submission[] = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? "",
        developer: row.developer_name ?? "",
        genre: row.genre ?? "",
        description: row.description ?? "",
        gameLink: row.game_link ?? "",
        imageUrl: row.image_url ?? "",
        aiType: row.ai_type ?? "",
        aiAreas: row.ai_areas ?? [],
        aiExplanation: row.ai_explanation ?? "",
        evidenceLink: row.evidence_link ?? "",
        submittedAt: row.submitted_at ?? "",
        status: row.status as SubmissionStatus,
        reviewReason: row.review_reason ?? "",
      }));

      setSubmissions(mapped);

      setSelectedId((currentId) => {
        if (
          currentId &&
          mapped.some((submission) => submission.id === currentId)
        ) {
          return currentId;
        }

        const needsAttention = mapped.find(
          (submission) =>
            submission.status === "Pending Review" ||
            submission.status === "Needs More Information"
        );

        return needsAttention?.id ?? mapped[0]?.id ?? null;
      });

      setLoaded(true);
    }

    loadSubmissions();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;
    const supabase = createClient();

    async function loadClaims() {
      setClaimsLoaded(false);
      setClaimError("");

      const { data: claimRows, error } = await supabase
        .from("game_claims")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Could not load game claims:", error);
        setClaimError(
          `Could not load developer claims: ${error.message}`
        );
        setClaimsLoaded(true);
        return;
      }

      const rows = claimRows ?? [];

      const importedIds = rows
        .map((row) => row.imported_game_id)
        .filter(Boolean) as string[];

      const approvedIds = rows
        .map((row) => row.approved_game_id)
        .filter(Boolean) as string[];

      const submissionIds = rows
        .map((row) => row.submission_id)
        .filter(Boolean) as string[];

      let importedGames: {
        id: string;
        title: string;
        developer_name: string | null;
      }[] = [];

      let approvedGames: {
        id: string;
        title: string | null;
        developer_name: string | null;
      }[] = [];

      let submittedGames: {
        id: string;
        title: string;
        developer_name: string;
      }[] = [];

      if (importedIds.length > 0) {
        const { data, error: importedError } = await supabase
          .from("imported_games")
          .select("id, title, developer_name")
          .in("id", importedIds);

        if (importedError) {
          console.error(
            "Could not load imported claim games:",
            importedError
          );
        } else {
          importedGames = data ?? [];
        }
      }

      if (approvedIds.length > 0) {
        const { data, error: approvedError } = await supabase
          .from("approved_games")
          .select("id, title, developer_name")
          .in("id", approvedIds);

        if (approvedError) {
          console.error(
            "Could not load approved claim games:",
            approvedError
          );
        } else {
          approvedGames = data ?? [];
        }
      }

      if (submissionIds.length > 0) {
        const { data, error: submissionError } = await supabase
          .from("game_submissions")
          .select("id, title, developer_name")
          .in("id", submissionIds);

        if (submissionError) {
          console.error(
            "Could not load submission claim games:",
            submissionError
          );
        } else {
          submittedGames = data ?? [];
        }
      }

      if (!mounted) return;

      const mappedClaims: GameClaim[] = rows.map((row) => {
        let gameTitle = "Unknown game";
        let developerName = "Developer not recorded";

        if (row.imported_game_id) {
          const game = importedGames.find(
            (item) => item.id === row.imported_game_id
          );

          if (game) {
            gameTitle = game.title;
            developerName =
              game.developer_name ?? "Developer not recorded";
          }
        } else if (row.approved_game_id) {
          const game = approvedGames.find(
            (item) => item.id === row.approved_game_id
          );

          if (game) {
            gameTitle = game.title ?? "Unknown game";
            developerName =
              game.developer_name ?? "Developer not recorded";
          }
        } else if (row.submission_id) {
          const game = submittedGames.find(
            (item) => item.id === row.submission_id
          );

          if (game) {
            gameTitle = game.title;
            developerName =
              game.developer_name ?? "Developer not recorded";
          }
        }

        return {
          id: row.id,
          claimantId: row.claimant_id,
          importedGameId: row.imported_game_id ?? null,
          approvedGameId: row.approved_game_id ?? null,
          submissionId: row.submission_id ?? null,
          gameTitle,
          developerName,
          relationship: row.relationship ?? "",
          claimReason: row.claim_reason ?? "",
          evidenceUrl: row.evidence_url ?? "",
          status: row.status as ClaimStatus,
          adminNotes: row.admin_notes ?? "",
          createdAt: row.created_at ?? "",
          reviewedAt: row.reviewed_at ?? "",
          reviewedBy: row.reviewed_by ?? "",
        };
      });

      setClaims(mappedClaims);

      setSelectedClaimId((currentId) => {
        if (
          currentId &&
          mappedClaims.some((claim) => claim.id === currentId)
        ) {
          return currentId;
        }

        const needsAttention = mappedClaims.find(
          (claim) =>
            claim.status === "Pending" ||
            claim.status === "Needs More Information"
        );

        return needsAttention?.id ?? mappedClaims[0]?.id ?? null;
      });

      setClaimsLoaded(true);
    }

    loadClaims();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;
    const supabase = createClient();

    async function loadTestReviews() {
      setTestReviewsLoaded(false);
      setTestReviewError("");

      const { data, error } = await supabase.rpc(
        "get_admin_community_test_reviews"
      );

      if (!mounted) return;

      if (error) {
        setTestReviewError(
          `Could not load playtest reviews: ${error.message}`
        );
        setTestReviewsLoaded(true);
        return;
      }

      setTestReviews((data ?? []) as TestReview[]);
      setTestReviewsLoaded(true);
    }

    void loadTestReviews();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  async function refreshTestReviews() {
    setTestReviewsLoaded(false);
    setTestReviewError("");

    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "get_admin_community_test_reviews"
    );

    if (error) {
      setTestReviewError(
        `Could not load playtest reviews: ${error.message}`
      );
      setTestReviewsLoaded(true);
      return;
    }

    setTestReviews((data ?? []) as TestReview[]);
    setTestReviewsLoaded(true);
  }

  async function reviewTest(
    testId: string,
    outcome: "accepted" | "rejected"
  ) {
    const action = outcome === "accepted" ? "accept" : "reject";

    if (
      !window.confirm(
        outcome === "accepted"
          ? "Accept this test? The tester will receive 100 XP."
          : "Reject this test? No XP will be awarded."
      )
    ) {
      return;
    }

    setBusyTestReviewId(testId);
    setTestReviewError("");
    setTestReviewMessage("");

    const supabase = createClient();
    const { error } = await supabase.rpc(
      "review_community_game_test",
      {
        p_test_id: testId,
        p_outcome: outcome,
      }
    );

    if (error) {
      setTestReviewError(
        `Could not ${action} the test: ${error.message}`
      );
      setBusyTestReviewId(null);
      return;
    }

    setTestReviews((current) =>
      current.filter((review) => review.test_id !== testId)
    );

    setTestReviewMessage(
      outcome === "accepted"
        ? "Test accepted. 100 XP awarded."
        : "Test rejected. No XP awarded."
    );
    setBusyTestReviewId(null);
  }

  useEffect(() => {
    if (!selectedSubmission) {
      setDraftStatus("Pending Review");
      setReviewReasonDraft("");
      return;
    }

    setDraftStatus(selectedSubmission.status);
    setReviewReasonDraft(selectedSubmission.reviewReason);
    setPageError("");
  }, [
    selectedSubmission?.id,
    selectedSubmission?.status,
    selectedSubmission?.reviewReason,
  ]);

  useEffect(() => {
    if (!selectedClaim) {
      setClaimStatusDraft("Pending");
      setClaimAdminNotesDraft("");
      return;
    }

    setClaimStatusDraft(selectedClaim.status);
    setClaimAdminNotesDraft(selectedClaim.adminNotes);
    setClaimError("");
    setClaimMessage("");
  }, [
    selectedClaim?.id,
    selectedClaim?.status,
    selectedClaim?.adminNotes,
  ]);

  useEffect(() => {
    if (!isAdmin || !selectedId) {
      setVerification(emptyVerification);
      setVerificationLoaded(false);
      return;
    }

    let mounted = true;
    const supabase = createClient();

    async function loadVerification() {
      setVerificationLoaded(false);
      setVerificationError("");
      setVerificationMessage("");

      const { data, error } = await supabase
        .from("game_verifications")
        .select(
          "ai_status, quality_status, quality_score, public_summary, evidence_summary, reviewer_notes, published, ai_claims_checked, evidence_checked, game_launched, core_gameplay_tested, bugs_recorded, performance_checked, testing_notes, limitations"
        )
        .eq("submission_id", selectedId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Could not load verification:", error);

        setVerificationError(
          "Could not load verification data. Check that the checklist columns exist and admin permissions are correct."
        );

        setVerification(emptyVerification);
      } else if (data) {
        setVerification({
          ai_status: data.ai_status as AIStatus,
          quality_status: data.quality_status as QualityStatus,
          quality_score:
            data.quality_score == null
              ? ""
              : String(data.quality_score),
          public_summary: data.public_summary ?? "",
          evidence_summary: data.evidence_summary ?? "",
          reviewer_notes: data.reviewer_notes ?? "",
          published: data.published ?? false,
          ai_claims_checked: data.ai_claims_checked ?? false,
          evidence_checked: data.evidence_checked ?? false,
          game_launched: data.game_launched ?? false,
          core_gameplay_tested:
            data.core_gameplay_tested ?? false,
          bugs_recorded: data.bugs_recorded ?? false,
          performance_checked:
            data.performance_checked ?? false,
          testing_notes: data.testing_notes ?? "",
          limitations: data.limitations ?? "",
        });
      } else {
        setVerification(emptyVerification);
      }

      setVerificationLoaded(true);
    }

    loadVerification();

    return () => {
      mounted = false;
    };
  }, [isAdmin, selectedId]);

  async function updateStatus(
    id: string,
    status: SubmissionStatus,
    reason: string
  ) {
    const requiresReason =
      status === "Rejected" ||
      status === "Needs More Information";

    if (requiresReason && !reason.trim()) {
      setPageError(
        status === "Rejected"
          ? "Enter a reason before rejecting this submission."
          : "Explain what information is needed before saving this decision."
      );

      return;
    }

    setPageError("");
    setSavingId(id);

    const supabase = createClient();
    const savedReason = requiresReason ? reason.trim() : "";

    const { error } = await supabase.rpc(
      "review_game_submission",
      {
        p_submission_id: id,
        p_status: status,
        p_review_reason: savedReason || null,
      }
    );

    setSavingId(null);

    if (error) {
      console.error("Could not update submission:", error);

      setPageError(
        "The decision could not be saved. Check your admin database permissions and try again."
      );

      return;
    }

    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === id
          ? {
              ...submission,
              status,
              reviewReason: savedReason,
            }
          : submission
      )
    );

    setDraftStatus(status);
    setReviewReasonDraft(savedReason);
    setVerificationMessage("");
  }

  async function updateClaim() {
    if (!selectedClaim) return;

    const requiresNotes =
      claimStatusDraft === "Rejected" ||
      claimStatusDraft === "Needs More Information";

    if (requiresNotes && !claimAdminNotesDraft.trim()) {
      setClaimError(
        claimStatusDraft === "Rejected"
          ? "Enter an admin note explaining why this claim is being rejected."
          : "Explain what additional information the claimant needs to provide."
      );

      return;
    }

    setClaimError("");
    setClaimMessage("");
    setSavingClaimId(selectedClaim.id);

    const supabase = createClient();

    const { error } = await supabase.rpc("review_game_claim", {
      p_claim_id: selectedClaim.id,
      p_status: claimStatusDraft,
      p_admin_notes: claimAdminNotesDraft.trim() || null,
    });

    setSavingClaimId(null);

    if (error) {
      console.error("Could not review game claim:", error);

      setClaimError(
        `The claim decision could not be saved: ${error.message}`
      );

      return;
    }

    const reviewed =
      claimStatusDraft === "Approved" ||
      claimStatusDraft === "Rejected";

    const reviewedAt = reviewed
      ? new Date().toISOString()
      : "";

    setClaims((current) =>
      current.map((claim) =>
        claim.id === selectedClaim.id
          ? {
              ...claim,
              status: claimStatusDraft,
              adminNotes: claimAdminNotesDraft.trim(),
              reviewedAt,
            }
          : claim
      )
    );

    setClaimMessage(
      claimStatusDraft === "Approved"
        ? "Developer claim approved and the game has been linked to the developer account."
        : claimStatusDraft === "Rejected"
          ? "Developer claim rejected."
          : claimStatusDraft === "Needs More Information"
            ? "Claim marked as needing more information."
            : "Claim returned to Pending."
    );
  }

  function updateVerification<K extends keyof Verification>(
    field: K,
    value: Verification[K]
  ) {
    setVerification((current) => ({
      ...current,
      [field]: value,
    }));

    setVerificationMessage("");
    setVerificationError("");
  }

  async function runMetadataBackfill() {
    if (backfillRunning) return;

    setBackfillRunning(true);
    setBackfillResult("");
    setBackfillError("");

    try {
      const response = await fetch(
        "/api/admin/backfill-steam-metadata",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const responseText = await response.text();

      let result: unknown;

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        result = responseText;
      }

      if (!response.ok) {
        setBackfillError(
          `Backfill failed (HTTP ${response.status}): ${
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2)
          }`
        );

        return;
      }

      setBackfillResult(
        typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.error(
        "Metadata backfill request failed:",
        error
      );

      setBackfillError(
        "Could not contact the metadata backfill API. Check that the development server is running and inspect the terminal for errors."
      );
    } finally {
      setBackfillRunning(false);
    }
  }

  const readinessChecks = [
    {
      title: "AI claims reviewed",
      complete: verification.ai_claims_checked,
      detail: verification.ai_claims_checked
        ? "The developer's disclosure has been reviewed."
        : "The developer's AI claims have not been checked.",
    },
    {
      title: "Evidence inspected",
      complete: verification.evidence_checked,
      detail: verification.evidence_checked
        ? "Supporting material has been inspected."
        : "Supporting evidence has not been checked.",
    },
    {
      title: "Game launched",
      complete: verification.game_launched,
      detail: verification.game_launched
        ? "The game has been launched successfully."
        : "Successful launch has not been confirmed.",
    },
    {
      title: "Core gameplay tested",
      complete: verification.core_gameplay_tested,
      detail: verification.core_gameplay_tested
        ? "Core gameplay has been tested."
        : "Core gameplay has not been tested.",
    },
    {
      title: "Bugs recorded",
      complete: verification.bugs_recorded,
      detail: verification.bugs_recorded
        ? "Bugs have been documented, or no observed issues have been recorded."
        : "Bugs have not been documented and no-issue findings have not been confirmed.",
    },
    {
      title: "Performance checked",
      complete: verification.performance_checked,
      detail: verification.performance_checked
        ? "Performance has been checked in the recorded test environment."
        : "Performance has not been checked.",
    },
    {
      title: "Testing notes recorded",
      complete: Boolean(verification.testing_notes.trim()),
      detail: verification.testing_notes.trim()
        ? "Testing notes have been recorded."
        : "Record what was tested and the observed results.",
    },
    {
      title: "Public summary written",
      complete: Boolean(verification.public_summary.trim()),
      detail: verification.public_summary.trim()
        ? "A public explanation is ready."
        : "A public summary is required to publish.",
    },
  ];

  const readinessCount = readinessChecks.filter(
    (item) => item.complete
  ).length;

  const priorityOrder: Record<SubmissionStatus, number> = {
    "Pending Review": 0,
    "Needs More Information": 1,
    Approved: 2,
    Rejected: 3,
  };

  const claimPriorityOrder: Record<ClaimStatus, number> = {
    Pending: 0,
    "Needs More Information": 1,
    Approved: 2,
    Rejected: 3,
  };

  const approvedMissingInfoCount = submissions.filter(
    (submission) =>
      submission.status === "Approved" &&
      getMissingInformation(submission).length > 0
  ).length;

  const filteredSubmissions = (
    filter === "All"
      ? submissions
      : filter === "Needs attention"
        ? submissions.filter(
            (submission) =>
              submission.status === "Pending Review" ||
              submission.status === "Needs More Information"
          )
        : filter === "Approved with missing information"
          ? submissions.filter(
              (submission) =>
                submission.status === "Approved" &&
                getMissingInformation(submission).length > 0
            )
          : submissions.filter(
              (submission) => submission.status === filter
            )
  ).sort((a, b) => {
    const priorityDifference =
      priorityOrder[a.status] - priorityOrder[b.status];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return (
      new Date(a.submittedAt).getTime() -
      new Date(b.submittedAt).getTime()
    );
  });

  const filteredClaims = (
    claimFilter === "All"
      ? claims
      : claimFilter === "Needs attention"
        ? claims.filter(
            (claim) =>
              claim.status === "Pending" ||
              claim.status === "Needs More Information"
          )
        : claims.filter(
            (claim) => claim.status === claimFilter
          )
  ).sort((a, b) => {
    const priorityDifference =
      claimPriorityOrder[a.status] -
      claimPriorityOrder[b.status];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return (
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
    );
  });

  const pendingCount = submissions.filter(
    (submission) => submission.status === "Pending Review"
  ).length;

  const needsInfoCount = submissions.filter(
    (submission) =>
      submission.status === "Needs More Information"
  ).length;

  const pendingClaimCount = claims.filter(
    (claim) => claim.status === "Pending"
  ).length;

  const claimNeedsInfoCount = claims.filter(
    (claim) => claim.status === "Needs More Information"
  ).length;

  const submissionNeedsAttentionCount =
    pendingCount + needsInfoCount;

  const claimNeedsAttentionCount =
    pendingClaimCount + claimNeedsInfoCount;

  const playtestReviewCount = testReviews.length;

  const totalNeedsAttention =
    submissionNeedsAttentionCount +
    claimNeedsAttentionCount +
    playtestReviewCount;

  async function saveVerification() {
    if (!selectedSubmission) return;

    setVerificationError("");
    setVerificationMessage("");

    if (
      verification.published &&
      selectedSubmission.status !== "Approved"
    ) {
      setVerificationError(
        "Approve the store listing before publishing its verification results."
      );
      return;
    }

    let score: number | null = null;

    if (verification.quality_score.trim() !== "") {
      score = Number(verification.quality_score);

      if (
        !Number.isFinite(score) ||
        score < 1 ||
        score > 10 ||
        !Number.isInteger(score * 10)
      ) {
        setVerificationError(
          "Enter a quality score from 1 to 10, using up to one decimal place."
        );
        return;
      }
    }

    if (
      verification.quality_status !== "Tested" &&
      score !== null
    ) {
      setVerificationError(
        "Record a quality score only after the game has been tested."
      );
      return;
    }

    if (verification.quality_status === "Tested") {
      if (!verification.game_launched) {
        setVerificationError(
          "Mark the game as successfully launched before saving a Tested status."
        );
        return;
      }

      if (!verification.core_gameplay_tested) {
        setVerificationError(
          "Mark core gameplay as tested before saving a Tested status."
        );
        return;
      }

      if (!verification.bugs_recorded) {
        setVerificationError(
          "Record bugs found, or explicitly record that no bugs were observed, before saving a Tested status."
        );
        return;
      }

      if (!verification.performance_checked) {
        setVerificationError(
          "Complete the performance check before saving a Tested status."
        );
        return;
      }

      if (!verification.testing_notes.trim()) {
        setVerificationError(
          "Add testing notes explaining what you played and assessed before marking the game Tested."
        );
        return;
      }
    }

    if (score !== null) {
      const requiredScoreChecksComplete =
        verification.quality_status === "Tested" &&
        verification.ai_status ===
          "Supported by Evidence" &&
        verification.ai_claims_checked &&
        verification.evidence_checked &&
        verification.game_launched &&
        verification.core_gameplay_tested &&
        verification.bugs_recorded &&
        verification.performance_checked &&
        Boolean(verification.testing_notes.trim());

      if (!requiredScoreChecksComplete) {
        setVerificationError(
          "A quality score requires a Tested status, supported AI evidence, all six verification checks completed, and documented testing notes."
        );
        return;
      }
    }

    if (
      verification.ai_status ===
        "Supported by Evidence" &&
      (!verification.ai_claims_checked ||
        !verification.evidence_checked)
    ) {
      setVerificationError(
        "To mark AI claims as Supported by Evidence, review the claims and inspect supporting evidence first."
      );
      return;
    }

    if (
      verification.published &&
      !verification.public_summary.trim()
    ) {
      setVerificationError(
        "Add a public summary before publishing the assessment."
      );
      return;
    }

    if (
      verification.published &&
      verification.ai_status === "Not Reviewed"
    ) {
      setVerificationError(
        "Choose an AI disclosure assessment before publishing."
      );
      return;
    }

    const incompleteChecks = readinessChecks.filter(
      (item) => !item.complete
    );

    if (
      verification.published &&
      incompleteChecks.length > 0 &&
      !verification.limitations.trim()
    ) {
      setVerificationError(
        "Some checks are incomplete. Add a public limitations statement explaining what remains unverified, or complete the outstanding checks."
      );
      return;
    }

    setVerificationSaving(true);

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setVerificationSaving(false);
      setVerificationError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    const { error } = await supabase
      .from("game_verifications")
      .upsert(
        {
          submission_id: selectedSubmission.id,
          ai_status: verification.ai_status,
          quality_status: verification.quality_status,
          quality_score: score,
          public_summary:
            verification.public_summary.trim(),
          evidence_summary:
            verification.evidence_summary.trim(),
          reviewer_notes:
            verification.reviewer_notes.trim(),
          published: verification.published,
          ai_claims_checked:
            verification.ai_claims_checked,
          evidence_checked: verification.evidence_checked,
          game_launched: verification.game_launched,
          core_gameplay_tested:
            verification.core_gameplay_tested,
          bugs_recorded: verification.bugs_recorded,
          performance_checked:
            verification.performance_checked,
          testing_notes:
            verification.testing_notes.trim(),
          limitations: verification.limitations.trim(),
          reviewed_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" }
      );

    setVerificationSaving(false);

    if (error) {
      console.error(
        "Could not save verification:",
        error
      );

      setVerificationError(
        "Verification could not be saved. Check the table columns, policies and database permissions."
      );

      return;
    }

    setVerificationMessage(
      verification.published
        ? incompleteChecks.length > 0
          ? "Assessment published with outstanding checks disclosed in the limitations."
          : "Verification assessment saved and published."
        : "Assessment saved as unpublished."
    );
  }

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-[#090b0a] p-10 text-zinc-100">
        <p className="text-zinc-400">
          Checking administrator permissions...
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#090b0a] p-10 text-zinc-100">
        <h1 className="text-2xl font-bold">
          Access denied
        </h1>

        <p className="mt-3 text-zinc-400">
          You need administrator permissions to view this
          page.
        </p>

        <a
          href="/"
          className="mt-5 inline-block text-emerald-400 underline"
        >
          Return home
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Playtested Admin
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Review
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Review developer submissions, ownership claims
            and independent playtest reports, then manage
            Playtested assessments separately.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Needs attention",
              value: totalNeedsAttention,
            },
            {
              label: "Pending submissions",
              value: pendingCount,
            },
            {
              label: "Pending claims",
              value: pendingClaimCount,
            },
            {
              label: "Playtest reviews",
              value: playtestReviewCount,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${panelClass} p-5`}
            >
              <p className="text-sm text-zinc-400">
                {stat.label}
              </p>

              <p className="mt-2 text-3xl font-bold">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className={`${panelClass} mb-8 overflow-hidden`}>
          <button
            type="button"
            onClick={() =>
              setCatalogueOpen((current) => !current)
            }
            className="flex w-full items-center justify-between gap-4 p-5 text-left"
          >
            <div>
              <h2 className="text-lg font-semibold">
                Catalogue management
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Steam importing, imported catalogue and
                metadata tools.
              </p>
            </div>

            <span
              className={`text-xl text-zinc-500 transition ${
                catalogueOpen ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {catalogueOpen && (
            <div className="space-y-6 border-t border-zinc-800 p-5">
              <SteamImporter />

              <ImportedSteamCatalogue />

              <div className="rounded-xl border border-zinc-800 bg-[#090b0a] p-5">
                <h3 className="font-semibold">
                  Steam metadata backfill
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Process existing Steam catalogue records
                  waiting for metadata. This does not verify
                  or approve games.
                </p>

                <button
                  type="button"
                  onClick={runMetadataBackfill}
                  disabled={backfillRunning}
                  className="mt-4 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {backfillRunning
                    ? "Processing metadata..."
                    : "Run metadata backfill"}
                </button>

                {backfillRunning && (
                  <p className="mt-3 text-sm text-zinc-400">
                    Processing the batch. Keep this page open
                    until the request finishes.
                  </p>
                )}

                {backfillError && (
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                    {backfillError}
                  </pre>
                )}

                {backfillResult && (
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs leading-5 text-zinc-300">
                    {backfillResult}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 flex border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setReviewTab("submissions")}
            className={`border-b-2 px-5 py-4 text-sm font-semibold transition ${
              reviewTab === "submissions"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Game submissions
            {submissionNeedsAttentionCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
                {submissionNeedsAttentionCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setReviewTab("claims")}
            className={`border-b-2 px-5 py-4 text-sm font-semibold transition ${
              reviewTab === "claims"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Developer claims
            {claimNeedsAttentionCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
                {claimNeedsAttentionCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setReviewTab("playtests")}
            className={`border-b-2 px-5 py-4 text-sm font-semibold transition ${
              reviewTab === "playtests"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Playtest reviews
            {playtestReviewCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
                {playtestReviewCount}
              </span>
            )}
          </button>
        </div>

        {reviewTab === "submissions" && (
          <>
            {pageError && (
              <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
                {pageError}
              </div>
            )}

            <div className="mb-6 flex flex-wrap gap-2">
              {(
                [
                  "All",
                  "Needs attention",
                  "Approved with missing information",
                  ...submissionStatuses,
                ] as SubmissionFilter[]
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-lg px-3 py-2 text-xs transition sm:text-sm ${
                    filter === status
                      ? "bg-emerald-400 font-semibold text-black"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  {status}

                  {status === "Needs attention" && (
                    <span className="ml-2">
                      {submissionNeedsAttentionCount}
                    </span>
                  )}

                  {status ===
                    "Approved with missing information" && (
                    <span className="ml-2">
                      {approvedMissingInfoCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!loaded ? (
              <p className="py-10 text-zinc-400">
                Loading submissions...
              </p>
            ) : submissions.length === 0 ? (
              <div className={`${panelClass} p-5`}>
                <h2 className="font-semibold">
                  No submissions yet
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  New developer submissions will appear here.
                </p>
              </div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold">
                      Submissions
                    </h2>

                    <span className="text-xs text-zinc-500">
                      {filteredSubmissions.length} shown
                    </span>
                  </div>

                  <div className="space-y-2">
                    {filteredSubmissions.map(
                      (submission) => {
                        const missing =
                          getMissingInformation(
                            submission
                          );

                        return (
                          <button
                            key={submission.id}
                            type="button"
                            onClick={() =>
                              setSelectedId(
                                submission.id
                              )
                            }
                            className={`w-full rounded-xl border p-4 text-left transition ${
                              selectedId === submission.id
                                ? "border-emerald-400 bg-emerald-400/5"
                                : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {submission.imageUrl ? (
                                <img
                                  src={
                                    submission.imageUrl
                                  }
                                  alt=""
                                  className="h-14 w-20 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-[#090b0a] text-[10px] text-zinc-600">
                                  No image
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">
                                      {
                                        submission.title
                                      }
                                    </p>

                                    <p className="mt-1 truncate text-xs text-zinc-500">
                                      {
                                        submission.developer
                                      }
                                    </p>
                                  </div>

                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${statusClasses(
                                      submission.status
                                    )}`}
                                  >
                                    {
                                      submission.status
                                    }
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                                  <span>
                                    {submission.genre ||
                                      "Genre missing"}
                                  </span>

                                  <span>·</span>

                                  <span>
                                    {formatDate(
                                      submission.submittedAt
                                    )}
                                  </span>
                                </div>

                                {missing.length > 0 && (
                                  <p className="mt-2 text-xs text-amber-300">
                                    {missing.length} missing
                                    field
                                    {missing.length === 1
                                      ? ""
                                      : "s"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}

                    {filteredSubmissions.length ===
                      0 && (
                      <div
                        className={`${panelClass} p-5`}
                      >
                        <p className="text-sm text-zinc-400">
                          No submissions match this
                          filter.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="lg:sticky lg:top-6">
                  {selectedSubmission ? (
                    <div className="space-y-4">
                      <div
                        className={`${panelClass} p-5`}
                      >
                        <div className="flex items-start gap-4">
                          {selectedSubmission.imageUrl ? (
                            <img
                              src={
                                selectedSubmission.imageUrl
                              }
                              alt=""
                              className="h-20 w-28 shrink-0 rounded-lg object-cover"
                            />
                          ) : null}

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                              Submission review
                            </p>

                            <h2 className="mt-1 text-2xl font-bold">
                              {
                                selectedSubmission.title
                              }
                            </h2>

                            <p className="mt-1 text-sm text-zinc-400">
                              By{" "}
                              {
                                selectedSubmission.developer
                              }
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${statusClasses(
                              selectedSubmission.status
                            )}`}
                          >
                            {
                              selectedSubmission.status
                            }
                          </span>
                        </div>
                      </div>

                      <CollapsibleSection
                        title="Listing review"
                        description="Approve, reject or request more information."
                        defaultOpen
                      >
                        <label className={labelClass}>
                          Listing review status
                        </label>

                        <select
                          value={draftStatus}
                          disabled={
                            savingId ===
                            selectedSubmission.id
                          }
                          onChange={(event) => {
                            setDraftStatus(
                              event.target
                                .value as SubmissionStatus
                            );
                            setPageError("");
                          }}
                          className={inputClass}
                        >
                          {submissionStatuses.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            )
                          )}
                        </select>

                        {draftStatus ===
                          "Approved" &&
                          draftMissingInformation.length >
                            0 && (
                            <div className="mt-4 rounded-lg border border-red-400/40 bg-red-400/10 p-4">
                              <p className="text-sm font-bold text-red-300">
                                Missing information
                              </p>

                              <p className="mt-2 text-xs leading-5 text-red-200">
                                You are approving a
                                listing with the
                                following missing
                                fields:
                              </p>

                              <ul className="mt-2 list-inside list-disc text-xs text-red-200">
                                {draftMissingInformation.map(
                                  (item) => (
                                    <li key={item}>
                                      {item}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        {(draftStatus ===
                          "Rejected" ||
                          draftStatus ===
                            "Needs More Information") && (
                          <div className="mt-4">
                            <label
                              className={labelClass}
                            >
                              {draftStatus ===
                              "Rejected"
                                ? "Reason for rejection"
                                : "Information required"}
                            </label>

                            <textarea
                              rows={4}
                              value={
                                reviewReasonDraft
                              }
                              onChange={(event) => {
                                setReviewReasonDraft(
                                  event.target.value
                                );
                                setPageError("");
                              }}
                              className={inputClass}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              selectedSubmission.id,
                              draftStatus,
                              reviewReasonDraft
                            )
                          }
                          disabled={
                            savingId ===
                              selectedSubmission.id ||
                            ((draftStatus ===
                              "Rejected" ||
                              draftStatus ===
                                "Needs More Information") &&
                              !reviewReasonDraft.trim())
                          }
                          className="mt-4 w-full rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
                        >
                          {savingId ===
                          selectedSubmission.id
                            ? "Saving decision..."
                            : "Save listing decision"}
                        </button>
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Game details & disclosure"
                        description="Developer-supplied listing information and AI disclosure."
                      >
                        {(() => {
                          const missing =
                            getMissingInformation(
                              selectedSubmission
                            );

                          return (
                            <>
                              <div
                                className={`mb-6 rounded-lg border p-4 ${
                                  missing.length
                                    ? "border-amber-400/30 bg-amber-400/5"
                                    : "border-emerald-400/20 bg-emerald-400/5"
                                }`}
                              >
                                <p className="text-sm font-semibold">
                                  {missing.length
                                    ? `${missing.length} missing field${missing.length === 1 ? "" : "s"}`
                                    : "Required listing information supplied"}
                                </p>

                                {missing.length >
                                  0 && (
                                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                                    {missing.join(
                                      " · "
                                    )}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-5">
                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Genre
                                  </p>
                                  <p className="text-sm">
                                    {selectedSubmission.genre ||
                                      "Not supplied"}
                                  </p>
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Description
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                    {selectedSubmission.description ||
                                      "Not supplied"}
                                  </p>
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Game or store link
                                  </p>

                                  {selectedSubmission.gameLink ? (
                                    <a
                                      href={
                                        selectedSubmission.gameLink
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="break-all text-sm text-emerald-400 underline"
                                    >
                                      {
                                        selectedSubmission.gameLink
                                      }
                                    </a>
                                  ) : (
                                    <p className="text-sm text-zinc-500">
                                      Not supplied
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    AI classification
                                  </p>
                                  <p className="text-sm">
                                    {selectedSubmission.aiType ||
                                      "Not supplied"}
                                  </p>
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Where AI is used
                                  </p>

                                  {selectedSubmission
                                    .aiAreas.length ? (
                                    <div className="flex flex-wrap gap-2">
                                      {selectedSubmission.aiAreas.map(
                                        (area) => (
                                          <span
                                            key={
                                              area
                                            }
                                            className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                                          >
                                            {
                                              area
                                            }
                                          </span>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-zinc-500">
                                      No areas
                                      specified
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Developer's AI
                                    explanation
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                    {selectedSubmission.aiExplanation ||
                                      "Not supplied"}
                                  </p>
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Developer evidence
                                  </p>

                                  {selectedSubmission.evidenceLink ? (
                                    <a
                                      href={
                                        selectedSubmission.evidenceLink
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm text-emerald-400 underline"
                                    >
                                      Open evidence
                                      link ↗
                                    </a>
                                  ) : (
                                    <p className="text-sm text-zinc-500">
                                      Not supplied
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p
                                    className={
                                      labelClass
                                    }
                                  >
                                    Submitted
                                  </p>
                                  <p className="text-sm text-zinc-400">
                                    {formatDate(
                                      selectedSubmission.submittedAt
                                    )}
                                  </p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Independent assessment"
                        description={`Verification readiness: ${readinessCount}/${readinessChecks.length}`}
                      >
                        {!verificationLoaded ? (
                          <p className="text-sm text-zinc-400">
                            Loading verification
                            record...
                          </p>
                        ) : (
                          <div className="space-y-5">
                            <div className="rounded-xl border border-zinc-800 bg-[#090b0a] p-4">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold">
                                  Assessment readiness
                                </h3>

                                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">
                                  {readinessCount}/
                                  {
                                    readinessChecks.length
                                  }
                                </span>
                              </div>

                              <div className="mt-5 space-y-4">
                                {readinessChecks.map(
                                  (item) => (
                                    <ReadinessItem
                                      key={
                                        item.title
                                      }
                                      complete={
                                        item.complete
                                      }
                                      title={
                                        item.title
                                      }
                                      detail={
                                        item.detail
                                      }
                                    />
                                  )
                                )}
                              </div>
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                AI disclosure
                                assessment
                              </label>

                              <select
                                value={
                                  verification.ai_status
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "ai_status",
                                    event.target
                                      .value as AIStatus
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                {aiStatuses.map(
                                  (status) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {
                                        status
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Gameplay testing
                                status
                              </label>

                              <select
                                value={
                                  verification.quality_status
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "quality_status",
                                    event.target
                                      .value as QualityStatus
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                {qualityStatuses.map(
                                  (status) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {
                                        status
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div className="rounded-xl border border-zinc-800 p-4">
                              <h3 className="font-semibold">
                                Verification
                                checklist
                              </h3>

                              <div className="mt-4 space-y-4">
                                {checklistItems.map(
                                  (item) => (
                                    <label
                                      key={
                                        item.field
                                      }
                                      className="flex cursor-pointer items-start gap-3"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          verification[
                                            item
                                              .field
                                          ]
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateVerification(
                                            item.field as ChecklistField,
                                            event
                                              .target
                                              .checked
                                          )
                                        }
                                        className="mt-1 accent-emerald-400"
                                      />

                                      <span>
                                        <span className="block text-sm font-medium">
                                          {
                                            item.label
                                          }
                                        </span>

                                        <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                          {
                                            item.description
                                          }
                                        </span>
                                      </span>
                                    </label>
                                  )
                                )}
                              </div>
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Testing notes
                              </label>

                              <textarea
                                rows={5}
                                value={
                                  verification.testing_notes
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "testing_notes",
                                    event.target
                                      .value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Testing limitations
                              </label>

                              <textarea
                                rows={3}
                                value={
                                  verification.limitations
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "limitations",
                                    event.target
                                      .value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Quality score,
                                optional, 1 to 10
                              </label>

                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="0.1"
                                value={
                                  verification.quality_score
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "quality_score",
                                    event.target
                                      .value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Evidence reviewed
                              </label>

                              <textarea
                                rows={4}
                                value={
                                  verification.evidence_summary
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "evidence_summary",
                                    event.target
                                      .value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Public assessment
                                summary
                              </label>

                              <textarea
                                rows={4}
                                value={
                                  verification.public_summary
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "public_summary",
                                    event.target
                                      .value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </div>

                            <div>
                              <label
                                className={labelClass}
                              >
                                Private reviewer
                                notes
                              </label>

                              <textarea
                                rows={4}
                                value={
                                  verification.reviewer_notes
                                }
                                onChange={(event) =>
                                  updateVerification(
                                    "reviewer_notes",
                                    event.target
                                      .value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    verification.published
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateVerification(
                                      "published",
                                      event
                                        .target
                                        .checked
                                    )
                                  }
                                  className="mt-1 accent-emerald-400"
                                />

                                <span>
                                  <span className="block text-sm font-semibold">
                                    Publish
                                    verification
                                    results
                                  </span>

                                  <span className="mt-1 block text-xs leading-5 text-zinc-400">
                                    Only approved
                                    listings can have
                                    public assessments.
                                  </span>
                                </span>
                              </label>
                            </div>

                            {selectedSubmission.status !==
                              "Approved" && (
                              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
                                This listing is not
                                approved. You can save
                                an internal assessment,
                                but cannot publish it.
                              </p>
                            )}

                            {verificationError && (
                              <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                                {
                                  verificationError
                                }
                              </p>
                            )}

                            {verificationMessage && (
                              <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                                {
                                  verificationMessage
                                }
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={
                                saveVerification
                              }
                              disabled={
                                verificationSaving ||
                                !verificationLoaded
                              }
                              className="w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-300 disabled:opacity-50"
                            >
                              {verificationSaving
                                ? "Saving assessment..."
                                : "Save verification assessment"}
                            </button>
                          </div>
                        )}
                      </CollapsibleSection>
                    </div>
                  ) : (
                    <div
                      className={`${panelClass} p-5`}
                    >
                      <p className="text-sm text-zinc-400">
                        Select a submission to review.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {reviewTab === "claims" && (
          <>
            {claimError && (
              <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
                {claimError}
              </div>
            )}

            <div className="mb-6 flex flex-wrap gap-2">
              {(
                [
                  "All",
                  "Needs attention",
                  ...claimStatuses,
                ] as ClaimFilter[]
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setClaimFilter(status)
                  }
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    claimFilter === status
                      ? "bg-emerald-400 font-semibold text-black"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  {status}

                  {status === "Needs attention" && (
                    <span className="ml-2">
                      {claimNeedsAttentionCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!claimsLoaded ? (
              <p className="py-10 text-zinc-400">
                Loading developer claims...
              </p>
            ) : claims.length === 0 ? (
              <div className={`${panelClass} p-5`}>
                <h2 className="font-semibold">
                  No developer claims
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Claims for existing games will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold">
                      Developer claims
                    </h2>

                    <span className="text-xs text-zinc-500">
                      {filteredClaims.length} shown
                    </span>
                  </div>

                  <div className="space-y-2">
                    {filteredClaims.map((claim) => (
                      <button
                        key={claim.id}
                        type="button"
                        onClick={() =>
                          setSelectedClaimId(
                            claim.id
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selectedClaimId === claim.id
                            ? "border-emerald-400 bg-emerald-400/5"
                            : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">
                              {claim.gameTitle}
                            </h3>

                            <p className="mt-1 truncate text-xs text-zinc-500">
                              {claim.developerName}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${statusClasses(
                              claim.status
                            )}`}
                          >
                            {claim.status}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                          <span className="rounded-md bg-zinc-800 px-2 py-1">
                            {claim.relationship}
                          </span>

                          <span>
                            {formatDate(
                              claim.createdAt
                            )}
                          </span>
                        </div>
                      </button>
                    ))}

                    {filteredClaims.length === 0 && (
                      <div
                        className={`${panelClass} p-5`}
                      >
                        <p className="text-sm text-zinc-400">
                          No claims match this filter.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="lg:sticky lg:top-6">
                  {selectedClaim ? (
                    <div
                      className={`${panelClass} p-5`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                            Developer claim
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            {
                              selectedClaim.gameTitle
                            }
                          </h2>

                          <p className="mt-1 text-sm text-zinc-400">
                            {
                              selectedClaim.developerName
                            }
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${statusClasses(
                            selectedClaim.status
                          )}`}
                        >
                          {selectedClaim.status}
                        </span>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                          <p className={labelClass}>
                            Relationship
                          </p>

                          <p className="text-sm">
                            {selectedClaim.relationship ||
                              "Not supplied"}
                          </p>
                        </div>

                        <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                          <p className={labelClass}>
                            Submitted
                          </p>

                          <p className="text-sm">
                            {formatDate(
                              selectedClaim.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className={labelClass}>
                          Claim reason
                        </p>

                        <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                            {selectedClaim.claimReason ||
                              "No reason supplied"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className={labelClass}>
                          Verification evidence
                        </p>

                        {selectedClaim.evidenceUrl ? (
                          <a
                            href={
                              selectedClaim.evidenceUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-emerald-400 underline"
                          >
                            Open evidence ↗
                          </a>
                        ) : (
                          <p className="text-sm text-amber-300">
                            No evidence URL supplied
                          </p>
                        )}
                      </div>

                      <div className="mt-5">
                        <p className={labelClass}>
                          Claimant account ID
                        </p>

                        <p className="break-all font-mono text-xs text-zinc-500">
                          {selectedClaim.claimantId}
                        </p>
                      </div>

                      <div className="my-6 border-t border-zinc-800" />

                      <div>
                        <label className={labelClass}>
                          Claim decision
                        </label>

                        <select
                          value={claimStatusDraft}
                          onChange={(event) => {
                            setClaimStatusDraft(
                              event.target
                                .value as ClaimStatus
                            );
                            setClaimError("");
                            setClaimMessage("");
                          }}
                          disabled={
                            savingClaimId ===
                            selectedClaim.id
                          }
                          className={inputClass}
                        >
                          {claimStatuses.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="mt-5">
                        <label className={labelClass}>
                          Admin notes
                          {(claimStatusDraft ===
                            "Rejected" ||
                            claimStatusDraft ===
                              "Needs More Information") &&
                            " *"}
                        </label>

                        <textarea
                          rows={5}
                          value={
                            claimAdminNotesDraft
                          }
                          onChange={(event) => {
                            setClaimAdminNotesDraft(
                              event.target.value
                            );
                            setClaimError("");
                            setClaimMessage("");
                          }}
                          placeholder={
                            claimStatusDraft ===
                            "Needs More Information"
                              ? "Explain what evidence or information is required."
                              : claimStatusDraft ===
                                  "Rejected"
                                ? "Explain why the claim is being rejected."
                                : "Private notes about the claim and evidence reviewed."
                          }
                          className={inputClass}
                        />
                      </div>

                      {claimStatusDraft ===
                        "Approved" && (
                        <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
                          <p className="text-sm font-semibold text-emerald-300">
                            Approving developer
                            relationship
                          </p>

                          <p className="mt-2 text-xs leading-5 text-zinc-400">
                            This records that
                            Playtested has approved
                            the developer claim. It
                            does not make the game
                            Assessed or Verified.
                          </p>
                        </div>
                      )}

                      {claimError && (
                        <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                          {claimError}
                        </p>
                      )}

                      {claimMessage && (
                        <p className="mt-5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                          {claimMessage}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={updateClaim}
                        disabled={
                          savingClaimId ===
                          selectedClaim.id
                        }
                        className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingClaimId ===
                        selectedClaim.id
                          ? "Saving claim decision..."
                          : "Save claim decision"}
                      </button>

                      {selectedClaim.reviewedAt && (
                        <p className="mt-4 text-xs text-zinc-500">
                          Last reviewed{" "}
                          {formatDate(
                            selectedClaim.reviewedAt
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`${panelClass} p-5`}
                    >
                      <p className="text-sm text-zinc-400">
                        Select a developer claim to
                        review.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {reviewTab === "playtests" && (
          <>
            {testReviewMessage && (
              <div className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                {testReviewMessage}
              </div>
            )}

            {testReviewError && (
              <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
                {testReviewError}
              </div>
            )}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Independent playtest reviews
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Review submitted Tester Hub reports. Accepted tests award 100 XP and can contribute to Playtested assessment evidence.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void refreshTestReviews()}
                disabled={!testReviewsLoaded || busyTestReviewId !== null}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {!testReviewsLoaded ? (
              <div className={`${panelClass} p-8 text-sm text-zinc-400`}>
                Loading submitted tests...
              </div>
            ) : testReviews.length === 0 && !testReviewError ? (
              <div className={`${panelClass} p-8`}>
                <h3 className="text-lg font-semibold">All caught up</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  There are no independent playtests awaiting review.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {testReviews.map((review) => (
                  <article
                    key={review.test_id}
                    className={`${panelClass} p-5 sm:p-6`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                          Independent Tester Hub report
                        </p>
                        <h3 className="mt-2 text-xl font-bold">
                          {review.game_title}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          Tester: {review.tester_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Submitted: {review.submitted_at ? formatDate(review.submitted_at) : "Date unavailable"}
                        </p>
                      </div>

                      <span className="h-fit w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                        Awaiting review
                      </span>
                    </div>

                    {review.overall_score !== null ? (
                      <>
                        <div className="mt-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                            Tester verdict
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Overall experience</p>
                              <p className="text-2xl font-bold">
                                {review.overall_score}
                                <span className="ml-1 text-sm font-normal text-zinc-500">/ 10</span>
                              </p>
                            </div>

                            <div className="rounded-lg border border-[#77f29b]/30 bg-[#77f29b]/[0.06] p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-[#77f29b]">Would continue playing</p>
                              <p className="mt-1 text-lg font-bold">
                                {formatIntent(review.continue_playing)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/[0.06] p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Would recommend</p>
                              <p className="mt-1 text-lg font-bold">
                                {formatIntent(review.recommend_game)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Time played</p>
                              <p className="text-2xl font-bold">
                                {review.hours_played ?? "N/A"}
                                {review.hours_played !== null && (
                                  <span className="ml-1 text-sm font-normal text-zinc-500">
                                    {review.hours_played === 1 ? " hour" : " hours"}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Gameplay</p>
                            <p className="text-xl font-bold">
                              {review.gameplay_score ?? "N/A"}
                              {review.gameplay_score !== null && (
                                <span className="ml-1 text-sm font-normal text-zinc-500">/ 10</span>
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg border border-sky-400/25 bg-sky-400/[0.04] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Performance</p>
                            <p className="text-xl font-bold">
                              {review.performance_score ?? "N/A"}
                              {review.performance_score !== null && (
                                <span className="ml-1 text-sm font-normal text-zinc-500">/ 10</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                            Detailed feedback
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Direct feedback from the tester about their experience.
                          </p>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                                What they enjoyed most
                              </p>
                              <div className="mt-2 min-h-28 whitespace-pre-wrap break-words rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-4 text-sm leading-6 text-zinc-200">
                                {review.enjoyed_most || "No answer provided."}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                                What frustrated them
                              </p>
                              <div className="mt-2 min-h-28 whitespace-pre-wrap break-words rounded-lg border border-amber-400/25 bg-amber-400/[0.04] p-4 text-sm leading-6 text-zinc-200">
                                {review.frustrations || "No answer provided."}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-red-300">
                                Bugs & technical issues
                              </p>
                              <div className="mt-2 min-h-28 whitespace-pre-wrap break-words rounded-lg border border-red-400/25 bg-red-400/[0.04] p-4 text-sm leading-6 text-zinc-200">
                                {review.bugs_found || "No bugs reported."}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                                Single biggest improvement
                              </p>
                              <div className="mt-2 min-h-28 whitespace-pre-wrap break-words rounded-lg border border-sky-400/25 bg-sky-400/[0.04] p-4 text-sm leading-6 text-zinc-200">
                                {review.biggest_improvement || "No answer provided."}
                              </div>
                            </div>
                          </div>

                          {review.feedback && (
                            <div className="mt-4">
                              <p className={labelClass}>Anything else</p>
                              <div className="whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-[#090b0a] p-4 text-sm leading-6 text-zinc-300">
                                {review.feedback}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
                          <p className="text-sm font-semibold text-amber-200">
                            Legacy playtest response
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Submitted before the structured V10 questionnaire. Only the original response fields are available.
                          </p>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                            <p className={labelClass}>Gameplay score</p>
                            <p className="text-2xl font-bold">
                              {review.gameplay_score ?? "N/A"}
                              {review.gameplay_score !== null && (
                                <span className="ml-1 text-sm font-normal text-zinc-500">/ 10</span>
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                            <p className={labelClass}>Performance score</p>
                            <p className="text-2xl font-bold">
                              {review.performance_score ?? "N/A"}
                              {review.performance_score !== null && (
                                <span className="ml-1 text-sm font-normal text-zinc-500">/ 10</span>
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                            <p className={labelClass}>Time played</p>
                            <p className="text-2xl font-bold">
                              {review.hours_played ?? "N/A"}
                              {review.hours_played !== null && (
                                <span className="ml-1 text-sm font-normal text-zinc-500">
                                  {review.hours_played === 1 ? " hour" : " hours"}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <div>
                            <p className={labelClass}>Tester feedback</p>
                            <div className="min-h-28 whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-[#090b0a] p-4 text-sm leading-6 text-zinc-300">
                              {review.feedback || "No feedback provided."}
                            </div>
                          </div>

                          <div>
                            <p className={labelClass}>Bugs reported</p>
                            <div className="min-h-28 whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-[#090b0a] p-4 text-sm leading-6 text-zinc-300">
                              {review.bugs_found || "No bugs reported."}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3 border-t border-zinc-800 pt-5">
                      <button
                        type="button"
                        onClick={() => void reviewTest(review.test_id, "accepted")}
                        disabled={busyTestReviewId !== null}
                        className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyTestReviewId === review.test_id
                          ? "Processing..."
                          : "Accept · Award 100 XP"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void reviewTest(review.test_id, "rejected")}
                        disabled={busyTestReviewId !== null}
                        className="rounded-lg border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject · No XP
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <p className="mt-10 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-500">
          Developer ownership claims, listing approval
          and Playtested verification are separate
          decisions. Approving a claim does not make a
          game Assessed or Verified.
        </p>
      </div>
    </main>
  );
}
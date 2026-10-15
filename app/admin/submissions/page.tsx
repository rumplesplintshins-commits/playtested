
"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "../../../lib/supabase";

type SubmissionStatus =
  | "Pending Review"
  | "Approved"
  | "Rejected"
  | "Needs More Information";

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
  price: string;
  aiType: string;
  aiAreas: string[];
  aiExplanation: string;
  evidenceLink: string;
  submittedAt: string;
  status: SubmissionStatus;
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

const statuses: SubmissionStatus[] = [
  "Pending Review",
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
  "rounded-xl border border-zinc-800 bg-zinc-900/60 p-5";

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
    description: "Documented observed defects or confirmed no issues during the test.",
  },
  {
    field: "performance_checked",
    label: "Performance checked",
    description: "Considered performance on the hardware and settings tested.",
  },
] as const;

type ChecklistField = (typeof checklistItems)[number]["field"];

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

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | SubmissionStatus>("All");
  const [loaded, setLoaded] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageError, setPageError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [verification, setVerification] =
    useState<Verification>(emptyVerification);
  const [verificationLoaded, setVerificationLoaded] = useState(false);
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");

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
      setPageError("");

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
        title: row.title,
        developer: row.developer_name,
        genre: row.genre,
        description: row.description,
        gameLink: row.game_link ?? "",
        imageUrl: row.image_url ?? "",
        price: row.price ?? "",
        aiType: row.ai_type,
        aiAreas: row.ai_areas ?? [],
        aiExplanation: row.ai_explanation ?? "",
        evidenceLink: row.evidence_link ?? "",
        submittedAt: row.submitted_at,
        status: row.status as SubmissionStatus,
      }));

      setSubmissions(mapped);
      setSelectedId((currentId) => {
        if (currentId && mapped.some((item) => item.id === currentId)) {
          return currentId;
        }
        return mapped[0]?.id ?? null;
      });
      setLoaded(true);
    }

    loadSubmissions();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

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
            data.quality_score == null ? "" : String(data.quality_score),
          public_summary: data.public_summary ?? "",
          evidence_summary: data.evidence_summary ?? "",
          reviewer_notes: data.reviewer_notes ?? "",
          published: data.published ?? false,
          ai_claims_checked: data.ai_claims_checked ?? false,
          evidence_checked: data.evidence_checked ?? false,
          game_launched: data.game_launched ?? false,
          core_gameplay_tested: data.core_gameplay_tested ?? false,
          bugs_recorded: data.bugs_recorded ?? false,
          performance_checked: data.performance_checked ?? false,
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

  async function updateStatus(id: string, status: SubmissionStatus) {
    setPageError("");
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("game_submissions")
      .update({ status })
      .eq("id", id);

    setSavingId(null);

    if (error) {
      console.error("Could not update submission:", error);
      setPageError(
        "The status could not be saved. Check your admin database permissions and try again."
      );
      return;
    }

    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === id ? { ...submission, status } : submission
      )
    );

    setVerificationMessage("");
  }

  function updateVerification<K extends keyof Verification>(
    field: K,
    value: Verification[K]
  ) {
    setVerification((current) => ({ ...current, [field]: value }));
    setVerificationMessage("");
    setVerificationError("");
  }

  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedId) ?? null;

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

  const filteredSubmissions =
    filter === "All"
      ? submissions
      : submissions.filter((submission) => submission.status === filter);

  const pendingCount = submissions.filter(
    (submission) => submission.status === "Pending Review"
  ).length;

  const approvedCount = submissions.filter(
    (submission) => submission.status === "Approved"
  ).length;

  const needsInfoCount = submissions.filter(
    (submission) => submission.status === "Needs More Information"
  ).length;

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

      if (!verification.testing_notes.trim()) {
        setVerificationError(
          "Add testing notes explaining what you played and assessed before marking the game Tested."
        );
        return;
      }
    }

    if (
      verification.ai_status === "Supported by Evidence" &&
      (!verification.ai_claims_checked || !verification.evidence_checked)
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
        "Some checks are incomplete. Add a public limitations statement explaining what has not been verified, or complete the outstanding checks."
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
      setVerificationError("Your session has expired. Please log in again.");
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
          public_summary: verification.public_summary.trim(),
          evidence_summary: verification.evidence_summary.trim(),
          reviewer_notes: verification.reviewer_notes.trim(),
          published: verification.published,
          ai_claims_checked: verification.ai_claims_checked,
          evidence_checked: verification.evidence_checked,
          game_launched: verification.game_launched,
          core_gameplay_tested: verification.core_gameplay_tested,
          bugs_recorded: verification.bugs_recorded,
          performance_checked: verification.performance_checked,
          testing_notes: verification.testing_notes.trim(),
          limitations: verification.limitations.trim(),
          reviewed_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" }
      );

    setVerificationSaving(false);

    if (error) {
      console.error("Could not save verification:", error);
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
        <p className="text-zinc-400">Checking administrator permissions...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#090b0a] p-10 text-zinc-100">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-3 text-zinc-400">
          You need administrator permissions to view this page.
        </p>
        <a href="/" className="mt-5 inline-block text-emerald-400 underline">
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
            Game submissions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Review submitted games, inspect their AI disclosures and evidence,
            and manage independent verification assessments.
          </p>
        </div>

        {pageError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300"
          >
            {pageError}
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total submissions", value: submissions.length },
            { label: "Pending review", value: pendingCount },
            { label: "Approved", value: approvedCount },
            { label: "Needs more info", value: needsInfoCount },
          ].map((stat) => (
            <div key={stat.label} className={panelClass}>
              <p className="text-sm text-zinc-400">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["All", ...statuses] as Array<"All" | SubmissionStatus>).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  filter === status
                    ? "bg-emerald-400 font-semibold text-black"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        {!loaded ? (
          <p className="py-10 text-zinc-400">Loading submissions...</p>
        ) : pageError && submissions.length === 0 ? (
          <div className={panelClass}>
            <p className="text-sm text-zinc-300">
              Submissions could not be loaded.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black"
            >
              Retry
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className={panelClass}>
            <h2 className="text-lg font-semibold">No submissions yet</h2>
            <p className="mt-2 text-sm text-zinc-400">
              New developer submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">
                Submissions ({filteredSubmissions.length})
              </h2>

              {filteredSubmissions.length === 0 ? (
                <div className={panelClass}>
                  <p className="text-sm text-zinc-400">
                    No submissions match this filter.
                  </p>
                </div>
              ) : (
                filteredSubmissions.map((submission) => (
                  <button
                    key={submission.id}
                    onClick={() => setSelectedId(submission.id)}
                    className={`block w-full rounded-xl border p-4 text-left transition ${
                      selectedId === submission.id
                        ? "border-emerald-400 bg-emerald-400/5"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                    }`}
                  >
                    <div className="mb-4 h-36 w-full overflow-hidden rounded-lg bg-[#090b0a]">
                      {submission.imageUrl ? (
                        <img
                          src={submission.imageUrl}
                          alt={`${submission.title} thumbnail`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                          No game thumbnail supplied
                        </div>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{submission.title}</h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {submission.developer}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                        {submission.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
                      <span className="rounded-md bg-zinc-800 px-2 py-1">
                        {submission.genre}
                      </span>
                      <span className="rounded-md bg-zinc-800 px-2 py-1">
                        {submission.aiType}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </section>

            <section className={`${panelClass} lg:sticky lg:top-6`}>
              {selectedSubmission ? (
                <>
                  <div className="mb-5 aspect-video w-full overflow-hidden rounded-xl bg-[#090b0a]">
                    {selectedSubmission.imageUrl ? (
                      <img
                        src={selectedSubmission.imageUrl}
                        alt={`${selectedSubmission.title} game artwork`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                        No game artwork supplied
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Submission details
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {selectedSubmission.title}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      By {selectedSubmission.developer}
                    </p>
                  </div>

                  <div className="mt-6">
                    <label className={labelClass}>Listing review status</label>
                    <select
                      value={selectedSubmission.status}
                      disabled={savingId === selectedSubmission.id}
                      onChange={(event) =>
                        updateStatus(
                          selectedSubmission.id,
                          event.target.value as SubmissionStatus
                        )
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-400 disabled:opacity-60"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {savingId === selectedSubmission.id && (
                      <p className="mt-2 text-xs text-zinc-400">
                        Saving status...
                      </p>
                    )}
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className={labelClass}>Genre</p>
                      <p className="text-sm">{selectedSubmission.genre}</p>
                    </div>

                    <div>
                      <p className={labelClass}>Price</p>
                      <p className="text-sm">
                        {selectedSubmission.price || "Not specified"}
                      </p>
                    </div>

                    <div>
                      <p className={labelClass}>Game description</p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {selectedSubmission.description}
                      </p>
                    </div>

                    <div>
                      <p className={labelClass}>Game or store link</p>
                      {selectedSubmission.gameLink ? (
                        <a
                          href={selectedSubmission.gameLink}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sm text-emerald-400 underline"
                        >
                          {selectedSubmission.gameLink}
                        </a>
                      ) : (
                        <p className="text-sm text-zinc-500">Not supplied</p>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>Thumbnail image URL</p>
                      {selectedSubmission.imageUrl ? (
                        <a
                          href={selectedSubmission.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sm text-emerald-400 underline"
                        >
                          Open image
                        </a>
                      ) : (
                        <p className="text-sm text-zinc-500">Not supplied</p>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>AI classification declared</p>
                      <p className="text-sm">{selectedSubmission.aiType}</p>
                    </div>

                    <div>
                      <p className={labelClass}>Where AI is used</p>
                      {selectedSubmission.aiAreas.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.aiAreas.map((area) => (
                            <span
                              key={area}
                              className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          No areas specified
                        </p>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>Developer's AI explanation</p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {selectedSubmission.aiExplanation || "Not supplied"}
                      </p>
                    </div>

                    <div>
                      <p className={labelClass}>Developer-supplied evidence</p>
                      {selectedSubmission.evidenceLink ? (
                        <a
                          href={selectedSubmission.evidenceLink}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sm text-emerald-400 underline"
                        >
                          Open evidence link
                        </a>
                      ) : (
                        <p className="text-sm text-zinc-500">Not supplied</p>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>Submitted</p>
                      <p className="text-sm text-zinc-400">
                        {selectedSubmission.submittedAt
                          ? new Date(
                              selectedSubmission.submittedAt
                            ).toLocaleString()
                          : "Date not recorded"}
                      </p>
                    </div>
                  </div>

                  <div className="my-8 border-t border-zinc-800" />

                  <section aria-labelledby="verification-heading">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Independent assessment
                    </p>
                    <h2
                      id="verification-heading"
                      className="mt-2 text-2xl font-bold"
                    >
                      Verification assessment
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Record what Playtested has actually assessed. Listing
                      approval does not constitute verification.
                    </p>

                    {!verificationLoaded ? (
                      <p className="mt-6 text-sm text-zinc-400">
                        Loading verification record...
                      </p>
                    ) : (
                      <div className="mt-6 space-y-5">
                        <div className="rounded-xl border border-zinc-800 bg-[#090b0a] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">
                                Assessment readiness
                              </h3>
                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                This checklist tracks the information recorded.
                                It does not automatically certify a game.
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                              {readinessCount}/{readinessChecks.length}
                            </span>
                          </div>

                          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all"
                              style={{
                                width: `${
                                  (readinessCount / readinessChecks.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>

                          <div className="mt-5 space-y-4">
                            {readinessChecks.map((item) => (
                              <ReadinessItem
                                key={item.title}
                                complete={item.complete}
                                title={item.title}
                                detail={item.detail}
                              />
                            ))}
                          </div>

                          {readinessCount < readinessChecks.length && (
                            <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">
                              Outstanding checks do not always prevent
                              publication, but the public limitations must
                              explain what remains unverified.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>
                            AI disclosure assessment
                          </label>
                          <select
                            value={verification.ai_status}
                            onChange={(event) =>
                              updateVerification(
                                "ai_status",
                                event.target.value as AIStatus
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm outline-none focus:border-emerald-400"
                          >
                            {aiStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            This is an evidence-based assessment of the
                            disclosure, not a guarantee that every use of AI
                            has been detected.
                          </p>
                        </div>

                        <div>
                          <label className={labelClass}>
                            Gameplay testing status
                          </label>
                          <select
                            value={verification.quality_status}
                            onChange={(event) =>
                              updateVerification(
                                "quality_status",
                                event.target.value as QualityStatus
                              )
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm outline-none focus:border-emerald-400"
                          >
                            {qualityStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-xl border border-zinc-800 p-4">
                          <h3 className="font-semibold">
                            Verification checklist
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            Tick an item only after performing that check.
                            Unticked items remain unconfirmed.
                          </p>

                          <div className="mt-4 space-y-4">
                            {checklistItems.map((item) => (
                              <label
                                key={item.field}
                                className="flex cursor-pointer items-start gap-3"
                              >
                                <input
                                  type="checkbox"
                                  checked={verification[item.field]}
                                  onChange={(event) =>
                                    updateVerification(
                                      item.field as ChecklistField,
                                      event.target.checked
                                    )
                                  }
                                  className="mt-1 accent-emerald-400"
                                />
                                <span>
                                  <span className="block text-sm font-medium">
                                    {item.label}
                                  </span>
                                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                    {item.description}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Testing notes</label>
                          <textarea
                            rows={5}
                            value={verification.testing_notes}
                            onChange={(event) =>
                              updateVerification(
                                "testing_notes",
                                event.target.value
                              )
                            }
                            placeholder="What did you play? What features and gameplay did you test? Include duration, environment and observed results."
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Testing limitations
                          </label>
                          <textarea
                            rows={3}
                            value={verification.limitations}
                            onChange={(event) =>
                              updateVerification(
                                "limitations",
                                event.target.value
                              )
                            }
                            placeholder="Explain what remains untested or unverified, including limited playtime, platforms or unavailable evidence."
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-400"
                          />
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            If you publish with incomplete checks, this
                            statement will be shown as a caveat on the public
                            assessment.
                          </p>
                        </div>

                        <div>
                          <label className={labelClass}>
                            Quality score, optional, 1 to 10
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={verification.quality_score}
                            onChange={(event) =>
                              updateVerification(
                                "quality_score",
                                event.target.value
                              )
                            }
                            placeholder="Only score games that have been tested"
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            A score is an editorial assessment, not an
                            objective measure of everyone's enjoyment.
                          </p>
                        </div>

                        <div>
                          <label className={labelClass}>
                            Evidence reviewed
                          </label>
                          <textarea
                            rows={4}
                            value={verification.evidence_summary}
                            onChange={(event) =>
                              updateVerification(
                                "evidence_summary",
                                event.target.value
                              )
                            }
                            placeholder="What evidence did you inspect? What did it establish, and what remains unverified?"
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Public assessment summary
                          </label>
                          <textarea
                            rows={4}
                            value={verification.public_summary}
                            onChange={(event) =>
                              updateVerification(
                                "public_summary",
                                event.target.value
                              )
                            }
                            placeholder="Summarise the checks performed, evidence supporting the findings and important caveats."
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Private reviewer notes
                          </label>
                          <textarea
                            rows={4}
                            value={verification.reviewer_notes}
                            onChange={(event) =>
                              updateVerification(
                                "reviewer_notes",
                                event.target.value
                              )
                            }
                            placeholder="Internal notes, follow-up questions and concerns"
                            className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-400"
                          />
                          <p className="mt-2 text-xs text-zinc-500">
                            These notes are excluded from the public results
                            view.
                          </p>
                        </div>

                        <div className="rounded-lg border border-zinc-800 bg-[#090b0a] p-4">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={verification.published}
                              onChange={(event) =>
                                updateVerification(
                                  "published",
                                  event.target.checked
                                )
                              }
                              className="mt-1 accent-emerald-400"
                            />
                            <span>
                              <span className="block text-sm font-semibold">
                                Publish verification results
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-zinc-400">
                                Only approved listings can have public
                                assessments. Incomplete checks require a
                                limitations statement.
                              </span>
                            </span>
                          </label>
                        </div>

                        {selectedSubmission.status !== "Approved" && (
                          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
                            This listing is not approved. You can save an
                            internal assessment, but cannot publish it.
                          </p>
                        )}

                        {verificationError && (
                          <p
                            role="alert"
                            className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
                          >
                            {verificationError}
                          </p>
                        )}

                        {verificationMessage && (
                          <p
                            role="status"
                            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"
                          >
                            {verificationMessage}
                          </p>
                        )}

                        <button
                          onClick={saveVerification}
                          disabled={
                            verificationSaving || !verificationLoaded
                          }
                          className="w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {verificationSaving
                            ? "Saving assessment..."
                            : "Save verification assessment"}
                        </button>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <p className="text-sm text-zinc-400">
                  Select a submission to review its details.
                </p>
              )}
            </section>
          </div>
        )}

        <p className="mt-10 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-500">
          Listing approval and verification are separate decisions.
          Published assessments describe the checks actually performed and
          do not guarantee that all AI use has been detected or that every
          player will enjoy the game.
        </p>
      </div>
    </main>
  );
}
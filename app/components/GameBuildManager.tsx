"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

type BuildStatus = "Queued" | "Testing" | "Complete" | "Failed";
type PulseResult = "Clear" | "Clear with limitations" | "Alert" | null;
type PulseRunStatus = "Queued" | "Running" | "Complete" | "Failed";

type GameBuild = {
  id: string;
  submission_id: string;
  version_label: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number | null;
  status: BuildStatus;
  pulse_result: PulseResult;
  tester_eligible: boolean;
  uploaded_at: string;
  testing_started_at: string | null;
  testing_completed_at: string | null;
};

type PulseRun = {
  id: string;
  build_id: string;
  status: PulseRunStatus;
  result: PulseResult;
  worker_version: string;
  pulse_version: string;
  profile: string;
  total_checks: number | null;
  launch_passed: number | null;
  launch_total: number | null;
  restart_passed: number | null;
  restart_total: number | null;
  interaction_confirmed: number | null;
  interaction_failed: number | null;
  interaction_inconclusive: number | null;
  interaction_total: number | null;
  sessions_with_errors: number;
  sessions_with_failed_requests: number;
  sessions_with_stalls: number;
  worker_session_errors: number;
  summary: string | null;
  limitations: string | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type Props = {
  submissionId: string;
  gameTitle: string;
};

const MAX_BUILD_BYTES = 500 * 1024 * 1024;

function formatBytes(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildStatusClasses(status: BuildStatus) {
  if (status === "Complete") return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  if (status === "Failed") return "border-red-400/30 bg-red-400/10 text-red-300";
  if (status === "Testing") return "border-violet-300/30 bg-violet-300/10 text-violet-200";
  return "border-sky-300/30 bg-sky-300/10 text-sky-200";
}

function resultClasses(result: PulseResult) {
  if (result === "Clear") return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  if (result === "Clear with limitations") return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  if (result === "Alert") return "border-red-400/30 bg-red-400/10 text-red-300";
  return "border-white/10 bg-white/[0.04] text-zinc-400";
}

function publicPulseLabel(result: PulseResult) {
  if (result === "Clear") return "PULSE CLEAR";
  if (result === "Clear with limitations") return "PULSE CLEAR · Interaction unconfirmed";
  if (result === "Alert") return "PULSE ALERT";
  return "Awaiting result";
}

export default function GameBuildManager({ submissionId, gameTitle }: Props) {
  const router = useRouter();
  const [builds, setBuilds] = useState<GameBuild[]>([]);
  const [runs, setRuns] = useState<PulseRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [queueingBuildId, setQueueingBuildId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBuilds = useCallback(async () => {
    const supabase = createClient();

    const { data: buildRows, error: buildError } = await supabase
      .from("game_builds")
      .select(
        "id, submission_id, version_label, storage_path, original_filename, file_size_bytes, status, pulse_result, tester_eligible, uploaded_at, testing_started_at, testing_completed_at"
      )
      .eq("submission_id", submissionId)
      .order("uploaded_at", { ascending: false });

    if (buildError) {
      setError(`Could not load builds: ${buildError.message}`);
      setLoading(false);
      return;
    }

    const typedBuilds = (buildRows ?? []) as GameBuild[];
    setBuilds(typedBuilds);

    const buildIds = typedBuilds.map((build) => build.id);

    if (buildIds.length === 0) {
      setRuns([]);
      setLoading(false);
      return;
    }

    const { data: runRows, error: runError } = await supabase
      .from("pulse_runs")
      .select(
        "id, build_id, status, result, worker_version, pulse_version, profile, total_checks, launch_passed, launch_total, restart_passed, restart_total, interaction_confirmed, interaction_failed, interaction_inconclusive, interaction_total, sessions_with_errors, sessions_with_failed_requests, sessions_with_stalls, worker_session_errors, summary, limitations, error_message, queued_at, started_at, completed_at, created_at"
      )
      .in("build_id", buildIds)
      .order("created_at", { ascending: false });

    if (runError) {
      setError(`Builds loaded, but PULSE results could not be loaded: ${runError.message}`);
      setRuns([]);
      setLoading(false);
      return;
    }

    setRuns((runRows ?? []) as PulseRun[]);
    setLoading(false);
  }, [submissionId]);

  useEffect(() => {
    void loadBuilds();
  }, [loadBuilds]);

  const latestRunByBuild = useMemo(() => {
    const map = new Map<string, PulseRun>();
    for (const run of runs) {
      if (!map.has(run.build_id)) map.set(run.build_id, run);
    }
    return map;
  }, [runs]);

  async function queueBuild(buildId: string) {
    setError("");
    setMessage("");
    setQueueingBuildId(buildId);

    try {
      const supabase = createClient();
      const { error: queueError } = await supabase.rpc("queue_pulse_run", {
        target_build_id: buildId,
      });

      if (queueError) {
        setError(`The build is uploaded, but PULSE could not be queued: ${queueError.message}`);
        return false;
      }

      setMessage("Build queued for PULSE technical testing.");
      await loadBuilds();
      router.refresh();
      return true;
    } finally {
      setQueueingBuildId(null);
    }
  }

  async function handleUpload() {
    if (!selectedFile || uploading) return;

    setError("");
    setMessage("");

    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      setError("PULSE currently accepts ZIP builds only.");
      return;
    }

    if (selectedFile.size <= 0) {
      setError("The selected ZIP is empty.");
      return;
    }

    if (selectedFile.size > MAX_BUILD_BYTES) {
      setError("This build is larger than the current 500 MB PULSE upload limit.");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login?next=/my-submissions";
        return;
      }

      const safeName = selectedFile.name
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const objectName = `${crypto.randomUUID()}-${safeName || "build.zip"}`;
      const storagePath = `${user.id}/${submissionId}/${objectName}`;

      const { error: uploadError } = await supabase.storage
        .from("game-builds")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type || "application/zip",
        });

      if (uploadError) {
        setError(`Build upload failed: ${uploadError.message}`);
        return;
      }

      const automaticLabel = `Build ${builds.length + 1}`;
      const finalVersionLabel = versionLabel.trim() || automaticLabel;

      const { data: createdBuild, error: insertError } = await supabase
        .from("game_builds")
        .insert({
          submission_id: submissionId,
          uploaded_by: user.id,
          version_label: finalVersionLabel,
          storage_path: storagePath,
          original_filename: selectedFile.name,
          file_size_bytes: selectedFile.size,
          status: "Queued",
          tester_eligible: false,
        })
        .select("id")
        .single();

      if (insertError || !createdBuild) {
        await supabase.storage.from("game-builds").remove([storagePath]);
        setError(`The ZIP uploaded, but the build record could not be created: ${insertError?.message ?? "Unknown database error"}`);
        return;
      }

      setSelectedFile(null);
      setVersionLabel("");
      setMessage(`${finalVersionLabel} uploaded successfully.`);
      await loadBuilds();

      const queued = await queueBuild(createdBuild.id);
      if (!queued) return;

      setMessage(`${finalVersionLabel} uploaded and queued for PULSE.`);
    } catch (unexpectedError) {
      console.error("Unexpected PULSE build upload error:", unexpectedError);
      setError("An unexpected error occurred while uploading the build.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[#77f29b]/20 bg-[#0c100d]">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#77f29b]">PULSE</p>
            <h4 className="mt-2 text-lg font-bold">Automated technical testing</h4>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Upload a ZIP build of {gameTitle}. PULSE checks launch reliability, restart reliability,
              runtime errors, stalls, stability and interaction evidence before human playtesting.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-right">
            <p className="text-xs text-zinc-500">Engine</p>
            <p className="mt-1 text-sm font-semibold text-zinc-200">PULSE v1 · Worker v6.8</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg border border-[#77f29b]/25 bg-[#77f29b]/[0.07] p-4 text-sm text-[#77f29b]">
            {message}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="block text-sm text-zinc-300">
            ZIP build
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              disabled={uploading}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setError("");
                setMessage("");
              }}
              className="mt-2 block w-full rounded-lg border border-white/10 bg-[#101311] px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-[#77f29b] file:px-3 file:py-2 file:font-semibold file:text-[#090b0a]"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Build label
            <input
              type="text"
              value={versionLabel}
              maxLength={80}
              disabled={uploading}
              onChange={(event) => setVersionLabel(event.target.value)}
              placeholder={`Build ${builds.length + 1}`}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#101311] px-4 py-3 outline-none focus:border-[#77f29b]"
            />
          </label>

          <button
            type="button"
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
            className="rounded-lg bg-[#77f29b] px-5 py-3 font-semibold text-[#090b0a] transition hover:bg-[#91ffb0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload & queue PULSE"}
          </button>
        </div>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Private ZIP storage · maximum 500 MB · builds are not publicly accessible.
          PULSE testing is queued automatically after upload.
        </p>

        {selectedFile && (
          <p className="mt-2 text-xs text-zinc-400">
            Selected: {selectedFile.name} · {formatBytes(selectedFile.size)}
          </p>
        )}

        <div className="mt-6 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between gap-4">
            <h5 className="font-semibold">Build history</h5>
            <button
              type="button"
              onClick={() => void loadBuilds()}
              disabled={loading || uploading}
              className="text-xs font-semibold text-[#77f29b] hover:underline disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading PULSE builds...</p>
          ) : builds.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/10 p-5">
              <p className="text-sm text-zinc-400">No PULSE builds uploaded yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {builds.map((build) => {
                const run = latestRunByBuild.get(build.id) ?? null;
                const hasActiveRun = run?.status === "Queued" || run?.status === "Running";

                return (
                  <article key={build.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-100">{build.version_label}</p>
                          <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${buildStatusClasses(build.status)}`}>
                            {build.status}
                          </span>
                          {build.pulse_result && (
                            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${resultClasses(build.pulse_result)}`}>
                              {publicPulseLabel(build.pulse_result)}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-zinc-500">
                          {build.original_filename} · {formatBytes(build.file_size_bytes)} · uploaded {formatDateTime(build.uploaded_at)}
                        </p>
                      </div>

                      <div className="text-right text-xs text-zinc-500">
                        <p>{build.tester_eligible ? "Tester eligible" : "Not tester eligible yet"}</p>
                        {run && <p className="mt-1">{run.pulse_version} · Worker {run.worker_version}</p>}
                      </div>
                    </div>

                    {run ? (
                      <div className="mt-4 rounded-lg border border-white/10 bg-[#090b0a]/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">PULSE status</p>
                            <p className="mt-1 font-semibold text-zinc-200">
                              {run.status === "Queued" && "Queued for technical testing"}
                              {run.status === "Running" && "Technical testing in progress"}
                              {run.status === "Complete" && publicPulseLabel(run.result)}
                              {run.status === "Failed" && "PULSE system run failed"}
                            </p>
                          </div>

                          {run.total_checks !== null && (
                            <p className="text-sm font-semibold text-[#77f29b]">{run.total_checks} checks</p>
                          )}
                        </div>

                        {run.status === "Complete" && (
                          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-md border border-white/10 p-3">
                              <p className="text-zinc-500">Launch</p>
                              <p className="mt-1 font-semibold text-zinc-200">{run.launch_passed ?? "—"}/{run.launch_total ?? "—"}</p>
                            </div>
                            <div className="rounded-md border border-white/10 p-3">
                              <p className="text-zinc-500">Restart</p>
                              <p className="mt-1 font-semibold text-zinc-200">{run.restart_passed ?? "—"}/{run.restart_total ?? "—"}</p>
                            </div>
                            <div className="rounded-md border border-white/10 p-3">
                              <p className="text-zinc-500">Interaction</p>
                              <p className="mt-1 font-semibold text-zinc-200">
                                {run.interaction_confirmed ?? 0}C · {run.interaction_failed ?? 0}F · {run.interaction_inconclusive ?? 0}I
                              </p>
                            </div>
                            <div className="rounded-md border border-white/10 p-3">
                              <p className="text-zinc-500">Detected</p>
                              <p className="mt-1 font-semibold text-zinc-200">
                                {run.sessions_with_errors} errors · {run.sessions_with_stalls} stalls
                              </p>
                            </div>
                          </div>
                        )}

                        {run.summary && <p className="mt-4 text-sm leading-6 text-zinc-300">{run.summary}</p>}
                        {run.limitations && <p className="mt-2 text-xs leading-5 text-amber-200">Limitation: {run.limitations}</p>}
                        {run.error_message && <p className="mt-2 text-xs leading-5 text-red-300">System error: {run.error_message}</p>}
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-4">
                        <p className="text-sm text-amber-100">This build exists but does not currently have a PULSE run.</p>
                        <button
                          type="button"
                          disabled={queueingBuildId === build.id}
                          onClick={() => void queueBuild(build.id)}
                          className="rounded-md border border-amber-300/30 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/10 disabled:opacity-50"
                        >
                          {queueingBuildId === build.id ? "Queueing..." : "Queue PULSE"}
                        </button>
                      </div>
                    )}

                    {run?.status === "Failed" && !hasActiveRun && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          disabled={queueingBuildId === build.id}
                          onClick={() => void queueBuild(build.id)}
                          className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-[#77f29b]/40 disabled:opacity-50"
                        >
                          {queueingBuildId === build.id ? "Queueing retry..." : "Retry PULSE"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
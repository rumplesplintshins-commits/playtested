import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile, access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type PulseRequest = {
  submissionId?: string;
  jobId?: string;
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normaliseDownloadUrl(value: string): string {
  const url = new URL(value);

  // A GitHub "blob" URL is a page, not the file itself.
  if (
    url.hostname.toLowerCase() === "github.com" &&
    url.pathname.includes("/blob/")
  ) {
    const parts = url.pathname.split("/").filter(Boolean);
    const blobIndex = parts.indexOf("blob");

    if (blobIndex >= 2 && parts.length > blobIndex + 2) {
      const owner = parts[0];
      const repo = parts[1];
      const ref = parts[blobIndex + 1];
      const filePath = parts.slice(blobIndex + 2).join("/");

      return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
    }
  }

  return value;
}

async function downloadZip(sourceUrl: string, destination: string) {
  const normalisedUrl = normaliseDownloadUrl(sourceUrl);
  const parsed = new URL(normalisedUrl);
  const isGitHubReleaseAsset =
    parsed.hostname.toLowerCase() === "github.com" &&
    parsed.pathname.includes("/releases/download/");

  let downloadUrl = normalisedUrl;
  let requestHeaders: Record<string, string> = {
    "User-Agent": "Playtested-PULSE/1.0",
    Accept: "application/zip, application/octet-stream, */*",
  };

  /*
    For GitHub Release assets, resolve the exact asset through GitHub's public
    Releases API first. This avoids relying on the browser-facing
    /releases/download/... route, which was returning 404 to the local
    server process even though the same public asset downloaded in a browser.
  */
  if (isGitHubReleaseAsset) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    const releasesIndex = parts.indexOf("releases");
    const downloadIndex = parts.indexOf("download");

    if (
      releasesIndex !== 2 ||
      downloadIndex !== 3 ||
      parts.length < 6 ||
      !parts[0] ||
      !parts[1] ||
      !parts[4] ||
      !parts[5]
    ) {
      throw new Error("PULSE could not parse the GitHub Release asset URL.");
    }

    const owner = decodeURIComponent(parts[0]);
    const repo = decodeURIComponent(parts[1]);
    const tag = decodeURIComponent(parts[4]);
    const assetName = decodeURIComponent(parts.slice(5).join("/"));
    const releaseApiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/tags/${encodeURIComponent(tag)}`;

    const releaseResponse = await fetch(releaseApiUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "Playtested-PULSE/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!releaseResponse.ok) {
      throw new Error(
        `PULSE could not resolve the GitHub Release through the GitHub API (HTTP ${releaseResponse.status}).`
      );
    }

    const release = (await releaseResponse.json()) as {
      assets?: Array<{
        name?: string;
        url?: string;
        browser_download_url?: string;
      }>;
    };

    const asset = Array.isArray(release.assets)
      ? release.assets.find((item) => item.name === assetName)
      : undefined;

    if (!asset?.url) {
      const availableAssets = Array.isArray(release.assets)
        ? release.assets
            .map((item) => item.name)
            .filter((name): name is string => Boolean(name))
            .join(", ")
        : "";

      throw new Error(
        availableAssets
          ? `PULSE found the GitHub Release, but not the requested asset. Available assets: ${availableAssets}`
          : "PULSE found the GitHub Release, but it contains no downloadable assets."
      );
    }

    downloadUrl = asset.url;
    requestHeaders = {
      "User-Agent": "Playtested-PULSE/1.0",
      Accept: "application/octet-stream",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(downloadUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new Error(
        isGitHubReleaseAsset
          ? `PULSE resolved the GitHub Release asset, but GitHub could not deliver it (HTTP ${response.status}).`
          : `PULSE could not download the submitted build (HTTP ${response.status}).`
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      throw new Error("The submitted build downloaded as an empty file.");
    }

    if (buffer.length > 500 * 1024 * 1024) {
      throw new Error(
        "The submitted build is larger than the 500 MB PULSE limit."
      );
    }

    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      const contentType = response.headers.get("content-type") ?? "unknown";
      throw new Error(
        `The submitted build response was not a ZIP file (${contentType}).`
      );
    }

    await writeFile(destination, buffer);

    return {
      bytes: buffer.length,
      finalUrl: response.url || downloadUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

type SecurityScanStatus =
  | "NO KNOWN THREATS DETECTED"
  | "THREAT DETECTED"
  | "SECURITY SCAN FAILED";

type SecurityScanResult = {
  status: SecurityScanStatus;
  blocked: boolean;
  scanner: "ClamAV";
  scannerVersion: string | null;
  signatureVersion: string | null;
  detectionName: string | null;
  durationMs: number;
  stdout: string;
  stderr: string;
};

async function sha256File(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function getClamScanPath(): string {
  const configured = process.env.CLAMSCAN_PATH?.trim();
  if (configured) return configured;
  if (process.platform === "win32") return "C:\\Program Files\\ClamAV\\clamscan.exe";
  return "clamscan";
}

function getClamDatabasePath(): string | null {
  const configured = process.env.CLAMAV_DATABASE_PATH?.trim();
  if (configured) return configured;
  if (process.platform === "win32") return "C:\\Program Files\\ClamAV\\database";
  return null;
}

function extractClamDetectionName(output: string): string | null {
  const foundLine = output.split(/\r?\n/).find((line) => /\sFOUND\s*$/i.test(line.trim()));
  if (!foundLine) return null;
  const afterColon = foundLine.includes(":")
    ? foundLine.slice(foundLine.indexOf(":") + 1).trim()
    : foundLine.trim();
  return afterColon.replace(/\s+FOUND\s*$/i, "").trim() || "Threat detected";
}

async function getClamVersion(clamscanPath: string): Promise<string | null> {
  try {
    const result = await execFileAsync(clamscanPath, ["--version"], {
      timeout: 30_000,
      windowsHide: true,
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const match = output.match(/ClamAV\s+([^\s/]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function runClamAvScan(zipPath: string): Promise<SecurityScanResult> {
  const clamscanPath = getClamScanPath();
  const databasePath = getClamDatabasePath();
  const startedAt = Date.now();

  if (process.platform === "win32" || clamscanPath.includes("\\") || clamscanPath.includes("/")) {
    try {
      await access(clamscanPath);
    } catch {
      return {
        status: "SECURITY SCAN FAILED",
        blocked: true,
        scanner: "ClamAV",
        scannerVersion: null,
        signatureVersion: null,
        detectionName: null,
        durationMs: Date.now() - startedAt,
        stdout: "",
        stderr: `ClamAV scanner was not found at ${clamscanPath}.`,
      };
    }
  }

  const scannerVersion = await getClamVersion(clamscanPath);
  const args: string[] = [];
  if (databasePath) args.push(`--database=${databasePath}`);
  args.push("--infected", zipPath);

  try {
    const result = await execFileAsync(clamscanPath, args, {
      cwd: process.cwd(),
      timeout: 5 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const known = `${stdout}\n${stderr}`.match(/Known viruses:\s*([0-9]+)/i);

    return {
      status: "NO KNOWN THREATS DETECTED",
      blocked: false,
      scanner: "ClamAV",
      scannerVersion,
      signatureVersion: known?.[1] ?? null,
      detectionName: null,
      durationMs: Date.now() - startedAt,
      stdout,
      stderr,
    };
  } catch (scanError) {
    const failure = scanError as Error & {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    const stdout = failure.stdout ?? "";
    const stderr = failure.stderr ?? "";
    const combined = `${stdout}\n${stderr}`;
    const exitCode =
      typeof failure.code === "number"
        ? failure.code
        : typeof failure.code === "string" && /^\d+$/.test(failure.code)
          ? Number(failure.code)
          : null;
    const known = combined.match(/Known viruses:\s*([0-9]+)/i);

    if (exitCode === 1 || /\sFOUND\s*$/im.test(combined)) {
      return {
        status: "THREAT DETECTED",
        blocked: true,
        scanner: "ClamAV",
        scannerVersion,
        signatureVersion: known?.[1] ?? null,
        detectionName: extractClamDetectionName(combined),
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      };
    }

    return {
      status: "SECURITY SCAN FAILED",
      blocked: true,
      scanner: "ClamAV",
      scannerVersion,
      signatureVersion: known?.[1] ?? null,
      detectionName: null,
      durationMs: Date.now() - startedAt,
      stdout,
      stderr: stderr || failure.message,
    };
  }
}

function extractTechnicalRunId(stdout: string): string | null {
  const match = stdout.match(
    /Technical run created:\s*([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i
  );

  return match?.[1] ?? null;
}


type TechnicalSessionEvidence = {
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
  genericObservations: JsonObject;
  evidence: JsonObject;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function firstDefined(object: JsonObject, keys: string[]): unknown {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }
  return null;
}

function normaliseTechnicalSession(row: JsonObject): TechnicalSessionEvidence {
  const genericObservations = asObject(
    firstDefined(row, ["generic_observations", "genericObservations"])
  );
  const evidence = asObject(
    firstDefined(row, ["evidence_json", "telemetry_json", "evidence", "telemetry"])
  );

  return {
    id: asString(row.id),
    family: asString(
      firstDefined(row, ["test_family", "family", "test_type"]),
      "unknown"
    ),
    sessionNumber: asNullableNumber(
      firstDefined(row, ["session_number", "session_index", "check_number"])
    ),
    startSucceeded: asNullableBoolean(
      firstDefined(row, [
        "start_succeeded",
        "startup_succeeded",
        "initial_start_succeeded",
        "start_success",
      ])
    ),
    restartAttempted: asNullableBoolean(
      firstDefined(row, ["restart_attempted"])
    ),
    restartSucceeded: asNullableBoolean(
      firstDefined(row, ["restart_succeeded", "restart_success"])
    ),
    stallDetected:
      firstDefined(row, ["stall_detected"]) === true ||
      firstDefined(genericObservations, ["stallDetected"]) === true,
    durationMs: asNullableNumber(
      firstDefined(row, ["duration_ms", "session_duration_ms"])
    ),
    loadMs: asNullableNumber(
      firstDefined(row, ["load_ms", "load_time_ms"])
    ),
    consoleErrors: asArray(
      firstDefined(row, ["console_errors", "consoleErrors"])
    ),
    pageErrors: asArray(
      firstDefined(row, ["page_errors", "pageErrors"])
    ),
    failedRequests: asArray(
      firstDefined(row, ["failed_requests", "failedRequests"])
    ),
    fatalError: firstDefined(row, ["fatal_error", "fatalError"]),
    genericObservations,
    evidence,
  };
}

function hasRuntimeEvidence(session: TechnicalSessionEvidence): boolean {
  return (
    session.consoleErrors.length > 0 ||
    session.pageErrors.length > 0 ||
    session.failedRequests.length > 0 ||
    Boolean(session.fatalError)
  );
}

function mapTechnicalRun(
  run: JsonObject,
  submissionId: string,
  sourceUrl: string,
  finalUrl: string,
  bytes: number,
  technicalSessions: TechnicalSessionEvidence[]
) {
  const summary = asObject(run.summary_json);

  const launch = asObject(summary.launchReliability);
  const restart = asObject(summary.restartReliability);
  const interaction = asObject(summary.interaction);
  const generic = asObject(summary.genericDetection);
  const immediateCrash = asObject(summary.immediateCrashDetection);
  const familySummaries = asObject(summary.familySummaries);
  const launchFamily = asObject(familySummaries.launch);
  const restartFamily = asObject(familySummaries.restart);
  const interactionFamily = asObject(familySummaries.interaction);
  const stabilityFamily = asObject(familySummaries.stability);
  const soakFamily = asObject(familySummaries.soak);

  const totalChecks = asNumber(
    summary.totalChecks,
    asNumber(run.completed_sessions, asNumber(run.requested_sessions, 0))
  );

  const successfulBuildLoads = asNumber(
    summary.successfulBuildLoads,
    asNumber(run.successful_build_loads, 0)
  );

  const buildLoadSuccessRate = asNumber(
    summary.buildLoadSuccessRate,
    asNumber(run.build_load_success_rate, 0)
  );

  const medianLoadMs = asNumber(
    summary.medianLoadMs,
    asNumber(run.median_load_ms, 0)
  );

  const launchTotal = asNumber(
    launch.checks,
    asNumber(launchFamily.checks, 0)
  );
  const launchPassed = asNumber(
    launch.successful,
    asNumber(
      launchFamily.successfulStarts,
      asNumber(run.successful_initial_starts, 0)
    )
  );

  const restartTotal = asNumber(
    restart.checks,
    asNumber(restartFamily.restartAttempted, 0)
  );
  const restartPassed = asNumber(
    restart.successful,
    asNumber(
      restartFamily.successfulRestarts,
      asNumber(run.successful_restarts, 0)
    )
  );

  const interactionTotal = asNumber(
    interaction.checks,
    asNumber(interactionFamily.checks, 0)
  );
  const interactionConfirmed = asNumber(
    interaction.confirmed,
    asNumber(
      interaction.successful,
      asNumber(interactionFamily.successfulInteractions, 0)
    )
  );
  const interactionFailed = asNumber(
    interaction.failed,
    asNumber(interactionFamily.failedInteractions, 0)
  );
  const interactionInconclusive = asNumber(
    interaction.inconclusive,
    asNumber(
      interactionFamily.inconclusiveInteractions,
      Math.max(
        0,
        interactionTotal - interactionConfirmed - interactionFailed
      )
    )
  );

  const sessionsWithErrors = asNumber(
    generic.sessionsWithErrors,
    asNumber(run.sessions_with_errors, 0)
  );

  const sessionsWithFailedRequests = asNumber(
    generic.sessionsWithFailedRequests,
    0
  );

  const sessionsWithStalls = asNumber(
    generic.sessionsWithStalls,
    asNumber(run.sessions_with_stalls, 0)
  );

  const workerSessionErrors = asNumber(
    generic.sessionsWithWorkerErrors,
    asNumber(run.sessions_with_worker_errors, 0)
  );

  const workerVersion = asString(run.worker_version, "unknown");
  const profile = asString(summary.profile, "quick");
  const overallResult = asString(
    run.overall_result,
    asString(summary.result, "Recorded")
  );

  const issueReasonsFromSummary = Array.isArray(summary.issueReasons)
    ? summary.issueReasons.filter(
        (value): value is string => typeof value === "string"
      )
    : [];

  const issueReasonsFromRun = Array.isArray(run.issue_reasons)
    ? run.issue_reasons.filter(
        (value): value is string => typeof value === "string"
      )
    : [];

  const issueReasons =
    issueReasonsFromSummary.length > 0
      ? issueReasonsFromSummary
      : issueReasonsFromRun;

  const launchFailures = Math.max(0, launchTotal - launchPassed);
  const restartFailures = Math.max(0, restartTotal - restartPassed);

  const issueDetails: Array<{
    type: string;
    severity: "warning";
    title: string;
    detail: string;
  }> = [];

  if (launchFailures > 0) {
    issueDetails.push({
      type: "launch_failure",
      severity: "warning",
      title: "Launch failures detected",
      detail: `${launchFailures} of ${launchTotal} dedicated launch checks failed.`,
    });
  }

  if (sessionsWithErrors > 0) {
    issueDetails.push({
      type: "runtime_error",
      severity: "warning",
      title: "Runtime/browser errors detected",
      detail: `${sessionsWithErrors} test session(s) contained console errors, page errors, or failed requests.`,
    });
  }

  if (sessionsWithFailedRequests > 0) {
    issueDetails.push({
      type: "failed_request",
      severity: "warning",
      title: "Failed resource requests detected",
      detail: `${sessionsWithFailedRequests} test session(s) contained failed network/resource requests.`,
    });
  }

  if (sessionsWithStalls > 0) {
    issueDetails.push({
      type: "stall",
      severity: "warning",
      title: "Runtime stalls detected",
      detail: `${sessionsWithStalls} test session(s) contained a detected stall.`,
    });
  }

  if (restartFailures > 0) {
    issueDetails.push({
      type: "restart_failure",
      severity: "warning",
      title: "Restart failures detected",
      detail: `${restartFailures} of ${restartTotal} restart attempts failed.`,
    });
  }

  if (workerSessionErrors > 0) {
    issueDetails.push({
      type: "worker_error",
      severity: "warning",
      title: "PULSE worker/session errors detected",
      detail: `${workerSessionErrors} test session(s) encountered a worker/session-level error.`,
    });
  }

  const buildPackageValid = bytes > 0;
  const entryPointFound = totalChecks > 0;
  const buildLoaded = successfulBuildLoads > 0;
  const allBuildLoadsSuccessful =
    totalChecks > 0 && successfulBuildLoads === totalChecks;

  const runtimeErrorSessions = technicalSessions.filter(hasRuntimeEvidence);
  const stallSessions = technicalSessions.filter((session) => session.stallDetected);
  const launchFailureSessions = technicalSessions.filter(
    (session) =>
      session.family.toLowerCase() === "launch" &&
      session.startSucceeded === false
  );
  const restartFailureSessions = technicalSessions.filter(
    (session) =>
      session.family.toLowerCase() === "restart" &&
      session.startSucceeded === true &&
      session.restartSucceeded === false
  );

  const detailedEvidence = {
    runtimeErrors: runtimeErrorSessions,
    stalls: stallSessions,
    launchFailures: launchFailureSessions,
    restartFailures: restartFailureSessions,
  };

  return {
    runId: asString(run.id),
    submissionId,
    status: asString(run.status, "completed"),
    result: overallResult,
    workerVersion,
    pulseVersion: "PULSE v1",
    profile,
    totalChecks,
    startedAt:
      typeof run.started_at === "string" ? run.started_at : null,
    completedAt:
      typeof run.completed_at === "string" ? run.completed_at : null,
    durationMs:
      typeof run.duration_ms === "number" ? run.duration_ms : null,

    build: {
      sourceUrl,
      finalUrl,
      bytes,
      packageValid: buildPackageValid,
      entryPointFound,
      loaded: buildLoaded,
      successfulLoads: successfulBuildLoads,
      loadSuccessRate: buildLoadSuccessRate,
      medianLoadMs,
      allLoadsSuccessful: allBuildLoadsSuccessful,
    },

    launchPassed,
    launchTotal,
    launchFailures,

    restartPassed,
    restartTotal,
    restartFailures,

    immediateCrashChecked: asNumber(immediateCrash.checked, 0),
    immediateCrashes: asNumber(immediateCrash.detected, 0),
    immediateCrashObservationMs: asNumber(
      immediateCrash.observationWindowMs,
      0
    ),

    interactionConfirmed,
    interactionFailed,
    interactionInconclusive,
    interactionTotal,

    sessionsWithErrors,
    sessionsWithFailedRequests,
    sessionsWithStalls,
    workerSessionErrors,

    familySummaries: {
      launch: launchFamily,
      restart: restartFamily,
      interaction: interactionFamily,
      stability: stabilityFamily,
      soak: soakFamily,
    },

    issueCount: issueDetails.length,
    issueDetails,
    issueReasons,
    detailedEvidence,

    summary:
      issueReasons.length > 0
        ? issueReasons.join(" · ")
        : issueDetails.length > 0
          ? issueDetails.map((issue) => issue.detail).join(" · ")
          : overallResult === "PASS"
            ? "No technical issues were detected in this PULSE run."
            : "PULSE completed and recorded this technical run.",

    limitations:
      "PULSE v1 does not yet report a dedicated immediate-crash metric. Launch failures, runtime/browser errors and stalls are reported separately.",

    errorMessage:
      typeof run.error_message === "string" ? run.error_message : null,
  };
}

export async function POST(request: NextRequest) {
  let temporaryDirectory: string | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "PULSE server configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = (await request.json().catch(() => null)) as PulseRequest | null;
    const submissionId =
      typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    const jobId =
      typeof body?.jobId === "string" ? body.jobId.trim() : "";

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "PULSE requires a submission ID." },
        { status: 400 }
      );
    }

    const runnerSecret = process.env.PULSE_RUNNER_SECRET?.trim() ?? "";
    const suppliedRunnerSecret =
      request.headers.get("x-pulse-runner-secret")?.trim() ?? "";
    const isTrustedRunner =
      Boolean(runnerSecret) && suppliedRunnerSecret === runnerSecret;

    let authenticatedUserId = "";

    if (isTrustedRunner) {
      if (!jobId) {
        return NextResponse.json(
          { success: false, error: "The PULSE runner requires a job ID." },
          { status: 400 }
        );
      }

      const { data: runnerJob, error: runnerJobError } = await supabase
        .from("pulse_jobs")
        .select("id, submission_id, developer_id, status")
        .eq("id", jobId)
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (runnerJobError || !runnerJob) {
        return NextResponse.json(
          { success: false, error: "PULSE runner could not load this queued job." },
          { status: runnerJobError ? 500 : 404 }
        );
      }

      authenticatedUserId = String(runnerJob.developer_id || "");
    } else {
      const authorization = request.headers.get("authorization");

      if (!authorization?.startsWith("Bearer ")) {
        return NextResponse.json(
          { success: false, error: "You must be signed in to run PULSE." },
          { status: 401 }
        );
      }

      const token = authorization.slice("Bearer ".length).trim();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return NextResponse.json(
          { success: false, error: "Your session could not be verified." },
          { status: 401 }
        );
      }

      authenticatedUserId = user.id;
    }

    const { data: submission, error: submissionError } = await supabase
      .from("game_submissions")
      .select("id, developer_id, title, game_link, steam_url")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: "PULSE could not load the saved submission." },
        { status: submissionError ? 500 : 404 }
      );
    }

    if (submission.developer_id !== authenticatedUserId) {
      return NextResponse.json(
        { success: false, error: "You cannot run PULSE for this submission." },
        { status: 403 }
      );
    }

    if (jobId) {
      const { data: pulseJob, error: pulseJobError } = await supabase
        .from("pulse_jobs")
        .select("id, submission_id, developer_id, status")
        .eq("id", jobId)
        .maybeSingle();

      if (pulseJobError || !pulseJob) {
        return NextResponse.json(
          { success: false, error: "PULSE could not load this V9 job." },
          { status: pulseJobError ? 500 : 404 }
        );
      }

      if (
        pulseJob.submission_id !== submissionId ||
        pulseJob.developer_id !== authenticatedUserId
      ) {
        return NextResponse.json(
          { success: false, error: "This PULSE job does not belong to this submission." },
          { status: 403 }
        );
      }

      const allowedStartStatuses = isTrustedRunner
        ? ["ACQUIRING_BUILD"]
        : ["QUEUED"];

      if (!allowedStartStatuses.includes(pulseJob.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `This PULSE job cannot start because its current status is ${pulseJob.status}.`,
          },
          { status: 409 }
        );
      }
    }

    async function updatePulseJob(
      status:
        | "ACQUIRING_BUILD"
        | "SECURITY_SCAN"
        | "TESTING"
        | "PROCESSING_RESULTS"
        | "COMPLETE"
        | "BLOCKED"
        | "FAILED",
      values: Record<string, unknown> = {}
    ) {
      if (!jobId) return;

      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        status,
        updated_at: now,
        ...values,
      };

      if (status === "ACQUIRING_BUILD") {
        payload.started_at = now;
        payload.error_message = null;
      }

      if (status === "COMPLETE" || status === "BLOCKED" || status === "FAILED") {
        payload.completed_at = now;
      }

      const { error: updateError } = await supabase
        .from("pulse_jobs")
        .update(payload)
        .eq("id", jobId)
        .eq("submission_id", submissionId)
        .eq("developer_id", authenticatedUserId);

      if (updateError) {
        throw new Error(
          `PULSE could not update V9 job ${jobId} to ${status}: ${updateError.message}`
        );
      }
    }

    const sourceUrl = String(
      submission.game_link || submission.steam_url || ""
    ).trim();

    if (!sourceUrl || !isHttpUrl(sourceUrl)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "PULSE needs a valid HTTPS link to the ZIP build before the technical worker can run.",
        },
        { status: 400 }
      );
    }

    await updatePulseJob("ACQUIRING_BUILD");

    temporaryDirectory = await mkdtemp(join(tmpdir(), "playtested-pulse-"));
    const zipPath = join(temporaryDirectory, "submitted-build.zip");
    const download = await downloadZip(sourceUrl, zipPath);

    await updatePulseJob("SECURITY_SCAN");

    /*
      PULSE SECURITY GATE
      The ZIP is fingerprinted and scanned before the existing technical worker
      is allowed to extract or execute it. Security failures are fail-closed.
    */
    const buildSha256 = await sha256File(zipPath);

    if (jobId) {
      await updatePulseJob("SECURITY_SCAN", {
        build_sha256: buildSha256,
        build_url: download.finalUrl || sourceUrl,
      });
    }

    const securityScan = await runClamAvScan(zipPath);

    const { error: securityScanInsertError } = await supabase
      .from("pulse_security_scans")
      .insert({
        submission_id: submissionId,
        technical_run_id: null,
        build_url: download.finalUrl || sourceUrl,
        build_sha256: buildSha256,
        scanner: securityScan.scanner,
        scanner_version: securityScan.scannerVersion,
        signature_version: securityScan.signatureVersion,
        status: securityScan.status,
        detection_name: securityScan.detectionName,
        blocked: securityScan.blocked,
        scan_duration_ms: securityScan.durationMs,
      });

    if (securityScanInsertError) {
      console.error("PULSE security scan result could not be recorded:", securityScanInsertError);
      await updatePulseJob("FAILED", {
        error_message:
          "PULSE completed the malware scan but could not save its security audit record.",
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "PULSE completed the malware scan but could not save its security audit record. The build was not executed.",
        },
        { status: 500 }
      );
    }

    if (securityScan.status === "THREAT DETECTED") {
      await updatePulseJob("BLOCKED", {
        build_sha256: buildSha256,
        error_message: securityScan.detectionName
          ? `ClamAV detected ${securityScan.detectionName}.`
          : "A known malware signature was detected.",
      });
      return NextResponse.json(
        {
          success: false,
          securityBlocked: true,
          security: {
            status: securityScan.status,
            blocked: true,
            scanner: securityScan.scanner,
            scannerVersion: securityScan.scannerVersion,
            detectionName: securityScan.detectionName,
            buildSha256,
          },
          error: securityScan.detectionName
            ? `PULSE SECURITY CHECK — BLOCKED. ClamAV detected ${securityScan.detectionName}. The submitted build was not executed.`
            : "PULSE SECURITY CHECK — BLOCKED. A known malware signature was detected. The submitted build was not executed.",
        },
        { status: 422 }
      );
    }

    if (securityScan.status === "SECURITY SCAN FAILED") {
      console.error("PULSE security scan failed closed:", {
        submissionId,
        buildSha256,
        stderr: securityScan.stderr.slice(-4000),
      });
      await updatePulseJob("BLOCKED", {
        build_sha256: buildSha256,
        error_message:
          "The malware scanner was unavailable or returned an error. The build was not executed.",
      });
      return NextResponse.json(
        {
          success: false,
          securityBlocked: true,
          security: {
            status: securityScan.status,
            blocked: true,
            scanner: securityScan.scanner,
            scannerVersion: securityScan.scannerVersion,
            detectionName: null,
            buildSha256,
          },
          error:
            "PULSE SECURITY CHECK — COULD NOT COMPLETE. The malware scanner was unavailable or returned an error, so the submitted build was not executed.",
        },
        { status: 503 }
      );
    }

    await updatePulseJob("TESTING");

    /*
      IMPORTANT:
      This is the real worker file we have been developing/testing.
      Do not point this route at pulse_runs or the old 12-check preflight.
      The worker creates its own unique row in technical_test_runs.
    */
    const workerFileName = "technical-test-worker-v6.10.mjs";
    const workerCandidates = [
      resolve(process.cwd(), "scripts", workerFileName),
      resolve(process.cwd(), "..", "scripts", workerFileName),
    ];

    let workerPath: string | null = null;

    for (const candidate of workerCandidates) {
      try {
        await access(candidate);
        workerPath = candidate;
        break;
      } catch {
        // Try the next project-root candidate.
      }
    }

    if (!workerPath) {
      console.error("PULSE worker file resolution failed:", {
        cwd: process.cwd(),
        candidates: workerCandidates,
      });

      await updatePulseJob("FAILED", {
        error_message: "The PULSE worker file could not be resolved.",
      });

      return NextResponse.json(
        {
          success: false,
          error:
            `The PULSE worker file could not be resolved. Server working directory: ${process.cwd()}. Checked: ${workerCandidates.join(" | ")}`,
        },
        { status: 500 }
      );
    }

    const buildLabel = `Submission ${submissionId.slice(0, 8)} · ${new Date().toISOString()}`;

    let stdout = "";
    let stderr = "";

    try {
      const result = await execFileAsync(
        process.execPath,
        [
          workerPath,
          `--zip=${zipPath}`,
          `--game=${submission.title}`,
          `--build=${buildLabel}`,
          "--profile=quick",
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          timeout: 15 * 60 * 1000,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true,
        }
      );

      stdout = result.stdout ?? "";
      stderr = result.stderr ?? "";
    } catch (workerError) {
      const failure = workerError as Error & {
        stdout?: string;
        stderr?: string;
      };

      stdout = failure.stdout ?? "";
      stderr = failure.stderr ?? "";

      console.error("PULSE worker execution failed:", {
        message: failure.message,
        stdout: stdout.slice(-6000),
        stderr: stderr.slice(-6000),
      });

      await updatePulseJob("FAILED", {
        error_message: `PULSE Worker could not complete this run: ${failure.message}`,
      });

      return NextResponse.json(
        {
          success: false,
          error: `PULSE Worker could not complete this run: ${failure.message}`,
        },
        { status: 500 }
      );
    }

    /*
      The worker prints the UUID immediately after it creates the authoritative
      technical_test_runs record:
          Technical run created: <uuid>

      We use THAT exact UUID. We never search for "latest", so another run or an
      old preflight can never be substituted for this execution.
    */
    const technicalRunId = extractTechnicalRunId(stdout);

    if (technicalRunId) {
      await updatePulseJob("PROCESSING_RESULTS", {
        technical_run_id: technicalRunId,
      });
    }

    if (technicalRunId) {
      const { error: securityLinkError } = await supabase
        .from("pulse_security_scans")
        .update({ technical_run_id: technicalRunId })
        .eq("submission_id", submissionId)
        .eq("build_sha256", buildSha256)
        .is("technical_run_id", null)
        .eq("status", "NO KNOWN THREATS DETECTED");

      if (securityLinkError) {
        console.error(
          "PULSE could not link the clean security scan to the technical run:",
          securityLinkError
        );
      }
    }

    if (!technicalRunId) {
      console.error("PULSE worker did not expose a technical run ID:", {
        stdout: stdout.slice(-8000),
        stderr: stderr.slice(-8000),
      });

      await updatePulseJob("FAILED", {
        error_message:
          "The worker finished but PULSE could not identify this run's unique technical-test ID.",
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "The worker finished but PULSE could not identify this run's unique technical-test ID.",
        },
        { status: 500 }
      );
    }

    const { data: technicalRun, error: technicalRunError } = await supabase
      .from("technical_test_runs")
      .select("*")
      .eq("id", technicalRunId)
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (technicalRunError || !technicalRun) {
      console.error("PULSE technical run lookup failed:", technicalRunError);

      await updatePulseJob("FAILED", {
        technical_run_id: technicalRunId,
        error_message:
          "Worker completed, but PULSE could not load its saved technical-test result.",
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Worker completed, but PULSE could not load its saved technical-test result.",
        },
        { status: 500 }
      );
    }

    const { data: technicalSessionRows, error: technicalSessionsError } =
      await supabase
        .from("technical_test_sessions")
        .select("*")
        .eq("run_id", technicalRunId);

    if (technicalSessionsError) {
      console.error(
        "PULSE technical session evidence lookup failed:",
        technicalSessionsError
      );

      await updatePulseJob("FAILED", {
        technical_run_id: technicalRunId,
        error_message:
          "Worker completed, but PULSE could not load the saved session-level diagnostic evidence.",
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Worker completed, but PULSE could not load the saved session-level diagnostic evidence.",
        },
        { status: 500 }
      );
    }

    const technicalSessions = Array.isArray(technicalSessionRows)
      ? technicalSessionRows.map((row) =>
          normaliseTechnicalSession(row as JsonObject)
        )
      : [];

    const pulse = mapTechnicalRun(
      technicalRun as JsonObject,
      submissionId,
      sourceUrl,
      download.finalUrl,
      download.bytes,
      technicalSessions
    );

    /*
      Hard guard against the exact regression we just saw.
      A quick PULSE worker result is not allowed onto the results screen if it
      looks like the old 12-check preflight record.
    */
    if (pulse.totalChecks < 100) {
      console.error("Rejected non-worker PULSE result:", {
        technicalRunId,
        workerVersion: pulse.workerVersion,
        totalChecks: pulse.totalChecks,
      });

      await updatePulseJob("FAILED", {
        technical_run_id: technicalRunId,
        error_message: `PULSE received only ${pulse.totalChecks} checks instead of the full Worker quick suite.`,
      });

      return NextResponse.json(
        {
          success: false,
          error: `PULSE received only ${pulse.totalChecks} checks from this run instead of the full Worker quick suite. The result has not been displayed.`,
        },
        { status: 500 }
      );
    }

    const completedPulse = {
      ...pulse,
      securityScan: {
        status: securityScan.status,
        blocked: securityScan.blocked,
        scanner: securityScan.scanner,
        scannerVersion: securityScan.scannerVersion,
        signatureVersion: securityScan.signatureVersion,
        detectionName: securityScan.detectionName,
        buildSha256,
        scanDurationMs: securityScan.durationMs,
      },
    };

    await updatePulseJob("COMPLETE", {
      technical_run_id: technicalRunId,
      build_sha256: buildSha256,
      build_url: download.finalUrl || sourceUrl,
      error_message: null,
      report_json: completedPulse,
    });

    return NextResponse.json({
      success: true,
      pulse: completedPulse,
    });
  } catch (error) {
    console.error("Unexpected PULSE worker route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "PULSE encountered an unexpected error.",
      },
      { status: 500 }
    );
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  }
}

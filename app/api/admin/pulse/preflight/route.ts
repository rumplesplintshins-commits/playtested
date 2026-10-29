import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CheckStatus = "passed" | "warning" | "failed" | "skipped";

type PulseCheck = {
  check_key: string;
  check_name: string;
  category: string;
  status: CheckStatus;
  summary: string;
  details?: string;
  duration_ms?: number;
};

type PreflightRequest = {
  submissionId?: string;
};

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("PULSE server configuration is incomplete.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extractBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function getHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getSourceName(hostname: string | null): string {
  if (!hostname) return "Unknown source";

  if (
    hostname === "store.steampowered.com" ||
    hostname.endsWith(".steampowered.com")
  ) {
    return "Steam";
  }

  if (hostname === "itch.io" || hostname.endsWith(".itch.io")) {
    return "itch.io";
  }

  if (
    hostname === "drive.google.com" ||
    hostname.endsWith(".drive.google.com")
  ) {
    return "Google Drive";
  }

  if (hostname === "dropbox.com" || hostname.endsWith(".dropbox.com")) {
    return "Dropbox";
  }

  if (
    hostname === "onedrive.live.com" ||
    hostname.endsWith(".onedrive.live.com")
  ) {
    return "OneDrive";
  }

  return hostname;
}

function extractSteamAppId(value: string): string | null {
  try {
    const url = new URL(value);

    if (
      url.hostname !== "store.steampowered.com" &&
      url.hostname !== "www.store.steampowered.com"
    ) {
      return null;
    }

    const match = url.pathname.match(/^\/app\/(\d+)(?:\/|$)/i);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function testReachability(
  url: string
): Promise<{
  reachable: boolean;
  status: number | null;
  finalUrl: string | null;
  contentType: string | null;
  durationMs: number;
  error?: string;
}> {
  const started = Date.now();

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    let response: Response;

    try {
      response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Playtested-PULSE/1.0",
        },
      });

      if (response.status === 405 || response.status === 501) {
        clearTimeout(timeout);

        const secondController = new AbortController();

        const secondTimeout = setTimeout(() => {
          secondController.abort();
        }, 8000);

        try {
          response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            cache: "no-store",
            signal: secondController.signal,
            headers: {
              "User-Agent": "Playtested-PULSE/1.0",
              Range: "bytes=0-0",
            },
          });
        } finally {
          clearTimeout(secondTimeout);
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return {
      reachable: response.status >= 200 && response.status < 500,
      status: response.status,
      finalUrl: response.url || url,
      contentType: response.headers.get("content-type"),
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      reachable: false,
      status: null,
      finalUrl: null,
      contentType: null,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Request failed.",
    };
  }
}

export async function POST(request: NextRequest) {
  let runId: string | null = null;

  try {
    const accessToken = extractBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    let body: PreflightRequest;

    try {
      body = (await request.json()) as PreflightRequest;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const submissionId = body.submissionId?.trim();

    if (!submissionId) {
      return NextResponse.json(
        {
          error: "submissionId is required.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Your session could not be verified.",
        },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("PULSE profile lookup failed:", profileError);

      return NextResponse.json(
        {
          error: "PULSE could not verify your developer access.",
        },
        { status: 500 }
      );
    }

    if (!profile?.roles?.includes("developer")) {
      return NextResponse.json(
        {
          error: "Game Developer access is required.",
        },
        { status: 403 }
      );
    }

    const { data: submission, error: submissionError } = await supabase
      .from("game_submissions")
      .select(
        `
          id,
          developer_id,
          title,
          developer_name,
          game_link,
          steam_url,
          steam_app_id,
          release_status,
          status
        `
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      console.error("PULSE submission lookup failed:", submissionError);

      return NextResponse.json(
        {
          error: "PULSE could not load the submission.",
        },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        {
          error: "Submission not found.",
        },
        { status: 404 }
      );
    }

    if (submission.developer_id !== user.id) {
      return NextResponse.json(
        {
          error: "You cannot run PULSE against this submission.",
        },
        { status: 403 }
      );
    }

    const gameLink =
      typeof submission.game_link === "string"
        ? submission.game_link.trim()
        : "";

    const steamUrl =
      typeof submission.steam_url === "string"
        ? submission.steam_url.trim()
        : "";

    const primaryBuildUrl = gameLink || steamUrl || null;

    const buildSource = gameLink
      ? "external_url"
      : steamUrl
        ? "steam"
        : null;

    const { data: pulseRun, error: createRunError } = await supabase
      .from("pulse_runs")
      .insert({
        submission_id: submission.id,
        triggered_by: user.id,
        run_type: "preflight",
        status: "running",
        build_source: buildSource,
        build_url: primaryBuildUrl,
        total_checks: 0,
        completed_checks: 0,
        passed_checks: 0,
        warning_checks: 0,
        failed_checks: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createRunError || !pulseRun) {
      console.error("PULSE run creation failed:", createRunError);

      return NextResponse.json(
        {
          error: "PULSE could not create the diagnostic run.",
        },
        { status: 500 }
      );
    }

    runId = pulseRun.id;

    const checks: PulseCheck[] = [];

    // ---------------------------------------------------------
    // CHECK 01 — PLAYABLE BUILD SUPPLIED
    // ---------------------------------------------------------

    checks.push({
      check_key: "playable_build_supplied",
      check_name: "Playable build supplied",
      category: "Build",
      status: gameLink ? "passed" : "warning",
      summary: gameLink
        ? "A playable build or tester-access link was supplied."
        : "No separate playable build or tester-access link was supplied.",
      details: gameLink
        ? `PULSE detected a build/access source at ${getSourceName(
            getHostname(gameLink)
          )}.`
        : steamUrl
          ? "A Steam store page exists, but a store listing does not necessarily provide tester access."
          : "The submission currently has no playable build or tester-access URL.",
    });

    // ---------------------------------------------------------
    // CHECK 02 — BUILD URL FORMAT
    // ---------------------------------------------------------

    if (gameLink) {
      checks.push({
        check_key: "build_url_valid",
        check_name: "Build URL format",
        category: "Build",
        status: isHttpUrl(gameLink) ? "passed" : "failed",
        summary: isHttpUrl(gameLink)
          ? "The playable build URL has a valid HTTP/HTTPS format."
          : "The playable build URL is not a valid HTTP/HTTPS URL.",
      });
    } else {
      checks.push({
        check_key: "build_url_valid",
        check_name: "Build URL format",
        category: "Build",
        status: "skipped",
        summary: "No playable build URL was supplied.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 03 — HTTPS
    // ---------------------------------------------------------

    if (gameLink && isHttpUrl(gameLink)) {
      const buildUrl = new URL(gameLink);

      checks.push({
        check_key: "secure_transport",
        check_name: "Secure transport",
        category: "Security",
        status: buildUrl.protocol === "https:" ? "passed" : "warning",
        summary:
          buildUrl.protocol === "https:"
            ? "The build/access link uses HTTPS."
            : "The build/access link does not use HTTPS.",
        details:
          buildUrl.protocol === "https:"
            ? "Transport encryption is enabled for the supplied URL."
            : "PULSE recommends HTTPS for build distribution and tester access.",
      });
    } else {
      checks.push({
        check_key: "secure_transport",
        check_name: "Secure transport",
        category: "Security",
        status: "skipped",
        summary: "No valid playable build URL was available to inspect.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 04 — SOURCE IDENTIFICATION
    // ---------------------------------------------------------

    if (gameLink && isHttpUrl(gameLink)) {
      const hostname = getHostname(gameLink);
      const sourceName = getSourceName(hostname);

      checks.push({
        check_key: "build_source_identified",
        check_name: "Build source identified",
        category: "Distribution",
        status: hostname ? "passed" : "warning",
        summary: hostname
          ? `PULSE identified the build/access source as ${sourceName}.`
          : "PULSE could not identify the build source.",
        details: hostname ? `Host: ${hostname}` : undefined,
      });
    } else {
      checks.push({
        check_key: "build_source_identified",
        check_name: "Build source identified",
        category: "Distribution",
        status: "skipped",
        summary: "No playable build URL was supplied.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 05 — BUILD LINK REACHABILITY
    // ---------------------------------------------------------

    if (gameLink && isHttpUrl(gameLink)) {
      const reachability = await testReachability(gameLink);

      checks.push({
        check_key: "build_link_reachable",
        check_name: "Build link reachability",
        category: "Availability",
        status: reachability.reachable ? "passed" : "failed",
        summary: reachability.reachable
          ? `The supplied build/access URL responded${
              reachability.status
                ? ` with HTTP ${reachability.status}`
                : ""
            }.`
          : "PULSE could not reach the supplied build/access URL.",
        details: reachability.reachable
          ? reachability.finalUrl &&
            reachability.finalUrl !== gameLink
            ? `The request resolved to ${reachability.finalUrl}.`
            : "The supplied endpoint responded to the PULSE connectivity probe."
          : reachability.error ??
            "The remote endpoint did not respond successfully.",
        duration_ms: reachability.durationMs,
      });
    } else {
      checks.push({
        check_key: "build_link_reachable",
        check_name: "Build link reachability",
        category: "Availability",
        status: "skipped",
        summary: "No valid playable build URL was available to test.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 06 — STEAM URL FORMAT
    // ---------------------------------------------------------

    if (steamUrl) {
      const detectedSteamId = extractSteamAppId(steamUrl);

      checks.push({
        check_key: "steam_listing_valid",
        check_name: "Steam listing format",
        category: "Steam",
        status: detectedSteamId ? "passed" : "failed",
        summary: detectedSteamId
          ? `Steam App ID ${detectedSteamId} was identified.`
          : "PULSE could not identify a Steam App ID from the supplied Steam URL.",
      });
    } else {
      checks.push({
        check_key: "steam_listing_valid",
        check_name: "Steam listing format",
        category: "Steam",
        status: "skipped",
        summary: "No Steam store page was supplied.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 07 — STORED STEAM APP ID CONSISTENCY
    // ---------------------------------------------------------

    if (steamUrl) {
      const detectedSteamId = extractSteamAppId(steamUrl);
      const storedSteamId = submission.steam_app_id
        ? String(submission.steam_app_id)
        : null;

      if (!detectedSteamId) {
        checks.push({
          check_key: "steam_app_id_consistency",
          check_name: "Steam App ID consistency",
          category: "Steam",
          status: "failed",
          summary:
            "Steam App ID consistency could not be verified because the URL was not recognised.",
        });
      } else if (!storedSteamId) {
        checks.push({
          check_key: "steam_app_id_consistency",
          check_name: "Steam App ID consistency",
          category: "Steam",
          status: "warning",
          summary:
            "A Steam App ID was detected, but no App ID is stored against the submission.",
        });
      } else {
        checks.push({
          check_key: "steam_app_id_consistency",
          check_name: "Steam App ID consistency",
          category: "Steam",
          status:
            detectedSteamId === storedSteamId ? "passed" : "failed",
          summary:
            detectedSteamId === storedSteamId
              ? `Stored Steam App ID ${storedSteamId} matches the submitted Steam URL.`
              : `Steam App ID mismatch: URL contains ${detectedSteamId}, but the submission stores ${storedSteamId}.`,
        });
      }
    } else {
      checks.push({
        check_key: "steam_app_id_consistency",
        check_name: "Steam App ID consistency",
        category: "Steam",
        status: "skipped",
        summary: "No Steam listing was supplied.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 08 — STEAM LISTING REACHABILITY
    // ---------------------------------------------------------

    if (steamUrl && extractSteamAppId(steamUrl)) {
      const steamReachability = await testReachability(steamUrl);

      checks.push({
        check_key: "steam_listing_reachable",
        check_name: "Steam listing reachability",
        category: "Steam",
        status: steamReachability.reachable ? "passed" : "warning",
        summary: steamReachability.reachable
          ? `The Steam listing responded${
              steamReachability.status
                ? ` with HTTP ${steamReachability.status}`
                : ""
            }.`
          : "PULSE could not confirm that the Steam listing was reachable.",
        details: steamReachability.reachable
          ? "The submitted Steam endpoint responded to the PULSE connectivity probe."
          : steamReachability.error ??
            "Steam did not return a successful response to the connectivity probe.",
        duration_ms: steamReachability.durationMs,
      });
    } else {
      checks.push({
        check_key: "steam_listing_reachable",
        check_name: "Steam listing reachability",
        category: "Steam",
        status: "skipped",
        summary: "No recognised Steam listing was available to test.",
      });
    }

    // ---------------------------------------------------------
    // CHECK 09 — SUBMISSION OWNERSHIP
    // ---------------------------------------------------------

    checks.push({
      check_key: "submission_ownership",
      check_name: "Submission ownership",
      category: "Submission",
      status: "passed",
      summary:
        "The authenticated developer owns the Playtested submission used for this PULSE run.",
    });

    // ---------------------------------------------------------
    // CHECK 10 — RELEASE INFORMATION
    // ---------------------------------------------------------

    const releaseStatus =
      typeof submission.release_status === "string"
        ? submission.release_status.trim()
        : "";

    checks.push({
      check_key: "release_status_present",
      check_name: "Release information",
      category: "Submission",
      status: releaseStatus ? "passed" : "warning",
      summary: releaseStatus
        ? `Release status is recorded as ${releaseStatus}.`
        : "No release status is recorded.",
    });

    // ---------------------------------------------------------
    // STORE RESULTS
    // ---------------------------------------------------------

    const resultRows = checks.map((check) => ({
      pulse_run_id: runId,
      check_key: check.check_key,
      check_name: check.check_name,
      category: check.category,
      status: check.status,
      summary: check.summary,
      details: check.details ?? null,
      duration_ms: check.duration_ms ?? null,
    }));

    const { error: resultInsertError } = await supabase
      .from("pulse_results")
      .insert(resultRows);

    if (resultInsertError) {
      throw new Error(
        `Could not store PULSE results: ${resultInsertError.message}`
      );
    }

    const completedChecks = checks.filter(
      (check) => check.status !== "skipped"
    ).length;

    const passedChecks = checks.filter(
      (check) => check.status === "passed"
    ).length;

    const warningChecks = checks.filter(
      (check) => check.status === "warning"
    ).length;

    const failedChecks = checks.filter(
      (check) => check.status === "failed"
    ).length;

    const scoredChecks = passedChecks + warningChecks + failedChecks;

    const technicalScore =
      scoredChecks > 0
        ? Math.round(
            ((passedChecks + warningChecks * 0.5) / scoredChecks) * 100
          )
        : null;

    const finalStatus =
      failedChecks > 0
        ? "failed"
        : warningChecks > 0
          ? "warning"
          : "passed";

    const completedAt = new Date().toISOString();

    const { error: updateRunError } = await supabase
      .from("pulse_runs")
      .update({
        status: finalStatus,
        total_checks: checks.length,
        completed_checks: completedChecks,
        passed_checks: passedChecks,
        warning_checks: warningChecks,
        failed_checks: failedChecks,
        technical_score: technicalScore,
        completed_at: completedAt,
      })
      .eq("id", runId);

    if (updateRunError) {
      throw new Error(
        `Could not finalise PULSE run: ${updateRunError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      pulse: {
        runId,
        runType: "preflight",
        status: finalStatus,
        technicalScore,
        totalChecks: checks.length,
        completedChecks,
        passedChecks,
        warningChecks,
        failedChecks,
        skippedChecks: checks.filter(
          (check) => check.status === "skipped"
        ).length,
        startedAt: null,
        completedAt,
        checks,
      },
    });
  } catch (error) {
    console.error("PULSE preflight failed:", error);

    if (runId) {
      try {
        const supabase = createAdminClient();

        await supabase
          .from("pulse_runs")
          .update({
            status: "error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
      } catch (updateError) {
        console.error(
          "PULSE could not mark failed run as error:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PULSE encountered an unexpected error.",
      },
      { status: 500 }
    );
  }
}

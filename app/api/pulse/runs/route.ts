import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PulseJobRequest = {
  submissionId?: string;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "PULSE server configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to run PULSE.",
        },
        { status: 401 }
      );
    }

    const token = authorization.slice("Bearer ".length).trim();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Your session could not be verified.",
        },
        { status: 401 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as PulseJobRequest | null;

    const submissionId =
      typeof body?.submissionId === "string"
        ? body.submissionId.trim()
        : "";

    if (!submissionId) {
      return NextResponse.json(
        {
          success: false,
          error: "PULSE requires a submission ID.",
        },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await supabase
      .from("game_submissions")
      .select("id, developer_id, title, game_link, steam_url")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      console.error("PULSE submission lookup failed:", submissionError);

      return NextResponse.json(
        {
          success: false,
          error: "PULSE could not load the saved submission.",
        },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        {
          success: false,
          error: "PULSE could not find the saved submission.",
        },
        { status: 404 }
      );
    }

    if (submission.developer_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot run PULSE for this submission.",
        },
        { status: 403 }
      );
    }

    const buildUrl = String(
      submission.game_link || submission.steam_url || ""
    ).trim();

    if (!buildUrl || !isHttpUrl(buildUrl)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "PULSE needs a valid build link before a technical run can be created.",
        },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("pulse_jobs")
      .insert({
        submission_id: submission.id,
        developer_id: user.id,
        technical_run_id: null,

        status: "QUEUED",

        engine_version: "PULSE v1",
        worker_version: "v6.10",
        test_suite_version: "v6.10",

        build_url: buildUrl,
        build_sha256: null,

        error_message: null,
      })
      .select(
        `
          id,
          submission_id,
          developer_id,
          technical_run_id,
          status,
          engine_version,
          worker_version,
          test_suite_version,
          build_url,
          build_sha256,
          error_message,
          created_at,
          started_at,
          completed_at,
          updated_at
        `
      )
      .single();

    if (jobError || !job) {
      console.error("PULSE job creation failed:", jobError);

      return NextResponse.json(
        {
          success: false,
          error: "PULSE could not create the technical test job.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,

        job: {
          id: job.id,
          submissionId: job.submission_id,
          technicalRunId: job.technical_run_id,

          status: job.status,

          engineVersion: job.engine_version,
          workerVersion: job.worker_version,
          testSuiteVersion: job.test_suite_version,

          buildUrl: job.build_url,
          buildSha256: job.build_sha256,

          errorMessage: job.error_message,

          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          updatedAt: job.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PULSE job API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "PULSE could not create the technical test job.",
      },
      { status: 500 }
    );
  }
}
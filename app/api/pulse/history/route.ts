import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PulseJobRow = {
  id: string;
  submission_id: string;
  technical_run_id: string | null;
  status: string;
  engine_version: string;
  worker_version: string;
  test_suite_version: string;
  build_url: string | null;
  build_sha256: string | null;
  error_message: string | null;
  report_json: unknown | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Server configuration is missing Supabase credentials.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication is required.",
      },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication is required.",
      },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Your session could not be verified.",
      },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const { data, error: jobsError } = await supabase
    .from("pulse_jobs")
    .select(
      "id, submission_id, technical_run_id, status, engine_version, worker_version, test_suite_version, build_url, build_sha256, error_message, report_json, created_at, started_at, completed_at, updated_at"
    )
    .eq("developer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (jobsError) {
    console.error("PULSE history lookup failed:", jobsError);

    return NextResponse.json(
      {
        success: false,
        error: "PULSE could not load your diagnostic history.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const jobs = (data ?? []) as unknown as PulseJobRow[];

  return NextResponse.json(
    {
      success: true,
      jobs: jobs.map((job) => ({
        id: job.id,
        submissionId: job.submission_id,
        technicalRunId: job.technical_run_id,
        status: job.status,
        engineVersion: job.engine_version,
        workerVersion: job.worker_version,
        testSuiteVersion: job.test_suite_version,
        buildUrl: job.build_url,
        buildSha256: job.build_sha256,
        error: job.error_message,
        pulse: job.report_json ?? null,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        updatedAt: job.updated_at,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

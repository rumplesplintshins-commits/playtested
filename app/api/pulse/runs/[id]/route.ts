import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ id: string }>;
};


export async function GET(request: NextRequest, context: RouteContext) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "PULSE server configuration is incomplete." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "You must be signed in to view this PULSE job." },
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
      { success: false, error: "Your session could not be verified." },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const jobId = id?.trim();

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: "PULSE requires a job ID." },
      { status: 400 }
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("pulse_jobs")
    .select(
      "id, submission_id, developer_id, technical_run_id, status, engine_version, worker_version, test_suite_version, build_url, build_sha256, error_message, report_json, created_at, started_at, completed_at, updated_at"
    )
    .eq("id", jobId)
    .eq("developer_id", user.id)
    .maybeSingle();

  if (jobError) {
    console.error("PULSE job status lookup failed:", jobError);
    return NextResponse.json(
      { success: false, error: "PULSE could not load this diagnostic job." },
      { status: 500 }
    );
  }

  if (!job) {
    return NextResponse.json(
      { success: false, error: "This PULSE job was not found." },
      { status: 404 }
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
        pulse: job.report_json ?? null,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        updatedAt: job.updated_at,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

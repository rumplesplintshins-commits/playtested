import {randomUUID,createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const RUNNER_SECRET = process.env.PULSE_RUNNER_SECRET?.trim();
const PLAYTESTED_BASE_URL = (
  process.env.PLAYTESTED_BASE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");

const POLL_INTERVAL_MS = 1500;
const STALE_JOB_MINUTES = 10;
const STALE_JOB_CHECK_INTERVAL_MS = 60_000;
const ACTIVE_JOB_STATUSES = [
  "ACQUIRING_BUILD",
  "SECURITY_SCAN",
  "TESTING",
  "PROCESSING_RESULTS",
];

let stopping = false;
let activeJobId = null;

const workerId=randomUUID();let heartbeatPending=false,processingReady=false;
export async function reportReadiness(force=true){
 if(heartbeatPending)return false;heartbeatPending=true;
 let ready=false;
 try{
  if(force&&!stopping&&process.env.PULSE_ENABLED!=="false"){
   const response=await fetch(PLAYTESTED_BASE_URL+"/api/pulse/preflight",{headers:{"X-PULSE-RUNNER-SECRET":RUNNER_SECRET,"X-PULSE-PROJECT":createHash("sha256").update(SUPABASE_URL).digest("hex")},signal:AbortSignal.timeout(25000)});
   ready=response.ok&&(await response.json()).ready===true;
  }
  await supabaseRequest("rpc/record_pulse_worker_heartbeat",{method:"POST",body:JSON.stringify({p_worker:workerId,p_ready:ready,p_busy:!!activeJobId,p_job:activeJobId})});
  processingReady=ready;return ready;
 }catch{processingReady=false;return false;}finally{heartbeatPending=false;}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    signal:AbortSignal.timeout(10000),
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object"
        ? payload.message || payload.details || JSON.stringify(payload)
        : String(payload || response.statusText);

    throw new Error(`Supabase ${response.status}: ${detail}`);
  }

  return payload;
}

export async function recoverStaleJobs() {
  const cutoff = new Date(
    Date.now() - STALE_JOB_MINUTES * 60 * 1000
  ).toISOString();

  const statusFilter = ACTIVE_JOB_STATUSES
    .map((status) => `status.eq.${status}`)
    .join(",");

  const rows = await supabaseRequest(
    `pulse_jobs?select=id,status,updated_at&or=(${statusFilter})&updated_at=lt.${encodeURIComponent(cutoff)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  for (const job of rows) {
    const alive=await supabaseRequest("rpc/pulse_job_worker_alive",{method:"POST",body:JSON.stringify({p_job:job.id})});
    if(alive===true)continue;
    const now = new Date().toISOString();
    const message =
      `PULSE job recovered after remaining in ${job.status} for more than ` +
      `${STALE_JOB_MINUTES} minutes. The runner or server may have stopped during execution.`;

    await supabaseRequest(
      `pulse_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.${encodeURIComponent(job.status)}&updated_at=eq.${encodeURIComponent(job.updated_at)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "FAILED",
          error_message: message,
          completed_at: now,
          updated_at: now,
        }),
      }
    );

    console.warn(
      `[PULSE V9] Recovered stale job ${job.id} from ${job.status} -> FAILED.`
    );
  }
}

async function claimNextQueuedJob() {
  const rows = await supabaseRequest("rpc/claim_next_pulse_job", {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: JSON.stringify({}),
  });

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function failJob(jobId, message) {
  try {
    await supabaseRequest(
      `pulse_jobs?id=eq.${encodeURIComponent(jobId)}&status=eq.ACQUIRING_BUILD`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "FAILED",
          error_message: message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );
  } catch (error) {
    console.error("PULSE runner could not mark the claimed job FAILED:", error);
  }
}

export async function runJob(job) {
  activeJobId = job.id;
  await reportReadiness();

  console.log(
    `[PULSE V9] Starting job ${job.id} for submission ${job.submission_id}`
  );

  try {
    const response = await fetch(`${PLAYTESTED_BASE_URL}/api/pulse/preflight`, {
      signal:AbortSignal.timeout(30*60*1000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PULSE-RUNNER-SECRET": RUNNER_SECRET,
      },
      body: JSON.stringify({
        submissionId: job.submission_id,
        jobId: job.id,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      const message =
        payload?.error ||
        `PULSE execution endpoint returned HTTP ${response.status}.`;

      console.error(`[PULSE V9] Job ${job.id} failed: ${message}`);

      // The preflight route normally records FAILED/BLOCKED itself.
      // This fallback only catches failures before that lifecycle update occurs.
      await failJob(job.id, message);
      return;
    }

    console.log(
      `[PULSE V9] Job ${job.id} completed — technical run ${
        payload.pulse?.technicalRunId || "recorded"
      }`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PULSE runner failure.";

    console.error(`[PULSE V9] Job ${job.id} crashed: ${message}`);
    await failJob(job.id, message);
  } finally {
    activeJobId = null;
  }
}

async function main() {
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RUNNER_SECRET) {
  console.error(
    "PULSE V9 runner requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PULSE_RUNNER_SECRET."
  );
  process.exit(1);
}


  const endpoint=new URL(PLAYTESTED_BASE_URL);
  if(endpoint.protocol!=="https:"&&!(endpoint.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(endpoint.hostname)))throw Error("PLAYTESTED_BASE_URL requires HTTPS outside local development.");
  await reportReadiness();
  const heartbeat=setInterval(()=>void reportReadiness(),20000);
  console.log("PULSE V9 standalone runner online.");
  console.log("Execution endpoint configured; readiness required.");
  console.log("Waiting to atomically claim QUEUED jobs...");
  console.log(
    `Stale-job recovery enabled: ${STALE_JOB_MINUTES} minute timeout.`
  );

  let lastStaleCheckAt = 0;

  while (!stopping) {
    try {
      const now = Date.now();

      if (now - lastStaleCheckAt >= STALE_JOB_CHECK_INTERVAL_MS) {
        await recoverStaleJobs();
        lastStaleCheckAt = now;
      }

      if(!processingReady){await sleep(3000);continue;}
      const job = await claimNextQueuedJob();

      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      await runJob(job);
    } catch (error) {
      await reportReadiness(false);
      console.error(
        "[PULSE V9] Queue polling error:",
        error instanceof Error ? error.message : error
      );
      await sleep(3000);
    }
  }

  clearInterval(heartbeat);await reportReadiness(false);
  console.log(
    activeJobId
      ? `PULSE V9 runner stopping after job ${activeJobId}.`
      : "PULSE V9 runner stopped."
  );
}

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch((error) => {
  console.error("PULSE V9 runner fatal error:", error);
  process.exit(1);
});

const PROCESS_URL =
  process.env.PLAYTESTED_PROCESS_URL ||
  "http://localhost:3000/api/admin/process-steam-queue";

const WORKER_SECRET = process.env.STEAM_WORKER_SECRET;

const DELAY_BETWEEN_BATCHES_MS = 5000;
const EMPTY_QUEUE_DELAY_MS = 60000;
const ERROR_DELAY_MS = 60000;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function timestamp() {
  return new Date().toLocaleTimeString();
}

async function processBatch() {
  if (!WORKER_SECRET) {
    throw new Error(
      "STEAM_WORKER_SECRET is missing. Start this worker with: node --env-file=.env.local scripts/steam-queue-worker.mjs"
    );
  }

  const response = await fetch(PROCESS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-steam-worker-secret": WORKER_SECRET,
    },
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(`Unreadable server response (${response.status})`);
  }

  if (!response.ok) {
    const error = new Error(
      result.error ||
        result.message ||
        `Request failed (${response.status})`
    );

    error.result = result;
    throw error;
  }

  return result;
}

async function run() {
  console.log("Playtested Steam queue worker");
  console.log(`Endpoint: ${PROCESS_URL}`);
  console.log("Worker authentication: configured");
  console.log("Press Ctrl+C to stop.");
  console.log("");

  let totalBatches = 0;
  let totalProcessed = 0;
  let totalImported = 0;
  let totalExcluded = 0;
  let totalNotGames = 0;
  let totalFailed = 0;

  while (true) {
    try {
      console.log(`[${timestamp()}] Processing next batch...`);

      const result = await processBatch();

      totalBatches += 1;

      const processed = result.processed ?? 0;
      const imported = result.imported ?? 0;
      const excluded = result.excluded ?? 0;
      const notGames = result.notGames ?? 0;
      const failed = result.failed ?? 0;

      totalProcessed += processed;
      totalImported += imported;
      totalExcluded += excluded;
      totalNotGames += notGames;
      totalFailed += failed;

      console.log(
        `[${timestamp()}] Batch ${totalBatches}: ` +
          `${processed} processed, ` +
          `${imported} eligible, ` +
          `${excluded} excluded/held, ` +
          `${notGames} non-games, ` +
          `${failed} failed.`
      );

      console.log(
        `Totals: ${totalProcessed} processed, ` +
          `${totalImported} eligible, ` +
          `${totalExcluded} excluded/held, ` +
          `${totalNotGames} non-games, ` +
          `${totalFailed} failed.`
      );

      if (
        result.rateLimited ||
        (result.success === false && result.retryable)
      ) {
        const cooldownSeconds = Math.max(
          Number(result.cooldownSeconds ?? 1800),
          60
        );

        console.log(
          `[${timestamp()}] Steam/API cooldown requested. Waiting ${Math.ceil(
            cooldownSeconds / 60
          )} minute(s)...`
        );

        await wait(cooldownSeconds * 1000);
        continue;
      }

      if (processed === 0) {
        console.log(
          `[${timestamp()}] Nothing currently claimable. Checking again in 60 seconds...`
        );

        await wait(EMPTY_QUEUE_DELAY_MS);
        continue;
      }

      await wait(DELAY_BETWEEN_BATCHES_MS);
    } catch (error) {
      const result = error?.result;

      if (
        result?.rateLimited ||
        result?.retryable ||
        /429|rate.?limit|too many requests|cooldown/i.test(
          error instanceof Error
            ? error.message
            : String(error)
        )
      ) {
        const cooldownSeconds = Math.max(
          Number(result?.cooldownSeconds ?? 1800),
          60
        );

        console.error(
          `[${timestamp()}] Rate limited/retry requested. Waiting ${Math.ceil(
            cooldownSeconds / 60
          )} minute(s).`
        );

        await wait(cooldownSeconds * 1000);
        continue;
      }

      console.error(
        `[${timestamp()}] Worker error:`,
        error instanceof Error ? error.message : error
      );

      console.log(
        `[${timestamp()}] Retrying in ${
          ERROR_DELAY_MS / 1000
        } seconds...`
      );

      await wait(ERROR_DELAY_MS);
    }
  }
}

process.on("SIGINT", () => {
  console.log("\nSteam queue worker stopped.");
  process.exit(0);
});

run().catch((error) => {
  console.error("Steam queue worker crashed:", error);
  process.exit(1);
});
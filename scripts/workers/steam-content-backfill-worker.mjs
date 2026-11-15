const BASE_URL = "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/admin/backfill-steam-content`;

const WORKER_SECRET = process.env.STEAM_WORKER_SECRET;

const DELAY_BETWEEN_BATCHES_MS = 5000;
const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000;

if (!WORKER_SECRET) {
  console.error(
    "STEAM_WORKER_SECRET is missing. Run this script with --env-file=.env.local."
  );
  process.exit(1);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds} second(s)`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} minute(s)`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0
    ? `${hours} hour(s) ${minutes} minute(s)`
    : `${hours} hour(s)`;
}

async function requestBatch() {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-steam-worker-secret": WORKER_SECRET,
    },
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Backfill route returned HTTP ${response.status} with invalid JSON.`
    );
  }

  if (!response.ok) {
    const message =
      payload?.details ||
      payload?.error ||
      payload?.message ||
      `Backfill route returned HTTP ${response.status}.`;

    throw new Error(message);
  }

  return payload;
}

async function main() {
  console.log("Playtested Steam content backfill worker");
  console.log("----------------------------------------");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log("");
  console.log(
    "This worker only processes eligible catalogue games missing Steam content metadata."
  );
  console.log("Press Ctrl+C at any time to stop safely.");
  console.log("");

  let batchNumber = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalNsfwFound = 0;

  while (true) {
    batchNumber++;

    console.log(`Starting batch ${batchNumber}...`);

    let result;

    try {
      result = await requestBatch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.error(`Batch ${batchNumber} failed: ${message}`);
      console.error("");
      console.error(
        "The worker has stopped. Existing completed backfill records are safe."
      );
      console.error(
        "Fix the error, then run the worker again to resume from the remaining games."
      );

      process.exit(1);
    }

    const processed = Number(result.processed ?? 0);
    const updated = Number(result.updated ?? 0);
    const failed = Number(result.failed ?? 0);
    const nsfwFound = Number(result.nsfwFound ?? 0);

    totalProcessed += processed;
    totalUpdated += updated;
    totalFailed += failed;
    totalNsfwFound += nsfwFound;

    console.log(
      `Batch ${batchNumber}: ${processed} processed, ${updated} updated, ${failed} failed, ${nsfwFound} NSFW.`
    );

    if (result.remaining !== null && result.remaining !== undefined) {
      console.log(`Remaining: ${result.remaining}`);
    }

    if (Array.isArray(result.results)) {
      for (const item of result.results) {
        const status = item.success ? "OK" : "FAILED";
        const nsfw =
          item.success && item.isNsfw === true ? " [NSFW]" : "";

        console.log(
          `  ${status}: ${item.title ?? item.appId} (${item.appId})${nsfw}`
        );

        if (!item.success && item.message) {
          console.log(`    ${item.message}`);
        }
      }
    }

    console.log("");

    if (result.complete === true || Number(result.remaining) === 0) {
      console.log("Steam content backfill complete.");
      console.log("----------------------------------------");
      console.log(`Total processed this run: ${totalProcessed}`);
      console.log(`Total updated this run: ${totalUpdated}`);
      console.log(`Total failed this run: ${totalFailed}`);
      console.log(`NSFW games found this run: ${totalNsfwFound}`);

      process.exit(0);
    }

    if (result.rateLimited === true) {
      const cooldownSeconds = Number(result.cooldownSeconds ?? 0);

      const delay =
        cooldownSeconds > 0
          ? cooldownSeconds * 1000
          : DEFAULT_RETRY_DELAY_MS;

      console.log(
        `Steam rate limit/cooldown active. Waiting ${formatDuration(delay)}...`
      );
      console.log("");

      await wait(delay);

      continue;
    }

    if (result.success === false && result.retryable === true) {
      const cooldownSeconds = Number(result.cooldownSeconds ?? 0);

      const delay =
        cooldownSeconds > 0
          ? cooldownSeconds * 1000
          : DEFAULT_RETRY_DELAY_MS;

      console.log(
        `Temporary Steam failure. Waiting ${formatDuration(delay)} before retrying...`
      );
      console.log("");

      await wait(delay);

      continue;
    }

    /*
     * Safety check.
     *
     * If the route says games remain but processes nothing, continuing
     * indefinitely would create a tight loop. Stop instead so the
     * remaining records can be inspected.
     */
    if (processed === 0) {
      console.error(
        "No games were processed but the backfill is not complete."
      );
      console.error(
        "Worker stopped to prevent an infinite retry loop."
      );

      process.exit(1);
    }

    console.log(
      `Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000} seconds before the next batch...`
    );
    console.log("");

    await wait(DELAY_BETWEEN_BATCHES_MS);
  }
}

process.on("SIGINT", () => {
  console.log("");
  console.log("Backfill worker stopped.");
  console.log(
    "Already completed games are saved. Run the same command later to resume."
  );
  process.exit(0);
});

main().catch((error) => {
  console.error(
    "Unexpected backfill worker error:",
    error instanceof Error ? error.message : error
  );

  process.exit(1);
});

"use client";

import { useRef, useState, type FormEvent } from "react";

type ImportResult = {
  appId: string;
  title?: string;
  success?: boolean;
  message: string;
};

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  complete?: boolean;
  discovered?: number;
  lastAppId?: number;
  importedCount?: number;
  failedCount?: number;
  processed?: number;
  imported?: number;
  notGames?: number;
  excluded?: number;
  failed?: number;
  pending?: number;
  rateLimited?: boolean;
  retryable?: boolean;
  cooldownSeconds?: number;
  results?: ImportResult[];
};

const DISCOVERY_DELAY_MS = 5000;
const PROCESSING_BATCH_DELAY_MS = 5000;

const curatedGames = [
  { title: "Hades", appId: "1145360", genre: "Action roguelike" },
  { title: "Hollow Knight", appId: "367520", genre: "Metroidvania" },
  { title: "Celeste", appId: "504230", genre: "Platformer" },
  { title: "Dead Cells", appId: "588650", genre: "Action roguelike" },
  { title: "Slay the Spire", appId: "646570", genre: "Deckbuilding" },
  { title: "Balatro", appId: "2379780", genre: "Card game" },
  { title: "Stardew Valley", appId: "413150", genre: "Cozy simulation" },
  { title: "Terraria", appId: "105600", genre: "Sandbox adventure" },
  { title: "Vampire Survivors", appId: "1794680", genre: "Survivor-like" },
  { title: "DAVE THE DIVER", appId: "1868140", genre: "Adventure" },
  { title: "Undertale", appId: "391540", genre: "RPG" },
  { title: "Cuphead", appId: "268910", genre: "Run and gun" },
  { title: "Inscryption", appId: "1092790", genre: "Deckbuilding horror" },
  { title: "TUNIC", appId: "553420", genre: "Action adventure" },
  { title: "Spiritfarer", appId: "972660", genre: "Management adventure" },
  { title: "Outer Wilds", appId: "753640", genre: "Exploration" },
  { title: "Return of the Obra Dinn", appId: "653530", genre: "Mystery" },
  { title: "Papers, Please", appId: "239030", genre: "Simulation" },
  { title: "Katana ZERO", appId: "460950", genre: "Action platformer" },
  { title: "Loop Hero", appId: "1282730", genre: "Strategy roguelike" },
];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function SteamImporter() {
  const [expanded, setExpanded] = useState(false);
  const [appIds, setAppIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<"discovery" | "processing" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const stopRequested = useRef(false);

  async function postRequest(
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<ApiResult> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    let result: ApiResult;

    try {
      result = (await response.json()) as ApiResult;
    } catch {
      throw new Error(
        `The server returned an unreadable response (${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status}).`);
    }

    return result;
  }

  function loadCuratedList() {
    setAppIds(curatedGames.map((game) => game.appId).join("\n"));
    setMessage(
      "Loaded the 20 curated Steam App IDs. Select Import games to import them."
    );
    setError("");
    setImportResults([]);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ids = Array.from(
      new Set(
        appIds
          .split(/[\s,;]+/)
          .map((id) => id.trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      setError("Enter at least one Steam App ID.");
      return;
    }

    if (ids.some((id) => !/^\d{1,12}$/.test(id))) {
      setError(
        "App IDs must contain numbers only. Separate IDs with new lines, commas or spaces."
      );
      return;
    }

    if (ids.length > 20) {
      setError("Import a maximum of 20 unique App IDs at a time.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    setImportResults([]);

    try {
      const result = await postRequest("/api/admin/import-steam", {
        appIds: ids,
      });

      setMessage(
        result.message ||
          `${result.importedCount ?? 0} game(s) imported; ${result.failedCount ?? 0} failed.`
      );
      setImportResults(result.results ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not contact the server. Check that it is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runDiscovery() {
    setTask("discovery");
    stopRequested.current = false;
    setMessage("");
    setError("");
    setImportResults([]);

    let totalDiscovered = 0;
    let pagesCompleted = 0;

    try {
      while (!stopRequested.current) {
        if (pagesCompleted > 0) {
          setProgress(
            `Waiting 5 seconds before the next request. ${pagesCompleted} page(s) completed, ${totalDiscovered.toLocaleString()} listings discovered.`
          );

          await wait(DISCOVERY_DELAY_MS);

          if (stopRequested.current) break;
        }

        setProgress(
          `Discovering Steam catalogue. ${pagesCompleted} page(s) completed, ${totalDiscovered.toLocaleString()} listings discovered.`
        );

        const result = await postRequest("/api/admin/discover-steam");

        totalDiscovered += result.discovered ?? 0;
        pagesCompleted += 1;

        if (result.complete) {
          setProgress("");
          setMessage(
            `Discovery complete. ${totalDiscovered.toLocaleString()} listings processed across ${pagesCompleted} page(s).`
          );
          return;
        }
      }

      setProgress("");
      setMessage(
        `Discovery stopped. ${totalDiscovered.toLocaleString()} listings were processed during this run. You can resume later.`
      );
    } catch (caught) {
      setProgress("");

      const errorMessage =
        caught instanceof Error
          ? caught.message
          : "Steam discovery failed. You can try again.";

      if (/HTTP\s*429|rate.?limit|too many requests/i.test(errorMessage)) {
        setError(
          `Steam has rate-limited discovery. Stopped after ${pagesCompleted} page(s) in this run, with ${totalDiscovered.toLocaleString()} listings reported. Do not retry immediately. Original error: ${errorMessage}`
        );
      } else {
        setError(
          `${errorMessage} Discovery stopped after ${pagesCompleted} page(s), with ${totalDiscovered.toLocaleString()} listings reported.`
        );
      }
    } finally {
      setTask(null);
    }
  }

  async function runProcessing(continuous = false) {
    setTask("processing");
    stopRequested.current = false;
    setMessage("");
    setError("");
    setProgress(
      continuous
        ? "Starting continuous queue processing..."
        : "Processing one batch of up to five queued listings..."
    );
    setImportResults([]);

    let batchesCompleted = 0;
    let totalProcessed = 0;
    let totalImported = 0;
    let totalNotGames = 0;
    let totalExcluded = 0;
    let totalFailed = 0;
    let stoppedByCondition = false;

    try {
      while (!stopRequested.current) {
        if (continuous && batchesCompleted > 0) {
          setProgress(
            `Batch ${batchesCompleted} complete. ${totalProcessed.toLocaleString()} listings processed so far. Waiting ${PROCESSING_BATCH_DELAY_MS / 1000} seconds before the next batch.`
          );

          await wait(PROCESSING_BATCH_DELAY_MS);

          if (stopRequested.current) break;
        }

        setProgress(
          continuous
            ? `Processing batch ${batchesCompleted + 1}. ${totalProcessed.toLocaleString()} listings processed so far.`
            : "Processing one batch of up to five queued listings..."
        );

        const result = await postRequest("/api/admin/process-steam-queue");
        batchesCompleted += 1;

        const batchResults = Array.isArray(result.results)
          ? result.results
          : [];

        const displayedResults = batchResults.map((item) => ({
          ...item,
          success:
            item.success ??
            !/failed|error|unavailable|rate.?limit|excluded|held back|skipped/i.test(
              item.message
            ),
        }));

        setImportResults((previous) =>
          [...previous, ...displayedResults].slice(-100)
        );

        totalProcessed += result.processed ?? batchResults.length;
        totalImported += result.imported ?? 0;
        totalNotGames += result.notGames ?? 0;
        totalExcluded += result.excluded ?? 0;
        totalFailed += result.failed ?? 0;

        if (result.rateLimited || (result.success === false && result.retryable)) {
          const waitMinutes = Math.ceil(
            (result.cooldownSeconds ?? 1800) / 60
          );

          setError(
            result.message ||
              `Processing paused because the request should be retried later. Wait approximately ${waitMinutes} minute(s) before restarting.`
          );
          stoppedByCondition = true;
          break;
        }

        if (batchResults.length === 0 || (result.processed ?? 0) === 0) {
          setMessage(
            result.message ||
              "No listings were processed. The queue may be empty or its entries may not currently be claimable."
          );
          stoppedByCondition = true;
          break;
        }

        if (!continuous) {
          setMessage(
            `Single batch complete: ${totalProcessed} listing(s) processed, ${totalImported} passed preliminary indie screening, ${totalNotGames} non-games skipped, ${totalExcluded} excluded or held back, and ${totalFailed} failed.`
          );
          stoppedByCondition = true;
          break;
        }
      }

      if (continuous && !stoppedByCondition) {
        setMessage(
          stopRequested.current
            ? `Processing stopped on request. ${totalProcessed.toLocaleString()} listings processed across ${batchesCompleted} batch(es).`
            : `Processing finished. ${totalProcessed.toLocaleString()} listings processed across ${batchesCompleted} batch(es).`
        );
      } else if (continuous && stoppedByCondition && !error) {
        setMessage(
          `Continuous processing stopped after ${batchesCompleted} batch(es). Total: ${totalProcessed.toLocaleString()} processed, ${totalImported} passed preliminary indie screening, ${totalNotGames} non-games skipped, ${totalExcluded} excluded or held back, and ${totalFailed} failed.`
        );
      }
    } catch (caught) {
      const errorMessage =
        caught instanceof Error
          ? caught.message
          : "Queue processing failed.";

      setError(errorMessage);
    } finally {
      setProgress("");
      setTask(null);
      stopRequested.current = false;
    }
  }

  function requestStop() {
    stopRequested.current = true;
    setProgress("Stop requested. Waiting for the current request to finish...");
  }

  const taskRunning = task !== null;

  return (
    <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Catalogue management
          </span>
          <span className="mt-1 block text-xl font-bold text-zinc-100">
            Steam catalogue
          </span>
          <span className="mt-1 block text-sm text-zinc-400">
            Discover, import and manage public Steam listings.
          </span>
        </span>

        <span className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300">
          {expanded ? "− Minimise" : "+ Expand"}
        </span>
      </button>

      {expanded && (
        <div className="mt-6 border-t border-zinc-800 pt-5">
          <p className="max-w-2xl text-sm leading-6 text-zinc-400">
            Imported games remain without an independent assessment until they go through
            Playtested&apos;s own assessment process.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={runDiscovery}
              disabled={taskRunning || loading}
              className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {task === "discovery" ? "Discovering..." : "Discover catalogue"}
            </button>

            <button
              type="button"
              onClick={() => runProcessing(false)}
              disabled={taskRunning || loading}
              className="rounded-lg border border-zinc-600 px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {task === "processing" ? "Processing..." : "Process one batch"}
            </button>

            <button
              type="button"
              onClick={() => runProcessing(true)}
              disabled={taskRunning || loading}
              className="rounded-lg border border-emerald-400 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Process continuously
            </button>

            {taskRunning && (
              <button
                type="button"
                onClick={requestStop}
                className="rounded-lg border border-red-400/50 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/10"
              >
                Stop processing
              </button>
            )}
          </div>

          {progress && (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-zinc-700 bg-black/20 p-3 text-sm text-zinc-300"
            >
              {progress}
            </p>
          )}

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-bold">Import Steam games</h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Import up to 20 public Steam game listings at a time. Imports
              remain without an independent assessment and do not approve developer submissions.
            </p>

            <button
              type="button"
              onClick={loadCuratedList}
              disabled={loading || taskRunning}
              className="mt-4 rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-emerald-400 disabled:opacity-50"
            >
              Load curated list (20)
            </button>

            <div className="mt-5 rounded-lg border border-zinc-800 bg-black/20 p-4">
              <h4 className="font-semibold">Curated starter list</h4>
              <p className="mt-1 text-sm text-zinc-400">
                A genre-diverse starting point, not a Playtested quality
                endorsement. Review games before importing.
              </p>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {curatedGames.map((game) => (
                  <li key={game.appId} className="text-sm">
                    <span className="text-zinc-100">{game.title}</span>
                    <span className="text-zinc-500"> · {game.genre}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleImport} className="mt-5">
              <label
                htmlFor="steam-app-ids"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Steam App IDs
              </label>

              <textarea
                id="steam-app-ids"
                required
                value={appIds}
                onChange={(event) => setAppIds(event.target.value)}
                disabled={loading || taskRunning}
                placeholder={"413150\n620\n105600"}
                rows={5}
                className="w-full rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-400 disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-zinc-500">
                Enter up to 20 unique numeric App IDs, separated by new lines,
                commas or spaces.
              </p>

              <button
                type="submit"
                disabled={loading || taskRunning || !appIds.trim()}
                className="mt-4 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Importing games..." : "Import games"}
              </button>
            </form>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"
            >
              {message}
            </p>
          )}

          {importResults.length > 0 && (
            <div className="mt-4 rounded-lg border border-zinc-800 p-4">
              <h4 className="font-semibold">Recent processing results</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Showing up to the latest 100 listings from this run.
              </p>
              <ul className="mt-3 space-y-2">
                {importResults.map((result, index) => (
                  <li
                    key={`${result.appId}-${index}`}
                    className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between"
                  >
                    <span className="text-zinc-200">
                      {result.title || `App ID ${result.appId}`}
                    </span>
                    <span
                      className={
                        result.success ? "text-emerald-400" : "text-red-300"
                      }
                    >
                      {result.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

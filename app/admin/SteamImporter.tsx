
"use client";

import { useRef, useState, type FormEvent } from "react";

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  complete?: boolean;
  discovered?: number;
  lastAppId?: number;
  processed?: number;
  imported?: number;
  notGames?: number;
  failed?: number;
  results?: unknown[];
};

export default function SteamImporter() {
  const [appId, setAppId] = useState("");
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<"discovery" | "processing" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const stopRequested = useRef(false);

  async function postRequest(
    endpoint: string
  ): Promise<ApiResult> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const result = (await response.json()) as ApiResult;

    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status}).`);
    }

    return result;
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/import-steam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appId: appId.trim() }),
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        setError(result.error || "The game could not be imported.");
        return;
      }

      setMessage(result.message || "Game imported successfully.");
      setAppId("");
    } catch {
      setError("Could not contact the server. Check that it is running.");
    } finally {
      setLoading(false);
    }
  }

  async function runDiscovery() {
    setTask("discovery");
    stopRequested.current = false;
    setMessage("");
    setError("");

    let totalDiscovered = 0;
    let pagesCompleted = 0;

    try {
      while (!stopRequested.current) {
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

        if (stopRequested.current) {
          break;
        }
      }

      setProgress("");
      setMessage(
        `Discovery stopped. ${totalDiscovered.toLocaleString()} listings were processed during this run. You can resume later.`
      );
    } catch (caught) {
      setProgress("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Steam discovery failed. You can try again."
      );
    } finally {
      setTask(null);
    }
  }

  async function runProcessing() {
    setTask("processing");
    stopRequested.current = false;
    setMessage("");
    setError("");

    let totalProcessed = 0;
    let totalImported = 0;
    let totalNotGames = 0;
    let totalFailed = 0;
    let batchesCompleted = 0;

    try {
      while (!stopRequested.current) {
        setProgress(
          `Processing queue. ${batchesCompleted} batch(es) completed, ${totalProcessed.toLocaleString()} listings processed.`
        );

        const result = await postRequest(
          "/api/admin/process-steam-queue"
        );

        const batchResults = Array.isArray(result.results)
          ? result.results
          : [];

        // An empty result means the processor found no more work.
        if (batchResults.length === 0) {
          setProgress("");
          setMessage(
            `Queue processing finished. ${totalProcessed.toLocaleString()} listings processed, ${totalImported.toLocaleString()} imported or updated, ${totalNotGames.toLocaleString()} excluded as non-games, and ${totalFailed.toLocaleString()} failed.`
          );
          return;
        }

        batchesCompleted += 1;
        totalProcessed += result.processed ?? batchResults.length;
        totalImported += result.imported ?? 0;
        totalNotGames += result.notGames ?? 0;
        totalFailed += result.failed ?? 0;

        if (stopRequested.current) {
          break;
        }
      }

      setProgress("");
      setMessage(
        `Processing stopped. ${totalProcessed.toLocaleString()} listings processed in this run. You can resume later.`
      );
    } catch (caught) {
      setProgress("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Queue processing failed. You can try again."
      );
    } finally {
      setTask(null);
    }
  }

  function requestStop() {
    stopRequested.current = true;
    setProgress("Stopping after the current request finishes...");
  }

  const taskRunning = task !== null;

  return (
    <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
        Catalogue management
      </p>

      <h2 className="mt-2 text-xl font-bold">Steam catalogue</h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        Discover public Steam game listings, then enrich them with available
        metadata. Imported listings remain without an independent assessment until they go
        through Playtested&apos;s own assessment process.
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
          onClick={runProcessing}
          disabled={taskRunning || loading}
          className="rounded-lg border border-zinc-600 px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {task === "processing" ? "Processing..." : "Process queue"}
        </button>

        {taskRunning && (
          <button
            type="button"
            onClick={requestStop}
            className="rounded-lg border border-red-400/50 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/10"
          >
            Stop
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
        <h3 className="text-lg font-bold">Import one Steam game</h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Use this for an individual listing. The catalogue discovery process
          above is intended for bulk imports.
        </p>

        <form
          onSubmit={handleImport}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            value={appId}
            onChange={(event) => setAppId(event.target.value)}
            placeholder="Steam App ID, e.g. 413150"
            aria-label="Steam App ID"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-400"
          />

          <button
            type="submit"
            disabled={loading || taskRunning || !appId.trim()}
            className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import game"}
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
    </section>
  );
}

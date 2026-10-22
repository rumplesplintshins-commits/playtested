
"use client";

import { useState, type FormEvent } from "react";

export default function SteamImporter() {
  const [appId, setAppId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      const result = await response.json();

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

  return (
    <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
        Catalogue management
      </p>

      <h2 className="mt-2 text-xl font-bold">Import Steam game</h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        Add a public Steam game listing to Playtested. Imports are labelled
        Not yet verified and do not create an assessment or approve a
        developer submission.
      </p>

      <form
        onSubmit={handleImport}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
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
          disabled={loading || !appId.trim()}
          className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Importing..." : "Import game"}
        </button>
      </form>

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

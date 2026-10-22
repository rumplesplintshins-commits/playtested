"use client";

import { useCallback, useEffect, useState } from "react";

type ImportedGame = {
  id: string;
  steam_app_id: string;
  title: string | null;
  developer_name: string | null;
  publisher_name: string | null;
  genre: string | null;
  description: string | null;
  steam_url: string | null;
  image_url: string | null;
  price: string | null;
  release_date: string | null;
  imported_at: string | null;
  last_synced_at: string | null;
  catalogue_eligible: boolean;
  metadata_backfill_status: string;
  metadata_backfill_error: string | null;
};

type Filter = "all" | "eligible" | "excluded" | "pending" | "complete";

type CatalogueResponse = {
  games: ImportedGame[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const panelClass =
  "rounded-xl border border-zinc-800 bg-zinc-900/60 p-5";

export default function ImportedSteamCatalogue() {
  const [games, setGames] = useState<ImportedGame[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        status: filter,
        page: String(page),
        pageSize: "25",
      });

      const response = await fetch(
        `/api/admin/imported-games?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = (await response.json()) as
        | CatalogueResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error || "Could not load imported games."
            : "Could not load imported games."
        );
      }

      const catalogue = result as CatalogueResponse;

      setGames(catalogue.games ?? []);
      setTotal(catalogue.total ?? 0);
      setTotalPages(catalogue.totalPages ?? 0);
    } catch (err) {
      console.error("Could not load imported catalogue:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not contact the imported catalogue API."
      );
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  function applySearch() {
    setPage(1);
    setSearch(searchInput.trim());
    setMessage("");
  }

  async function changeEligibility(game: ImportedGame) {
    const nextEligibility = !game.catalogue_eligible;
    const action = nextEligibility ? "include" : "exclude";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${game.title || game.steam_app_id}" ${
          nextEligibility
            ? "in the public catalogue?"
            : "from the public catalogue?"
        } This does not verify the game.`
      )
    ) {
      return;
    }

    setBusyId(game.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/imported-games", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: game.id,
          catalogue_eligible: nextEligibility,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not update catalogue eligibility."
        );
      }

      setMessage(result.message || "Catalogue eligibility updated.");
      await loadGames();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the listing."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteGame(game: ImportedGame) {
    const title = game.title || `Steam App ID ${game.steam_app_id}`;

    if (
      !window.confirm(
        `PERMANENTLY DELETE "${title}" from the imported Steam catalogue?\n\nThis cannot be undone. Only this imported catalogue record will be targeted.`
      )
    ) {
      return;
    }

    setBusyId(game.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/imported-games", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: game.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not delete the listing.");
      }

      setMessage(result.message || "Imported listing deleted.");

      if (games.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadGames();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the listing."
      );
    } finally {
      setBusyId(null);
    }
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All listings" },
    { value: "pending", label: "Metadata pending" },
    { value: "complete", label: "Metadata complete" },
    { value: "eligible", label: "Catalogue eligible" },
    { value: "excluded", label: "Excluded" },
  ];

  return (
    <section className={`${panelClass} mb-8`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Imported Steam Catalogue</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Manage imported listings without affecting developer submissions.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {loading
              ? "Loading catalogue..."
              : `${total.toLocaleString()} imported listings`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadGames()}
            disabled={loading}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            {isExpanded ? "Collapse ▲" : "Manage catalogue ▼"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"
        >
          {message}
        </div>
      )}

      {isExpanded && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Search title, Steam App ID or developer"
              aria-label="Search imported Steam listings"
              className="min-w-0 rounded-lg border border-zinc-700 bg-[#090b0a] px-3 py-3 text-sm outline-none focus:border-emerald-400"
            />

            <button
              type="button"
              onClick={applySearch}
              className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-black hover:bg-emerald-300"
            >
              Search
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFilter(item.value);
                  setPage(1);
                  setMessage("");
                }}
                className={`rounded-lg px-3 py-2 text-xs transition ${
                  filter === item.value
                    ? "bg-emerald-400 font-semibold text-black"
                    : "border border-zinc-700 bg-[#090b0a] text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
            <p>
              {total.toLocaleString()} listing{total === 1 ? "" : "s"} found
            </p>
            <p>Showing up to 25 per page</p>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              Loading imported listings...
            </p>
          ) : error && games.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">
                The imported catalogue could not be loaded.
              </p>
              <button
                type="button"
                onClick={() => void loadGames()}
                className="mt-3 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
              >
                Try again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="mt-5 rounded-lg border border-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-300">
                No matching listings found.
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Try another filter or search term.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {games.map((game) => {
                const expanded = expandedId === game.id;
                const busy = busyId === game.id;

                return (
                  <article
                    key={game.id}
                    className="overflow-hidden rounded-xl border border-zinc-800 bg-[#090b0a]"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row">
                      <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:w-40">
                        {game.image_url ? (
                          <img
                            src={game.image_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold text-zinc-100">
                          {game.title || "Title not available"}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-400">
                          App ID: {game.steam_app_id}
                          {game.developer_name
                            ? ` · ${game.developer_name}`
                            : ""}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-md px-2 py-1 text-xs ${
                              game.catalogue_eligible
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-red-400/10 text-red-300"
                            }`}
                          >
                            {game.catalogue_eligible
                              ? "Catalogue eligible"
                              : "Excluded"}
                          </span>

                          <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                            Metadata: {game.metadata_backfill_status || "unknown"}
                          </span>

                          {game.genre && (
                            <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                              {game.genre}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : game.id)
                            }
                            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-500"
                          >
                            {expanded ? "Hide details" : "View details"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void changeEligibility(game)}
                            disabled={busy}
                            className="rounded-lg border border-emerald-400/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
                          >
                            {busy
                              ? "Working..."
                              : game.catalogue_eligible
                                ? "Exclude from catalogue"
                                : "Include in catalogue"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteGame(game)}
                            disabled={busy}
                            className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                          >
                            Permanently delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-zinc-800 p-4">
                        <dl className="grid gap-4 sm:grid-cols-2">
                          {[
                            ["Developer", game.developer_name],
                            ["Publisher", game.publisher_name],
                            ["Genre", game.genre],
                            ["Price", game.price],
                            ["Release date", game.release_date],
                            ["Imported at", game.imported_at],
                            ["Last synced", game.last_synced_at],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                {label}
                              </dt>
                              <dd className="mt-1 break-words text-sm text-zinc-300">
                                {value || "Not available"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        {game.steam_url && (
                          <p className="mt-4 text-sm">
                            <a
                              href={game.steam_url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-emerald-400 underline"
                            >
                              Open Steam listing
                            </a>
                          </p>
                        )}

                        {game.description && (
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                              Description
                            </h4>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                              {game.description}
                            </p>
                          </div>
                        )}

                        {game.metadata_backfill_error && (
                          <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                            <h4 className="text-xs font-semibold text-amber-300">
                              Backfill note or exclusion reason
                            </h4>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-zinc-300">
                              {game.metadata_backfill_error}
                            </p>
                          </div>
                        )}

                        <p className="mt-4 text-xs leading-5 text-zinc-500">
                          Catalogue eligibility is not Playtested verification.
                          Imported Steam listings remain Not yet verified until
                          independently assessed.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500">
              Page {Math.max(page, 1)} of {Math.max(totalPages, 1)}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={loading || page <= 1}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(Math.max(totalPages, 1), current + 1)
                  )
                }
                disabled={loading || page >= totalPages || totalPages === 0}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

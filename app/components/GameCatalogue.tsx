"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type VerificationStatus = "Verified" | "Assessed" | "Not yet verified";

type CatalogueGame = {
  key: string;
  slug: string;
  title: string;
  developer: string;
  genre: string;
  description: string;
  image: string;
  aiType: string;
  score: number;
  gameLink?: string;
  steamAppId?: string;
  isSubmission: boolean;
  isImportedSteam?: boolean;
  hasPlaytestedProfile?: boolean;
  isNsfw: boolean;
  verificationStatus: VerificationStatus | null;
  submittedAt?: string;
};

type VerificationRow = {
  game_id: string;
  verification_status: VerificationStatus;
  quality_score: number | null;
};

type CatalogueRpcRow = {
  source_type: "approved" | "steam";
  game_id: string;
  steam_app_id: string | null;
  title: string;
  developer_name: string;
  genre: string;
  description: string;
  image_url: string;
  game_link: string;
  ai_type: string;
  verification_status: VerificationStatus;
  quality_score: number | string | null;
  submitted_at: string | null;
  is_nsfw: boolean;
  has_playtested_profile: boolean;
  total_count: number | string;
};

const aiTypes = [
  "All AI types",
  "AI-generated",
  "AI-assisted",
  "No AI disclosed",
  "AI use unknown",
];

const genres = [
  "All genres",
  "Action",
  "Adventure",
  "Casual",
  "RPG",
  "Strategy",
  "Simulation",
  "Racing",
  "Sports",
];

const sortOptions = [
  "Featured",
  "Recently added",
  "Highest rated",
  "Title A-Z",
];

const verificationOptions = [
  "All verification statuses",
  "Verified",
  "Assessed",
  "Not yet verified",
  "Steam listings",
];

const PAGE_SIZE = 12;

function normalizeSteamAppId(value: unknown): string {
  return String(value ?? "").trim();
}

function VerificationBadge({
  status,
}: {
  status: VerificationStatus | null;
}) {
  if (!status) {
    return null;
  }

  const styles: Record<VerificationStatus, string> = {
    Verified:
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    Assessed: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    "Not yet verified": "border-white/20 bg-white/5 text-white/65",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function GenreBadge({ genre }: { genre: string }) {
  return (
    <span className="inline-flex w-fit rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 sm:text-sm">
      {genre}
    </span>
  );
}

function GameCardContent({
  game,
  onOpen,
}: {
  game: CatalogueGame;
  onOpen: () => void;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151815] transition hover:border-emerald-400/30">
      <button
        type="button"
        onClick={onOpen}
        className="block aspect-video w-full overflow-hidden bg-[#202520] text-left"
        aria-label={`View ${game.title} details`}
      >
        {game.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.image}
            alt={game.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#253b2b] to-[#151815] text-sm text-white/45">
            Game image
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <GenreBadge genre={game.genre} />
          <VerificationBadge status={game.verificationStatus} />
        </div>

        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="text-lg font-semibold text-white hover:text-emerald-300">
            {game.title}
          </h3>
        </button>

        <p className="text-sm text-white/60">by {game.developer}</p>

        <p className="line-clamp-3 text-sm leading-6 text-white/75">
          {game.description}
        </p>

        <div className="mt-auto space-y-3 pt-2">
          <span className="text-sm text-white/65">{game.aiType}</span>

          <button
            type="button"
            onClick={onOpen}
            className="w-full rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            {game.isImportedSteam && !game.hasPlaytestedProfile
              ? "View Steam page ↗"
              : "View game details"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function GameCatalogue() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [verificationFilter, setVerificationFilter] = useState(
    "All verification statuses"
  );
  const [aiType, setAiType] = useState("All AI types");
  const [includeNsfw, setIncludeNsfw] = useState(false);
  const [sort, setSort] = useState("Featured");
  const [page, setPage] = useState(1);

  const [games, setGames] = useState<CatalogueGame[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      const supabase = createClient();

      setLoaded(false);
      setLoadError(false);

      const { data, error } = await supabase.rpc("get_public_catalogue", {
        p_page: page,
        p_page_size: PAGE_SIZE,
        p_search: search.trim(),
        p_genre: genre,
        p_verification: verificationFilter,
        p_ai_type: aiType,
        p_include_nsfw: includeNsfw,
        p_sort: sort,
      });

      if (cancelled) return;

      if (error) {
        console.error("Could not load public catalogue:", error);
        setGames([]);
        setTotalCount(0);
        setLoadError(true);
        setLoaded(true);
        return;
      }

      const rows = (data ?? []) as CatalogueRpcRow[];

      const mappedGames: CatalogueGame[] = rows.map((row) => {
        const isImportedSteam = row.source_type === "steam";
        const steamAppId = normalizeSteamAppId(row.steam_app_id);

        return {
          key: row.game_id,
          slug: isImportedSteam
            ? `steam-${steamAppId}`
            : `submission-${row.game_id}`,
          title: row.title ?? "Untitled game",
          developer: row.developer_name ?? "Unknown developer",
          genre: row.genre ?? "Uncategorised",
          description: row.description ?? "",
          image: row.image_url ?? "",
          aiType: row.ai_type ?? "AI use unknown",
          score: Number(row.quality_score ?? 0),
          gameLink: row.game_link ?? "",
          steamAppId,
          isSubmission: !isImportedSteam,
          isImportedSteam,
          hasPlaytestedProfile: row.has_playtested_profile === true,
          isNsfw: row.is_nsfw === true,
          verificationStatus: row.verification_status ?? "Not yet verified",
          submittedAt: row.submitted_at ?? "",
        };
      });

      setGames(mappedGames);
      setTotalCount(
        rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0
      );
      setLoaded(true);
    }

    const timer = window.setTimeout(
      () => {
        void loadGames();
      },
      search.trim() ? 250 : 0
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    page,
    search,
    genre,
    verificationFilter,
    aiType,
    includeNsfw,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  function resetFilters() {
    setSearch("");
    setGenre("All genres");
    setVerificationFilter("All verification statuses");
    setAiType("All AI types");
    setIncludeNsfw(false);
    setSort("Featured");
    setPage(1);
  }

  function openGame(game: CatalogueGame) {
    if (game.isImportedSteam) {
      if (game.hasPlaytestedProfile) {
        router.push(`/games/${game.slug}`);
        return;
      }

      if (game.gameLink) {
        window.open(game.gameLink, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (game.isSubmission) {
      router.push(`/submissions/${game.key}`);
    } else {
      router.push(`/games/${game.slug}`);
    }
  }

  const fieldClass =
    "min-w-0 w-full rounded-lg border border-white/25 bg-[#151815] px-4 py-3.5 text-base font-medium text-white shadow-sm outline-none transition placeholder:text-white/45 hover:border-emerald-400/45 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40";

  return (
    <div className="w-full space-y-6 pt-2 text-white">
      <section className="rounded-xl border border-white/15 bg-[#101310] p-4 shadow-lg shadow-black/20 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">
              Game discovery
            </p>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Find games worth your time
            </h2>
          </div>
          <span className="text-sm text-white/55">
            {totalCount.toLocaleString()}{" "}
            {totalCount === 1 ? "game" : "games"} listed
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="search"
            aria-label="Search games"
            placeholder="Search games, developers, genres..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          />

          <select
            aria-label="Filter by genre"
            value={genre}
            onChange={(event) => {
              setGenre(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by verification status"
            value={verificationFilter}
            onChange={(event) => {
              setVerificationFilter(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {verificationOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by AI use"
            value={aiType}
            onChange={(event) => {
              setAiType(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {aiTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort games"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {sortOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/25 bg-[#151815] px-4 py-3.5 transition hover:border-emerald-400/45">
            <span>
              <span className="block text-base font-semibold text-white">
                Include NSFW
              </span>
              <span className="mt-0.5 block text-xs text-white/50">
                Show explicit adult-content games
              </span>
            </span>

            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                checked={includeNsfw}
                onChange={(event) => {
                  setIncludeNsfw(event.target.checked);
                  setPage(1);
                }}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-white/20 transition peer-checked:bg-emerald-400" />
              <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 peer-checked:bg-black" />
            </span>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-white/25 px-4 py-3.5 text-base font-semibold text-white transition hover:border-white/45 hover:bg-white/[0.06]"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="space-y-5 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Explore the catalogue
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Browse games and feedback
            </h2>
            <p className="mt-2 text-base text-white/60">
              {totalCount.toLocaleString()}{" "}
              {totalCount === 1 ? "game" : "games"} found
            </p>
          </div>

          {!loaded && (
            <p className="text-sm text-white/55">
              Loading catalogue listings...
            </p>
          )}
        </div>

        {loadError && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            The catalogue could not be loaded. Please try again. Check the
            browser console for details if the problem continues.
          </p>
        )}

        {games.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {games.map((game) => (
              <GameCardContent
                key={game.key}
                game={game}
                onOpen={() => openGame(game)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#151815] px-5 py-12 text-center">
            <h3 className="text-lg font-semibold">No games found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Try another verification status or clear your filters. Steam
              listings only appear after they meet the preliminary catalogue
              eligibility and metadata requirements.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
            >
              Clear filters
            </button>
          </div>
        )}

        {loaded && !loadError && pageCount > 1 && (
          <nav
            aria-label="Game catalogue pages"
            className="flex flex-wrap items-center justify-center gap-2 pt-4"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-white/25 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(pageCount, 7) }, (_, index) => {
              const startPage = Math.max(
                1,
                Math.min(currentPage - 3, pageCount - 6)
              );

              return startPage + index;
            }).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-current={currentPage === pageNumber ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  currentPage === pageNumber
                    ? "border-emerald-400 bg-emerald-400 font-bold text-black"
                    : "border-white/25 text-white hover:bg-white/5"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
              className="rounded-md border border-white/25 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
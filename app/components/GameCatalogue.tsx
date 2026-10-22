"use client";

import { useEffect, useMemo, useState } from "react";
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
  verificationStatus: VerificationStatus | null;
  submittedAt?: string;
};

type VerificationRow = {
  game_id: string;
  verification_status: VerificationStatus;
  quality_score: number | null;
};

const aiTypes = [
  "All AI types",
  "AI-generated",
  "AI-assisted",
  "No AI disclosed",
  "AI use unknown",
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
const DATABASE_BATCH_SIZE = 1000;

function getVerificationStatus(
  verification?: VerificationRow
): VerificationStatus {
  if (
    verification?.verification_status === "Verified" ||
    verification?.verification_status === "Assessed" ||
    verification?.verification_status === "Not yet verified"
  ) {
    return verification.verification_status;
  }

  return "Not yet verified";
}

function normalizeSteamAppId(value: unknown): string {
  return String(value ?? "").trim();
}

function getFeaturedTier(game: CatalogueGame): number {
  if (game.verificationStatus === "Verified") {
    return 0;
  }

  if (game.verificationStatus === "Assessed") {
    return 1;
  }

  if (game.isSubmission) {
    return 2;
  }

  return 3;
}

function getSearchRelevance(game: CatalogueGame, term: string): number {
  const title = game.title.toLowerCase();
  const developer = game.developer.toLowerCase();
  const genre = game.genre.toLowerCase();
  const description = game.description.toLowerCase();

  if (title === term) return 100;
  if (title.startsWith(term)) return 90;
  if (title.includes(term)) return 80;
  if (developer === term) return 70;
  if (developer.startsWith(term)) return 60;
  if (developer.includes(term)) return 50;
  if (genre.includes(term)) return 30;
  if (description.includes(term)) return 10;

  return 0;
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
    Verified: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
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
            {game.isImportedSteam
              ? "View Steam page ↗"
              : "View game and feedback"}
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
  const [sort, setSort] = useState("Featured");
  const [page, setPage] = useState(1);

  const [approvedGames, setApprovedGames] = useState<CatalogueGame[]>([]);
  const [importedGames, setImportedGames] = useState<CatalogueGame[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [importError, setImportError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      const supabase = createClient();

      try {
        const [
          { data: approvedData, error: approvedError },
          { data: verificationData, error: verificationError },
        ] = await Promise.all([
          supabase
            .from("approved_games")
            .select("*")
            .order("submitted_at", { ascending: false }),
          supabase.from("published_game_verifications").select("*"),
        ]);

        if (cancelled) return;

        if (approvedError) {
          console.error("Could not load approved games:", approvedError);
          setLoadError(true);
        }

        if (verificationError) {
          console.error(
            "Could not load published verifications:",
            verificationError
          );
        }

        const verifications = (verificationData ?? []) as VerificationRow[];

        const mappedApprovedGames: CatalogueGame[] = (
          approvedData ?? []
        ).map((row: any) => {
          const verification = verifications.find(
            (item) => item.game_id === row.id
          );

          return {
            key: row.id,
            slug: `submission-${row.id}`,
            title: row.title ?? "Untitled game",
            developer:
              row.developer_name ?? row.developer ?? "Unknown developer",
            genre: row.genre ?? "Uncategorised",
            description: row.description ?? "",
            image: row.image_url ?? "",
            aiType: row.ai_type ?? "AI use unknown",
            score: verification?.quality_score ?? 0,
            gameLink: row.game_link ?? "",
            steamAppId: normalizeSteamAppId(row.steam_app_id),
            isSubmission: true,
            verificationStatus: getVerificationStatus(verification),
            submittedAt: row.submitted_at ?? "",
          };
        });

        setApprovedGames(mappedApprovedGames);

        // Load only eligible Steam listings with complete core metadata.
        // Demo/sample data is intentionally not included in the public catalogue.
        const allImportedRows: any[] = [];
        let from = 0;
        let reachedEnd = false;

        while (!reachedEnd) {
          const to = from + DATABASE_BATCH_SIZE - 1;

          const { data, error } = await supabase
            .from("imported_games")
            .select(
              "id, steam_app_id, title, developer_name, genre, description, steam_url, image_url, imported_at, catalogue_eligible"
            )
            .eq("catalogue_eligible", true)
            .eq("metadata_backfill_status", "complete")
            .not("title", "is", null)
            .not("developer_name", "is", null)
            .not("genre", "is", null)
            .not("image_url", "is", null)
            .order("imported_at", { ascending: false })
            .order("steam_app_id", { ascending: true })
            .range(from, to);

          if (cancelled) return;

          if (error) {
            console.error(
              `Could not load eligible Steam listings starting at ${from}:`,
              error
            );
            setImportError(true);
            break;
          }

          const batch = data ?? [];
          allImportedRows.push(...batch);

          setLoadingProgress(
            `Loaded ${allImportedRows.length.toLocaleString()} eligible Steam listings...`
          );

          if (batch.length < DATABASE_BATCH_SIZE) {
            reachedEnd = true;
          } else {
            from += DATABASE_BATCH_SIZE;
          }
        }

        if (cancelled) return;

        const mappedImportedGames: CatalogueGame[] = allImportedRows.map(
          (row: any) => ({
            key: `steam-${row.steam_app_id}`,
            slug: `steam-${row.steam_app_id}`,
            title: row.title ?? "Untitled Steam game",
            developer: row.developer_name ?? "Unknown developer",
            genre: row.genre ?? "Uncategorised",
            description: row.description ?? "",
            image: row.image_url ?? "",
            aiType: "AI use unknown",
            score: 0,
            gameLink:
              row.steam_url ??
              `https://store.steampowered.com/app/${row.steam_app_id}/`,
            steamAppId: normalizeSteamAppId(row.steam_app_id),
            isSubmission: false,
            isImportedSteam: true,
            verificationStatus: "Not yet verified",
            submittedAt: row.imported_at ?? "",
          })
        );

        const linkedSteamAppIds = new Set(
          mappedApprovedGames
            .map((game) => game.steamAppId)
            .filter((appId): appId is string => Boolean(appId))
        );

        const uniqueImportedGames = mappedImportedGames.filter((game) => {
          if (!game.steamAppId) return true;
          return !linkedSteamAppIds.has(game.steamAppId);
        });

        setImportedGames(uniqueImportedGames);
        setLoadingProgress("");
        setLoaded(true);
      } catch (error) {
        console.error("Unexpected catalogue loading error:", error);

        if (!cancelled) {
          setLoadError(true);
          setImportError(true);
          setLoaded(true);
          setLoadingProgress("");
        }
      }
    }

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, []);

  const catalogueGames = useMemo(
    () => [...approvedGames, ...importedGames],
    [approvedGames, importedGames]
  );

  const genres = useMemo(
    () => [
      "All genres",
      ...Array.from(new Set(catalogueGames.map((game) => game.genre)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    ],
    [catalogueGames]
  );

  const availableAiTypes = useMemo(
    () => [
      "All AI types",
      ...Array.from(new Set(catalogueGames.map((game) => game.aiType)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    ],
    [catalogueGames]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = catalogueGames.filter((game) => {
      const searchableText =
        `${game.title} ${game.developer} ${game.genre} ${game.description}`.toLowerCase();

      const matchesVerification =
        verificationFilter === "All verification statuses" ||
        (verificationFilter === "Steam listings" &&
          game.isImportedSteam === true) ||
        (verificationFilter === "Verified" &&
          game.verificationStatus === "Verified") ||
        (verificationFilter === "Assessed" &&
          game.verificationStatus === "Assessed") ||
        (verificationFilter === "Not yet verified" &&
          game.verificationStatus === "Not yet verified");

      return (
        searchableText.includes(term) &&
        (genre === "All genres" || game.genre === genre) &&
        (aiType === "All AI types" || game.aiType === aiType) &&
        matchesVerification
      );
    });

    if (sort === "Recently added") {
      result.sort((a, b) =>
        (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
      );
    } else if (sort === "Highest rated") {
      result.sort((a, b) => {
        const scoreDifference = b.score - a.score;

        if (scoreDifference !== 0) return scoreDifference;

        return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");
      });
    } else if (sort === "Title A-Z") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (term) {
      result.sort((a, b) => {
        const relevanceDifference =
          getSearchRelevance(b, term) - getSearchRelevance(a, term);

        if (relevanceDifference !== 0) return relevanceDifference;

        const tierDifference = getFeaturedTier(a) - getFeaturedTier(b);

        if (tierDifference !== 0) return tierDifference;

        const scoreDifference = b.score - a.score;

        if (scoreDifference !== 0) return scoreDifference;

        return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");
      });
    } else {
      result.sort((a, b) => {
        const tierDifference = getFeaturedTier(a) - getFeaturedTier(b);

        if (tierDifference !== 0) return tierDifference;

        const scoreDifference = b.score - a.score;

        if (scoreDifference !== 0) return scoreDifference;

        return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");
      });
    }

    return result;
  }, [catalogueGames, search, genre, aiType, sort, verificationFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function resetFilters() {
    setSearch("");
    setGenre("All genres");
    setVerificationFilter("All verification statuses");
    setAiType("All AI types");
    setSort("Featured");
    setPage(1);
  }

  function openGame(game: CatalogueGame) {
    if (game.isImportedSteam) {
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
            {filtered.length.toLocaleString()}{" "}
            {filtered.length === 1 ? "game" : "games"} listed
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
            {Array.from(new Set([...aiTypes, ...availableAiTypes])).map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              )
            )}
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
              {filtered.length.toLocaleString()}{" "}
              {filtered.length === 1 ? "game" : "games"} found
            </p>
          </div>

          {!loaded && (
            <p className="text-sm text-white/55">
              {loadingProgress || "Loading catalogue listings..."}
            </p>
          )}

          {loaded && loadingProgress && (
            <p className="text-sm text-white/55">{loadingProgress}</p>
          )}
        </div>

        {loadError && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            Approved listings could not be loaded. Imported Steam listings may
            still be available. Check the browser console for details.
          </p>
        )}

        {importError && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            Some eligible imported Steam listings could not be loaded. The
            catalogue may be incomplete. Check the browser console for details.
          </p>
        )}

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((game) => (
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

        {pageCount > 1 && (
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
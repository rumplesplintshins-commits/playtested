
"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";

type Game = {
  id: string;
  title: string;
  genre: string;
  developer: string;
  description: string;
  accent: string;
  mark: string;
};

const demoGames: Game[] = [
  {
    id: "echoes",
    title: "Echoes of Elsewhere",
    genre: "Adventure",
    developer: "Northstar Studio",
    description: "Explore a world shaped by forgotten memories.",
    accent: "from-emerald-950 via-teal-950 to-zinc-950",
    mark: "E",
  },
  {
    id: "hollow",
    title: "Hollow Reach",
    genre: "Survival",
    developer: "Black Pine Games",
    description: "Survive beyond the edge of the known world.",
    accent: "from-sky-950 via-blue-950 to-zinc-950",
    mark: "H",
  },
  {
    id: "neon",
    title: "Neon Protocol",
    genre: "Action RPG",
    developer: "Ghost Circuit",
    description: "Fight for control of a city that never sleeps.",
    accent: "from-purple-950 via-fuchsia-950 to-zinc-950",
    mark: "N",
  },
  {
    id: "kingdoms",
    title: "Kingdoms of Ash",
    genre: "Strategy",
    developer: "Iron Oak Interactive",
    description: "Build an empire from the ruins of an old world.",
    accent: "from-orange-950 via-red-950 to-zinc-950",
    mark: "K",
  },
  {
    id: "starfall",
    title: "Starfall",
    genre: "Sci-Fi",
    developer: "Orbit Forge",
    description: "Discover what waits beyond the final frontier.",
    accent: "from-indigo-950 via-blue-950 to-zinc-950",
    mark: "S",
  },
  {
    id: "wildwood",
    title: "Wildwood",
    genre: "Simulation",
    developer: "Mosslight Studio",
    description: "Build a home in a living, changing wilderness.",
    accent: "from-lime-950 via-green-950 to-zinc-950",
    mark: "W",
  },
];

type Filter = "All games" | "Installed" | "Not installed";
type Sort = "Recently added" | "Title A–Z" | "Title Z–A";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All games");
  const [sort, setSort] = useState<Sort>("Recently added");
  const [installedIds, setInstalledIds] = useState<string[]>(["hollow"]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>(["echoes"]);
  const [installProgress, setInstallProgress] = useState<Record<string, number>>({});
  const [installingIds, setInstallingIds] = useState<string[]>([]);

  useEffect(() => {
    if (installingIds.length === 0) return;

    const timer = window.setInterval(() => {
      setInstallProgress((current) => {
        const next = { ...current };

        for (const id of installingIds) {
          next[id] = Math.min((next[id] ?? 0) + 10, 100);
        }

        return next;
      });
    }, 300);

    return () => window.clearInterval(timer);
  }, [installingIds]);

  useEffect(() => {
    const completed = installingIds.filter(
      (id) => (installProgress[id] ?? 0) >= 100
    );

    if (completed.length === 0) return;

    setInstalledIds((current) =>
      Array.from(new Set([...current, ...completed]))
    );

    setInstallingIds((current) =>
      current.filter((id) => !completed.includes(id))
    );
  }, [installProgress, installingIds]);

  const visibleGames = useMemo(() => {
    let result = demoGames.filter((game) => {
      const matchesSearch =
        `${game.title} ${game.genre} ${game.developer}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const isInstalled = installedIds.includes(game.id);

      const matchesFilter =
        filter === "All games" ||
        (filter === "Installed" && isInstalled) ||
        (filter === "Not installed" && !isInstalled);

      return matchesSearch && matchesFilter;
    });

    if (sort === "Title A–Z") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "Title Z–A") {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  }, [search, filter, sort, installedIds]);

  function installGame(id: string) {
    if (installedIds.includes(id) || installingIds.includes(id)) return;

    setInstallProgress((current) => ({ ...current, [id]: 0 }));
    setInstallingIds((current) => [...current, id]);
  }

  function uninstallGame(id: string) {
    setInstalledIds((current) => current.filter((gameId) => gameId !== id));
    setInstallingIds((current) => current.filter((gameId) => gameId !== id));

    setInstallProgress((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function toggleFavourite(id: string) {
    setFavouriteIds((current) =>
      current.includes(id)
        ? current.filter((gameId) => gameId !== id)
        : [...current, id]
    );
  }

  const installedCount = installedIds.length;
  const installingCount = installingIds.length;
  const featuredGame = demoGames[0];
  const featuredInstalled = installedIds.includes(featuredGame.id);
  const featuredInstalling = installingIds.includes(featuredGame.id);

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#77f29b]">
              PLAYER SPACE / LIBRARY
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">
              YOUR <span className="text-[#77f29b]">GAMES.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              Your collection, your next adventure. Everything you play,
              all in one place.
            </p>
          </div>

          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1.5 text-xs text-amber-200">
            DEMO LIBRARY
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-[#0e110f] p-4">
            <p className="text-[10px] tracking-wider text-zinc-500 sm:text-xs">
              GAMES IN LIBRARY
            </p>
            <p className="mt-2 text-3xl font-bold">{demoGames.length}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0e110f] p-4">
            <p className="text-[10px] tracking-wider text-zinc-500 sm:text-xs">
              INSTALLED
            </p>
            <p className="mt-2 text-3xl font-bold">{installedCount}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/[0.08] bg-[#0e110f] p-4 sm:col-span-1">
            <p className="text-[10px] tracking-wider text-zinc-500 sm:text-xs">
              FAVOURITES
            </p>
            <p className="mt-2 text-3xl font-bold">{favouriteIds.length}</p>
          </div>
        </div>

        <div className="mt-9 overflow-hidden rounded-xl border border-white/10 bg-[#0e110f]">
          <div
            className={`relative flex min-h-[230px] items-center overflow-hidden bg-gradient-to-r ${featuredGame.accent} sm:min-h-[260px]`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
            <span className="absolute -right-3 -top-10 select-none font-[family-name:var(--font-display)] text-[240px] font-black leading-none text-white/[0.05] sm:-right-1 sm:text-[300px]">
              {featuredGame.mark}
            </span>

            <div className="relative max-w-2xl p-6 sm:p-9">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#77f29b] sm:text-xs">
                PLAYTESTED SPOTLIGHT
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
                {featuredGame.title}
              </h2>
              <p className="mt-2 text-xs text-zinc-300 sm:text-sm">
                {featuredGame.genre} <span className="text-zinc-600">/</span>{" "}
                {featuredGame.developer}
              </p>
              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-300">
                {featuredGame.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {featuredInstalled ? (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-md bg-[#77f29b]/15 px-4 py-2.5 text-sm font-semibold text-[#77f29b]"
                  >
                    Launch coming soon
                  </button>
                ) : featuredInstalling ? (
                  <button
                    type="button"
                    onClick={() => uninstallGame(featuredGame.id)}
                    className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
                  >
                    Cancel install ({installProgress[featuredGame.id] ?? 0}%)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => installGame(featuredGame.id)}
                    className="rounded-md bg-[#77f29b] px-4 py-2.5 text-sm font-bold text-[#09100b] transition hover:bg-[#9af8b4]"
                  >
                    Install game ↓
                  </button>
                )}

                <a
                  href="/store"
                  className="rounded-md border border-white/20 bg-black/20 px-4 py-2.5 text-sm font-semibold transition hover:border-white/40 hover:bg-white/10"
                >
                  Explore Store ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 sm:text-xs">
                YOUR COLLECTION
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                All games
                <span className="ml-2 text-base font-normal text-zinc-500">
                  {visibleGames.length}
                </span>
              </h2>
            </div>
            {installingCount > 0 && (
              <span className="text-xs text-amber-300">
                {installingCount} installing
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <div className="min-w-0 flex-1">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your library..."
                aria-label="Search your library"
                className="w-full rounded-lg border border-white/10 bg-[#0e110f] px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["All games", "Installed", "Not installed"] as Filter[]).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
                      filter === option
                        ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]"
                        : "border-white/10 bg-[#0e110f] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {option}
                  </button>
                )
              )}
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              aria-label="Sort games"
              className="rounded-lg border border-white/10 bg-[#0e110f] px-3 py-3 text-sm text-zinc-300 outline-none focus:border-[#77f29b]/50"
            >
              <option value="Recently added">Recently added</option>
              <option value="Title A–Z">Title A–Z</option>
              <option value="Title Z–A">Title Z–A</option>
            </select>
          </div>

          {visibleGames.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleGames.map((game) => {
                const isInstalled = installedIds.includes(game.id);
                const isInstalling = installingIds.includes(game.id);
                const isFavourite = favouriteIds.includes(game.id);
                const progress = installProgress[game.id] ?? 0;

                return (
                  <article
                    key={game.id}
                    className="group overflow-hidden rounded-xl border border-white/[0.09] bg-[#0e110f] transition duration-200 hover:-translate-y-1 hover:border-white/20"
                  >
                    <div
                      className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${game.accent}`}
                    >
                      <span className="select-none font-[family-name:var(--font-display)] text-8xl font-black text-white/[0.13] transition duration-300 group-hover:scale-110">
                        {game.mark}
                      </span>

                      <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-zinc-200 backdrop-blur">
                        {game.genre}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleFavourite(game.id)}
                        aria-label={
                          isFavourite
                            ? `Remove ${game.title} from favourites`
                            : `Add ${game.title} to favourites`
                        }
                        className="absolute right-3 top-3 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-lg leading-none transition hover:bg-black/70"
                      >
                        <span className={isFavourite ? "text-[#77f29b]" : "text-zinc-400"}>
                          {isFavourite ? "★" : "☆"}
                        </span>
                      </button>

                      <span className="absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 text-[9px] tracking-wider text-zinc-300 backdrop-blur">
                        SAMPLE GAME
                      </span>
                    </div>

                    <div className="p-4 sm:p-5">
                      <h3 className="truncate text-lg font-bold">{game.title}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{game.developer}</p>
                      <p className="mt-3 min-h-10 text-sm leading-5 text-zinc-400">
                        {game.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-4">
                        <span
                          className={`text-xs ${
                            isInstalled
                              ? "text-[#77f29b]"
                              : isInstalling
                                ? "text-amber-300"
                                : "text-zinc-500"
                          }`}
                        >
                          {isInstalled
                            ? "Installed · Demo"
                            : isInstalling
                              ? `Installing · ${progress}%`
                              : "Ready to install"}
                        </span>
                      </div>

                      {isInstalling && (
                        <div
                          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Installing ${game.title}`}
                        >
                          <div
                            className="h-full rounded-full bg-[#77f29b] transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        {isInstalled ? (
                          <>
                            <button
                              type="button"
                              disabled
                              className="flex-1 cursor-not-allowed rounded-md bg-[#77f29b]/10 px-3 py-2.5 text-xs font-semibold text-[#77f29b]/70"
                              title="Launching will be added with the distribution system"
                            >
                              Launch coming soon
                            </button>
                            <button
                              type="button"
                              onClick={() => uninstallGame(game.id)}
                              className="rounded-md border border-white/10 px-3 py-2.5 text-xs text-zinc-400 transition hover:border-red-400/40 hover:text-red-300"
                            >
                              Uninstall
                            </button>
                          </>
                        ) : isInstalling ? (
                          <button
                            type="button"
                            onClick={() => uninstallGame(game.id)}
                            className="flex-1 rounded-md border border-white/10 px-3 py-2.5 text-xs text-zinc-300 transition hover:border-red-400/40 hover:text-red-300"
                          >
                            Cancel install
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => installGame(game.id)}
                            className="flex-1 rounded-md bg-[#77f29b] px-3 py-2.5 text-xs font-bold text-[#09100b] transition hover:bg-[#9af8b4]"
                          >
                            Install game ↓
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-white/10 px-6 py-14 text-center">
              <p className="text-lg font-semibold">No games found</p>
              <p className="mt-2 text-sm text-zinc-500">
                Try another search or change your filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("All games");
                }}
                className="mt-4 text-sm font-semibold text-[#77f29b] hover:text-[#9af8b4]"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <p className="mt-7 text-xs leading-5 text-zinc-600">
          Demo content only. These sample games are not confirmed purchases.
          Installation actions simulate a status in this browser and do not
          download game files. Real account ownership, downloads and launching
          will be connected in later versions.
        </p>
      </section>

      <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
        PLAYTESTED_ · Your collection, in one place.
      </footer>
    </main>
  );
}
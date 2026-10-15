
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
  featured?: boolean;
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
    featured: true,
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
  const [installedIds, setInstalledIds] = useState<string[]>([
    "hollow",
  ]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([
    "echoes",
  ]);
  const [installProgress, setInstallProgress] = useState<
    Record<string, number>
  >({});
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
    }, 250);

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
      result = [...result].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    } else if (sort === "Title Z–A") {
      result = [...result].sort((a, b) =>
        b.title.localeCompare(a.title)
      );
    }

    return result;
  }, [search, filter, sort, installedIds]);

  const featuredGame = demoGames[0];
  const installedCount = installedIds.length;
  const installingCount = installingIds.length;

  function installGame(id: string) {
    if (
      installedIds.includes(id) ||
      installingIds.includes(id)
    ) {
      return;
    }

    setInstallProgress((current) => ({ ...current, [id]: 0 }));
    setInstallingIds((current) => [...current, id]);
  }

  function uninstallGame(id: string) {
    setInstalledIds((current) =>
      current.filter((gameId) => gameId !== id)
    );

    setInstallingIds((current) =>
      current.filter((gameId) => gameId !== id)
    );

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

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#77f29b]">
              PLAYER SPACE / LIBRARY
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">
              YOUR <span className="text-[#77f29b]">GAMES.</span>
            </h1>
          </div>

          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 text-xs text-amber-200">
            DEMO LIBRARY
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
          Your collection, your next adventure. Manage your games
          and keep everything in one place.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "GAMES IN LIBRARY",
              value: demoGames.length,
              detail: "Sample collection",
            },
            {
              label: "INSTALLED",
              value: installedCount,
              detail: "On this demo library",
            },
            {
              label: "INSTALLING",
              value: installingCount,
              detail: "Active demo installs",
            },
            {
              label: "FAVOURITES",
              value: favouriteIds.length,
              detail: "Your starred games",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-[#0e110f] p-4 sm:p-5"
            >
              <p className="text-[10px] tracking-[0.15em] text-zinc-500 sm:text-xs">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#0e110f]">
          <div
            className={`relative flex min-h-[280px] items-center overflow-hidden bg-gradient-to-br ${featuredGame.accent} sm:min-h-[340px]`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
            <div className="absolute right-4 top-0 select-none font-[family-name:var(--font-display)] text-[200px] font-black leading-none text-white/[0.04] sm:right-12 sm:text-[300px]">
              {featuredGame.mark}
            </div>

            <div className="relative max-w-2xl p-6 sm:p-10">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#77f29b]">
                FEATURED IN YOUR LIBRARY
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-5xl">
                {featuredGame.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                {featuredGame.genre} · {featuredGame.developer}
              </p>
              <p className="mt-4 max-w-md text-sm leading-6 text-zinc-300">
                {featuredGame.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {installedIds.includes(featuredGame.id) ? (
                  <button
                    type="button"
                    disabled
                    className="rounded-md bg-[#77f29b] px-5 py-3 text-sm font-bold text-[#09100b] opacity-80"
                  >
                    Launch coming soon
                  </button>
                ) : installingIds.includes(featuredGame.id) ? (
                  <button
                    type="button"
                    disabled
                    className="rounded-md bg-[#77f29b]/20 px-5 py-3 text-sm font-semibold text-[#77f29b]"
                  >
                    Installing {installProgress[featuredGame.id] ?? 0}%
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => installGame(featuredGame.id)}
                    className="rounded-md bg-[#77f29b] px-5 py-3 text-sm font-bold text-[#09100b] transition hover:bg-[#9af8b4]"
                  >
                    Install game ↓
                  </button>
                )}

                <a
                  href="/store"
                  className="rounded-md border border-white/20 bg-black/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  Explore Store ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-zinc-500">
              YOUR COLLECTION
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              All games
              <span className="ml-3 text-base font-normal text-zinc-500">
                {visibleGames.length}
              </span>
            </h2>
          </div>

          <a
            href="/store"
            className="rounded-md bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
          >
            Browse Store ↗
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your library..."
              aria-label="Search your library"
              className="w-full rounded-lg border border-white/10 bg-[#0e110f] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#77f29b]/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              ["All games", "Installed", "Not installed"] as Filter[]
            ).map((option) => (
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
            ))}
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${game.accent}`}
                  >
                    <div className="absolute inset-0 bg-black/10 transition group-hover:bg-transparent" />
                    <span className="select-none font-[family-name:var(--font-display)] text-8xl font-black text-white/[0.13] transition duration-300 group-hover:scale-110">
                      {game.mark}
                    </span>

                    <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-200 backdrop-blur">
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
                      <span
                        className={
                          isFavourite
                            ? "text-[#77f29b]"
                            : "text-zinc-400"
                        }
                      >
                        {isFavourite ? "★" : "☆"}
                      </span>
                    </button>

                    <span className="absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-zinc-300 backdrop-blur">
                      SAMPLE LISTING
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold">
                          {game.title}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {game.developer}
                        </p>
                      </div>

                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          isInstalled
                            ? "bg-[#77f29b]"
                            : isInstalling
                              ? "animate-pulse bg-amber-300"
                              : "bg-zinc-600"
                        }`}
                      />
                    </div>

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

                      {isInstalled && (
                        <span className="text-xs text-zinc-600">
                          Demo build
                        </span>
                      )}
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

                    <div className="mt-5 flex gap-2">
                      {isInstalled ? (
                        <>
                          <button
                            type="button"
                            disabled
                            className="flex-1 cursor-not-allowed rounded-md bg-[#77f29b]/10 px-3 py-2.5 text-xs font-semibold text-[#77f29b]/70"
                            title="Game launching will be added with the distribution system"
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
          <div className="mt-6 rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
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
              className="mt-5 text-sm font-semibold text-[#77f29b] hover:text-[#9af8b4]"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="text-sm font-semibold text-zinc-300">
            About this demo
          </p>
          <p className="mt-2 text-xs leading-6 text-zinc-500">
            These are sample games, not verified purchases. Install
            and uninstall actions simulate library states in this
            browser session. They do not download or remove game
            files, and installed games cannot yet be launched.
            Your real owned games will be connected to your account
            in a later step.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
        PLAYTESTED_ · Your collection, in one place.
      </footer>
    </main>
  );
}

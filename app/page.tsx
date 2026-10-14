
const games = [
  {
    slug: "echoes-of-elsewhere",
    title: "Echoes of Elsewhere",
    type: "AI EXPERIMENT",
    genre: "Adventure",
    score: "8.4",
    reviews: 128,
    description: "A surreal world that reshapes itself around your decisions.",
    status: "Early Access",
    accent: "from-emerald-950 to-zinc-900",
    mark: "E",
  },
  {
    slug: "hollow-reach",
    title: "Hollow Reach",
    type: "INDIE",
    genre: "Survival",
    score: "7.8",
    reviews: 86,
    description: "Explore an abandoned planet where nothing stays dead.",
    status: "Playable",
    accent: "from-sky-950 to-zinc-900",
    mark: "H",
  },
  {
    slug: "neon-protocol",
    title: "Neon Protocol",
    type: "AI-ASSISTED",
    genre: "Action RPG",
    score: "7.2",
    reviews: 54,
    description: "A cyberpunk RPG with experimental adaptive enemies.",
    status: "Early Access",
    accent: "from-purple-950 to-zinc-900",
    mark: "N",
  },
  {
    slug: "kingdoms-of-ash",
    title: "Kingdoms of Ash",
    type: "INDIE",
    genre: "Strategy",
    score: "9.1",
    reviews: 213,
    description: "Build a fallen kingdom back into an empire.",
    status: "Released",
    accent: "from-amber-950 to-zinc-900",
    mark: "K",
  },
];

const stats = [
  { label: "GAMES TRACKED", value: "481", note: "Across all categories" },
  { label: "PLAYER REVIEWS", value: "12.6k", note: "Community feedback" },
  { label: "AVERAGE RATING", value: "7.8", note: "Out of 10" },
  { label: "GAMES TESTED", value: "96", note: "Hands-on reports" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wider">
            PLAYTESTED<span className="text-[#77f29b]">_</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#discover" className="hover:text-white">Discover</a>
            <a href="#stats" className="hover:text-white">Community stats</a>
            <a href="#about" className="hover:text-white">About</a>
          </nav>
          <a href="#discover" className="rounded-md border border-[#77f29b]/40 px-4 py-2 text-sm text-[#77f29b] hover:bg-[#77f29b]/10">
            Explore games
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs tracking-wide text-[#77f29b]">
            <span className="h-2 w-2 rounded-full bg-[#77f29b]" />
            BUILT AROUND PLAYER OPINION
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            LESS HYPE.
            <br />
            <span className="text-[#77f29b]">MORE GAME.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 md:text-lg">
            Discover what is worth playing. Honest reviews, useful player
            feedback and a clearer picture of what makes a game good.
            Whatever the technology behind it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#discover" className="rounded-md bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4]">
              Discover games <span aria-hidden="true">↗</span>
            </a>
            <a href="#stats" className="rounded-md border border-white/15 px-5 py-3 text-sm text-zinc-300 hover:border-white/30">
              Explore the data
            </a>
          </div>
        </div>
      </section>

      <section id="stats" className="border-y border-white/[0.08] bg-[#0e110f]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide">
              THE COMMUNITY AT A GLANCE
            </h2>
            <span className="rounded border border-amber-400/20 px-2 py-1 text-[10px] tracking-widest text-amber-300">
              DEMO DATA
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="border-l border-[#77f29b]/40 pl-4">
                <p className="text-[10px] tracking-[0.18em] text-zinc-500">{stat.label}</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">{stat.value}</p>
                <p className="mt-1 text-xs text-zinc-500">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs tracking-[0.2em] text-[#77f29b]">FIND YOUR NEXT GAME</p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">Worth your time?</h2>
            <p className="mt-2 text-sm text-zinc-500">A mix of experimental, AI-assisted and traditional games.</p>
          </div>
          <span className="text-sm text-zinc-500">{games.length} featured games</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <a
              key={game.slug}
              href={`/games/${game.slug}`}
              className="group overflow-hidden rounded-xl border border-white/[0.09] bg-[#101311] transition hover:-translate-y-1 hover:border-[#77f29b]/40"
            >
              <div className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${game.accent}`}>
                <span className="font-[family-name:var(--font-display)] text-8xl font-bold text-white/[0.12]">{game.mark}</span>
                <span className="absolute left-3 top-3 rounded border border-white/10 bg-black/40 px-2 py-1 text-[9px] tracking-widest text-zinc-300">
                  {game.type}
                </span>
                <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-zinc-300">{game.status}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold group-hover:text-[#77f29b]">{game.title}</h3>
                  <span className="shrink-0 rounded bg-[#77f29b]/10 px-2 py-1 text-sm font-semibold text-[#77f29b]">{game.score}</span>
                </div>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-zinc-400">{game.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs text-zinc-500">
                  <span>{game.genre}</span>
                  <span>{game.reviews} reviews</span>
                </div>
                <p className="mt-4 text-xs font-medium text-[#77f29b]">View game & reviews <span aria-hidden="true">→</span></p>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-600">All games, ratings and review counts shown here are illustrative demo content.</p>
      </section>

      <section id="about" className="border-t border-white/[0.08] bg-[#0e110f]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 text-xs tracking-[0.2em] text-[#77f29b]">THE IDEA</p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold">Judge the game.<br />Not the hype.</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-zinc-400">
            AI-made games are changing the landscape, but players still care
            about the same things: gameplay, performance, originality and
            whether a game respects their time. Playtested brings that feedback
            into one place, with transparent labels and reviews from players.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
        PLAYTESTED_ · A prototype for players, by players.
      </footer>
    </main>
  );
}

import GameCatalogue from "./components/GameCatalogue";
import SiteHeader from "./components/SiteHeader";

const stats = [
  { label: "GAMES TRACKED", value: "481", note: "Across all categories" },
  { label: "PLAYER REVIEWS", value: "12.6k", note: "Community feedback" },
  { label: "AVERAGE RATING", value: "7.8", note: "Out of 10" },
  { label: "GAMES TESTED", value: "96", note: "Hands-on reports" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

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
            <a
              href="#discover"
              className="rounded-md bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] hover:bg-[#9af8b4]"
            >
              Discover games <span aria-hidden="true">↗</span>
            </a>
            <a
              href="#stats"
              className="rounded-md border border-white/15 px-5 py-3 text-sm text-zinc-300 hover:border-white/30"
            >
              Explore the data
            </a>
          </div>
        </div>
      </section>

      <section id="stats" className="border-y border-white/[0.08] bg-[#0e110f]">
        <div className="mx-auto max-w-7xl px-6 pt-8 pb-16">
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
                <p className="text-[10px] tracking-[0.18em] text-zinc-500">
                  {stat.label}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GameCatalogue />

      <section id="about" className="border-t border-white/[0.08] bg-[#0e110f]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 text-xs tracking-[0.2em] text-[#77f29b]">
              THE IDEA
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold">
              Judge the game.
              <br />
              Not the hype.
            </h2>
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
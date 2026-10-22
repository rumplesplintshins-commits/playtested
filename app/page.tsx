
import GameCatalogue from "./components/GameCatalogue";
import SiteHeader from "./components/SiteHeader";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-8 pt-8 md:pb-10 md:pt-10">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs tracking-wide text-[#77f29b]">
            <span className="h-2 w-2 rounded-full bg-[#77f29b]" />
            BUILT AROUND PLAYER OPINION
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            FIND THE GEMS.
            <br />
            <span className="text-[#77f29b]">SKIP THE SLOP.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 md:text-base">
            Find games worth your time through honest player feedback,
            structured testing and transparent verification. No matter
            how they were made, quality comes first.
          </p>
        </div>
      </section>

      <section id="discover-games">
        <GameCatalogue />
      </section>

      <section
        id="about"
        className="mt-10 border-t border-white/[0.08] bg-[#0e110f]"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 text-xs tracking-[0.2em] text-[#77f29b]">
              THE IDEA
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              Judge the game.
              <br />
              Not the hype.
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-7 text-zinc-400">
            Players care about gameplay, performance, originality and whether
            a game respects their time. Playtested brings player feedback and
            testing evidence together, with transparent labels and reviews.
            AI-made games are welcome. Quality is what matters.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
        PLAYTESTED_ · A prototype for players, by players.
      </footer>
    </main>
  );
}

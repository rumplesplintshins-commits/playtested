
import GameCatalogue from "../components/GameCatalogue";
import SiteHeader from "../components/SiteHeader";

export default function StorePage() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 md:pt-20">
        <p className="mb-3 text-xs tracking-[0.2em] text-[#77f29b]">
          THE PLAYTESTED STORE
        </p>

        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">
          FIND THE GEMS.
          <br />
          <span className="text-[#77f29b]">SKIP THE SLOP.</span>
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400">
          Cut through the AI slop. Discover the hidden gems. Explore games
          by genre, price and AI involvement, with transparent AI disclosures,
          evidence-based verification and player ratings to help you find
          games worth your time.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-xs text-zinc-400">
          <span className="rounded-md border border-white/10 px-3 py-2">
            Browse games
          </span>
          <span className="rounded-md border border-white/10 px-3 py-2">
            Filter by AI involvement
          </span>
          <span className="rounded-md border border-white/10 px-3 py-2">
            Compare ratings
          </span>
        </div>
      </section>

      <GameCatalogue />

      <footer className="mt-12 border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
        PLAYTESTED_ · Store prototype · Community submissions are labelled
        separately from demo listings.
      </footer>
    </main>
  );
}
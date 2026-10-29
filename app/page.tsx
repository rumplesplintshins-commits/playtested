
import GameCatalogue from "./components/GameCatalogue";
import SiteHeader from "./components/SiteHeader";
import Link from "next/link";

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
            Good games get better when people play them. Playtested brings
            developers and players together to try games, share honest feedback
            and work out what needs improving.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="home-developers" className="flex flex-col rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-5">
              <h2 id="home-developers" className="text-lg font-semibold text-white">Making a game?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Submit your game, tell testers what you want them to focus on, and read their feedback for each build. Find out what works and what could be better.</p>
              <Link href="/submit" className="mt-5 rounded-lg bg-[#77f29b] px-4 py-3 text-center text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#77f29b]">Submit a game</Link>
              <Link href="/login?mode=signup&role=developer&next=/my-submissions" className="mt-3 text-center text-sm text-[#77f29b] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">New here? Join as a developer</Link>
            </section>
            <section aria-labelledby="home-testers" className="flex flex-col rounded-xl border border-white/10 bg-white/[0.025] p-5">
              <h2 id="home-testers" className="text-lg font-semibold text-white">Enjoy trying games?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Sign in to find a game you can test, play it and tell the developer about your experience. Useful criticism matters just as much as praise.</p>
              <Link href="/tester" className="mt-5 rounded-lg border border-[#77f29b]/30 px-4 py-3 text-center text-sm font-semibold text-[#77f29b] transition hover:bg-[#77f29b]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#77f29b]">Find a game to test</Link>
              <Link href="/login?mode=signup&role=tester&next=/tester" className="mt-3 text-center text-sm text-[#77f29b] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">New here? Join as a tester</Link>
            </section>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">You can be a developer, a tester, or both. Just looking around? <a href="#discover-games" className="text-[#77f29b] underline underline-offset-4 focus-visible:outline-2">Browse the games below</a>.</p>
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
              Let machines handle the repetitive work.
              <br />
              Keep people at the heart of gaming.
            </h2>
          </div>

          <div className="max-w-xl space-y-4 text-sm leading-7 text-zinc-400">
            <p>Playtested uses automation to handle repetitive technical checks,
              leaving people to judge what matters: how a game feels to play.</p>
            <p>Developers get structured feedback to help improve their games.
              Players share honest experiences, discover games through community
              ratings, and help shape a community they want to be part of.
              Thoughtful criticism matters just as much as praise.</p>
          </div>
        </div>
      </section>

    </main>
  );
}

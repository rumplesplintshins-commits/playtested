import SiteHeader from "../../components/SiteHeader";
import { games } from "../../data/games";

export const instant = false;

export default async function GamePage({
params,
}: {
params: Promise<{ slug: string }>;
}) {
const { slug } = await params;
const game = games.find((item) => item.slug === slug);

if (!game) {
return (
<main className="min-h-screen bg-[#090b0a] text-zinc-100">
<SiteHeader />
<section className="mx-auto max-w-6xl px-6 py-20">
<h1 className="text-3xl font-bold">Game not found</h1>
<a href="/" className="mt-6 inline-block text-[#77f29b]">
  Back to Game Discovery
</a>

</section>
</main>
);
}

const reviews = game.reviews ?? [];
const score = game.score;

return (
<main className="min-h-screen bg-[#090b0a] text-zinc-100">
<SiteHeader />

  <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">
    <div className="mx-auto max-w-6xl px-6 py-16">
      <span className="inline-flex rounded border border-[#77f29b]/30 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#77f29b]">
        {game.aiType}
      </span>

      <p className="mt-6 text-sm text-zinc-500">
        {game.genre} · Game profile
      </p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold md:text-6xl">
          {game.title}
        </h1>

        <div className="rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.06] p-4">
          <p className="text-xs text-zinc-500">PLAYER SCORE</p>
          <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#77f29b]">
            {score !== null ? score.toFixed(1) : "Unrated"}
            {score !== null && (
              <span className="text-sm text-zinc-500"> /10</span>
            )}
          </p>
        </div>
      </div>

      <p className="mt-5 max-w-2xl leading-7 text-zinc-400">
        {game.description}
      </p>

      <p className="mt-5 text-xs text-amber-300">
        DEMO CONTENT · Classifications, scores and reviews are illustrative
        examples, not verified claims.
      </p>
    </div>
  </section>

  <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_320px]">
    <section>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        Player review feed
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        What players like, what needs work, and where opinions differ.
      </p>

      <div className="mt-6 space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <article
              key={review.user}
              className="rounded-xl border border-white/[0.09] bg-[#101311] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{review.user}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Sample review · {review.tag}
                  </p>
                </div>
                <span className="rounded bg-[#77f29b]/10 px-2.5 py-1 text-sm font-semibold text-[#77f29b]">
                  {review.rating}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-zinc-300">
                {review.text}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
            <p className="text-sm leading-7 text-zinc-400">
              Detailed reviews have not been added to this demo game yet.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5">
        <h3 className="font-semibold">Add your review</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Real review submission and user accounts will be added in a
          later version.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 cursor-not-allowed rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-500"
        >
          Coming later
        </button>
      </div>
    </section>

    <aside className="space-y-6">
      <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Quick verdict
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          {game.verdict ??
            "A detailed assessment has not yet been added for this game."}
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          What works
        </h2>
        {game.strengths && game.strengths.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {game.strengths.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-[#77f29b]">+</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No assessment available yet.
          </p>
        )}

        <div className="my-5 border-t border-white/[0.08]" />

        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Needs work
        </h2>
        {game.weaknesses && game.weaknesses.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {game.weaknesses.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-amber-300">−</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No assessment available yet.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
        <p className="text-xs tracking-widest text-[#77f29b]">
          AI TRANSPARENCY
        </p>
        <h2 className="mt-3 text-lg font-bold">What this label means</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          This is a sample classification for the prototype. In a live
          version, the label should be supported by a developer disclosure
          and evidence where available. It does not indicate that
          Playtested has independently verified the claim.
        </p>
      </div>

      <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.04] p-5">
        <p className="text-xs tracking-widest text-[#77f29b]">
          THE PRINCIPLE
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          How a game was made is useful context. Whether it is worth
          playing is what matters.
        </p>
      </div>
    </aside>
  </div>

  <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
    PLAYTESTED_ · Prototype, not connected to live player data.
  </footer>
</main>

);
}
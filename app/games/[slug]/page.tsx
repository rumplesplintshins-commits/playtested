
export const instant = false;

const gameDetails: Record<
  string,
  {
    title: string;
    type: string;
    genre: string;
    score: string;
    description: string;
    verdict: string;
    strengths: string[];
    weaknesses: string[];
    reviews: {
      user: string;
      rating: string;
      tag: string;
      text: string;
    }[];
  }
> = {
  "echoes-of-elsewhere": {
    title: "Echoes of Elsewhere",
    type: "AI EXPERIMENT",
    genre: "Adventure",
    score: "8.4",
    description:
      "A surreal world that reshapes itself around your decisions.",
    verdict:
      "An intriguing concept with room to grow. The big question is whether its reactive world creates meaningful choices or just novelty.",
    strengths: [
      "Reactive world concept",
      "Strong atmosphere",
      "Interesting exploration",
    ],
    weaknesses: [
      "Some repetitive encounters",
      "Long-term variety remains unproven",
    ],
    reviews: [
      {
        user: "PixelNomad",
        rating: "9/10",
        tag: "Gameplay",
        text: "The world feels unpredictable. I want to see how far the developers take the idea.",
      },
      {
        user: "FramePerfect",
        rating: "7/10",
        tag: "Exploration",
        text: "Great atmosphere, but a few encounters feel similar. Lots of potential.",
      },
      {
        user: "IndieScope",
        rating: "8/10",
        tag: "Overall",
        text: "A promising experiment. It needs more polish, but I would keep playing.",
      },
    ],
  },

  "hollow-reach": {
    title: "Hollow Reach",
    type: "INDIE",
    genre: "Survival",
    score: "7.8",
    description:
      "Explore an abandoned planet where nothing stays dead.",
    verdict:
      "A tense survival concept with a strong setting. Its lasting appeal depends on exploration and survival variety.",
    strengths: [
      "Atmospheric setting",
      "Tense survival gameplay",
      "Memorable premise",
    ],
    weaknesses: [
      "Pacing can dip",
      "Resource gathering needs balance",
    ],
    reviews: [
      {
        user: "OrbitFox",
        rating: "8/10",
        tag: "Exploration",
        text: "Exploring feels tense, and the setting is excellent. I would like more tools to discover.",
      },
      {
        user: "SavePoint",
        rating: "7/10",
        tag: "Survival",
        text: "Solid survival foundations, though gathering resources gets repetitive.",
      },
    ],
  },

  "neon-protocol": {
    title: "Neon Protocol",
    type: "AI-ASSISTED",
    genre: "Action RPG",
    score: "7.2",
    description:
      "A cyberpunk RPG with experimental adaptive enemies.",
    verdict:
      "Adaptive enemies are an interesting idea, but combat quality and quest design need to carry the experience.",
    strengths: [
      "Adaptive enemy concept",
      "Distinct setting",
      "Build experimentation",
    ],
    weaknesses: [
      "Uneven combat balance",
      "Some repetitive quests",
    ],
    reviews: [
      {
        user: "ByteKnight",
        rating: "8/10",
        tag: "Combat",
        text: "Enemies adapting to my approach makes encounters interesting. Balancing needs work.",
      },
      {
        user: "QuestLog",
        rating: "6/10",
        tag: "Story",
        text: "Good atmosphere, but the quests need more variety.",
      },
    ],
  },

  "kingdoms-of-ash": {
    title: "Kingdoms of Ash",
    type: "INDIE",
    genre: "Strategy",
    score: "9.1",
    description:
      "Build a fallen kingdom back into an empire.",
    verdict:
      "A strategy experience built around long-term planning and meaningful decisions. Conventional games belong here just as much as experimental ones.",
    strengths: [
      "Strategic depth",
      "Replay potential",
      "Meaningful decisions",
    ],
    weaknesses: [
      "Steep learning curve",
      "Long play sessions",
    ],
    reviews: [
      {
        user: "GrandStrategist",
        rating: "10/10",
        tag: "Strategy",
        text: "Lots of interesting decisions. I can see myself replaying campaigns to try different approaches.",
      },
      {
        user: "TurnOne",
        rating: "8/10",
        tag: "Learning curve",
        text: "Deep and rewarding, though the first few hours take patience.",
      },
    ],
  },
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = gameDetails[slug];

  if (!game) {
    return (
      <main className="min-h-screen bg-[#090b0a] px-6 py-20 text-zinc-100">
        <a href="/" className="text-[#77f29b]">
          PLAYTESTED_
        </a>
        <h1 className="mt-10 text-3xl font-bold">Game not found</h1>
        <a href="/#discover" className="mt-6 inline-block text-zinc-400">
          ← Back to games
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wider"
          >
            PLAYTESTED<span className="text-[#77f29b]">_</span>
          </a>
          <a
            href="/#discover"
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← All games
          </a>
        </div>
      </header>

      <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="rounded border border-[#77f29b]/30 px-2 py-1 text-xs tracking-widest text-[#77f29b]">
            {game.type}
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
                {game.score}
                <span className="text-sm text-zinc-500"> /10</span>
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl leading-7 text-zinc-400">
            {game.description}
          </p>

          <p className="mt-5 text-xs text-amber-300">
            DEMO CONTENT · Scores and reviews are fictional examples.
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
            {game.reviews.map((review) => (
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
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5">
            <h3 className="font-semibold">Add your review</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Real review submission and user accounts will be added in a
              later version.
            </p>
            <button
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
              {game.verdict}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              What works
            </h2>
            <ul className="mt-4 space-y-3">
              {game.strengths.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-zinc-300">
                  <span className="text-[#77f29b]">+</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="my-5 border-t border-white/[0.08]" />

            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Needs work
            </h2>
            <ul className="mt-4 space-y-3">
              {game.weaknesses.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-zinc-300">
                  <span className="text-amber-300">−</span>
                  {item}
                </li>
              ))}
            </ul>
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
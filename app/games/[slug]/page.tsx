import SiteHeader from "../../components/SiteHeader";
import { games } from "../../data/games";
import { createClient } from "../../../lib/supabase-server";

export const instant = false;

type VerificationStatus = "Verified" | "Assessed" | "Not yet verified";

type ImportedGame = {
  id: string;
  steam_app_id: string | number | null;
  title: string | null;
  developer_name: string | null;
  genre: string | null;
  description: string | null;
  steam_url: string | null;
  image_url: string | null;
};

type PlaytestRow = {
  id: string;
  release_label: string | null;
  status: string;
  audience: string;
  created_at: string;
};

type PlaytestedProgressRow = {
  accepted_count?: number | string | null;
  total_testers?: number | string | null;
};

function formatStatus(status: string) {
  if (status === "open") return "Testing in progress";
  if (status === "paused") return "Testing paused";
  if (status === "closed") return "Completed";
  if (status === "draft") return "Draft";
  return status;
}

function formatReleaseLabel(value: string | null, fallback: number) {
  const label = value?.trim();
  return label ? label : `Round ${fallback}`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug.startsWith("steam-")) {
    const steamAppId = slug.slice("steam-".length).trim();
    const supabase = await createClient();

    const { data: importedGameData, error: importedGameError } = await supabase
      .from("imported_games")
      .select(
        "id, steam_app_id, title, developer_name, genre, description, steam_url, image_url"
      )
      .eq("steam_app_id", steamAppId)
      .maybeSingle();

    const importedGame = importedGameData as ImportedGame | null;

    if (importedGameError || !importedGame) {
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

    const { data: developerLink, error: developerLinkError } = await supabase
      .from("game_developer_links")
      .select("id, relationship")
      .eq("imported_game_id", importedGame.id)
      .limit(1)
      .maybeSingle();

    if (developerLinkError) {
      console.error(
        "Could not check imported game developer relationship:",
        developerLinkError
      );
    }

    // Raw Steam imports deliberately do not get a Playtested profile.
    // If the relationship is later removed, this URL stops behaving like a
    // Playtested game page and the catalogue will return to the Steam action.
    if (!developerLink) {
      return (
        <main className="min-h-screen bg-[#090b0a] text-zinc-100">
          <SiteHeader />
          <section className="mx-auto max-w-6xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Steam catalogue listing
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              This game does not have a Playtested profile
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              This title is currently a catalogue-only Steam listing. A
              Playtested game profile becomes available when a developer
              relationship is established.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/"
                className="rounded-md border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                Back to Game Discovery
              </a>
              {importedGame.steam_url && (
                <a
                  href={importedGame.steam_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#8af5a8]"
                >
                  View Steam page ↗
                </a>
              )}
            </div>
          </section>
        </main>
      );
    }

    const { data: playtestData, error: playtestError } = await supabase
      .from("community_playtests")
      .select("id, release_label, status, audience, created_at")
      .eq("imported_game_id", importedGame.id)
      .order("created_at", { ascending: false });

    if (playtestError) {
      console.error("Could not load public playtest activity:", playtestError);
    }

    const playtests = (playtestData ?? []) as PlaytestRow[];
    const latestPlaytest = playtests[0] ?? null;
    const activePlaytest =
      playtests.find(
        (playtest) =>
          playtest.status === "open" ||
          playtest.status === "paused" ||
          playtest.status === "draft"
      ) ?? null;

    let acceptedIndependentTests = 0;
    let independentParticipants = 0;

    for (const playtest of playtests) {
      const { data: progressData, error: progressError } = await supabase.rpc(
        "get_developer_playtested_test_progress",
        {
          p_playtest_id: playtest.id,
        }
      );

      if (progressError) {
        console.error(
          `Could not load Tester Hub progress for playtest ${playtest.id}:`,
          progressError
        );
        continue;
      }

      const progress = Array.isArray(progressData)
        ? (progressData[0] as PlaytestedProgressRow | undefined)
        : (progressData as PlaytestedProgressRow | null);

      acceptedIndependentTests += toNumber(progress?.accepted_count);
      independentParticipants += toNumber(progress?.total_testers);
    }

    const verificationStatus: VerificationStatus = "Not yet verified";
    const steamUrl =
      importedGame.steam_url ||
      (importedGame.steam_app_id
        ? `https://store.steampowered.com/app/${importedGame.steam_app_id}/`
        : null);

    return (
      <main className="min-h-screen bg-[#090b0a] text-zinc-100">
        <SiteHeader />

        <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">
          <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                {verificationStatus}
              </span>
              <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-3 py-1.5 text-xs font-semibold text-violet-200">
                AI use unknown
              </span>
              <span className="inline-flex rounded-full border border-[#77f29b]/25 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b9f9ca]">
                Developer claimed
              </span>
            </div>

            <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <p className="text-sm text-zinc-500">
                  {importedGame.genre || "Uncategorised"} · Game profile
                </p>

                <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-6xl">
                  {importedGame.title || "Untitled game"}
                </h1>

                <p className="mt-3 text-lg text-zinc-400">
                  by {importedGame.developer_name || "Unknown developer"}
                </p>

                <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">
                  {importedGame.description ||
                    "No description is currently available for this game."}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {steamUrl && (
                    <a
                      href={steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-[#77f29b] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#8af5a8]"
                    >
                      View Steam page ↗
                    </a>
                  )}
                  <a
                    href="/"
                    className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                  >
                    Back to catalogue
                  </a>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101311]">
                {importedGame.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={importedGame.image_url}
                    alt={importedGame.title || "Game artwork"}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#253b2b] to-[#151815] text-sm text-zinc-500">
                    Game artwork
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                    Playtested activity
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
                    {activePlaytest
                      ? "Currently being playtested"
                      : playtests.length > 0
                        ? "Playtesting history"
                        : "Developer claimed on Playtested"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Independent Playtested testing is kept separate from the
                    developer&apos;s own community feedback and can contribute
                    towards future assessment and verification.
                  </p>
                </div>

                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                  {verificationStatus}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">Playtest rounds</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">
                    {playtests.length}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">
                    Independent testers
                  </p>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">
                    {independentParticipants}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">Accepted tests</p>
                  <p className="mt-1 text-2xl font-bold text-[#77f29b]">
                    {acceptedIndependentTests}
                  </p>
                </div>
              </div>

              {latestPlaytest ? (
                <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Latest playtest
                      </p>
                      <p className="mt-2 font-semibold text-zinc-100">
                        {formatReleaseLabel(
                          latestPlaytest.release_label,
                          playtests.length
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        latestPlaytest.status === "open"
                          ? "border-[#77f29b]/25 bg-[#77f29b]/[0.06] text-[#b9f9ca]"
                          : latestPlaytest.status === "paused"
                            ? "border-amber-300/25 bg-amber-300/[0.06] text-amber-200"
                            : "border-white/15 bg-white/[0.04] text-zinc-300"
                      }`}
                    >
                      {formatStatus(latestPlaytest.status)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-white/15 p-4">
                  <p className="text-sm text-zinc-400">
                    The developer has claimed this game, but no public
                    playtesting activity has been recorded yet.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                About
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
                About {importedGame.title || "this game"}
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                {importedGame.description ||
                  "No description is currently available for this game."}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                Developer relationship
              </p>
              <h2 className="mt-3 text-lg font-bold">Claimed on Playtested</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                A developer relationship for this game has been approved on
                Playtested. This confirms the account&apos;s relationship to
                the listing. It does not mean the game itself has been
                assessed or verified.
              </p>
              {"relationship" in developerLink &&
                developerLink.relationship && (
                  <p className="mt-4 text-sm text-zinc-300">
                    Relationship:{" "}
                    <span className="font-semibold text-zinc-100">
                      {developerLink.relationship}
                    </span>
                  </p>
                )}
            </div>

            <div className="rounded-xl border border-white/[0.09] bg-[#101311] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                AI transparency
              </p>
              <h2 className="mt-3 text-lg font-bold">AI use unknown</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                No reviewed AI-use disclosure is currently published for this
                game. Playtested does not infer AI use from a Steam listing.
              </p>
            </div>

            <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                The principle
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                How a game was made is useful context. Whether it is worth
                playing is what matters.
              </p>
            </div>
          </aside>
        </div>

        <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
          PLAYTESTED_ · Game information sourced from the catalogue. Playtested
          activity reflects activity recorded on Playtested.
        </footer>
      </main>
    );
  }

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
              Real review submission and user accounts will be added in a later
              version.
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
              and evidence where available. It does not indicate that Playtested
              has independently verified the claim.
            </p>
          </div>

          <div className="rounded-xl border border-[#77f29b]/20 bg-[#77f29b]/[0.04] p-5">
            <p className="text-xs tracking-widest text-[#77f29b]">
              THE PRINCIPLE
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              How a game was made is useful context. Whether it is worth playing
              is what matters.
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

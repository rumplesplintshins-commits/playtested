
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "../../../lib/supabase-server";

export const instant = false;

type SubmissionPageProps = {
  params: Promise<{ id: string }>;
};

const checklistItems = [
  ["ai_claims_checked", "AI claims reviewed"],
  ["evidence_checked", "Evidence inspected"],
  ["game_launched", "Game launched"],
  ["core_gameplay_tested", "Core gameplay tested"],
  ["bugs_recorded", "Bugs recorded"],
  ["performance_checked", "Performance checked"],
] as const;

type VerificationStatus =
  | "Verified"
  | "Assessed"
  | "Not yet verified";

export default async function SubmissionPage({
  params,
}: SubmissionPageProps) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from("approved_games")
    .select(
      "id, title, developer_name, genre, description, game_link, image_url, price, ai_type, ai_areas, ai_explanation, evidence_link"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !game) notFound();

  const { data: verification } = await supabase
    .from("published_game_verifications")
    .select(
      "verification_status, ai_status, quality_status, quality_score, public_summary, evidence_summary, ai_claims_checked, evidence_checked, game_launched, core_gameplay_tested, bugs_recorded, performance_checked, limitations, updated_at"
    )
    .eq("game_id", id)
    .maybeSingle();

  const rawPrice =
    typeof game.price === "string" ? game.price.trim() : "";

  const formattedPrice = rawPrice
    ? /^\d+(\.\d{1,2})?$/.test(rawPrice)
      ? `£${Number(rawPrice).toFixed(2)}`
      : rawPrice
    : "Price not provided";

  const numericPrice = rawPrice ? Number(rawPrice) : null;
  const isFree = rawPrice !== "" && numericPrice === 0;

  const rawVerificationStatus = verification?.verification_status;

  const verificationLabel: VerificationStatus =
    rawVerificationStatus === "Verified" ||
    rawVerificationStatus === "Assessed" ||
    rawVerificationStatus === "Not yet verified"
      ? rawVerificationStatus
      : "Not yet verified";

  const isVerified = verificationLabel === "Verified";
  const isAssessed = verificationLabel === "Assessed";

  const verificationDescription = isVerified
    ? "The recorded checks support the AI disclosure, and the game has been launched and its core gameplay tested. This does not guarantee every AI use has been detected or every aspect of quality."
    : isAssessed
      ? "Some assessment work has been recorded, but the full criteria for Verified have not been met. Review the checks and limitations below."
      : "This game has an approved listing, but there is not yet enough recorded assessment work to classify it as independently assessed.";

  const statusStyle = isVerified
    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
    : isAssessed
      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
      : "border-zinc-700 bg-white/[0.03] text-zinc-300";

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
        <Link
          href="/store"
          className="text-xs text-[#77f29b] hover:underline"
        >
          ← Back to Store
        </Link>

        <section className="mt-3 grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[260px_1fr] sm:items-center lg:grid-cols-[320px_1fr]">
          <div>
            {game.image_url ? (
              <img
                src={game.image_url}
                alt={`${game.title} artwork`}
                className="aspect-video w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg bg-white/[0.04] text-sm text-zinc-500">
                No game artwork supplied
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#77f29b]">
              PLAYTESTED COMMUNITY GAME
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {game.title}
            </h1>

            <p className="mt-1 text-sm text-zinc-400">
              By {game.developer_name} · {game.genre}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-xl font-semibold">{formattedPrice}</p>

              {game.game_link && (
                <a
                  href={game.game_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#77f29b] px-4 py-2 text-sm font-semibold text-black hover:bg-[#9af9b3]"
                >
                  Visit or play game ↗
                </a>
              )}
            </div>
          </div>
        </section>

        <section
          id="installation"
          className="mt-4 rounded-xl border border-[#77f29b]/30 bg-[#101712] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
                PLAYTESTED INSTALLER
              </p>

              <h2 className="mt-1 text-lg font-bold">
                {isFree ? "Get this game" : "Install this game"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-5 text-zinc-400">
                {isFree
                  ? "This game is listed as free. Direct downloads and installation through Playtested are not available yet."
                  : "Direct downloads and installation through Playtested are not available yet. Purchasing and game ownership are not supported by this prototype."}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-amber-200">
                  Playtested downloads coming soon
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled
              title="Direct downloads are not available yet"
              className="w-full cursor-not-allowed rounded-lg border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-500 sm:w-auto"
            >
              Install unavailable
            </button>
          </div>

          {game.game_link && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs text-zinc-400">
                Want to access the game now? Use the developer-provided link.
                It may open an external website or platform.
              </p>

              <a
                href={game.game_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[#77f29b] hover:underline"
              >
                Open external game link ↗
              </a>
            </div>
          )}
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-lg font-semibold">About this game</h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                {game.description}
              </p>

              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs font-semibold text-zinc-300">
                  Listing approval
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Approval confirms the listing passed platform review. It
                  does not itself verify game quality or AI disclosures.
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-lg font-semibold">
                Developer AI disclosure
              </h2>

              <p className="mt-3 text-xs text-zinc-500">
                Declared AI involvement
              </p>

              <p className="mt-1 text-sm font-medium">
                {game.ai_type || "Not specified"}
              </p>

              {game.ai_areas?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500">
                    Areas where AI was used
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {game.ai_areas.map((area: string) => (
                      <span
                        key={area}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {game.ai_explanation && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500">
                    Developer&apos;s explanation
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-zinc-300">
                    {game.ai_explanation}
                  </p>
                </div>
              )}

              {game.evidence_link && (
                <a
                  href={game.evidence_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-[#77f29b] hover:underline"
                >
                  View developer-provided evidence ↗
                </a>
              )}
            </section>
          </div>

          <div>
            {verification ? (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
                      Independent assessment
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      Playtested Verification
                    </h2>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle}`}
                  >
                    {verificationLabel}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {verificationDescription}
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  Assessment published
                  {verification.updated_at
                    ? ` · Updated ${new Date(
                        verification.updated_at
                      ).toLocaleDateString("en-GB")}`
                    : ""}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      AI disclosure assessment
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {verification.ai_status}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Gameplay testing
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {verification.quality_status}
                    </p>
                  </div>
                </div>

                {verification.quality_score !== null &&
                  verification.quality_score !== undefined && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                      <div>
                        <p className="text-xs font-medium">
                          Playtested quality score
                        </p>

                        <p className="text-[10px] text-zinc-500">
                          Editorial assessment, out of 10
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-[#77f29b]">
                        {Number(verification.quality_score).toFixed(1)}
                        <span className="text-sm text-zinc-500"> / 10</span>
                      </p>
                    </div>
                  )}

                {verification.public_summary && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">
                      Assessment summary
                    </h3>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {verification.public_summary}
                    </p>
                  </div>
                )}

                {verification.evidence_summary && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <h3 className="text-sm font-semibold">
                      Evidence reviewed
                    </h3>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                      {verification.evidence_summary}
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-white/10 pt-3">
                  <h3 className="text-sm font-semibold">What we checked</h3>

                  <ul className="mt-3 space-y-2">
                    {checklistItems.map(([key, label]) => {
                      const checked = verification[key] === true;

                      return (
                        <li
                          key={key}
                          className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5"
                        >
                          <span
                            aria-label={checked ? "Checked" : "Not checked"}
                            className={`mt-0.5 font-bold ${
                              checked
                                ? "text-[#77f29b]"
                                : "text-amber-300"
                            }`}
                          >
                            {checked ? "✓" : "!"}
                          </span>

                          <span className="text-sm text-zinc-300">
                            {label}

                            {!checked && (
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                Not confirmed in this assessment
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {verification.limitations && (
                  <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-4">
                    <h3 className="text-sm font-semibold text-amber-200">
                      Limitations and outstanding checks
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {verification.limitations}
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-xs leading-5 text-zinc-500">
                    Playtested reports the evidence and checks recorded at
                    the time of assessment. It cannot guarantee that every
                    instance of AI use has been detected, that every bug has
                    been found, or that future updates will behave the same.
                  </p>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Playtested Verification
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Not yet independently assessed
                </h2>

                <p className="mt-2 text-sm leading-5 text-zinc-400">
                  This game has an approved listing, but no published
                  verification assessment is available yet.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
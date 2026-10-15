
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

type ApprovedGame = {
  id: string;
  title: string;
  developer_name: string;
  genre: string;
  description: string;
  game_link: string;
  image_url: string | null;
  price: string;
  ai_type: string;
  ai_areas: string[];
};

export default function ApprovedSubmissions() {
  const [games, setGames] = useState<ApprovedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function loadGames() {
      const { data, error: queryError } = await supabase
        .from("game_submissions")
        .select(
          "id, title, developer_name, genre, description, game_link, image_url, price, ai_type, ai_areas"
        )
        .eq("status", "Approved")
        .order("submitted_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        console.error("Could not load approved games:", queryError);
        setError(true);
      } else {
        setGames(data ?? []);
      }

      setLoading(false);
    }

    loadGames();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-zinc-400">Loading approved submissions...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-zinc-400">
          Approved submissions could not be loaded.
        </p>
      </section>
    );
  }

  if (games.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#77f29b]">
          COMMUNITY SUBMISSIONS
        </p>
        <h2 className="text-2xl font-bold sm:text-3xl">
          Approved games
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          These developer submissions have been approved for listing.
          Approval does not mean their AI disclosures or game quality have
          been independently verified.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <article
            key={game.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60"
          >
            <div className="aspect-video bg-[#090b0a]">
              {game.image_url ? (
                <img
                  src={game.image_url}
                  alt={`${game.title} artwork`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                  No artwork supplied
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-xs text-emerald-300">
                  Listing approved
                </span>
                <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                  {game.genre}
                </span>
              </div>

              <h3 className="text-xl font-semibold">{game.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                By {game.developer_name}
              </p>

              <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                {game.description}
              </p>

              <div className="mt-4 border-t border-zinc-800 pt-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Developer-declared AI involvement
                </p>
                <p className="mt-1 text-sm text-zinc-200">{game.ai_type}</p>

                {game.ai_areas?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {game.ai_areas.map((area) => (
                      <span
                        key={area}
                        className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-200">
                  {game.price
  ? /^\d+(\.\d{1,2})?$/.test(game.price.trim())
    ? `£${Number(game.price).toFixed(2)}`
    : game.price
  : "Price not specified"}
                </span>

                {game.game_link &&
                  /^https?:\/\//i.test(game.game_link) && (
                    <a
                      href={game.game_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[#77f29b] px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300"
                    >
                      View game
                    </a>
                  )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
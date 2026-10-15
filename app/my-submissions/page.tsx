import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import SiteHeader from "../components/SiteHeader";
import { createClient } from "../../lib/supabase-server";

function formatPrice(price: string | null) {
if (!price || !price.trim()) {
return "Not set";
}

if (price.trim().toLowerCase() === "free") {
return "Free";
}

const amount = Number(price);

if (Number.isFinite(amount) && amount >= 0) {
return new Intl.NumberFormat("en-GB", {
style: "currency",
currency: "GBP",
}).format(amount);
}

return price;
}

function LoadingDashboard() {
return (
<p className="mt-8 text-zinc-400">
Loading your developer dashboard...
</p>
);
}

async function DeveloperDashboard() {
await connection();

const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login?next=/my-submissions");
}

const { data: submissions, error } = await supabase
.from("game_submissions")
.select("id, title, genre, status, submitted_at, price")
.eq("developer_id", user.id)
.order("submitted_at", { ascending: false });

if (error) {
return (
<p className="mt-8 text-red-400">
Could not load your submissions. Please try again.
</p>
);
}

const games = submissions ?? [];

return (
<>
<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
<p className="text-sm text-zinc-400">Games submitted</p>
<p className="mt-2 text-3xl font-bold">{games.length}</p>
</div>

    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-zinc-400">Approved games</p>
      <p className="mt-2 text-3xl font-bold text-[#77f29b]">
        {games.filter((game) => game.status === "Approved").length}
      </p>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-zinc-400">Copies sold</p>
      <p className="mt-2 text-3xl font-bold">0</p>
      <p className="mt-1 text-xs text-amber-300">Sales tracking not live</p>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-zinc-400">Developer earnings</p>
      <p className="mt-2 text-3xl font-bold">£0.00</p>
      <p className="mt-1 text-xs text-amber-300">Demo figure only</p>
    </div>
  </div>

  <div className="mt-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">Your games</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Manage your listings and monitor their performance.
        </p>
      </div>

      <Link
        href="/submit"
        className="rounded-lg bg-[#77f29b] px-5 py-3 font-semibold text-black"
      >
        Submit a game
      </Link>
    </div>

    {games.length === 0 ? (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <h3 className="text-lg font-semibold">No games submitted yet</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Submit your first game to start building your developer
          portfolio.
        </p>
      </div>
    ) : (
      <div className="mt-6 space-y-5">
        {games.map((game) => (
          <article
            key={game.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{game.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{game.genre}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Submitted{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(game.submitted_at))}
                </p>
              </div>

              <span className="rounded-md border border-white/10 px-3 py-2 text-sm">
                {game.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-black/20 p-4">
                <p className="text-xs text-zinc-500">Listed price</p>
                <p className="mt-2 font-semibold">
                  {formatPrice(game.price)}
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <p className="text-xs text-zinc-500">Copies sold</p>
                <p className="mt-2 font-semibold">0</p>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <p className="text-xs text-zinc-500">Gross revenue</p>
                <p className="mt-2 font-semibold">£0.00</p>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <p className="text-xs text-zinc-500">
                  Estimated earnings
                </p>
                <p className="mt-2 font-semibold text-[#77f29b]">
                  £0.00
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-4">
              <p className="text-xs text-zinc-500">
                Proposed platform fee: 10% of eligible sales. No real
                sales or fees are currently recorded.
              </p>

              <p className="text-xs text-amber-300">
                Sales analytics coming soon
              </p>
            </div>
          </article>
        ))}
      </div>
    )}
  </div>
</>

);
}

export default function MySubmissionsPage() {
return (
<main className="min-h-screen bg-[#090b0a] text-zinc-100">
<SiteHeader />

  <section className="mx-auto max-w-6xl px-6 py-12">
    <p className="text-xs tracking-[0.2em] text-[#77f29b]">
      DEVELOPER DASHBOARD
    </p>

    <h1 className="mt-3 text-4xl font-bold">My submissions</h1>

    <p className="mt-3 max-w-2xl text-zinc-400">
      Track your game listings, review progress, pricing and future sales
      performance in one place.
    </p>

    <Suspense fallback={<LoadingDashboard />}>
      <DeveloperDashboard />
    </Suspense>
  </section>
</main>

);
}
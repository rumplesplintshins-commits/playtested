import Link from "next/link";
import { connection } from "next/server";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "../../../lib/supabase-server";
import CommunityPlaytestJoin from "./CommunityPlaytestJoin";
import {carryJourney} from "@/lib/share-links";

export const instant = false;

type CommunityPlaytestPageProps = {
  searchParams?:Promise<{pt_visit?:string}>;
  params: Promise<{
    token: string;
  }>;
};

type PublicCommunityPlaytest = {
  playtest_id: string;
  title: string;
  instructions: string;
  focus_areas: string[] | null;
  estimated_minutes: number | null;
  release_label: string | null;
  status: string;
  audience: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatEstimatedTime(minutes: number | null) {
  if (!minutes) {
    return "Not specified";
  }

  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  if (minutes === 60) {
    return "1 hour";
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hours`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} ${
    hours === 1 ? "hour" : "hours"
  } ${remainingMinutes} minutes`;
}

function UnavailablePlaytest() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Community playtest
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            This playtest is not available
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            This invitation may have expired, the playtest may have been paused
            or closed, or community testing may no longer be enabled.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#77f29b]/40 hover:text-[#77f29b]"
          >
            Back to Playtested
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function CommunityPlaytestPage({
  params,
  searchParams,
}: CommunityPlaytestPageProps) {
  await connection();

  const { token } = await params;

  if (!isUuid(token)) {
    return <UnavailablePlaytest />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_community_playtest",
    {
      p_share_token: token,
    }
  );

  if (error) {
    console.error("Could not load public community playtest:", error);

    return <UnavailablePlaytest />;
  }

  const rows = (data ?? []) as PublicCommunityPlaytest[];
  const playtest = rows[0];

  if (!playtest) {
    return <UnavailablePlaytest />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const query=await searchParams;
  const visit=typeof query?.pt_visit==="string"&&/^[a-f0-9]{64}$/.test(query.pt_visit)?query.pt_visit:null;
  const returnPath = carryJourney(`/playtest/${token}`,visit);
  const encodedReturnPath = encodeURIComponent(returnPath);

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="rounded-2xl border border-[#77f29b]/20 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#77f29b]">
                Community playtest
              </p>

              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                {playtest.title}
              </h1>

              {playtest.release_label && (
                <p className="mt-2 text-sm text-zinc-400">
                  Build / release:{" "}
                  <span className="text-zinc-200">
                    {playtest.release_label}
                  </span>
                </p>
              )}
            </div>

            <span className="rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-3 py-1.5 text-xs font-semibold text-[#77f29b]">
              Playtest open
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Estimated test time
              </p>

              <p className="mt-2 font-medium text-zinc-200">
                {formatEstimatedTime(playtest.estimated_minutes)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Testing through
              </p>

              <p className="mt-2 font-medium text-zinc-200">
                Developer community
              </p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              What the developer wants you to test
            </p>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
              {playtest.instructions}
            </p>
          </div>

          {playtest.focus_areas && playtest.focus_areas.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Testing focus
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {playtest.focus_areas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs text-[#b9f9ca]"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-white/10 pt-8">
            {!user ? (
              <div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.05] p-5 sm:p-6">
                <h2 className="text-xl font-semibold">
                  Join this playtest
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Create a free Playtested tester account or log in to take
                  part. After signing in, you will return directly to this
                  playtest.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/login?mode=signup&role=tester&next=${encodedReturnPath}`}
                    className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
                  >
                    Sign up to test
                  </Link>

                  <Link
                    href={`/login?next=${encodedReturnPath}`}
                    className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#77f29b]/40 hover:text-[#77f29b]"
                  >
                    Log in to test
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#77f29b]/25 bg-[#77f29b]/[0.06] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
                  Signed in
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  You're ready to join the test
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  This invitation is for a developer community playtest. Your
                  feedback will be recorded separately from independent
                  Playtested Tester Hub results.
                </p>

                <CommunityPlaytestJoin token={token} />
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Community playtests are organised by the game's developer. Community
          feedback is kept separate from independent Playtested testing.
        </p>
      </section>
    </main>
  );
}

import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import StudioTeam from "../components/StudioTeam";
import { createClient } from "@/lib/supabase-server";

async function TeamContent() {
  await connection();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?next=/my-team");
  const {data: profile} = await client.from("profiles").select("role,roles").eq("id",user.id).maybeSingle();
  return <StudioTeam canCreate={profile?.role === "admin" || profile?.roles?.includes("developer") === true} />;
}

export default function MyTeamPage() {
  return <main className="min-h-screen bg-[#090b0a] text-zinc-100">
    <SiteHeader />
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <div>
        <a href="/my-submissions" className="text-sm text-emerald-300 underline-offset-4 hover:underline">My Games</a>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Manage Team</h1>
      </div>
      <Suspense fallback={<p role="status">Loading studio workspaces…</p>}><TeamContent /></Suspense>
    </section>
  </main>;
}

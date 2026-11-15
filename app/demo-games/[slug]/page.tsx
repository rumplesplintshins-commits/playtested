import { notFound } from "next/navigation";
import { DEMO_GAMES } from "@/lib/demo-games";
import { DemoGamePlayer } from "@/app/components/DemoGamePlayer";

export function generateStaticParams() { return DEMO_GAMES.map(game => ({ slug: game.slug })); }
export default async function DemoGamePage({ params }: { params: Promise<{ slug: string }> }) {
  // Keep QA mini-games available locally, never as public beta invitations.
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await params;
  const game = DEMO_GAMES.find(game => game.slug === slug);
  if (!game) notFound();
  return <DemoGamePlayer key={game.slug} game={game}/>;
}

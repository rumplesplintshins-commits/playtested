import Link from "next/link";

export default function PublicGameGuides() {
  return (
    <aside aria-labelledby="game-guides" className="mx-auto max-w-6xl border-t border-white/10 px-6 py-8">
      <h2 id="game-guides" className="text-lg font-semibold text-white">Learn more about playtesting</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
        Playtested separates player responses about a particular build from any
        independent assessment. Read how the process works and how to make
        feedback clear and useful.
      </p>
      <nav aria-label="Playtesting guides" className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <Link href="/playtesting" className="text-[#77f29b] underline underline-offset-4">How playtesting works</Link>
        <Link href="/guides/playtest-feedback" className="text-[#77f29b] underline underline-offset-4">Writing useful feedback</Link>
        <Link href="/find-playtesters" className="text-[#77f29b] underline underline-offset-4">For indie developers</Link>
        <Link href="/become-a-playtester" className="text-[#77f29b] underline underline-offset-4">For playtesters</Link>
      </nav>
    </aside>
  );
}

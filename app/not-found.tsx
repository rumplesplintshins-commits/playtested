import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-2xl px-6 py-16 text-zinc-100"><p className="text-[#77f29b]">PLAYTESTED_</p><h1 className="mt-6 text-4xl font-bold">Page not found</h1><p className="mt-4 text-zinc-300">This page does not exist or is no longer available.</p><nav aria-label="Find another page" className="mt-8 flex flex-wrap gap-5 text-[#77f29b]"><Link href="/">Explore Playtested</Link><Link href="/playtesting">Read the playtesting guide</Link></nav></main>;
}

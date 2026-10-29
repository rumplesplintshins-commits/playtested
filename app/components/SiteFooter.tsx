import Link from "next/link";

export default function SiteFooter() {
  return <footer className="border-t border-white/10 bg-[#0b0e0c] px-6 py-7 text-sm text-zinc-300">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
      <p className="font-semibold tracking-wide">PLAYTESTED_</p>
      <nav aria-label="Legal and support" className="flex flex-wrap gap-x-6 gap-y-3">
        {[["/terms", "Terms of Use"], ["/privacy", "Privacy Notice"], ["/contact", "Contact/Support"]].map(([href, label]) => <Link key={href} href={href} className="rounded underline-offset-4 hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">{label}</Link>)}
      </nav>
    </div>
  </footer>;
}

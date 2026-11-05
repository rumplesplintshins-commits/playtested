import Link from "next/link";
import { organicBreadcrumb, organicOrigin, organicPages, safeStructuredData } from "@/lib/organic-search";

export default function OrganicGuide({ path, eyebrow, title, intro, children }: {
  path: string; eyebrow: string; title: string; intro: string; children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#090b0a] text-zinc-100">
    <a className="sr-only focus:not-sr-only focus:block focus:bg-[#77f29b] focus:p-3 focus:text-black" href="#guide-content">Skip to guide</a>
    <header className="border-b border-white/10"><nav aria-label="Main navigation" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5">
      <Link href="/" className="mr-auto text-xl font-bold text-[#77f29b]">PLAYTESTED_</Link>
      <Link href="/playtesting">Playtesting</Link><Link href="/find-playtesters">For developers</Link><Link href="/become-a-playtester">For testers</Link>
    </nav></header>
    <main id="guide-content" className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-2 text-sm text-zinc-400"><Link href="/">Playtested</Link><span aria-hidden="true">/</span>{path.startsWith("/guides/") && <><Link href="/playtesting">Playtesting</Link><span aria-hidden="true">/</span></>}<span aria-current="page">{title}</span></nav>
      <p className="text-xs font-bold uppercase tracking-widest text-[#77f29b]">{eyebrow}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
      <p className="mt-6 text-lg leading-8 text-zinc-300">{intro}</p>
      <div className="mt-10 space-y-10 text-base leading-8 text-zinc-300 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:font-semibold [&_h3]:text-white [&_a]:text-[#77f29b] [&_a]:underline [&_p+p]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">{children}</div>
      {(path === "/find-playtesters" || path === "/become-a-playtester") && <aside className="mt-10 rounded-xl border border-[#77f29b]/30 p-5"><h2 className="text-xl font-semibold">Take the next step on Playtested</h2><p className="mt-3 text-sm leading-6 text-zinc-300">Open the live service to check current access rules and availability. Participation requires an eligible account; this guide does not reserve a place.</p><a className="mt-4 inline-block rounded border border-[#77f29b]/50 px-4 py-3 text-[#77f29b]" href={organicOrigin+(path === "/find-playtesters" ? "/submit" : "/tester")}>{path === "/find-playtesters" ? "Open Submit a Game" : "Open Tester Hub"}</a></aside>}
      <aside aria-label="Related playtesting guides" className="mt-12 rounded-xl border border-white/10 bg-[#101311] p-5"><h2 className="font-semibold">Keep exploring</h2><ul className="mt-3 space-y-3">{organicPages.filter(page => page.path !== path).map(page => <li key={page.path}><Link className="text-[#77f29b] underline" href={page.path}>{page.title}</Link></li>)}</ul><p className="mt-5 text-sm"><Link href="/#discover" className="underline">Explore the games catalogue</Link></p></aside>
    </main>
    <footer className="border-t border-white/10 px-6 py-6 text-center text-sm text-zinc-400"><p>Playtested · Practical guides for developers and playtesters</p><nav aria-label="Service information" className="mt-3 flex flex-wrap justify-center gap-5"><a href={organicOrigin+"/contact"}>Contact</a><a href={organicOrigin+"/privacy"}>Privacy</a><a href={organicOrigin+"/terms"}>Terms</a></nav></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeStructuredData(organicBreadcrumb(path, title)) }} />
  </div>;
}

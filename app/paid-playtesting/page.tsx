import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Paid Playtesting Preview | Playtested",
  description: "Preview proposed Playtested paid sessions and tester rewards. Payments are not available yet.",
  robots: { index: false, follow: false },
};

const steps = [
  { number: "01", title: "Share your build", description: "Submit a playable game and choose what you want honest feedback on." },
  { number: "02", title: "Pick your sessions", description: "Choose a duration and how many testers you want when paid bookings become available." },
  { number: "03", title: "Learn from players", description: "Review structured reports about the gameplay, bugs, controls and overall experience." },
] as const;

const sessions = [
  { time: "15 minutes", title: "Quick check", price: "£7", reward: "£5", description: "First impressions and a focused check on one area.", highlight: false },
  { time: "30 minutes", title: "Standard test", price: "£13", reward: "£10", description: "Time to explore the core loop, controls and friction points.", highlight: true },
  { time: "60 minutes", title: "Deep dive", price: "£17", reward: "£14", description: "A longer session for deeper exploration and considered feedback.", highlight: false },
] as const;

const faqs = [
  { question: "Can I still use Playtested for free?", answer: "Yes. The indie catalogue and free community playtesting remain available. Paid sessions would be an additional option." },
  { question: "Does my game need to be finished?", answer: "No. Playtested already accepts playable games and prototypes. Any extra requirements for paid sessions will be published before launch." },
  { question: "Who would test my game?", answer: "The plan is to recruit from the Playtested tester community, with eligibility checks and reviewed feedback. Exact paid-session rules are still being developed." },
  { question: "What would I receive?", answer: "Structured player feedback tied to your build. Recordings are not included or guaranteed by these proposed prices; any recording option would be separately agreed." },
  { question: "Are prices and rewards confirmed?", answer: "Not yet. These are proposed introductory amounts per tester. Payment processing, taxes where applicable, refunds, approval rules and payouts still need finalising." },
] as const;

export default function PaidPlaytestingPage() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#77f29b]/[0.06] blur-[90px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-14 md:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] lg:items-end">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-[#77f29b]/25 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#77f29b]">Paid playtesting · coming soon</p>
            <h1 className="mt-7 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Better feedback.<span className="block text-[#77f29b]">Fairer rewards.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
              Focused sessions for indie developers and meaningful rewards for players who test their games. This is a preview of our planned paid playtesting options.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#77f29b]">Try free playtesting</Link>
              <span className="text-sm text-zinc-500">Paid bookings are not open yet.</span>
            </div>
          </div>
          <aside className="min-w-0 rounded-2xl border border-white/10 bg-[#101611] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#77f29b]">Our approach</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Good playtests deserve good pay.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">We want most of each session price to go to the person doing the testing, while keeping developer costs straightforward.</p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-5">
              <span className="text-sm text-zinc-400">Proposed 30-minute tester reward</span>
              <strong className="text-3xl font-bold text-[#77f29b]">£10</strong>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#77f29b]">How it would work</p>
        <h2 id="how-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Three steps from build to feedback.</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="min-w-0 border-t border-white/15 pt-5">
              <span className="text-xs font-semibold tracking-widest text-[#77f29b]">{step.number}</span>
              <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" aria-labelledby="pricing-title" className="border-y border-white/10 bg-[#0e110f]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#77f29b]">Proposed introductory prices</p>
              <h2 id="pricing-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Simple sessions. Fair rewards.</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">Price per tester, per session. Nothing is being sold yet.</p>
            </div>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-3 py-1.5 text-xs font-medium text-amber-200">Preview only</span>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {sessions.map((session) => (
              <article key={session.time} className={session.highlight
                ? "flex min-w-0 flex-col rounded-2xl border border-[#77f29b]/45 bg-[#77f29b]/[0.045] p-6 sm:p-7"
                : "flex min-w-0 flex-col rounded-2xl border border-white/10 bg-[#090b0a]/60 p-6 sm:p-7"}>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{session.time}</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{session.title}</h3>
                <p className="mt-5 text-4xl font-bold tracking-tight text-white">{session.price}</p>
                <p className="mt-1 text-xs text-zinc-500">Developer pays · per tester</p>
                <div className="mt-6 rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.055] px-4 py-3">
                  <p className="text-xs text-zinc-400">Proposed tester reward</p>
                  <p className="mt-1 text-2xl font-semibold text-[#77f29b]">{session.reward}</p>
                </div>
                <p className="mt-5 flex-1 text-sm leading-7 text-zinc-400">{session.description}</p>
                <button type="button" disabled className="mt-7 min-h-11 w-full cursor-not-allowed rounded-lg border border-white/15 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-zinc-400">Not live yet</button>
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-4xl text-xs leading-6 text-zinc-500">These amounts are illustrative and may change. Payment processing, taxes where applicable, refund rules and tester payouts are not enabled.</p>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:py-20 lg:grid-cols-[minmax(220px,.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#77f29b]">Before you get started</p>
          <h2 id="faq-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">A few useful answers.</h2>
          <p className="mt-5 text-sm leading-7 text-zinc-400">Paid sessions are still being developed. Here is what is planned so far.</p>
        </div>
        <div className="min-w-0 border-t border-white/10">
          {faqs.map((item) => (
            <details key={item.question} className="group border-b border-white/10">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#77f29b] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span><span aria-hidden="true" className="shrink-0 text-lg font-normal text-[#77f29b] group-open:hidden">+</span><span aria-hidden="true" className="hidden shrink-0 text-lg font-normal text-[#77f29b] group-open:inline">−</span>
              </summary>
              <p className="max-w-2xl pb-5 pr-6 text-sm leading-7 text-zinc-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0e110f]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-6 py-10 sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-semibold text-white">Want feedback now?</h2><p className="mt-2 text-sm leading-7 text-zinc-400">Community testing is available today while paid playtests are being developed.</p></div>
          <Link href="/submit" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[#77f29b]/35 px-5 py-3 text-sm font-semibold text-[#77f29b] hover:bg-[#77f29b]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#77f29b]">Submit a game</Link>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Paid Playtesting Preview | Playtested",
  description: "Preview paid indie game playtesting sessions. Coming soon.",
  robots: { index: false, follow: false },
};

const steps = [
  { number: "01", title: "Bring your game", detail: "Submit a playable build and highlight the parts that need feedback." },
  { number: "02", title: "Set the focus", detail: "Choose a session length and tell testers what matters most." },
  { number: "03", title: "Learn what works", detail: "Get structured observations about gameplay, bugs and usability." },
] as const;

const sessions = [
  { minutes: "15 min", price: "£7", label: "First impressions", detail: "A quick look at the opening experience or one specific feature." },
  { minutes: "30 min", price: "£13", label: "Core gameplay", detail: "A closer look at controls, progression and early friction points." },
  { minutes: "60 min", price: "£17", label: "Extended playtest", detail: "More time to uncover issues that don't appear immediately." },
] as const;

const questions = [
  { title: "Will free playtesting still be available?", answer: "Yes. The existing free community playtests stay available. Paid sessions would be an optional addition." },
  { title: "Does my game need to be finished?", answer: "No. Playable demos and prototypes are welcome. Any additional conditions will be confirmed before bookings open." },
  { title: "Who will test my game?", answer: "The plan is to recruit relevant testers from the Playtested community. Selection rules are still being finalised." },
  { title: "What do I receive?", answer: "Structured feedback tied to your build and testing brief. Recordings are not included or guaranteed at these proposed prices." },
  { title: "Can I pay for a session now?", answer: "Not yet. The prices are provisional and paid bookings are disabled until the service is ready." },
] as const;

export default function PaidPlaytestingPage() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">Playtested / For developers</p>
            <span className="rounded-full border border-[#77f29b]/30 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs font-medium text-[#77f29b]">Paid playtesting · Coming soon</span>
          </div>
          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,.6fr)] lg:items-end">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                More eyes on your build.
                <span className="block text-[#77f29b]">More useful feedback.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Focused sessions to help you understand what players actually experience, from confusing controls to frustrating bugs.</p>
            </div>
            <div className="border-l-2 border-[#77f29b]/60 pl-5">
              <p className="text-sm font-semibold text-white">Free testing is already here.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">You can submit your game today while paid sessions are in development.</p>
              <Link href="/submit" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#77f29b] underline underline-offset-4 hover:text-[#a2fac0]">Submit a game</Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="process-heading" className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="process-heading" className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">From build to insight.</h2>
          <p className="text-sm text-zinc-500">Designed around real indie game testing.</p>
        </div>
        <ol className="mt-7 grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="min-w-0 rounded-xl border border-white/10 bg-[#101511] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#77f29b]/30 bg-[#77f29b]/[0.05] text-xs font-bold text-[#77f29b]">{step.number}</span>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-white/[0.08] bg-[#0e1510]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">Proposed introductory pricing</p>
          <h2 id="pricing-heading" className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">Pick the depth of your playtest.</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-400">Simple developer prices per tester. No checkout is available yet.</p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {sessions.map((session, index) => (
              <article key={session.minutes} className={index === 1 ? "flex min-w-0 flex-col rounded-xl border border-[#77f29b]/40 bg-[#77f29b]/[0.055] p-5 sm:p-6" : "flex min-w-0 flex-col rounded-xl border border-white/10 bg-[#090b0a]/50 p-5 sm:p-6"}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{session.minutes}</p>
                  {index === 1 && <span className="rounded-full bg-[#77f29b]/10 px-2 py-1 text-[11px] font-semibold text-[#77f29b]">Popular choice</span>}
                </div>
                <p className="mt-5 text-4xl font-bold tracking-tight text-white">{session.price}</p>
                <p className="mt-1 text-xs text-zinc-500">per tester</p>
                <h3 className="mt-6 text-base font-semibold">{session.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">{session.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#090b0a]/60 px-5 py-4">
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">These prices are provisional. Paid bookings have not launched.</p>
            <button type="button" disabled className="min-h-10 cursor-not-allowed rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-zinc-400">Not live yet</button>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)] lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">Good to know</p>
            <h2 id="faq-heading" className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">Questions before launch?</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">What we've planned so far, and what is still being worked out.</p>
          </div>
          <div className="min-w-0 divide-y divide-white/10 border-y border-white/10">
            {questions.map((item) => (
              <details key={item.title} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#77f29b] [&::-webkit-details-marker]:hidden">
                  <span>{item.title}</span>
                  <span aria-hidden="true" className="shrink-0 text-xl font-normal text-[#77f29b] group-open:hidden">+</span>
                  <span aria-hidden="true" className="hidden shrink-0 text-xl font-normal text-[#77f29b] group-open:inline">−</span>
                </summary>
                <p className="max-w-2xl pb-5 pr-5 text-sm leading-7 text-zinc-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

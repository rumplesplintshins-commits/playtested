import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Paid Playtesting Preview | Playtested",
  description: "Proposed paid playtesting sessions for indie games. Not live yet.",
  robots: { index: false, follow: false },
};

const steps = [
  { number: "01", title: "Share your build", description: "Add your playable game and tell testers what you want feedback on." },
  { number: "02", title: "Choose your sessions", description: "Pick a session length and the number of testers you need." },
  { number: "03", title: "Learn from players", description: "Get honest, structured feedback to help improve your game." },
] as const;

const sessions = [
  { minutes: "15 min", price: "£7", reward: "£5" },
  { minutes: "30 min", price: "£13", reward: "£10" },
  { minutes: "60 min", price: "£17", reward: "£14" },
] as const;

const questions = [
  {
    question: "Does my game need to be finished?",
    answer: "No. Playable prototypes, demos and games in development are welcome. Specific requirements for paid sessions will be confirmed before launch.",
  },
  {
    question: "Who will play my game?",
    answer: "The plan is to recruit from our Playtested community. Tester eligibility and selection rules will be confirmed before paid bookings open.",
  },
  {
    question: "What feedback will I receive?",
    answer: "Structured notes on gameplay, usability, issues and overall experience. Session recordings are not included or promised at these proposed prices.",
  },
  {
    question: "Will free playtesting still be available?",
    answer: "Yes. Free community playtesting is staying. Paid sessions will be an optional addition for developers who want more focused testing.",
  },
  {
    question: "Are the prices and tester rewards final?",
    answer: "Not yet. These are proposed introductory amounts per tester. Payment fees, any applicable taxes, refund rules and payouts still need to be finalised.",
  },
] as const;

export default function PaidPlaytestingPage() {
  return (
    <main className="min-h-screen bg-[#f9faf8] text-[#112923]">
      <div className="bg-[#090b0a] text-zinc-100"><SiteHeader /></div>
      <div className="border-b border-[#dce5de]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#456b58]">Playtested / Paid playtesting</p>
          <span className="rounded-full border border-[#bedac9] bg-[#ecf5ef] px-3 py-1 text-xs font-semibold text-[#2b6946]">Coming soon · preview only</span>
        </div>
      </div>

      <section aria-labelledby="steps-heading" className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <h1 id="steps-heading" className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Three steps to fresh feedback<span className="text-[#2ca273]">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#537067]">
          A straightforward way to get your game in front of real players. Paid sessions are still in development.
        </p>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="border-t border-[#d6e1d9] pt-5">
              <span className="text-xs font-semibold tracking-wide text-[#53846a]">{step.number}</span>
              <h2 className="mt-4 text-base font-semibold">{step.title}</h2>
              <p className="mt-3 max-w-xs text-sm leading-7 text-[#617b70]">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" aria-labelledby="prices-heading" className="border-y border-[#dce5de] bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.45fr)] lg:gap-16">
          <div>
            <h2 id="prices-heading" className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Small sessions.<span className="block">Clear pricing.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#617b70]">Proposed introductory prices, per tester. The majority goes to the person doing the playtest.</p>
          </div>
          <div className="min-w-0">
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {sessions.map((session) => (
                <div key={session.minutes} className="min-w-0 border-t border-[#d6e1d9] pt-5">
                  <p className="text-xs font-medium text-[#6e867a]">{session.minutes}</p>
                  <p className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">{session.price}</p>
                  <p className="mt-1 text-xs text-[#6e867a]">per tester</p>
                  <div className="mt-6 border-t border-[#edf0ec] pt-3">
                    <p className="text-[11px] leading-5 text-[#6e867a]">Tester earns</p>
                    <p className="text-base font-semibold text-[#268455]">{session.reward}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce5de] pt-5">
              <p className="max-w-sm text-xs leading-6 text-[#6e867a]">Pricing and rewards are provisional. Paid bookings and payouts are not enabled.</p>
              <button type="button" disabled className="min-h-10 cursor-not-allowed rounded-md border border-[#d3dfd5] bg-[#eff3ef] px-4 py-2 text-sm font-semibold text-[#728a7e]">Not live yet</button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.45fr)] lg:gap-16">
        <div>
          <h2 id="faq-heading" className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Before you<span className="block">share your build.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#617b70]">A few useful answers about how paid playtesting would work.</p>
        </div>
        <div className="min-w-0 border-t border-[#d6e1d9]">
          {questions.map((item, index) => (
            <details key={item.question} open={index < 2} className="group border-b border-[#d6e1d9]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-[#17372d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2ca273] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span aria-hidden="true" className="shrink-0 text-base font-normal text-[#57856b] group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden shrink-0 text-base font-normal text-[#57856b] group-open:inline">−</span>
              </summary>
              <p className="max-w-xl pb-5 pr-6 text-sm leading-7 text-[#617b70]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-[#dce5de] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-9">
          <div>
            <p className="text-base font-semibold">Free playtesting is already available.</p>
            <p className="mt-1 text-sm text-[#617b70]">Submit a game today or join the community as a tester.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/tester" className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#b9d4c1] px-4 py-2 text-sm font-semibold text-[#206442] hover:bg-[#eff7f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2ca273]">Find games to test</Link>
            <Link href="/submit" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#153c2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#235540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2ca273]">Submit a game</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

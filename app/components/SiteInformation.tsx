import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SupportEmail from "./SupportEmail";
import {LEGAL_REVIEW_DATE,LEGAL_VERSION,privacySections,termsSections} from "@/lib/site-information";

export default function SiteInformation({kind}:{kind:"terms"|"privacy"|"contact"}) {
  const contact=kind==="contact";
  const title=contact?"Contact/Support":kind==="terms"?"Terms of Use":"Privacy Notice";
  return <main className="min-h-screen bg-[#090b0a] text-zinc-100">
    <SiteHeader/>
    <article className="mx-auto max-w-3xl px-5 py-10 text-base leading-7 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      {!contact&&<><p className="mt-3 text-sm text-zinc-400">Version {LEGAL_VERSION} · Reviewed {LEGAL_REVIEW_DATE}. No effective date has been set.</p><aside className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-100"><strong>Draft — not final launch terms or a completed privacy notice.</strong> Operator identity/address, jurisdiction, minimum age and payment status require confirmation. Privacy bases, retention and provider arrangements also need operator review. This version does not record your acceptance.</aside></>}
      {contact?<>
        <p className="mt-5 text-zinc-300">Email Playtested for help with your account, a game or a review. This opens your email app; messages are not sent from this page.</p>
        <SupportEmail/>
        <h2 className="mt-8 text-xl font-semibold">What can we help with?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-300"><li>Technical problems or account access.</li><li>Feedback-review appeals and moderation decisions.</li><li>Privacy questions or account-deletion requests.</li><li>Game ownership, copyright or other intellectual-property concerns.</li><li>Suspicious game links, abusive content or unsafe behaviour.</li></ul>
        <h2 className="mt-8 text-xl font-semibold">What to include</h2>
        <p className="mt-3 text-zinc-300">Include the relevant game or report reference, a description of the problem and any steps that reproduce it. Redact private information from screenshots. Never send passwords, API keys, private access tokens or payment details.</p>
        <p className="mt-4 text-zinc-300">For an appeal, explain which decision you disagree with and why. For privacy requests, describe the information or account involved; we may need to confirm your identity through an appropriate channel.</p>
      </>:<>
        {(kind==="terms"?termsSections:privacySections).map(([heading,body])=><section key={heading} className="mt-8"><h2 className="text-xl font-semibold">{heading}</h2><p className="mt-3 whitespace-pre-line text-zinc-300">{body}</p></section>)}
        <section className="mt-8"><h2 className="text-xl font-semibold">Contact Playtested</h2><p className="mt-3 text-zinc-300">Use our <Link className="text-emerald-300 underline underline-offset-4" href="/contact">Contact/Support page</Link> for questions, requests or appeals.</p><SupportEmail/></section>
        {kind==="privacy"&&<p className="mt-6 text-sm text-zinc-400">Review reference: <a className="text-emerald-300 underline underline-offset-4" href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/">ICO guidance on privacy information</a> (checked 29 October 2026). Storage review: <a className="text-emerald-300 underline underline-offset-4" href="https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/">ICO guidance on cookies and other storage/access technologies</a> (checked 30 October 2026). UK complaints: <a className="text-emerald-300 underline underline-offset-4" href="https://ico.org.uk/make-a-complaint/">contact the ICO</a>.</p>}
      </>}
    </article>
  </main>;
}

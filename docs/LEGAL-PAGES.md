# Public information pages

Reviewed 29 October 2026. Draft version 0.1; no effective date or acceptance claim.

`/contact` uses the confirmed email in `lib/site-information.ts`. No form, email service or delivery promise was added. The shared root-layout footer follows the homepage's final “The idea” section and replaces old page footers.

`/terms` and `/privacy` are visibly labelled drafts and excluded from search indexing until finalised. Do not present them as launch-ready legal documents yet. Required confirmations:

- Legal operator/controller name, suitable public address and jurisdiction.
- Minimum user age; subscription and tester-payment operational status. Current developer-plan documentation describes manual entitlements, not billing.
- Privacy lawful bases and any legitimate-interest assessment; actual hosting/provider regions, agreements and transfer safeguards.
- Retention/deletion criteria and procedures for accounts, feedback, moderation, support, logs and backups. The implemented 90-day reporting window is not a universal deletion policy.
- Confirm public/private field visibility and external recipients against the launch configuration. Independent report access is distinct from public reception summaries.

Signup currently calls Supabase signUp with email, password and role metadata. No versioned acceptance is recorded. A final terms acceptance change would need a deliberate choice about wording, version/timestamp evidence and existing users; no checkbox, migration or forced consent was added. A privacy notice is information, not blanket consent to every processing purpose.

Before release: confirm the above, review the draft, set a genuine effective date/version, decide how material changes are communicated and whether acceptance evidence is required, then remove the draft banners/noindex only when appropriate. Do not infer existing user acceptance.

Bounded guidance checked: [ICO: information a privacy notice must provide](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/). Generated drafting does not guarantee legal compliance. No database, deployment, notification or email-delivery changes were made.

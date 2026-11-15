# Merge 26 — ranks-only public attribution implementation contract
**Owner decision:** 5 November 2026
**Status:** Required code changes, NOT implemented or verified by this document.

## Acceptance criteria
1. Eligible **accepted and publicly visible** feedback may display the tester's **current rank**. No public permanent tester number, stable tester label, private tester UUID, email, handle, identity/profile URL or other deterministic cross-game identifier may be returned or rendered.
2. Pending, rejected, private and otherwise non-public feedback must not leak rank or tester identity to unauthorised viewers. Authorised owner/developer/admin workflows retain their existing private moderation/feedback permissions.
3. Rank must come from the canonical server-side current-rank calculation, not client-supplied data. Rank may change over time; UI and privacy notice say **current rank**, not rank earned when feedback was submitted.
4. Public rank is a property of the **feedback presentation**, not a public tester profile or directory. Do not create a rank-based lookup endpoint or cross-game tester-history route.
5. Do not rely on hiding a number in the browser. Public RPCs, API JSON, server components, cache responses, exports, metadata, accessibility labels and rendered HTML must omit the public number and private identity.
6. Preserve internal UUIDs, ownership, reports, moderation decisions, XP, eligibility, historical audit and account deletion guards. No bulk data deletion or irreversible identity recycling.
7. Stop **allocating** public tester numbers for new users. Existing tester_public_identities data (if present in development) must not be made publicly accessible. For production, prefer removing the public-number schema/RPC usage from pending migration files before first application; if retaining a private mapping for compatibility, justify its necessity and ensure no allocation/public exposure.
8. An authorised administrator's rights restriction must suppress **public rank** everywhere it is exposed, without altering XP or the report. The restriction/minimisation workflow must remain audited and protected by RLS/permissions. A rights request must not be represented as full erasure.
9. Existing testers must receive accurate notice before historical accepted feedback begins showing rank. The operator must decide notice/objection arrangements and record approval before launch.
10. Update all privacy notices, Terms references, feature descriptions, tests and release notes that promise permanent numbers, public identity or stable cross-game recognition.

## Code/database impact
- Inspect and revise migration **108** (tester_public_identities), **111** (private rank helpers), **123** (approved identity resolver) and **124** (attribution restrictions), and any functions in **107/109** that refer to tester identity. Confirm ordering and dependencies of all 25 migrations after changes.
- Search Merge 26 application routes, server functions, UI components, types and tests for `tester_number`, `public_number`, `tester_public_identities`, `get_feedback_tester_identities`, `_share_key`, `set_tester_privacy_restriction` and any rank/identity presentation paths. Do not assume these are the only names.
- Public resolver output should be scoped to **report ID + current rank** where authorised, not tester ID or number. If keeping a legacy function name, ensure it cannot leak identifiers and revise clients/types accordingly; prefer an accurately named rank-only resolver.
- Verify unauthenticated and authenticated clients cannot SELECT private identity/restriction tables or execute privileged helpers. Confirm direct RPC probing cannot obtain a rank for arbitrary tester UUIDs.
- Update developer and tester views, mobile layout and 150% browser zoom; no blank 'Tester #...' placeholder or inaccessible labels.
- Ensure no analytics or attribution endpoint reintroduces stable public tester identity.

## Mandatory tests before merging
- Public accepted feedback: current rank present, no number/UUID/email/handle/profile link in HTML, API or RPC output.
- Pending/rejected feedback: no public rank or identity disclosure.
- Two accepted reports from same tester: no stable public correlator other than potentially coincidental rank; no public history endpoint.
- Rank changes: displayed rank updates from canonical calculation; no stale cached identifier.
- Restriction: admin suppresses public rank, while XP and report remain unchanged; non-admin cannot invoke or bypass restriction.
- Private owner/developer/admin moderation still works and preserves authorisation boundaries.
- Regression: catalogue, claims, 48h reservations, availability alerts, optional analytics/Steam referrals, account rights and existing test suites.
- Production migration dry run on a disposable/restored database and reviewed rollback/recovery plan. Do not merge while tests or privacy notice remain incomplete.

## DPIA/LIA update
Permanent public numbers are **rejected**, so their necessity/balancing test is no longer applicable to the approved product. Rank-only display still needs a documented basis, proportionality, transparency and rights handling. Public feedback free text can identify a tester despite omission of a number. Complete the outstanding controller identity, notice, retention, provider/transfer, age/legacy and operator sign-offs from `docs/MERGE-26-OWNER-PRIVACY-DECISIONS.md` and `docs/MERGE-26-DPIA-AND-LIA.md`.

**Release status:** HOLD until implementation, tests and accountable privacy approval are completed.

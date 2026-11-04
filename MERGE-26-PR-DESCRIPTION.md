# Merge 26 — Catalogue Improvements, Tester Identity, Analytics, Availability Alerts & UX

## Summary

Improve developer discovery/management and add stable rank-aware tester feedback, restricted tester analytics and optional place-availability bell alerts. Preserve existing report history, moderation, XP, one-active-test/capacity enforcement and privacy-first tracking/media behaviour.

## User-facing changes

- Featured ranks accepted developer-game scores across the full filtered catalogue before pagination, including claimed Steam games without duplicate cards.
- Confirmed-save toasts/top navigation; safe owner archive/restore and eligible unreviewed deletion; explicit admin-only Test/Demo exclusion from public discovery and genuine metrics.
- Correct review activity ordering, preserved disclosure reassessments and exact owner feedback/build notification links.
- Integrated visitor/acquisition and Tester Analytics panels with clear session, source, current-rank and review-rate definitions.
- Stable pseudonymous tester numbers with current-rank public/admin presentation and graceful missing-profile fallback.
- Opt-in/out full-game availability alerts, release/expiry/capacity events and first-come claim navigation; no automatic reservation, marketing or email.
- Shared accessible disclosure controls, retained form/view state, keyboard/reduced-motion/mobile/150% behaviour.

## Technical implementation

Reuse existing catalogue/reservation/notification infrastructure. Add restricted identity and waiting/state tables, database uniqueness, report-scoped batched ranks, admin HTTP guards plus service-only aggregates, canonical rank reuse, locked event epochs/durable suppression and server-time scheduled processing. Private UUID rank probing is denied. No new app infrastructure or paid service.

## Database and operations

Apply reviewed Merge 26 versions **202611040101 through 202611040112 in exact file order**, as listed with purposes and status in [release notes](MERGE-26-RELEASE-NOTES.md). All are applied only to development; **none is applied to production**. Verify existing schema/function prerequisites before a later authorised production application; preserve Free/Pro configuration and testing capacity and never copy development seeds.

Development's existing pg_cron minute job is active with a successful observed run. Production requires separate authorised scheduling/monitoring of `process_tester_availability()`. No new application environment variables. Preserve production secrets, users, submissions, reports and storage. Do not reset tester identity sequences during rollback/recovery.

## GDPR/privacy considerations

Public numbers are persistent pseudonymous personal data, not anonymity, and permit cross-game correlation. Private mapping/recipient RLS, minimal public fields, moderation gating, consent/refusal/withdrawal and synthetic exclusions are tested. Proposed 30-day requests and 90-day new availability alerts require approval before production; older genuine history is preserved. Lawful bases/LIA, DPIA screening, final notices, processor/transfer arrangements and rights/retention procedures require human decisions in [privacy review](MERGE-26-PRIVACY-REVIEW.md). Technical tests do not establish legal compliance.

## Tests and evidence

[Complete test catalogue](MERGE-26-TEST-PLAN.md): **95 cases; 67 automated criteria passed, 0 failed, 28 manual cases pending**. **20 executed suites/checks passed**, including TypeScript/build, actual SQL/security, XP/moderation, real PostgreSQL concurrency and targeted development browser checks. [Executed evidence](docs/MERGE-26-AUTOMATED-RESULTS.json). No new lint error-rule counts; existing baseline debt remains. No unrelated broad legacy suite was rerun.

## Manual acceptance and known risks

Owner must complete the ordered localhost walkthrough and record manual accessibility, multi-role workflows and privacy observations. Production's historic zero analytics and specific Neon Dodge state were deliberately not queried. Session figures are not people; historical rank is not reconstructed; unknown acquisition/registration attribution is not invented. Scheduler absence delays expiry alerts/cleanup. Existing account-deletion/retention and currently draft legal notices need owner/legal approval. Backup/production-schema/operational gates have not been completed by this development-only run.

## Deployment requirements and authorisation

Before any future release: owner localhost/privacy approval, fresh verified production recovery protection, current production schema/migration preflight, reviewed rollback plan, scheduler/environment approval and explicit final owner authorisation. After an authorised release, perform non-destructive production smoke checks.

**Production deployment is not authorised. Do not merge into `v11`, apply production migrations or deploy Render on the basis of this PR description. This candidate is not marked approved or production-safe.**


## PC and 48-hour continuation checkpoint

Development migrations 113?115 add owner-private optional account PC details, canonical optional minimum/recommended game requirements, 48-hour deadlines for new reservations, and transactional owner approval notifications. Already-issued deadlines and other policy values were preserved (one active development reservation verified). No production operation occurred. Account and listing UI preserve optional fields, use atomic save RPCs and show manual comparison without compatibility claims or device inspection. Steam importer does not currently supply structured requirements; no invented mapping was added.

Executed: PC validation/RLS/atomic rollback tests and real development browser account/create/edit/private comparison/clear/mobile/150% tests passed; 48-hour boundary/preservation, availability, approval dedupe/RLS/rollback and notification bell browser tests passed. Bell persistence is transactional; closed visible bells refresh every 15 seconds or on focus, not push-instantly. Hidden tabs do not poll. Full owner manual acceptance remains pending. The feedback-history/referrals follow-up begins after this checkpoint; final combined documentation and build will follow.

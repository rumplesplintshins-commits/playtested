# Merge 26 — release candidate for localhost acceptance

**Status:** implemented and tested in development; owner manual acceptance and privacy/operational release approvals remain outstanding. **Production deployment is not authorised.** Branch: `feature/merge-26`, production baseline `b7d8617`, earlier protected checkpoint `b0f8b19`.

## Executive summary

Merge 26 helps developers manage their listings and find the right feedback, gives testers recognisable pseudonymous feedback labels and optional place-availability alerts, and gives administrators clearer review ordering and aggregate participation statistics. Catalogue ranking now follows accepted developer-game scores rather than older verification/confidence tiers. Archive and explicit Test/Demo controls separate public discovery from private management without discarding history.

The release also protects trust: public tester numbers do not expose account mappings, admin analytics remains private, waiting lists are recipient-scoped, and existing moderation, XP, consent, capacity and one-active-test rules continue to govern access. Stable numbers can still connect public contributions across games, so this is not anonymity; publishing them requires the owner’s transparency/lawful-basis decisions.

## Complete feature breakdown

| Feature / previous problem | Implemented behaviour and technical change | Security/privacy and evidence | Dependencies |
|---|---|---|---|
| Featured catalogue did not follow the agreed score priorities | Server ranks the complete filtered set before pagination: accepted average >=6 developer games descending, unrated developer games newest, below-6 developer games descending, then generic imports. Claimed imports use a restricted public identity RPC rather than private relationship RLS; duplicate Steam entries are removed | Accepted evidence only; deterministic ties and existing primary sorts/filters; no title heuristics for demo classification. Core SQL tests cover 5.9/6, search, pagination, claims and alternate sorts | 101, 102, 107 |
| Developer saves were easy to miss | Listing/correction, contact, gameplay and screenshot management reuse the fixed accessible toast only after confirmed success, then scroll to navigation. Reduced motion uses instant positioning; failure retains edits/position | No false successful-save message; incomplete resubmissions are described as needing information. Existing consent/media architecture retained. Security and earlier-browser tests | Frontend; existing Merge 24 APIs |
| Developers could not safely remove listings | Explicit title-confirmed archive/unpublish and restore hide public discovery/new testing while keeping private game/build history. Only an unapproved, dependency-free, unmoderated submission may hard-delete | Server ownership, RLS/private tables and dependency checks protect campaigns/reports/claims/audit. Private approved aliases and linked owners remain manageable. Screenshot cleanup uses the existing private queue, not a new timed-delete promise | 101, 105, 106 |
| Internal QA games could distort discovery and reporting | Admin-only explicit Test/Demo flag excludes public catalogue/search/counts, public media/profiles, ratings, public shares, ordinary tester discovery and genuine acquisition. Authorised private management/testing continues | No automatic flagging of admin-owned games or production reclassification. Explicit synthetic-account metadata is trusted-server-owned. Core and development browser tests | 101, 103, 104, 106 |
| Review lists used the wrong activity date | Full loaded result set sorts by real review/submission/resubmission events, retaining action priority, search/selection and deterministic IDs; no assumed `updated_at` | Decision reasons and genuine reassessments remain audited. Fresh assessment plus explicit confirmation is required; completed work leaves the queue. No existing Neon Dodge reassessment was cleared or production record inspected | 103, 106; existing listing revision migrations |
| Developer feedback alerts needed precise destinations | Existing accepted-only, owner-only notification generation and durable suppression are retained. Links select campaign/build and tolerate collapsed duplicate relationship IDs | No claim/start/incomplete feedback notification, unrelated developer recipient or email added. Notification, workspace, build-selection and browser tests | 103; existing notification ledger |
| Visitor/acquisition link was detached and figures were ambiguous | Integrated lazy Analytics & acquisition summary and full report distinguish consenting tab sessions, record counts, current Approved status, distinct owners, captured labels and voluntary discovery. Unknown remains explicit; archived genuine history remains | Default-off tracking, refusal/withdrawal, DNT/GPC/bot/monitor filtering, verified-admin omission and trusted origins preserved. No guessed backfill or registration funnel. Real development event pipeline tested | 103, 104, 107; existing analytics retention |
| Generic tester labels were unstable between games | Unique database-sequence public numbers allocated once and safely backfilled; current Bronze/Silver/Gold/Platinum rank uses the existing canonical XP/report policy. Public and developer accepted feedback displays stable rank-aware labels; admin keeps its internal identifier plus explicitly current rank | Mapping table is private; bulk report-scoped RPC returns no account UUID/email. Current ranks are not historical reconstructions. Missing/deleted profiles have a fallback; hard-deleted auth mapping becomes a non-reassigned tombstone. Direct UUID rank probing is denied. Identity, label browser and real concurrency tests | 108, 111 |
| Administrators lacked a tester participation view | Integrated lazy Tester Analytics: registered/current population, distinct active submitters over 30 days, completed reports, review decisions, valid recorded hours and acceptance rate; visual/current-rank table includes empty tiers and unavailable profiles | Admin HTTP guard plus service-only RPC, server aggregation without join multiplication, explicit synthetic/demo exclusion, no public leaderboard or new individual scoring. Analytics SQL and hosted API/browser reconciliation tests | 109 |
| Full campaigns had no availability preference | Eligible testers can request/cancel bell alerts. Manual release, actual expiry and capacity increase produce one advisory alert per eligible recipient/event. Claiming cancels that campaign’s request; alerts do not reserve a place | Own-only preferences, explicit boolean opt-in, no marketing/email, no claimant identity in payload, atomic existing capacity/one-active locks, event epoch and durable suppression, 30-day request/90-day new-alert cleanup. SQL, Docker races and real synthetic browser flow tested | 110, 112; minute scheduler |
| Disclosure controls were inconsistent or lost state | Shared square + / green expanded diamond control, native keyboard details, explicit ARIA relationships/focus and reduced-motion styling across useful admin/developer/Tester Hub sections. Catalogue/results stay mounted after opening, preserving unsaved/view state; thumbnail navigation remains | No indiscriminate new collapsible sections or adjacent action activation. Label/disclosure and real admin/tester browser tests at mobile/simulated 150% | Frontend `DisclosureControl`, `CompactDetails`, existing workspace state |

No developer feedback analytics, AI summaries, automated issue extraction, paid reporting, video hosting or new paid infrastructure was introduced.

## Metric definitions and limitations

- **Registered testers:** current profiles with `tester` in roles, joined to non-anonymous/non-deleted Auth accounts, excluding accounts explicitly marked `is_synthetic: true` in trusted app metadata. Game flags exclude report activity, not an otherwise genuine person’s population membership.
- **Active 30 days:** distinct non-null tester IDs on completed reports submitted within the trailing 30 days, excluding future timestamps. This historical window can include someone no longer in today’s population; it is not a registration count.
- **Completed:** report status `submitted` or `reviewed`, not a claim/release. Reviewed accepted/rejected outcomes are decided; everything else in that completed cohort is pending. Explicit moderator replacements remain historical reports in these metrics; capacity may be restored only through the existing exceptional replacement workflow. Ordinary completion/rejection does not free capacity.
- **Acceptance:** accepted divided by accepted plus rejected; pending excluded; no decisions displays unavailable, not a fabricated percentage. This differs from XP/feedback-quality percentages.
- **Duration:** each completed report counted once; non-negative finite recorded hours summed, missing/invalid values omitted from duration averages. These are self-recorded hours, not independently measured playtime.
- **Ranks:** current canonical rank, not rank at submission. Historical rank was not reliably stored and is not reconstructed. Missing profiles retain aggregate historical counts in an unavailable bucket.
- **Acquisition:** submission records created in the trailing 30 days and their current approval status, not approvals performed in that period. Captured UTM/referral labels are not verified identities. Voluntary discovery answers do not establish a captured source. No registration attribution is collected.
- **Visitor counts:** consenting tab sessions, not verified unique people. Development initially had four visitor events; its consent-to-storage-to-report pipeline passed. Production zero figures and its specific Neon Dodge record were deliberately not re-queried.

## Database and operational changes

All Merge 26 migrations below were applied **only to development `ktifgybnkdaotdxrvjgq`**, in this order. **None was applied to production.** Existing Free/Pro policies, production testing capacity and live data were not copied, seeded or changed.

| Order | Versioned migration | Purpose | Development | Production |
|---:|---|---|---|---|
| 1 | `202611040101_merge26_listing_controls.sql` | Private visibility/control audit, safe owner lifecycle RPCs, public exclusion | Applied | No |
| 2 | `202611040102_merge26_catalogue.sql` | Complete-dataset Featured tiers | Applied | No |
| 3 | `202611040103_merge26_reporting.sql` | Review activity, reporting, private admin testing and feedback build links | Applied | No |
| 4 | `202611040104_merge26_historical_acquisition.sql` | Retain archived genuine acquisition history | Applied | No |
| 5 | `202611040105_merge26_control_audit_retention.sql` | Nullable audit actors on hard Auth deletion | Applied | No |
| 6 | `202611040106_merge26_private_listing_management.sql` | Private approved aliases, linked-owner management and reassessment | Applied | No |
| 7 | `202611040107_merge26_public_claim_ranking.sql` | Public claim recognition without exposing private relationship rows | Applied | No |
| 8 | `202611040108_merge26_tester_identity.sql` | Private stable number allocation/backfill and scoped bulk current ranks | Applied | No |
| 9 | `202611040109_merge26_tester_analytics.sql` | Service-only tester aggregate | Applied | No |
| 10 | `202611040110_merge26_availability_notifications.sql` | Preferences, event epochs, private bell and expiry/retention processor | Applied | No |
| 11 | `202611040111_merge26_private_rank_helpers.sql` | Deny private UUID rank probing; preserve authorised wrappers | Applied | No |
| 12 | `202611040112_merge26_explicit_availability_choice.sql` | Reject null/missing choice instead of treating it as opt-in | Applied | No |

Development had no existing `supabase_migrations.schema_migrations` history table. Explicit development-target SQL application and function/grant checks were used; do not blindly replay already-applied files. For a future production release, first review actual schema/dependencies and migration history with separately authorised read-only checks. Guarded definition edits fail closed when prerequisites differ. Base Merge 24 functions/views, notification ledger and reservation policy must already exist. Do not substitute development seeds or reset an existing database.

**Scheduler:** existing development `pg_cron` job `merge26-tester-availability`, `* * * * *`, runs `select public.process_tester_availability();`. Read-only postflight verified active and latest run **succeeded**. Configuration source: `supabase/development/merge26-availability-scheduler.sql`, which is development-only and not an automatically applied production migration. Production needs a separately approved equivalent schedule, owner/execute privileges, job-run monitoring and retry/alert ownership. Deadlines/capacity remain server-enforced without it, but expiry alerts and new preference/alert cleanup require the job. Event handlers cover immediate release/capacity changes.

**Environment/infrastructure:** no new application environment variables, Render service, paid dependency or hosting service. Existing production secrets must be preserved. Test-only optional path overrides are `M26_SUPABASE_CLI` and `REHEARSAL_DOCKER`; local credential fixtures and `.env.local` remain ignored. The isolated local PostgreSQL container is a concurrency test, **not** a production backup/restore rehearsal.

**Backfill:** stable numbers are allocated to current tester profiles and profiles with historical test records, in deterministic migration order, with database uniqueness and no email-derived/private-UUID encoding. New tester role assignment triggers allocation. Do not reset sequences or reallocate numbers after public use. Test/Demo designations are not automatically backfilled. Synthetic account metadata must be set only by a trusted operator for genuinely synthetic accounts.

## Privacy and legal status

See [MERGE-26-PRIVACY-REVIEW.md](MERGE-26-PRIVACY-REVIEW.md) for the processing inventory, proposed lawful bases, PECR assessment, access controls, retention, DPIA screening and proposed notice text. Stable public numbers allow cross-game correlation and remain pseudonymous personal data. The current legal pages are still identified as drafts; technical checks do not approve lawful bases, LIA/DPIA decisions, processor/transfer arrangements, controller details or an effective date.

Before production, approve public attribution and transition information for existing testers, proposed service/admin/audit bases, retention and rights-handling procedures, 30-day waiting/90-day new availability alerts, processor/transfer/log arrangements, and final notice wording. Existing genuine report history is preserved rather than silently erased. Hard Auth deletion nulls new mappings/actors; soft deletion or a deletion request alone is not proof of complete erasure. There is no new automated public leaderboard or covert analytics exemption.

## Testing and evidence

[MERGE-26-TEST-PLAN.md](MERGE-26-TEST-PLAN.md) contains **95 cases: 67 automated criteria passed, 0 failed, 28 owner-manual cases Not Run, 0 blocked automated cases**, mapped to **20 executed suites/checks, all passing**. This distinguishes acceptance criteria from raw assertion counts and distinguishes browser automation from owner manual acceptance.

Evidence: [sanitised executed suite results](docs/MERGE-26-AUTOMATED-RESULTS.json), [case totals](docs/MERGE-26-TEST-SUMMARY.json), and local logs/screenshots under `technical-test-results/m26-final/`. TypeScript, final build, targeted lint comparison, real PostgreSQL races, disposable SQL, real development browser/API checks and existing graded XP/moderation regression tests ran. New code has no new lint error-rule counts against `b7d8617`; 15 existing errors remain in the 31 changed TypeScript files checked, within the previously accepted wider baseline debt. Unrelated broad legacy tests were not rerun.

## Rollback and recovery considerations

**High-priority operational/privacy gate:** the existing Auth-to-report cascade, protected submitted-report guard and review-event references require an approved erasure/de-identification procedure. This release deliberately does not rewrite genuine feedback retention. The new mapping/audit deletion tests do not certify end-to-end account erasure; see the privacy review. This and public-attribution notice/basis approval are unresolved release gates, not resolved security claims.

1. Before a future production write, obtain/verify a fresh recoverable backup and document storage protection and a recovery owner; none was taken or validated by this development-only release. Separate production restore readiness remains an owner release decision.
2. Prefer an authorised code rollback/roll-forward that retains additive tables and history. Do not drop feedback, reset IDs/sequences, reassign public numbers, cascade-delete genuine dependencies or replace production plans/capacity with seeds.
3. If alert processing must be suspended, an authorised operator can disable **only this named job** and the optional feature path; preserve preferences, epochs and notification ledger while investigating. Re-enable processing and verify one-event suppression after recovery. Do not delete a genuine audit trail to hide a failure.
4. Old frontend rank access uses the still-authorised developer wrapper; canonical direct rank helper is private. Any DB rollback touching grants/functions must be reviewed against both versions. Do not broadly grant private helpers to make a rollback appear healthy.
5. Reverting persistent identity publication cannot retract what visitors already saw. Erasure/restriction and notice obligations require an operator decision, not a blind migration reversal. Retain stable allocations if restoring from backup.

## Release checklist — approval gates still apply

- [x] Intended work protected in logical commits on `feature/merge-26`; existing untracked schema dump/temp files excluded.
- [x] Development migrations applied and focused evidence recorded; development scheduler verified active/succeeded.
- [x] TypeScript/build and relevant security, SQL, XP, concurrency and browser checks passed; baseline lint distinguished.
- [ ] Owner completes the 28 manual localhost cases/acceptance walkthrough and records observations.
- [ ] Owner/legal approves public identities, bases/LIA/DPIA screening, notices, retention, rights procedure, processor/transfer assessment and effective date.
- [ ] Separately authorised current production schema/dependency comparison and exact migration preflight; preserve all existing users/data/configuration.
- [ ] Fresh production database/storage recovery protection verified; restore/rollback responsibility and accepted risks recorded.
- [ ] Production environment and existing Render integration/branch confirmed; no development seeds or secret changes.
- [ ] Production scheduler authorised/configured and monitored; expiry/retention processing verified without waiting 72 hours using safe controlled checks.
- [ ] Final owner authorisation for production migrations, deployment branch merge and Render release.
- [ ] After an authorised release, essential non-destructive production smoke tests: auth, existing catalogue/submissions, private admin/owner access, media, ranks, aggregates, consent and bell/capacity rules. No unnecessary real test data.

**Recommendation:** GO for owner localhost acceptance; **NO-GO for production now** because manual, privacy and production operational approval gates remain. No critical/high technical failure was observed in executed checks; untested manual outcomes are not claimed as passes.


## PC and 48-hour continuation checkpoint

Development migrations 113?115 add owner-private optional account PC details, canonical optional minimum/recommended game requirements, 48-hour deadlines for new reservations, and transactional owner approval notifications. Already-issued deadlines and other policy values were preserved (one active development reservation verified). No production operation occurred. Account and listing UI preserve optional fields, use atomic save RPCs and show manual comparison without compatibility claims or device inspection. Steam importer does not currently supply structured requirements; no invented mapping was added.

Executed: PC validation/RLS/atomic rollback tests and real development browser account/create/edit/private comparison/clear/mobile/150% tests passed; 48-hour boundary/preservation, availability, approval dedupe/RLS/rollback and notification bell browser tests passed. Bell persistence is transactional; closed visible bells refresh every 15 seconds or on focus, not push-instantly. Hidden tabs do not poll. Full owner manual acceptance remains pending. The feedback-history/referrals follow-up begins after this checkpoint; final combined documentation and build will follow.

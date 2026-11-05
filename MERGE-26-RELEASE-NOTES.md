## OS dropdown and Account hardware header follow-up

Started from e4b21f8 on feature/merge-26. OS was rendered as a text input with datalist autocomplete suggestions rather than a real selection control. Replaced that wiring with shared OperatingSystemSelect, a controlled native select bound to the existing os field. Windows 10, Windows 11, Linux, macOS, Other and optional blank are supported. Unrecognised saved strings get a retained saved-value option; no bulk conversion, schema migration or hardware-data rewrite. The browser manages popup keyboard/focus/positioning rather than a custom clipped overlay. CPU/GPU selectors and canonical ID logic are unchanged.

Account now matches the existing minimum/recommended disclosure pattern: compact bold green TESTER HARDWARE eyebrow and white My PC specifications title. The existing supporting sentence, privacy/no-detection guidance, expand/collapse, fields and Save/Clear behaviour remain.

Executed seven focused checks: OS browser, hardware regression, PC SQL/privacy, real development PC browser, TypeScript, targeted lint and final production build - all Passed. Real development coverage saves/reloads Account Windows11, minimum Linux/recommended macOS and an Other submission, restores original QA requirements and removes only the test's own temporary account/submission. Local browser coverage includes unknown legacy persistence, all five values, keyboard Enter/Escape/focus, disclosure retention, unchanged CPU/GPU IDs, desktop/mobile and 100/125/150 percent CSS zoom. The test fixture waits for hydration/storage loading before interaction; this is not a simulated production data change.

Targeted lint: 58 changed TS files, no new error-rule counts versus b7d8617; 22 baseline errors remain. Combined retained evidence now has 35 passed suite/check results, with 189 passed formal automated criteria and 39 broader manual cases pending. Unchanged earlier checks are retained, not all rerun.

Manual OS-M01 remains pending: Account and Submit/Edit using mouse and keyboard in the owner's browser, actual toolbar zoom 100/125/150 percent, mobile/native popup placement and screen-reader announcement. Restore only your own QA OS values after testing. CSS zoom/headless Chromium evidence is not a claim of owner manual or cross-browser acceptance. No database migration is required. No production, v11, Render or environment-secret changes; existing dump/temp files remain excluded.

---

## Final acceptance fixes - 5 November 2026

Implementation checkpoint: eba4725. Continued from actual HEAD 2baab20, preserving the intervening locked-option, PC styling and XP-card commits. The owner's latest brief explicitly passes feedback approval/rejection/XP and approval-notification generation; these systems were not reset or rewritten. See docs/MERGE-26-OWNER-ACCEPTANCE.md for the preserved owner ledger and **MERGE 26 — REMAINING LOCALHOST ACCEPTANCE WALKTHROUGH**. Formal pending cases can cover broader steps than the owner's reported component passes.

Implemented:

- Existing notification hrefs remain unchanged. Workspace URL/popstate handling now initiates feedback reveal/scroll; requested campaign selects Individual responses and follows Back/Forward. Actual owner bell click, direct URL and ordinary-user privacy denial passed against the named QA reports, restoring the exact original notification read state afterward. Full report answers still use the existing disclosure.
- Artwork root cause: a lazy img can initially be complete with zero naturalWidth before a request/currentSrc exists. The premature-failure check now requires an actual currentSrc. Both real QA JPEGs loaded with positive naturalWidth. Private own-history metadata also follows the same source game's published image override; submitted/approved/imported, missing/failed/archived paths retain safe scope. No invented image or public archive exposure.
- XP cards retain the existing redesign, add deterministic newest-first event ordering, and show Not recorded for a missing historical XP award instead of inventing zero. Real accepted/rejected reasons/counts/outcomes/XP were verified unchanged; disposable quality tests cover partial awards, reconsideration and reversals.
- Admin Review displays a compact DEV QA badge only for an explicit line-leading [DEV QA] marker in feedback content, with a negative test for ordinary mid-sentence references. Rubric errors now offer Retry rubric and describe access/configuration rather than prescribing blind replay of migration 013. Current authenticated admin rubric/queue passed; the owner's earlier successful moderation resolves that historical blocker.
- A shared searchable CPU/GPU catalogue stores stable canonical model IDs in existing optional fields. Alias matching is unambiguous and type-separated; unknown legacy values remain custom, and Other / Not listed is bounded/explicit. All editable Account/minimum/recommended/listing forms share the same selector; displays resolve labels. No bulk hardware-data rewrite, new table, runtime third-party lookup, device detection or compatibility/performance inference. See docs/HARDWARE-CATALOGUE.md.
- Development configuration exposed two mismatches: testing_policy default was four places; developer_plan_policy already allowed five Pro launches but this checkout's parser still required fifteen. New campaigns now use the authoritative three-place policy and the parser accepts the owner-approved Free1/Pro5/48-hour-gap contract. Existing campaign capacities/history and entitlement-based targeting rules remain. Current locked labels/grandfathering were preserved and server-bypass/paid-state tests passed.
- The specified QA campaign was saved at four and its freeze trigger intentionally ignored an ordinary UPDATE. A separate development-only maintenance script locked the table/campaign, checked the exact owner/QA markers/two occupied slots, suspended only the capacity-freeze trigger within the transaction, corrected that single row to three and restored/verified the trigger. Other campaigns, reports, XP, notifications and audits were untouched. Disposable tests prove idempotency, refusal above occupied capacity and rollback/restoration. The initial no-op was caught by postflight and fixed before completion; it is not represented as an earlier pass.

Evidence: **34 check results Passed, 0 Failed**, with unaffected prior results retained rather than rerunning everything. Formal catalogue: **221 cases; 183 automated criteria Passed; 38 broader manual cases pending**. Owner-reported passes are recorded separately, not erased or inferred from automation. TypeScript and final production build passed. Targeted lint covers 57 changed TS files with no new error-rule counts against b7d8617; 22 baseline errors remain within those files. CSS150%/390px automation passed; actual toolbar zoom/screen-reader and owner-specific remaining cases still require observation.

Development migrations applied in order: 202611050120_merge26_history_published_artwork.sql; 202611050121_merge26_new_campaign_capacity.sql; 202611050122_merge26_pro_launch_contract.sql. Migration121 handles the known historical fixed-four CHECK, preserves the existing reviewed 1..50 bound, sets default three and changes only the singleton default policy; saved targets are not backfilled. Migration122 preserves launch history/gaps/windows/flags and is a no-op where Pro is already five. The QA-only scripts/merge26-qa-capacity-correction.sql is NOT a production migration or report-deletion script. Both named QA reports remain necessary for future acceptance and are retained.

Ready for **final development acceptance testing**, not production release. No production access/write/migration, v11 merge, Render deployment or production PR. Privacy decisions, manual retests and separately authorised production schema/backup/migration/deployment work remain gates.

---

# Merge 26 - final development release additions
Final validation: **29 suite/check results Passed, 0 Failed**. Affected suites were rerun; prior passed unchanged scopes were retained rather than repeated. Catalogue: **198 cases; 160 automated criteria Passed; 38 manual/owner cases Not Run; 0 blocked automated cases**. TypeScript and final production build passed. Targeted lint checked 53 changed TypeScript files with no new error-rule counts against b7d8617; 22 existing errors remain in changed files (not a clean broad-lint claim). Mobile/CSS-150% browser automation passed; actual toolbar zoom/screen-reader and full hosted Steam manual walkthrough remain pending. Development postflight confirms 48-hour policy, private grants, stable identities and active availability/retention scheduling. No production access.


Implemented additions:

- Optional owner-private Account PC specifications, shared optional minimum/recommended game fields, canonical storage and atomic submission/edit RPCs. Public game requirements and private account comparison remain separate; no device inspection or compatibility certification. Existing Steam importer has no structured requirements mapping; none was invented.
- New reservations use server-issued 48-hour deadlines. During actual development cutover one issued deadline and all unrelated policy fields were verified unchanged. Expiry preserves drafts and one-active/capacity rules.
- Acceptance writes exactly one current-owner notification transactionally. Existing closed bell refreshes on visible-tab 15-second polling/focus/open, not an instantaneous push guarantee; hidden tabs do not poll.
- Admin reviewed reports and Testing Activity share useful / not useful / not-yet-rated badges from community_game_tests.feedback_usefulness. Nothing new controls XP, admin scoring, rank or moderation.
- Compact Testing Activity headers show genuine thumbnail/developer/title/status with image fallback, while existing submitted timestamp, quality/XP, feedback disclosure, review history and reconsideration remain. Private own-report media lookup resolves archived raw source metadata without changing public listing access. Missing/deleted data is not fabricated.
- Validated direct new-tab storefront links: Steam, creator itch.io, GOG, Epic Games and Humble Store. Only the activity Steam control records a qualifying event. No title-generated URLs or analytics redirect.
- Identity-free Steam click events use server-resolved source game UUID/type, tester_activity, per-click retry UUID and server time. No report/account/session/IP/user-agent/hardware fields are retained. Different deliberate activations count separately; a repeated event UUID is ignored.
- Referral recording requires renewed explicit optional analytics permission for the new purpose; older general Allow does not silently enable it. Decline, withdrawal, expiry, DNT/GPC and service failure do not disable navigation. Server checks origin, current authentication, non-admin tester role and ownership of the historical report.
- Admin-only Steam referrals on both admin screens aggregate retained last-90-day events server-side. KPIs remain independent of Top 10/25/50/All. All fetches bounded 100-game aggregate pages and uses a scrollable list; ties use stable kind and UUID. No raw event/person lists reach browsers.
- A final PC authorization edge case was corrected in versioned migration 117: anonymous NULL auth cannot pass the closed/private campaign requirement guard. Public approved-source checks remain.

Development migrations 113-119 are applied and postflight-verified. See the release notes for exact order and rollback considerations. Earlier 101-112 migrations remain preserved. Production requires separate review/backup/owner approval, notice/retention decisions and deployment authorization.

Final automated evidence and the complete case catalogue are in docs/MERGE-26-AUTOMATED-RESULTS.json and MERGE-26-TEST-PLAN.md. Results include actual hosted development authorization/PC workflows, disposable database tests and mocked browser boundary fixtures, explicitly distinguished. Manual owner acceptance remains pending; passing tests do not establish legal compliance.

---


## Exact additional migration order and verification

After preserved migrations 101-112, apply only after an independently approved future production-schema comparison:

1. 202611040113_merge26_pc_specifications.sql - private account table/RLS, canonical game requirements, validated atomic creation/edit wrappers and safe bulk read. Verify owner save/clear, cross-account/public denial and public approved game fields.
2. 202611040114_merge26_48_hour_reservations.sql - change only new-reservation policy default/window and named constraint. Capture issued deadlines and every policy field first; verify all existing timestamps and other fields are unchanged. Abort on an unexpected existing policy rather than overwriting production configuration.
3. 202611040115_merge26_immediate_feedback_approval.sql - replace the existing notification generator, retaining its existing trigger/durable dedupe event. Verify one owner event, rollback and no rejection/submission alert.
4. 202611040116_merge26_testing_activity_steam_referrals.sql - private own-history metadata helper, identity-free private event table, service-only writer/aggregation RPCs, and extension of the existing m24_analytics_retention function. Verify no public/raw-client grants, own-history access, admin-only HTTP reporting, valid Steam-only qualification and existing daily retention job. No new job or environment variable.
5. 202611040117_merge26_closed_campaign_requirements_guard.sql - guarded fail-closed replacement of the nullable campaign permission predicate. Aborts if the reviewed preceding definition differs. Verify anonymous closed/private campaign returns no association/requirements.

6. 202611040118_merge26_referral_snapshot_pagination.sql - pin an event-time reporting cutoff for All pages and use stable kind/UUID tie ordering. Counts cannot change between pages due to later events; current titles may update without changing tie order. Verify bounded page requests pass the same as_of and the window RPC remains service-only.

7. 202611040119_merge26_expired_activity_referral_scope.sql - align event qualification with Testing Activity logical expiry: accept owned past-deadline drafts without rewriting their stored claimed/in_progress status; keep current active claims excluded. Verify both boundaries with the SQL suite.

These have been applied ONLY to development ktifgybnkdaotdxrvjgq. Development has no migration-history table; version files and independent schema/privilege postflight provide the current evidence. Do not blindly replay on production or use development seed values. No production migration, schema comparison or backup operation is claimed in this follow-up.

## Deployment prerequisites and rollback

Owner localhost acceptance and privacy decisions must precede any production authorization. Confirm real production schema/dependencies and exact pending versions, obtain a fresh verified backup, preserve issued deadlines, Free/Pro configuration and live storage, then apply reviewed required migrations before application deployment. Verify the existing minute availability processor and daily analytics retention schedule separately. This document does not authorize production.

For a code rollback, turn off optional recording by reverting the UI/API code; preserve the private event/requirements tables and genuine history. Do not drop records, clear tester-number tombstones, reset XP, delete audit records or shorten/extend already-issued reservations. If policy must return to 72 hours, use an explicitly reviewed forward correction of default/constraint/current window; never rewrite issued deadlines. Restore notification/retention functions from exact pre-release definitions only under an approved rollback plan, retaining the original two retention deletes and existing jobs. A database restore would overwrite live data and requires a separate recovery decision; it is not an automatic rollback step.

Smoke-test future authorized deployment: Account optional PC save/clear/privacy; game optional requirements; old versus new deadlines; single developer approval bell; own archived tester history; usefulness versus unchanged XP; direct Steam/other-store navigation under refuse/allow/withdraw; admin-only Top 10/25/50/All; media/gallery/catalogue and previous notifications. Do not create unnecessary live test data.

## Known limitations / owner decisions

- No Steam page-load, purchase, conversion or revenue confirmation. Counts exclude unconsented/blocked/failed/admin/non-activity clicks. Repeated deliberate clicks may count more than one, and counts are a rolling 90-day retained window.
- Game identity is source type plus stable game UUID (approved/submitted aliases share their original UUID). No title-based matching or inferred reassignment of a deleted/changed source. Missing titles display Game no longer available; no fabricated developer/artwork/storefront.
- All uses a pinned event-time cutoff across bounded aggregate pages, with stable kind/UUID ties. Refresh for a newer snapshot. Retention and operator corrections remain normal data-lifecycle boundaries; no raw events reach the browser.
- Client choice and request consent flag do not constitute a central identifiable consent ledger; privacy review explicitly leaves demonstrability/granularity/rights/provider decisions for owner/legal approval.
- Owner manual tests, actual browser toolbar zoom/screen-reader walkthrough and full Steam end-to-end hosted acceptance remain Not Run. CSS zoom/mobile automation is evidence for layout, not a substitute for manual accessibility acceptance.

## Earlier release history (superseded where noted above)

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


## Finalisation changed files

- MERGE-26-PR-DESCRIPTION.md
- MERGE-26-PRIVACY-REVIEW.md
- MERGE-26-PROGRESS.md
- MERGE-26-RELEASE-NOTES.md
- MERGE-26-TEST-PLAN.md
- app/components/DeveloperPlan.tsx
- app/components/DeveloperWorkspace.tsx
- app/components/FeedbackReviewQueue.tsx
- app/components/GamePcRequirements.tsx
- app/components/PcSpecificationFields.tsx
- app/components/StartPlaytest.tsx
- app/components/TestingActivityHeader.tsx
- app/tester/page.tsx
- docs/MERGE-26-AUTOMATED-RESULTS.json
- docs/MERGE-26-TEST-SUMMARY.json
- lib/pc-specifications.ts
- tests/generate-merge26-test-plan.mjs
- tests/merge26-followup-cases.mjs
- tests/run-merge26-release-validation.mjs
- tests/test-developer-launch-limit.mjs
- tests/test-developer-workspace.mjs
- tests/test-merge26-development-postflight.mjs
- tests/test-merge26-pc-browser.mjs
- tests/test-merge26-pc.mjs
- tests/test-merge26-steam-browser.mjs
- tests/test-merge26-steam-referrals.mjs
- app/components/HardwarePicker.tsx
- docs/HARDWARE-CATALOGUE.md
- docs/MERGE-26-OWNER-ACCEPTANCE.md
- lib/hardware-catalogue.json
- lib/hardware-catalogue.ts
- scripts/merge26-qa-capacity-correction.sql
- supabase/migrations/202611050120_merge26_history_published_artwork.sql
- supabase/migrations/202611050121_merge26_new_campaign_capacity.sql
- supabase/migrations/202611050122_merge26_pro_launch_contract.sql
- tests/test-merge26-finalisation-development.mjs
- tests/test-merge26-hardware.mjs
- tests/test-merge26-qa-capacity.mjs

Rollback: preserve saved hardware IDs and keep the label resolver if reverting selector UI; do not bulk rewrite private specs. Existing notification hrefs remain compatible. Restore earlier read-helper definitions only through reviewed migrations if necessary. Any capacity-policy reversal affects future rounds only; do not rewrite issued deadlines or historical targets/XP/audit. Keep the owner-approved Pro five-launch contract coordinated with its frontend reader. The development-only QA maintenance script must never be run as a production migration.


## Privacy readiness follow-up

Separate page/Steam opt-ins with versioned minimal browser evidence, independent withdrawal and legacy-off defaults; audited admin public-attribution restriction/partial minimisation preserving report/XP integrity; explicit minute scheduler. New migrations124?125 after123, development verified, production not applied. Public-facing operator alias N Quanja is not verified legal identity. Full DPIA/LIA review, controller/provider facts and fresh database recovery remain release prerequisites;66Storage objects separately protected.

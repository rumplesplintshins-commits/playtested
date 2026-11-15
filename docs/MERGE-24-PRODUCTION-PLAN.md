# Merge 24 production release plan

Prepared 4 November 2026 on `feature/merge-24`. **NO-GO for production execution now.** Development functionality is accepted; production rollout still requires explicit approval, backup/restore rehearsal, legal draft sign-off and an agreed disposition of existing lint/legacy-suite debt. This document authorises no write, merge or deployment.

Latest gate pass: the owner explicitly left fresh production backup and restore **BLOCKED** and prohibited production credential access. The read-only migration/preflight review is complete and unchanged; debt is classified but not waived, and notice review is complete but not approved for publication. See [gate audit](MERGE-24-GATE-AUDIT.md), [deferred backup/restore procedure](MERGE-24-BACKUP-RESTORE-PROCEDURE.md), [notice findings/proposed wording](MERGE-24-NOTICE-REVIEW.md), and [final exact execution/Render checklist](MERGE-24-RELEASE-CHECKLIST.md). No application or migration file was changed in this documentation-only pass.

## Read-only audit findings

The audit used CLI `db query --read-only`, confirmed `transaction_read_only=on`, and queried catalogues/configuration only. No production application RPCs, user records, migration DDL or Storage object operations ran. `docs/merge24-production-baseline.json` records the production baseline and four replaced-function fingerprints; raw metadata snapshots/differences remain ignored under `technical-test-results`.

| Comparison | Observed result and action |
| --- | --- |
| Baseline application schema | 55 production relations, 148 functions; development 63/159. All existing views have matching definitions. Existing public columns/constraints match except notification column privileges/kind constraint. No historical baseline migration replay is needed. |
| New Merge 24 objects | Eight development-only tables, eleven additional function signatures, ten policies, four triggers and ten indexes. Production lacks these; create them through the ordered files below. `valid_contact_email_syntax` comes from renaming the syntax function. |
| Changed function bodies | Exactly `_create_notification`, `notify_submission_lifecycle`, `submission_completeness`, `get_my_developer_plan`. Other function differences are ACLs, not source changes. |
| Grants | Development bootstrap granted extra access on 33 pre-existing relations and 111 otherwise-identical functions at initial audit. **Do not copy development grants or a development schema dump to production.** Keep production's existing grants; use only explicit migration grants. Development policy repair subsequently removes extra access from the two policy tables and anonymous plan RPC. RLS/default ACLs were inspected separately. |
| Plan seeds | Production already has Free 1/720h/no gap and Pro 15/720h/48h with their matching targeting flags. Development was missing both rows. Migration 014 is missing-only and preserves production values; its explicit missing-policy error and RPC grants are useful production hardening. No plan is assigned or charged. |
| Testing seed | Production already has `places=3`, 72h reservations and a non-null activation timestamp. Development was missing its row and now has four places, without activating historical reservations. Migration 016 is missing-only; it must leave production's existing three places and activation unchanged. Do not run `activate_testing_reservations`, overwrite capacities or reset history. |
| Storage | Production has private game builds and public thumbnails with the already-correct 5 MB JPG/PNG/WebP bucket limits. Thumbnail policy hardening is still needed. Private screenshots bucket is absent and required. Preserve all existing objects. |
| Cron | Production lacks `pg_cron`; it is available to install. Development has the scheduled retention job. Migration 006 enables the extension and creates only the named Merge 24 retention job. Verify privileges/schedule in a rehearsal. |
| Migration history | Neither project has `supabase_migrations.schema_migrations`. Do not use blind `db push`, `migration repair --status applied` for unverified files, or run historical 202610/20261101 files again. Use a reviewed operator execution ledger with hashes and per-file outcomes. If adopting Supabase history later, reconcile the baseline in a separate reviewed operation. |

The prepared production preflight was executed read-only and all eight checks returned true. It is time-sensitive and must run again immediately before an approved rollout. Existing production configuration is not a defect merely because development differs.

## Preflight and reproducible preparation

1. Pin the reviewed feature commit, verify a clean relevant working tree and match `docs/merge24-migration-manifest.json`. `node scripts/maintenance/prepare-m24-release.mjs` checks all 16 SHA-256 hashes using UTF-8 LF-normalised content and prepares an offline bundle only. It has no database or deployment capability. Stop if any hash differs; review and update the manifest deliberately.
2. Repeat `node scripts/maintenance/audit-m24-release.mjs` with `SUPABASE_AUDIT_CLI` pointing to the installed Supabase CLI if necessary. It reads both explicitly named projects; it never follows the linked project for production. Confirm no unreviewed schema/function/policy/default-grant drift. Do not log keys, cookies, personal data or raw user exports.
3. Run `supabase db query --remote=qtcmzckdhgahuqqilmzj --read-only --file supabase/inspection/merge24-production-preflight.sql`. Every readiness boolean must be true. If objects are partly present, stop and reconcile against the per-file execution ledger; this is an initial-rollout preflight, not a retry detector.
4. Use the existing recovery process to take a protected production database backup plus Storage bucket/config/object inventory. Include Auth/Storage custom triggers/policies and function grants. Verify a restore in an isolated environment and apply this exact manifest there first. Rehearsal must cover existing production records, notification/read preservation and actual cron/storage permissions; PGlite feature tests do not substitute for that operator rehearsal.
5. Capture the four old function definitions, thumbnail policies/bucket settings, notification grants/kind constraint and existing seeds in the protected backup. Agree a maintenance/release window, code rollback commit and operator monitoring. Review approximate notification backfill/ledger population size and locks on the restored dataset before estimating rollout time.
6. Obtain explicit owner approval for the exact production SQL set, code merge and Render deployment. Confirm legal pages/operator details, provider/region agreements and deletion fulfilment. Confirm whether the documented existing lint/legacy-suite failures are accepted or must be repaired before release. Do not treat development acceptance as production authorisation.

## Ordered migrations

Execute files **001 through 016 in the manifest order**, one at a time, after approval. A reviewed operator may use `supabase db query --remote=qtcmzckdhgahuqqilmzj --file <exact-reviewed-file> --yes` only in that approved session, recording the hash/result before advancing. Each file owns its transaction; do not wrap the bundle in a second transaction or continue after failure. Most files are not replay-safe. Never execute the development seed/demo scripts in production.

| Step suffix | Production purpose |
| --- | --- |
| 001 private_submission_contacts | New private owner contact table and scoped policies. |
| 002 contact_email_validation | Replace the original overescaped contact regex; required intermediate dependency. |
| 003 acquisition_analytics | Private visitor/acquisition tables, attribution writer, service reports/retention. |
| 004 gameplay_footage | Validated external links, owner mutations and approved/owner/admin read rules. |
| 005 thumbnail_limits | Harden thumbnail insert/delete ownership. Existing production bucket limits remain equivalent; old objects stay. |
| 006 analytics_retention_schedule | Install available pg_cron and the daily 03:17 UTC retention job. |
| 007 evidence_link_validation | Protect new/changed legacy evidence writes; retain evidence and AI/verification dependencies. UI removal does not remove this database protection. |
| 008 optional_evidence_completeness | Bring completeness validation into parity while preserving historical classifications. |
| 009 contact_email_syntax | Syntax helper/normalisation trigger; required by final policy. Historical rows preserved with NOT VALID. |
| 010 platform_user_metrics | Service-only Auth/profile aggregate for admin API. |
| 011 game_screenshots | Private bucket, five-slot metadata, RLS, service mutation and retry cleanup queue. |
| 012 screenshot_delete_cleanup | Queue screenshot cleanup when submission metadata cascades are deleted. |
| 013 notification_routing | Restrict client edits to read state; private durable delivery keys; exact review/owner links; rejection/accepted feedback events. Backfill destinations only; preserve recipients/read state/timestamps. |
| 014 restore_developer_plan_policy | Missing-only seeds (production already seeded), explicit configuration error and grants. No entitlement changes. |
| 015 contact_email_policy | Private versioned public-suffix/disposable configuration, final authoritative contact check. Must match the deployed JSON. |
| 016 restore_testing_policy | No production seed change expected. Missing-only repair and explicit private policy grants; preserve `places=3` and prior activation. |

Applying the reviewed chain is simpler to audit than hand-splicing the transient validators. Do not omit prerequisite files or replay the old broad baseline. No schema change is needed for posters, sorting, compact layout or retained manual playback. No new environment variable, payment integration or video hosting service is required.

## Verification and deployment order

1. After schema files, run `supabase db query --remote=qtcmzckdhgahuqqilmzj --read-only --file supabase/inspection/merge24-production-postflight.sql`. Expect eight RLS tables, all access/validation booleans true; unchanged Free/Pro policy, unchanged production three-place/activation settings, private screenshot bucket (WebP, 5 MB), restrictive gateway-only policy, and exactly one active named daily retention job. Query/compare the JSON policy arrays to the checked-in JSON. Inspect constraints/grants/policies against the reviewed source, not just object counts.
2. New tables should initially have no copied development data. Check anonymous/ordinary/admin API denial/allow rules with authorised test users after application deployment. Do not mutate real users to conduct smoke tests. Confirm new functions remain service-only where specified; direct notification title/href writes and screenshot Storage access must fail.
3. Only then merge the reviewed commit through the approved branch workflow and deploy Render. Production server/browser Supabase settings must target production; service-role keys stay server-only. Ensure the Node runtime can install/run Sharp native dependencies. Build with `npm ci`/`npm run build`; no video binary is hosted.
4. Smoke test: developer/admin allowance; action-first ordering/filter/search/selection; no general evidence input and preserved claim evidence/AI disclosure; optional valid contact save/clear and `.cock`/Yopmail rejection; unrelated user denial; admin Platform users and visitor reports; analytics default off/opt-in/withdrawal; expected admin-only review alerts/owner-only decisions/read/toasts; max-five screenshot upload/edit/removal, public approved media and private pending media; compact desktop/mobile/150% layout, hidden empty gallery, screenshot controls/posters, no iframe/provider thumbnail before Play, all-provider manual playback and external fallback. Keep testing scope explicit and remove/label only authorised synthetic artefacts.
5. Observe error rates, ingestion, aggregate access and scheduled job run details. Retention deletes only Merge 24 analytics/acquisition records older than 90 days; verify via the named job and controlled aged synthetic fixtures in rehearsal, not by deleting live rows for a smoke test. Failed screenshot cleanup remains private and must be processed during deletion fulfilment.

## Rollback and operational limits

- On migration failure: stop; the current file transaction should roll back. Prior committed files remain. Record the exact stopping point, inspect state and prepare a reviewed forward repair. Do not rerun the entire bundle.
- On application failure: roll back code first to the pinned known-good release; retain additive tables/data. New notification text kinds should degrade to the existing generic rendering, but verify compatibility in rehearsal. If a new trigger must be disabled/restored, use a separately approved narrow forward patch from protected old definitions; do not drop media/contact data.
- Contact policy rollback requires the matching frontend/backend and a reviewed constraint/function change. Do not remove validation or permit unrelated-user writes to make a form succeed. Existing NOT VALID rows are retained and future updates enforce the policy.
- Restore old functions/grants/policies from the protected backup only under an approved incident action. Keep private screenshots private, and never make a bucket public as a rollback shortcut. Disable only the named retention job if required; don't remove a shared extension blindly.
- Account deletion/recovery inventory must cover contacts, screenshot objects and cleanup queue, gameplay metadata, acquisition records and notification delivery ledger. Profiles deletion cascades ledger keys; metadata deletion queues screenshot cleanup, but operator fulfilment must process it. Storage inventory is essential: a SQL rollback/restore does not restore removed objects by itself.
- Autoplay remains intentionally manual as documented in `MERGE-24-AUTOPLAY.md`. Automated zoom used CSS `zoom=1.5`, not actual browser zoom or complete Safari/Firefox accessibility coverage. Owner manual acceptance of playback/layout is recorded separately.

The development-only account/campaign provisioning and synthetic reports are not migrations and must never be exported or seeded into production. Credentials remain ignored locally. Production rows, configuration and branch/deployment state were not altered during this readiness pass.

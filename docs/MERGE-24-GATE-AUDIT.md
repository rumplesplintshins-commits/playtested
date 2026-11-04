# Production release gates — 4 November 2026

Reviewed feature commit: `94939b9`. This pass changes documentation only. **NO-GO for production release.** Owner explicitly deferred the fresh production backup and restore rehearsal and prohibited requesting/retrieving/storing production database credentials. No credential, export, restore, migration, live configuration change, branch merge, push or deployment was performed in this pass.

## Gate status

| Gate | Review outcome | Remaining release condition |
| --- | --- | --- |
| Current backup/integrity/isolated restore | **BLOCKED by owner instruction.** Local Docker and cached PostgreSQL images are available. Archived 28 October roles/schema/data sizes and SHA-256 checks match their manifest. | A current protected export, coverage/integrity verification, independent copy and isolated restoration of that current export, followed by the exact migration rehearsal. An old archive or metadata snapshot cannot satisfy this gate. |
| Migrations against production | **Read-only review complete.** Current preflight: all eight checks true. Manifest: all 16 hashes match. | Exact chain must still pass against the restored current production baseline; recheck drift immediately before any authorised rollout. |
| Lint/test debt | **Audit complete; exception not yet approved.** Same 38 lint errors; stale broad-suite failure reproduced. | Owner accepts the bounded exception below, or authorises remediation before release. A mandatory failing CI check remains an operational blocker until legitimately resolved; no check is bypassed. |
| Terms/Privacy/Cookie wording | **Implementation review complete; publication sign-off open.** See `MERGE-24-NOTICE-REVIEW.md`. | Owner/legal decisions, approved wording corrections and documented deletion/retention/provider arrangements. This is not a legal-compliance certification. |
| Execution/rollback/Render checklist | **Prepared**, including exact migration names and controlled deployment order. | Record the real Render service/live rollback deploy and approve the execution window/actions. Dashboard configuration has not been inspected or changed. |
| Documentation | Updated on the feature branch and committed in this pass. | A later production GO must identify its exact approved application commit, migration manifest and completed evidence—not just this document. |

## Current production comparison

- Read-only CLI queries explicitly targeted production `qtcmzckdhgahuqqilmzj` and development `ktifgybnkdaotdxrvjgq`; `transaction_read_only=on` was checked. PostgreSQL production version is 17.11. Catalogues, required policy configuration and non-identifying aggregate compatibility counts were inspected; no mutating application RPC, identifiable account row, stored URL, notification content or credential was returned.
- Production has 55 public relations/148 functions; development 63/159. Eight Merge 24 relations and eleven additional function signatures are absent in production. Existing view definitions match. Four existing function bodies are deliberately replaced; the other function differences are ACLs, not new source. The private baseline/fingerprint and normalised manifest from the earlier pass still match. Development bootstrap ACLs are not a production template.
- Production Free remains 1 launch/720h/no gap; Pro 15/720h/48h with the existing targeting flags. Production testing remains **three** places, 72h reservations, activation `2026-10-28T21:50:03.001143+00:00`. Neither policy row nor entitlement/history is reset by missing-only migrations 014/016.
- Production has thumbnail bucket limits already equivalent to 005; the owner-folder policies still require that hardening. Screenshots require the new private bucket/gateway. Cron is available but not installed; extension creation/job scheduling need future production authorisation. Both projects lack Supabase migration history: no blind `db push`, baseline replay or unverified migration-history repair.
- 001/002/009/015 establish contacts and the final policy in dependency order. 003/006 create private analytics and its retention task. 004 adds external-video metadata. 007/008 retain/protect legacy evidence and completeness dependencies despite UI removal. 010 is a service-only aggregate. 011/012 create private screenshots and cleanup. 013 restricts notification edits, adds delivery keys/events and changes existing notification destinations only. 014 adds an explicit missing-plan error while preserving existing seed values; 016 is a missing-only configuration repair with private grants. No new account, submission, campaign, plan assignment or demo is a production migration.
- Migration 013 has a genuine bounded live-data operation: populating delivery keys and updating historical notification `href` values. It preserves recipients, read state and timestamps, but is still a production write requiring approval. Rehearse runtime/locks and compare those preserved columns on the restored dataset before approving it. No claim of zero live-data impact is made.
- Additional current prerequisites passed: Auth exposes the `id`, `created_at`, `deleted_at` and `is_anonymous` columns used by migration 010; aggregate counts found zero oversized existing notification dedupe keys, zero kinds outside migration 013's allowlist, and zero legacy evidence URLs failing migration 007/008's size/syntax/whitespace or port-boundary checks. This reduces known compatibility risk without changing or returning those records. Future data can change, so repeat the compatibility screen before the approved rollout. No old evidence link was rewritten or removed.

## Lint audit and recommended exception

Fresh repository lint was run with output in ignored `technical-test-results/m24-gates-eslint.json`. It matches the recorded 38-error/15-file baseline by file, rule and message (line numbers can move). No application source or lint configuration was edited. The earlier passing build/typecheck and relevant live-development/browser/SQL results remain recorded in the progress log; documentation changes do not constitute a new application test run.

| Rule | Count | Assessment and recommended disposition |
| --- | ---: | --- |
| `react-hooks/set-state-in-effect` | 15 | Existing initial loads, selected-record/editor synchronisation, restored local state and a bounded Free-duration clamp. The inspected dependencies/guards do not demonstrate an unbounded loop. Extra renders and future race/dirty-editor regressions remain risks. Recommend bounded technical debt with owner acceptance, rather than asserting these patterns are ideal. Existing developer/admin, bell, campaign, feedback/draft and return-navigation tests mitigate the released paths. |
| `@next/next/no-html-link-for-pages` | 7 | Internal anchors cause full navigation rather than client-side transitions. No access-control bypass follows from an anchor; server/API permissions still apply. Acceptable navigation/performance debt, with return/scroll smoke tests retained. |
| `react/no-unescaped-entities` | 7 | Apostrophes in static JSX text; the production build succeeds. These findings are not evidence of user HTML injection. Recommend low-risk text/style debt. |
| `@typescript-eslint/no-explicit-any` | 7 | Existing internal administrative Steam ingestion/tracking helpers, not new Merge 24 contact/media inputs. Runtime typing is weaker, so retain strict admin/security boundaries and schedule typed replacements. Recommend medium-priority debt; do not treat this as proof that all external provider payloads are safe. |
| `react-hooks/immutability` | 2 | The two flagged expressions assign `window.location.href` in bell/notification click handlers after successful read RPCs; they are imperative browser navigation, not mutation of React state/props. Existing exact-destination/read tests pass. Recommend a narrow tooling/refactor debt exception; no blanket suppression was added. |

All 38 are accounted for by these file totals:

| File under `app/` | Errors | Inspected issue/context |
| --- | ---: | --- |
| `admin/submissions/ImportedSteamCatalogue.tsx` | 1 | Initial catalogue load effect. |
| `admin/submissions/page.tsx` | 5 | Three selected-review/editor effects, one internal anchor, one apostrophe. |
| `api/admin/backfill-steam-metadata/route.ts` | 3 | Untyped admin database helper parameters. |
| `api/admin/process-steam-queue/route.ts` | 4 | Untyped admin/Steam queue payload helpers. |
| `community/[postId]/CommunityDiscussion.tsx` | 1 | Initial discussion load effect. |
| `components/GameBuildManager.tsx` | 1 | Initial build/results load effect. |
| `components/NotificationBell.tsx` | 2 | Initial load and browser navigation assignment. |
| `components/SiteHeader.tsx` | 1 | Internal anchor. |
| `components/StartPlaytest.tsx` | 4 | One apostrophe; initial results, bounded duration, existing campaign editor synchronisation. |
| `games/[slug]/page.tsx` | 4 | Internal anchors. |
| `login/page.tsx` | 2 | URL-derived initial state and internal anchor. |
| `notifications/page.tsx` | 2 | Initial load and browser navigation assignment. |
| `playtest/[token]/page.tsx` | 2 | Static apostrophes. |
| `submit/page.tsx` | 4 | Bounded progress effect and three static apostrophes. |
| `tester/page.tsx` | 2 | Feedback-draft and saved-return-state restoration effects. |

**Classification:** no finding above is, on current evidence, an independently demonstrated Merge 24 security/data-loss regression requiring a feature change in this documentation-only pass. They are **recommended accepted technical debt**, not an owner-approved waiver. If lint is required by protected-branch CI or Render's configured checks, it remains a release execution blocker until fixed or the owner explicitly approves a reviewed policy change. Do not disable CI or ignore arbitrary future lint errors as part of this exception. New security/runtime failures or any count/rule change reopen the assessment.

## Stale broad-suite audit

`node tests/test-testing-policy.mjs` was rerun unchanged and fails at line 48: its older direct-submission claim fixture expects a “published Tester Hub campaign” error; the existing campaign-only RPC rejects it earlier as unavailable for community testing. This is a denied operation with changed error wording, not a successful unauthorised claim. The harness only loads historical migrations 001–011, so it is not a complete test of the current production migration stack. Earlier diagnostic continuation also exposed a fixture trying to publish a rank/genre-restricted campaign without a matching registered tester; no such diagnostic changes are retained in the test.

The focused `--reservations-only` and `--graded-quality` database suites were rerun and pass: one-active-test/capacity/expiry/reclaim, ownership/private permissions, review/award tamper denial and atomicity. Prior live separate-account Tester Hub tests and manual acceptance cover the actual claim/release/different-game/feedback flow. The full Merge 24 migration/RLS suite passed at `94939b9`; its results are not silently substituted for a green historical broad suite.

Recommend a narrowly documented test-harness debt exception for this release, pending owner acceptance and successful current-baseline restore rehearsal. Future remediation should update historical fixture prerequisites and precise denial expectations, preserve the denial assertions, then execute the remainder; do not weaken application guards, award synthetic XP on production or remove tests to make CI green. Actual concurrent final-place/plan tests are distinct from queued PGlite simulations and should be included in the isolated rehearsal when the backup gate resumes. If the broad suite is mandatory CI, its failure is an operational blocker until properly addressed.

## Approvals still needed

1. Resume the fresh read-only backup/isolated restore gate in a separate authorised run. Owner supplies credentials privately only then; approve any maintenance/write-quiescent window separately. No passwordless temporary-role creation or paid infrastructure is authorised.
2. Accept these specifically bounded lint/test exceptions, or authorise remediation. New failures are not covered by that acceptance.
3. Approve final notice wording/operator details, retention/deletion handling and provider/transfer arrangements, including the decisions listed in the notice review. Draft labels do not satisfy this gate.
4. After successful rehearsal and smoke evidence, approve the exact production migration manifest, any required cron/configuration action, controlled `v11` merge and Render deployment/rollback window. Approval for one must not be inferred as approval for all.

No paid infrastructure is required by the prepared local procedure; any proposal to purchase/upgrade a service needs separate approval. Documentation/preflight completeness is not production authorisation.

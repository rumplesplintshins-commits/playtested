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

# Merge 26 - latest completed development follow-up
Final validation: **29 suite/check results Passed, 0 Failed**. Affected suites were rerun; prior passed unchanged scopes were retained rather than repeated. Catalogue: **198 cases; 160 automated criteria Passed; 38 manual/owner cases Not Run; 0 blocked automated cases**. TypeScript and final production build passed. Targeted lint checked 53 changed TypeScript files with no new error-rule counts against b7d8617; 22 existing errors remain in changed files (not a clean broad-lint claim). Mobile/CSS-150% browser automation passed; actual toolbar zoom/screen-reader and full hosted Steam manual walkthrough remain pending. Development postflight confirms 48-hour policy, private grants, stable identities and active availability/retention scheduling. No production access.


This section supersedes earlier checkpoint counts below. Work remains on feature/merge-26. Protected checkpoints: e0e7901 (earlier completed implementation), c3c0e9c (PC), ca8e703 (48-hour reservations/approval bell); eeda886 implements the follow-up; final expiry/docs commits are listed by Git. No branch reset, production access, v11 merge or Render deployment occurred.

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

## PC / 48-hour continuation ? current stage

Starting HEAD was e0e7901; earlier work is preserved. Development migrations 113 (private optional account PC details and canonical game requirements), 114 (new 48-hour reservations) and 115 (immediate transactional approval notifications) are applied. One already-issued development deadline and every other testing policy field were independently verified unchanged during cutover. PC SQL/privacy/rollback and real development browser workflows passed, including optional submission/editing, private comparison, clear/failure states and mobile/150%. Notification polling/browser validation, final evidence/docs refresh and commit stages are being completed. The subsequent Testing Activity / usefulness / Steam-referral request is queued until this continuation is checkpointed. Production remains untouched.

# Merge 26 — local development acceptance

## Final continuation after checkpoint b0f8b19

The follow-on implementation and privacy-assurance brief is complete for **localhost acceptance**, not production release. Protected checkpoints include `0db90b9` (typed private lookup), `cf30e44` (identity/analytics/availability) and `172bfb2` (privacy hardening, disclosure UX and executed evidence). Final documentation/test refinements follow on this same branch; no new branch, `v11` merge, Render deployment or production database operation occurred.

Additional development migrations **108–112** are applied: stable private tester-number mappings and batched current ranks; restricted aggregate Tester Analytics; opt-in availability preferences/events/worker; private canonical rank helpers; explicit non-null opt-in choice. Existing migration 107 was confirmed pending at the checkpoint and then applied to development. New UI uses stable rank-aware public labels, current admin ranks and shared accessible disclosures without unnecessary form-state loss.

The existing development pg_cron job `merge26-tester-availability` runs every minute; read-only postflight verified active and latest execution **succeeded**. No production schedule was activated. Real isolated PostgreSQL races verified unique allocation, last-place exclusivity, one-active-test enforcement and release/expiry dedupe. New hosted browser fixtures created only synthetic users/reservations, then cleaned them; stable-number tombstones intentionally remain.

Final evidence: **20 suites/checks passed, 0 failed**. The comprehensive catalogue contains **95 cases: 67 automated criteria passed, 28 manual owner cases Not Run, 0 blocked automated cases**. TypeScript/final build passed. Targeted comparison covered 31 changed TypeScript files with no new lint error-rule counts; 15 existing errors remain within the previously accepted wider baseline debt. Broad unrelated legacy suites were not repeated. Browser, actual SQL, graded XP/moderation and privacy/security tests are included.

Read [test plan](MERGE-26-TEST-PLAN.md), [privacy review](MERGE-26-PRIVACY-REVIEW.md), [release notes](MERGE-26-RELEASE-NOTES.md), [PR description](MERGE-26-PR-DESCRIPTION.md) and [executed results](docs/MERGE-26-AUTOMATED-RESULTS.json). Owner/legal public-attribution, retention/rights and notice decisions remain explicit production gates. In particular, existing report/auth deletion dependencies require an approved operator procedure; no end-to-end erasure or legal-compliance claim is made. **GO for localhost acceptance; NO-GO for production until those approvals and operational gates pass.**

The earlier implementation notes below describe the initial checkpoint and are retained as history; the final evidence/documents above supersede their narrower test/migration counts.

Branch: `feature/merge-26`, based on `origin/v11` at `b7d8617`. Production Supabase, Render and `v11` were not queried, changed, merged or deployed. Localhost uses only development project `ktifgybnkdaotdxrvjgq`.

## Implemented and verified

- Featured ranking runs in the catalogue RPC before pagination: accepted average >=6 developer games, unrated developer games newest first, rated developer games below 6, then unclaimed Steam imports. Deterministic ties, existing filters/other primary sorts and Steam deduplication remain. No title-based Test/Demo classification.
- Existing accepted-feedback notifications retain owner-only routing, moderation timing, read/unread behaviour and durable deduplication. Links now select the exact campaign/build, including fallback when duplicate relationship IDs collapse into one workspace card. No email added.
- Game corrections/listing edits, contact, video and screenshot management use the existing fixed accessible toast after confirmed saves and scroll to navigation, respecting reduced motion. Failed saves retain edits and position.
- Owner-confirmed archive/unpublish and restore preserve campaigns, feedback and review history. Hard deletion is restricted to unapproved submissions without dependent records or moderation history. Initial owner-only submission audit entries can be removed with an otherwise eligible deletion. Existing screenshot deletion triggers enqueue private storage cleanup; processing uses the existing media-request cleanup path.
- Explicit admin-only Test/Demo controls exclude games from public catalogue/search/counts, profiles/media, ratings, public shares and ordinary tester discovery. Private owner/admin management and authorised admin tester workflows remain. No existing games are automatically flagged. Control changes retain an audit trail; account deletion can anonymise audit actors.
- Admin sorting uses real review events, status/reason changes and submission/resubmission timestamps, preserving Needs More Information priority, search/filter selection and deterministic ties. No invented `updated_at` column.
- Collapsible Analytics & acquisition sits inside the admin layout near Catalogue management, loads once on first expansion, and links to the detailed report.
- Acquisition reports explicitly separate captured channel labels from voluntary discovery answers. The last-30-day submission cohort counts records, current Approved status and distinct owners separately; it excludes explicit test records and legacy fixtures, preserves archived genuine history and never treats registrations or imports as submission conversions. Source tables are capped at 50 groups; cohort totals are not.

## Development migrations applied, in order

Development had no `supabase_migrations.schema_migrations` history table. Existing schema/function/policy definitions were inspected first; these versioned files were applied explicitly to the development project and checked individually. The CLI calls the project's main environment “production”; the target project reference was always **the development reference above**.

1. `202611040101_merge26_listing_controls.sql`
2. `202611040102_merge26_catalogue.sql`
3. `202611040103_merge26_reporting.sql`
4. `202611040104_merge26_historical_acquisition.sql`
5. `202611040105_merge26_control_audit_retention.sql`
6. `202611040106_merge26_private_listing_management.sql`
7. `202611040107_merge26_public_claim_ranking.sql` — public claim recognition uses a restricted identity-only RPC instead of depending on private relationship RLS.

## Focused verification

- TypeScript and optimized production build: PASS.
- `test-merge26.mjs`: actual migrations in disposable PostgreSQL/PGlite; score boundaries, full-dataset pagination, claimed imports/deduplication, anonymous/foreign/admin permissions, archive/history/deletion dependencies, private approved aliases, test campaign eligibility, real review ordering, acquisition cohorts, audit retention and completed reassessment queue removal: PASS.
- `test-merge26-security.mjs`, `test-proxy-origin.mjs`: consent, normal anonymous/ordinary-account events, verified admin omission, known monitors/bots, DNT/GPC, untrusted origins and existing screenshot mutation protections: PASS.
- Notification routing, build-results selection, developer workspace server tests, submission listing/reassessment tests (`--listings`) and Merge 24 final-fix regression tests: PASS. Related test loaders were updated for current component imports.
- `node --env-file=.env.local tests/test-merge26-browser.mjs`: PASS against retained synthetic development accounts. Includes admin/ordinary/anonymous authorisation, real consent event POST/storage/aggregation/withdrawal, admin-event omission, public/private test visibility, archive/restore and private feedback, confirmed-save toast/failure position/reduced motion, own disposable deletion, mobile and simulated 150% layouts, and no browser runtime errors. Synthetic event IDs and the disposable submission are cleaned up; original QA listing controls are restored. Control audit events remain intentionally.
- Targeted lint: no errors in new components/helpers and other directly changed small files. Existing large files retain exactly their baseline errors: admin submissions 5, StartPlaytest 4; error-rule distributions unchanged. DeveloperWorkspace and my-submissions have 0 errors. Existing image/dependency warnings remain. No broad legacy suite was run.

## Investigation findings and limits

- Before synthetic verification, development contained four analytics events in the last 30 days. The actual consent-to-event-to-report pipeline passed. Analytics is off by default; no consent, privacy signals, excluded bot traffic and suppressed admin traffic can legitimately yield zero. Production's exact zero cannot be diagnosed without production evidence; production was deliberately not queried.
- Development initially had 11 recent submission records, 6 currently Approved, owned by 4 distinct developers, with no duplicate attribution join. Historical submissions without an acquisition row appear as unknown; a voluntary “Reddit outreach” answer does not prove a captured Reddit visit. Production's previously reported 86/1 breakdown was not re-queried or backfilled.
- No Neon Dodge revision exists in development. Code and disposable SQL tests confirm that published material AI-disclosure changes remain pending until an administrator publishes a fresh assessment and explicitly confirms reassessment. Rejection reasons remain developer-visible; completed confirmations leave the pending queue and retain their audit reason. No existing reassessment was cleared. The production record's specific state remains unverified.
- Cookieless aggregate measurement may be feasible as a separate design, but removing cookies alone is not an exemption. The [ICO statistical-purposes guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) describes narrow conditions, including clear information and an easy objection mechanism. Any alternative needs owner/legal assessment of purposes, attribution and data handling. No consent exception or new tracking was introduced here.
- Approximate tab sessions are not unique people. Registration attribution is not collected. Test designation is explicit, not inferred from ownership or titles. A later production release needs separate authorisation and migration review.

## Manual acceptance at http://localhost:3000

1. Catalogue: choose Featured; compare rated/unrated developer games and Steam entries, then search/filter and change pages/sort.
2. Developer: edit a game and save contact/video/screenshots; confirm one fixed success toast and scroll to navigation. Check that failed saves keep edits and position.
3. Developer: archive an approved QA game, check it disappears publicly but remains privately manageable, then restore. Delete a fresh unreviewed disposable submission; try deleting one with history and expect a safe refusal.
4. Admin: select a QA submission and toggle Admin Test/Demo. Check owner/admin access remains, public discovery and ordinary Tester Hub offers disappear, and genuine acquisition counts exclude it. Clear the flag to restore normal visibility.
5. Admin: try each review status filter, open Analytics & acquisition, then the full report. Check mobile/150% layout and distinguish submission counts, distinct developers, sessions and unknown/self-reported sources.
6. Accept legitimate tester feedback through moderation; check only its developer receives one notification opening the correct game/build. Review a disclosure reassessment normally; do not clear one without fresh assessment evidence.


## PC and 48-hour continuation checkpoint

Development migrations 113?115 add owner-private optional account PC details, canonical optional minimum/recommended game requirements, 48-hour deadlines for new reservations, and transactional owner approval notifications. Already-issued deadlines and other policy values were preserved (one active development reservation verified). No production operation occurred. Account and listing UI preserve optional fields, use atomic save RPCs and show manual comparison without compatibility claims or device inspection. Steam importer does not currently supply structured requirements; no invented mapping was added.

Executed: PC validation/RLS/atomic rollback tests and real development browser account/create/edit/private comparison/clear/mobile/150% tests passed; 48-hour boundary/preservation, availability, approval dedupe/RLS/rollback and notification bell browser tests passed. Bell persistence is transactional; closed visible bells refresh every 15 seconds or on focus, not push-instantly. Hidden tabs do not poll. Full owner manual acceptance remains pending. The feedback-history/referrals follow-up begins after this checkpoint; final combined documentation and build will follow.


## Authorised production release attempt - stopped at privacy gate

Code cd784b7 is pushed and verified remotely; sixteen final release-critical checks passed, including Featured priority, security and final build. The separately documented owner/legal decisions remain unresolved under the explicit instruction not to infer their approval. No production migration, v11 merge, Render deployment or post-release smoke test occurred. Fresh backup/Storage recovery and current production migration compatibility remain unverified for this release. See docs/MERGE-26-PRODUCTION-RELEASE-STATUS.md for exact completed/pending gates and resume order.

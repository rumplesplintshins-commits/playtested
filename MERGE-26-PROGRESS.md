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

# Merge 24 review record

Prepared 4 November 2026 on `feature/merge-24`. Implementation and development acceptance are ready for review. Production release is not authorised. Legal sign-off, existing lint debt and the release checks below remain outstanding.

## Feature checklist

| Item | Result |
| --- | --- |
| M24-01–03 | Accepted collapse, navigation/return and Other-filter implementations preserved. Tester browser, helper and genre/discovery tests pass. Exact accepted thumbnail/scroll journeys remain on the manual release checklist. |
| M24-04 | Complete: separate private contacts, owner editing/clearing, withdrawal, admin read-only section, missing-data handling and owner/admin/other/anonymous access tests. All three methods verified through the real form. |
| M24-05 | Complete: restricted UTM labels, broad referrals, optional self-report, private submission attribution and grouped submission/approval reporting. Attribution associates with submissions, not registrations. Unknown sources stay explicit. |
| M24-06 | Complete: admin 24-hour/7-day/30-day unique session counts, views, UTC daily trend and source breakdown. Explicit opt-in, no analytics cookies/IP storage/fingerprinting, privacy-signal and bot suppression, active daily retention. |
| M24-07 | Complete: optional YouTube/Vimeo/Drive links, safe canonical URLs, owner editor, approved public display, click-to-load responsive YouTube/Vimeo players and external Drive links. No autoplay or video uploads. |
| M24-08 | Complete: larger descriptions/counters and AI distinctions preserved; optional evidence explained; direct uploads with signature checks/fixed extensions, 5 MB/MIME bucket limits, owner folders, feedback and upload guards. |
| M24-09 | Terms/privacy draft updated for confirmed operator/free/18+ context and all new features. Owner legal review still required. |
| M24-10 | Automated acceptance passes; admin mobile overflow fixed. New code passes targeted lint; repository lint has 38 pre-existing errors. Cross-browser, real provider playback and actual browser zoom remain manual acceptance. |

## Commits

- `af30a4e`: owner contact management and authenticated admin reader.
- `742b3ad`: consent-based analytics and private acquisition reporting.
- `1308427`: gameplay footage, form attribution and validated uploads.
- `1c50019`: terms/privacy draft updates.
- `9d4588e`: evidence validation, mobile admin fix and acceptance/regression tests.

## Migrations

Existing `202611040001_private_submission_contacts.sql` was already applied in development at handover. All seven new migrations below were applied individually to development only with the explicit project reference:

| Migration | Purpose |
| --- | --- |
| `202611040002_contact_email_validation.sql` | Correct overescaped regex; NOT VALID preserves historical rows while enforcing new writes. |
| `202611040003_acquisition_analytics.sql` | Private analytics/acquisition tables, owner acquisition RPC and service-only reports/retention. |
| `202611040004_gameplay_footage.sql` | Safe video links, owner writes, approved-only public visibility. |
| `202611040005_thumbnail_limits.sql` | Server-side 5 MB JPG/PNG/WebP limits and owner-folder policies; existing files preserved. |
| `202611040006_analytics_retention_schedule.sql` | Supabase pg_cron and daily 90-day expiry of only new analytics/acquisition records. Job verified active. |
| `202611040007_evidence_link_validation.sql` | Reject unsafe new/changed evidence URLs without blocking unrelated legacy edits. |
| `202611040008_optional_evidence_completeness.sql` | Align optional evidence guidance with authoritative completeness validation, retaining prior AI classifications. |

The bootstrapped development database has no Supabase migration-history table. Applying reviewed files with `db query --file` did not create that history. Reconcile the baseline and versions before using bulk `db push`; do not replay historical migrations blindly. Production history/schema must be checked independently before an authorised rollout.

## Actual verification

Passed:

- `npm.cmd run test:merge24`: actual migration policy tests and input helpers for contacts, analytics, video and image/evidence validation.
- `npm.cmd run test:unit`: tester helpers, feedback actions, playtime, ranks and safe share links. Updated stale versioned-storage/component-import fixtures.
- `npm.cmd run test:submissions`: isolated SQL/client rules, conditional requirements, routing, conflicts/idempotency, ownership/reviewer protection, existing decisions and notes. Updated stale validator/thumbnail fixtures; SQL legacy compatibility is explicitly distinguished from current UI guidance.
- `node tests/test-genre-mapping.mjs`.
- `npx.cmd tsc --noEmit` and `npm.cmd run build`. Build required network access for existing Google Fonts; no deployment.
- Targeted ESLint on all new feature components/routes/helpers: zero errors.
- `node tests/test-tester-browser.mjs`: mocked backend; filters, feedback/drafts/reservations and mobile/desktop reflow. Restored missing notification/usefulness mocks.
- `node tests/test-admin-review-scroll.mjs`: mocked backend; long-page scrolling, reachable controls and mobile/desktop reflow. Updated stale assessment labels.
- `node --env-file=.env.local tests/test-m24-development.mjs --create-fixtures --reuse-fixtures`: real development Auth/database/storage and localhost browser tests. All contact values/withdrawal; owner/other/anonymous RLS; spoof rejection; profile-role protection; admin endpoints returning 401/403/200; real analytics ingestion/deduplication/origin/path/consent checks; SVG/foreign-folder upload rejection; owner editing/keyboard focus; 320/390/1280px reflow and simulated 150% CSS zoom; admin contacts/dashboard; deferred safe player; approved public footage with no contacts in view/HTML/RSC; analytics off by default, opt-in and persistent withdrawal.
- Separate full-form execution: actual PNG upload, evidence, canonical Drive link, three contact methods, unchecked consent default and private self-reported discovery. Reuse skips creating another form submission once its fixture exists.
- `git diff --check`.

Not green: repository lint reports 38 pre-existing errors in 15 files. Modified admin and submit pages have the same 5 and 4 errors as handover commit `6f881aa`; other error-bearing application files were unchanged. Archived build output is now excluded. This is not counted as a passing check. Ignored detail: `technical-test-results/m24-repo-eslint.json`.

Synthetic development fixtures are retained: three accounts, two submissions, a tiny PNG and synthetic analytics. References are in ignored `technical-test-results/m24-development-fixtures.json`, without passwords/tokens. Reuse these rather than repeatedly creating accounts. No destructive cleanup or production-data copying occurred.

## Privacy and measurement boundaries

Unique visitor means a consenting browser-tab session renewed after 30 minutes without recorded navigation, not a distinct person or durable/cross-device identity. Tab duplication/session restore may preserve identifiers; returns/new tabs/cleared storage may inflate counts. Refusal/privacy tools reduce coverage. Source labels are unverified and often missing. No unsupported conversion percentages are calculated. The old shared-link journey endpoint remains disabled.

Preference expires after 180 days; collection checks expiry. Rejecting clears this tab's session. Raw events and submission acquisition expire after 90 days through the daily job; reports show 30 days. Bot/rate filtering is best effort and per process. No paid service was added.

Owner legal review: service address, jurisdiction, effective date, lawful-basis/legitimate-interest assessments, provider regions/agreements/transfers and deletion fulfilment. Account settings request deletion rather than immediately erasing all records; operator fulfilment must include private contacts. Optional game-outreach consent is not marketing permission. Legal pages remain labelled drafts without professional-certification claims.

References checked: [ICO storage/access guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/) and [Supabase Cron](https://supabase.com/docs/guides/cron). Analytics uses explicit opt-in rather than assuming an exemption applies.

## Manual acceptance

1. Repeat Other filtering and Tester Hub thumbnail/back journeys with long lists and multiple expanded/collapsed cards; confirm exact restored position.
2. Submit without contacts/video; edit each method, opt in, withdraw, clear and reload. Check admin visibility and another account's denial.
3. Try real shared YouTube/Vimeo/Drive links and inaccessible Drive files. Confirm no provider load before click and no autoplay. Links needing additional private/unlisted access parameters are not promised to work.
4. Test failed images, unsafe evidence/video links, network interruption and retry without duplicate submissions.
5. Check Chrome/Firefox/Safari, mobile keyboard/focus and actual 150% browser zoom. Simulated CSS zoom is not complete cross-browser/assistive-technology coverage.
6. Check analytics empty/error states, known/unknown campaigns, privacy signals and persistent rejection.
7. Approve legal wording and agree how existing lint debt will be handled before release.

## Safe release prerequisites

1. Obtain explicit owner authorisation for production migrations, production branch merge and Render deployment. None has occurred.
2. Use the existing recovery/backup process. Independently verify the production target, baseline/history and the seven migration files in order, including pg_cron permissions and existing storage policies that might widen access.
3. Apply only reviewed, unapplied migrations using the authorised operator workflow; accurately record versions. Never use blind bulk replay. Validate historical email constraints separately when appropriate.
4. Verify server-only service credentials match the target; never expose them through NEXT_PUBLIC variables. No new environment variable is required. Build access to existing Google Fonts remains necessary.
5. Verify RLS/grants, contacts, retention job and thumbnail limits. Apply schema before deploying the application because the submission helper expects the new tables/RPC.
6. Only after explicit release approval, merge/deploy through the existing architecture and run manual smoke checks. Monitor errors and retention jobs. Keep a code rollback ready; preserve submitted data and avoid destructive down migrations.

## Safeguards

Environment URL and CLI target repeatedly verified as development `ktifgybnkdaotdxrvjgq`. Production `qtcmzckdhgahuqqilmzj`, Render and `v11` were not changed. Existing untracked `playtested_schema.sql` and `supabase/.temp/` were preserved and excluded from commits. Secrets/private contacts were not printed or committed.

Next.js feedback pass completed. The Cache Components/Suspense diagnostic was resolved through existing guidance and did not qualify under the returned protocol. No feedback was submitted.

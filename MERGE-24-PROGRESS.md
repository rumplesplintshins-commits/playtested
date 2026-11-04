# Merge 24 review record

Prepared 4 November 2026 on `feature/merge-24`. Implementation and development acceptance are ready for review. Production release is not authorised. Legal sign-off, existing lint debt and the release checks below remain outstanding.

## Feature checklist

| Item | Result |
| --- | --- |
| M24-01–03 | Accepted collapse, navigation/return and Other-filter implementations preserved. Tester browser, helper and genre/discovery tests pass. Exact accepted thumbnail/scroll journeys remain on the manual release checklist. |
| M24-04 | Complete: separate private contacts, owner editing/clearing, withdrawal, admin read-only section, missing-data handling and owner/admin/other/anonymous access tests. All three methods verified through the real form. |
| M24-05 | Complete: restricted UTM labels, broad referrals, optional self-report, private submission attribution and grouped submission/approval reporting. Attribution associates with submissions, not registrations. Unknown sources stay explicit. |
| M24-06 | Complete: admin 24-hour/7-day/30-day unique session counts, views, UTC daily trend and source breakdown. Explicit opt-in, no analytics cookies/IP storage/fingerprinting, privacy-signal and bot suppression, active daily retention. |
| M24-07 | Complete: optional YouTube/Vimeo/Drive links, safe canonical URLs, owner editor, approved public display, click-to-load responsive YouTube/Vimeo/Drive players and external fallbacks. No autoplay or video uploads. |
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

## Additional acceptance fix: optional contact email

- Shared contact-email rules now drive both submission and owner editing. Malformed dot-atoms, missing/multiple @ signs, malformed domain labels, embedded whitespace, and local/domain/total length violations are rejected before submission and by the database. Blank values remain optional and normalize to NULL; outer ASCII whitespace is removed consistently. The practical ASCII mailbox format supports plus tags, apostrophes, subdomains and punycode domains.
- Domain syntax is checked without a TLD/provider allowlist, DNS/MX lookup or claim of mailbox deliverability. `test@yopmail.coma` remains syntactically valid: it receives a non-blocking likely-spelling warning. Unfamiliar valid domains are accepted. Existing known-disposable-provider data is used only for a non-blocking contact warning; registration's separate disposable-email policy is unchanged.
- Migration `202611040009_contact_email_syntax.sql` applied to development only. It adds authoritative validation and normalization, preserves historical rows with NOT VALID, and checks future writes. Include it after 008 in the authorised release sequence; the baseline/history reconciliation requirement still applies.
- Passed: expanded actual-migration frontend/database parity and boundary tests; `npm.cmd run test:merge24`; TypeScript; targeted lint; production build; real development/browser acceptance covering both inputs, warnings that permit saves, unfamiliar domains and clearing email. Existing synthetic fixtures were reused and restored. Production was not modified.
- No qualifying Next.js feedback candidate arose during this acceptance fix.

## Additional acceptance improvement: Platform users

- Added Platform users above the existing visitor metrics on `/admin/analytics`: distinct registered accounts, Developers, Testers, Players and new registrations in the last 7/30 days. Roles use `public.profiles.roles`; multi-role users count in each relevant category but only once in the account total. Duplicate entries within a roles array cannot inflate a count.
- Account totals and registration windows use Auth accounts/creation timestamps. Current non-deleted, non-anonymous accounts are counted, including unconfirmed registrations and accounts without profiles. Missing roles contribute only to the account total. The UI explains these boundaries. No account-level details are returned.
- Added administrator-checked `/api/admin/analytics/platform-users` with private/no-store responses and a service-only aggregate RPC. Anonymous and ordinary authenticated users cannot call the RPC or access these metrics via the API; caller-supplied admin metadata does not grant access.
- The new section loads independently with placeholders, an explicit zero-account state and scoped error/retry feedback. Existing visitor/referral/submission API and aggregate function were left unchanged. A failed platform-users request does not hide existing visitor reporting.
- Migration `202611040010_platform_user_metrics.sql` was tested locally and applied to development `ktifgybnkdaotdxrvjgq` only. Add it after 009 in the authorised release sequence. It adds only an aggregate function and grants, without changing accounts or profiles. Existing migration-history reconciliation prerequisites still apply.
- Passed `node tests/test-platform-users.mjs`: actual SQL role/overlap counts, duplicate roles, roles-array source, missing profiles, exact 7/30-day boundaries, future dates, guest/deleted exclusions, empty database and service-only grants; actual shared admin guard/route tests for 401/403/200, forged-admin denial and safe 503 responses.
- Passed `node --env-file=.env.local tests/test-platform-users-browser.mjs`: real development figures independently matched against Auth users/profile roles, live anonymous/user/admin API checks, cards at the top, independent loading, mobile/desktop reflow at 320/390/853/1280px and simulated 150% CSS zoom. Empty/error/retry states were tested with isolated response fixtures, without deleting live data. Existing visitor/attribution aggregate output was identical before and after. Reused existing synthetic sign-in accounts; no accounts/submissions were created. Visual check captured in ignored `technical-test-results/platform-users-150-percent.png`.
- Passed expanded `npm.cmd run test:merge24`, TypeScript, targeted ESLint, production build and diff whitespace checks. Repository-wide pre-existing lint debt documented above remains unchanged. No new Next.js feedback candidates arose.
- All work stays on `feature/merge-24`. No production database change, branch merge or deployment occurred.

## Additional enhancement: embedded gameplay player

- The shared public-game/admin-preview component now provides an accessible dark-theme Play placeholder and a responsive 16:9 iframe for YouTube, Vimeo and Google Drive. Google Drive file IDs construct exactly `https://drive.google.com/file/d/{id}/preview`; stored canonical external links remain `/view`. No schema migration or new environment variable is needed.
- No iframe, remote thumbnail or provider connection is created before explicit Play. Playback is started inside the loaded provider player; no autoplay parameter or autoplay permission is supplied. Closing unmounts the iframe. Changing video resets the loading choice, so one video's choice cannot automatically load another video.
- Safe embed URLs are constructed exclusively from validated provider hosts/file IDs. Query parameters such as autoplay and arbitrary supplied embed targets are discarded. Unsupported/malformed links render an unavailable message without an unsafe link or iframe. The external-only architecture is preserved: no video upload, hosting or proxying was introduced.
- Open video in new tab remains visible before and after loading, with safe external-link attributes. The player includes loading/stall guidance, browser-error feedback and retry/close controls. Cross-origin restriction screens do not reliably emit detectable application errors, so sharing/sign-in/embedding guidance and the external fallback remain visible regardless of iframe load. No claim is made that a provider load event proves a video can play.
- Updated the privacy draft for click-to-load Google Drive as well as YouTube/Vimeo; providers still control availability, sharing and their own processing after loading.
- Passed expanded `tests/test-gameplay-footage.mjs`: supported provider canonicalisation/embeds; malformed, spoofed and arbitrary iframe URL rejection; stripped autoplay/query injection; SSR placeholders without iframe/image/preconnect; invalid-link messaging; existing owner/public database visibility policies.
- Passed `node --env-file=.env.local tests/test-gameplay-browser.mjs`: all providers on actual development public-game and admin-review pages; no provider request or iframe before Play; keyboard activation; exact safe embed src; no autoplay permission; mocked restricted-provider screens with fallback; close/reload; a stalled request with 15-second guidance; 16:9 layout and no clipped placeholder content at 320/390/853/1280px and simulated 150% CSS zoom. Provider responses were intercepted rather than requesting real videos. Real playback still depends on each provider/file's availability and sharing permissions.
- The dedicated browser test temporarily changed only the known synthetic QA submission and restored its original footage/timestamp and review status in `finally`. Development review audit entries may remain for the synthetic fixture. No production access/change, new account or destructive cleanup occurred. Visual captures are ignored: `technical-test-results/gameplay-public-150-percent.png` and `gameplay-admin-150-percent.png`.
- Updated the existing broader development test for the new Play control label. Passed the expanded Merge 24 suite, TypeScript, targeted ESLint, local production build and whitespace checks. No qualifying Next.js feedback candidate arose during this enhancement.
- All work remains on `feature/merge-24`; no production merge or deployment was performed.

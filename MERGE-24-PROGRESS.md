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

## Manual acceptance recorded and unified media gallery

- Owner acceptance: embedded Google Drive gameplay playback was manually tested successfully on localhost. Public and admin-preview wording is now exactly **Gameplay Footage**. Developer submission/editing guidance keeps `(optional)`.
- Added a shared Game Media gallery to approved submission details and admin review previews. Gameplay video is first when present; screenshot thumbnails select a primary viewer. Screenshot previous/next controls preserve proportions with letterboxing rather than cropping. The thumbnail strip scrolls horizontally on mobile. Video requires explicit Play every time it is newly selected; changing to an image unmounts its iframe. No autoplay, provider thumbnail request or video hosting/upload was introduced.
- Developers can select up to five screenshots in the initial submission and add/replace/remove them in Game submissions or submission editing. Screenshots are separate from the catalogue thumbnail. Forms display previews and controls, not raw screenshot Storage URLs. Uploaded catalogue-thumbnail URLs are also hidden behind their previews while preserving external URL entry, clear/replace controls and the stored thumbnail value.
- New server upload gateway validates owner, origin, slot and bounded multipart size; accepts JPG/PNG/WebP up to 5 MB, 8192 pixels per side and 25 megapixels; actually decodes pixels with Sharp, applies orientation, strips metadata and re-encodes to WebP without cropping. Each upload includes a small aspect-preserving thumbnail for efficient gallery strips. The already-installed Sharp 0.35.5 is now an explicit runtime dependency with lockfile updates.
- Migration `202611040011_game_screenshots.sql` applied to development only: private `game-screenshots` bucket, five-slot metadata primary key/check, owner/admin/approved-read RLS, column grants hiding object paths, service-only mutations, locked metadata replacement and private file-cleanup queue. A restrictive Storage policy prevents direct access even if another permissive policy exists. Browser requests use first-party, no-store image URLs, and every image request rechecks visibility before downloading through the server. Pending/rejected media and revoked approvals cannot be fetched anonymously by keeping an old URL.
- Migration `202611040012_screenshot_delete_cleanup.sql` applied to development only: submission-deletion cascades also queue their screenshot files. Normal remove/replace requests process queued full-size/thumbnail pairs immediately. Failed file deletion tasks remain private and retry on subsequent media mutations; operator deletion fulfilment must also process outstanding cleanup tasks. Gallery access is withdrawn immediately through metadata changes, independently of physical cleanup retries. No destructive down migration or existing production data operation occurred.
- Full submission acceptance uncovered an existing optional-evidence bug: blank evidence was sent as NULL to a legacy NOT NULL column. It now uses the supported empty-string representation; the successful gallery submission test covers that path. Partial optional-media save errors direct developers to the saved submission rather than creating a duplicate.
- Expanded `npm.cmd run test:merge24` includes `tests/test-game-screenshots.mjs`: real JPG/PNG/WebP decoding, preserved orientation/proportions, EXIF removal, small thumbnails, spoofed/truncated/oversized/empty/dimension-invalid rejection, server-rendered empty/video/image/mixed galleries, five-slot constraints, owner paths, replacement revisions and cleanup, owner/admin/anonymous visibility, approval withdrawal, cascade cleanup and restrictive Storage access despite a permissive test policy.
- Passed `node --env-file=.env.local tests/test-game-media-browser.mjs`: actual initial screenshot submission; frontend limits/invalid-file rejection; real development upload gateway/storage; owner-only PUT/DELETE (including denial to unrelated admins), CSRF rejection, invalid/oversized payloads and sixth-slot rejection; no raw metadata/Storage bypass; private pending owner/admin reads; max-five editing; replacement/removal/reuse; preserved uncropped portrait dimensions; hidden thumbnail URL with clear/restore and saved-value preservation; public/admin mixed, screenshot-only, video-only and empty galleries; screenshot previous/next and retry after a failed image; mobile scrolling/reflow at 320/390/853/1280px and simulated 150% CSS zoom; video consent reset on item changes; approval revocation; successful physical cleanup of replaced/deleted files.
- Passed the existing all-provider `tests/test-gameplay-browser.mjs` against the integrated gallery. Existing synthetic video fixture and review status restored. Passed Merge 24, unit and submission suites, TypeScript, targeted ESLint and local production build. Browser image-error handling also checks already-complete images so failures occurring before hydration show the retry state.
- One dedicated synthetic Gallery QA submission with three private screenshots and its separate catalogue thumbnail is retained in development. Reference: ignored `technical-test-results/m24-development-fixtures.json` (`galleryFormSubmission`). Its original pending review status is restored after tests. Only its own media slots were replaced/removed during acceptance; no real developer game was altered. Visual check: ignored `technical-test-results/gallery-screenshots-150-percent.png`.
- Release prerequisites now include migrations 011 then 012 after 010, the private screenshot bucket in recovery/backup inventory, and platform-native Sharp runtime dependencies. Apply schema before application code. Existing baseline/migration-history reconciliation and explicit production authorisation requirements still apply. No new environment variable or paid service is required. Privacy draft updated for screenshots and cleanup.
- New manual acceptance: upload representative landscape/portrait screenshots, switch between them and the accepted Drive video, check exact gameplay content at actual browser 150% zoom and in other browsers, and verify that removing a screenshot or withdrawing approval removes future public access. Automated checks use synthetic images and intercepted video responses.
- No qualifying Next.js feedback candidate arose. Work remains isolated to `feature/merge-24`; production, `v11` and Render were not changed.

## Acceptance: notification audit and gameplay posters

- Audited development notification rows, recipient selection, lifecycle/feedback triggers, RPCs, grants and RLS before changing routing. Gallery QA and Playtest 02 new-submission alerts are expected administrator review notifications. Audited approval alerts belonged to each recipient's own submission, including an administrator who is also its developer. No cross-owner approval leak was found; existing notifications were not reassigned or deleted.
- Migration `202611040013_notification_routing.sql` was tested against actual SQL and applied only to development `ktifgybnkdaotdxrvjgq`. Browser writes are restricted to read state, with recipient RLS retained. Administrators receive pending-review/resubmission alerts; only the owner receives approval, rejection, information requests and newly accepted tester feedback. Unreviewed feedback stays private. Exact admin submission and developer workspace destinations replace generic links, including historical submission alerts. Historical recipients/read states/timestamps remain intact.
- A private delivery-key ledger preserves event/recipient deduplication even after dismissal. Status replays produce no new alert; distinct later review revisions may legitimately produce new notifications. Bell/count/read/dismiss and toast components remain unchanged. Synthetic browser review events legitimately create development alerts; these are not duplicate delivery of one event.
- Shared public/admin video posters now use an aspect-preserving image, dark overlay and centred Play control. YouTube's fixed public thumbnail is fetched through an authorised first-party gateway, cached upstream server-side, bounded, decoded and re-encoded. Requests cannot supply arbitrary upstream URLs, follow redirects or bypass pending-media visibility. Failed images fall through to the first screenshot, then the existing catalogue thumbnail; Drive/Vimeo use those existing game images without provider thumbnail lookups. No new poster database field is needed. Navigation thumbnails use existing game media.
- Browsers do not contact provider thumbnail services or load video players before Play. Existing catalogue image hosts retain their existing image-request behaviour. Click-to-load, no autoplay, external fallback, gallery navigation and 16:9 layout are preserved. Privacy draft updated to describe the server thumbnail fetch accurately; this supersedes earlier placeholder descriptions above.
- Passed expanded `npm.cmd run test:merge24`, unit and submission suites, TypeScript, targeted ESLint, local production build and whitespace checks. New actual-migration tests cover owner/admin/ordinary-recipient isolation, accepted feedback, rejection/information requests, resubmissions, exact links, durable deduplication, column permissions and read/dismiss behaviour. Poster tests cover provider priorities, unsafe sources, authorisation before fetch, fixed host/ID, bounded image decoding and unavailable upstream responses.
- Passed `tests/test-gameplay-browser.mjs` and `tests/test-notifications-posters-browser.mjs` against localhost/development: separate synthetic admin/developer/ordinary accounts, real lifecycle notifications and bell/deep-link/read flows, cross-recipient denials, public/admin provider posters, unavailable-YouTube screenshot fallback, no pre-click players/direct provider thumbnails, uncropped images, mobile widths and simulated 150% CSS zoom. Provider playback/thumbnail responses are intercepted; the owner's earlier manual Drive playback acceptance remains applicable. Actual browser zoom and representative production-quality artwork remain manual visual checks.
- Reused existing synthetic Gallery QA media and restored its footage/status. One labelled synthetic Notification QA fixture is retained rejected so it does not require review. Images/captures and fixture identifiers remain in ignored technical test results. No real developer record, account role or production data was changed.
- Release prerequisites include migration 013 after 012 and the private delivery ledger in account-deletion/backup inventory (recipient deletion cascades). Existing migration-history reconciliation and explicit production-release authorisation still apply. No qualifying Next.js feedback candidate arose. No production merge, deployment or production database operation occurred.

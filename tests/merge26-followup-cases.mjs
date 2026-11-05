// Acceptance criteria mapped only where executed assertions actually cover them.
export const followupAutomated=[
 ['OS-001','OS shared selector','os-browser','All five supported OS selections immediately update the controlled Account field; legacy saved values remain selectable.'],
 ['OS-002','OS shared selector','os-browser','Minimum/recommended Linux/macOS selections persist through collapse/reopen and fixture reload without altering CPU/GPU IDs.'],
 ['OS-003','OS keyboard/layout','os-browser','Arrow/Enter selection, Escape and focus work at desktop/mobile 100/125/150 percent CSS zoom with no page overflow.'],
 ['OS-004','OS real persistence','pc-browser','Account Windows11 saves/reloads in development with private hardware preserved; Tester Hardware heading/privacy guidance remain.'],
 ['OS-005','OS real persistence','pc-browser','Real listing minimum Linux/recommended macOS saves/reloads; Other is retained on a new optional submission.'],
 ['OS-006','Hardware regression','hardware','Working CPU/GPU search, canonical IDs, aliases, custom values and keyboard/collapse behaviour remain unchanged.'],
 ['FINAL-01','Finalisation notification navigation','finalisation-development','Real owner bell click and direct URL select the correct game/campaign Individual responses; Back/Forward work and QA read_at is restored.'],
 ['FINAL-02','Finalisation authorisation','finalisation-development','Actual admin rubric/queue succeeds; ordinary tester is denied admin review and unrelated private developer feedback.'],
 ['FINAL-03','DEV QA identification','steam-browser','Explicit line-leading [DEV QA] feedback gets one compact label; ordinary mid-sentence references do not.'],
 ['FINAL-04','Historical artwork','finalisation-development','Both existing accepted/rejected QA records load real existing JPEG thumbnails with naturalWidth greater than zero.'],
 ['FINAL-05','Historical artwork','steam-sql','Private history uses published image override for the same source game, preserving owner scope.'],
 ['FINAL-06','Historical artwork','steam-sql','Imported-game own history resolves its actual imported ID/title/image, separate from submitted/approved source.'],
 ['FINAL-07','Historical artwork','steam-browser','Genuinely missing/failed artwork falls back; a pending lazy image is not treated as failed.'],
 ['FINAL-08','XP review history','finalisation-development','Existing accepted/rejected outcomes, reasons, event counts and XP remain intact after navigation/collapse/mobile/150% checks.'],
 ['FINAL-09','XP review history','xp-quality','Partial awards, re-review/reconsideration and XP corrections remain correct in disposable graded-quality tests.'],
 ['FINAL-10','Hardware catalogue','hardware','CPU and GPU catalogues have unique separate canonical IDs with standard display labels.'],
 ['FINAL-11','Hardware catalogue','hardware','RTX4070TI, 4070 ti and NVIDIA 4070 Ti resolve to one model without ambiguous cross-type matches.'],
 ['FINAL-12','Hardware catalogue','hardware','Manufacturer/model search and no-results state work in the actual shared selector.'],
 ['FINAL-13','Hardware catalogue','hardware','Other values are explicitly custom and bounded; legacy unknown strings are preserved, not labelled canonical.'],
 ['FINAL-14','Hardware catalogue','hardware','Actual account/minimum requirements selectors retain canonical values across disclosure collapse; keyboard, mobile and CSS150% work.'],
 ['FINAL-15','Hardware persistence/privacy','pc-browser','Actual Account and minimum/recommended Submit/Edit save/reload/clear preserve private versus public hardware separation and failed edits.'],
 ['FINAL-16','Hardware validation','pc','Existing server whitelist/length/numeric bounds and RLS remain enforced for canonical/custom strings.'],
 ['FINAL-17','Entitlement presentation','plan-browser','Free Bronze is available, higher ranks/genre matching are Locked, Pro enables them, and grandfathered targeting can be retained/lowered.'],
 ['FINAL-18','Entitlement server enforcement','plan-policy','Altered Free targeting writes are rejected; authorised Pro settings and published grandfathering survive downgrade without stronger restrictions.'],
 ['FINAL-19','Launch contract','plan-policy','Forward five-launch Pro policy preserves historical usage, exact rolling quota boundaries, 48-hour gap and Free one-launch policy.'],
 ['FINAL-20','Campaign capacity','plan-policy','New rounds use three places while existing saved capacities/claims/history remain unchanged through policy migration.'],
 ['FINAL-21','QA capacity correction','qa-capacity','Actual frozen saved-capacity trigger is reproduced; guarded correction changes only the named QA row, restores trigger and preserves both XP/outcomes.'],
 ['FINAL-22','QA capacity correction','qa-capacity','Idempotency, occupied-capacity refusal, rollback and unrelated campaign preservation pass.'],
 ['FINAL-23','Development configuration','development-postflight','Actual development default and QA capacity are three; Pro is five with 48-hour gap, freeze trigger restored and privacy/scheduler checks pass.'],
 ['FU-F01','Focused regressions','pc-browser','Private PC account save/clear/comparison remains operational.'],
 ['FU-F02','Focused regressions','pc','Optional game minimum/recommended requirements and public/private permissions remain intact.'],
 ['FU-F03','Focused regressions','48-hours','New 48-hour reservation deadlines and grandfathered issued timestamps remain correct.'],
 ['FU-F04','Focused regressions','48-hours','Server expiry retains drafts and frees capacity correctly.'],
 ['FU-F05','Focused regressions','availability','Tester availability notifications preserve opt-in and deduplication.'],
 ['FU-F06','Focused regressions','feedback-approval','Owner developer approval notifications preserve routing and transaction guarantees.'],
 ['FU-F07','Focused regressions','identity','Tester public numbers/current rank assertions remain passed from the prior unchanged identity scope.'],
 ['FU-F08','Focused regressions','tester-analytics','Existing Admin Tester Analytics assertions remain passed from the prior unchanged aggregation scope.'],
 ['FU-F09','Focused regressions','core','Existing acquisition/cohort assertions remain passed from the prior unchanged report scope.'],
 ['FU-F10','Focused regressions','core','Existing Featured catalogue sort/filter/page assertions remain passed from the prior unchanged catalogue scope.'],
 ['FU-F11','Focused regressions','listings','Existing developer listing edit/reassessment assertions remain passed from the prior unchanged listing RPC scope.'],
 ['FU-F12','Focused regressions','xp-quality','Graded XP, quality moderation and reconsideration audit tests pass.'],
 ['FU-F13','Focused regressions','bell-browser','Existing bell counts/read actions and visible/focus refresh remain operational.'],
 ['FU-F14','Focused regressions','steam-routes','Optional analytics refusal/withdrawal/purpose renewal and server consent/privacy controls remain enforced.'],
 ['FU-A01','Developer usefulness','steam-browser','Admin reviewed cards render Developer marked useful with shared green badge.'],
 ['FU-A02','Developer usefulness','steam-browser','Admin reviewed cards render Developer marked not useful with distinct muted styling.'],
 ['FU-A03','Developer usefulness','steam-browser','Admin reviewed cards render null assessments as Not yet rated by developer.'],
 ['FU-A04','Developer usefulness','steam-browser','Actual Admin Review and Testing Activity header components use identical three-state semantics.'],
 ['FU-A05','Developer usefulness','steam-sql','The existing owner usefulness RPC does not change the 80 XP award.'],
 ['FU-A06','Developer usefulness','steam-sql','The existing owner usefulness RPC does not change accepted moderation outcome.'],
 ['FU-A07','Developer usefulness','steam-browser','Legacy reviewed card with missing usefulness renders neutral without inventing assessment.'],
 ['FU-B01','Testing Activity history','steam-sql','Own active-game metadata returns the actual image URL.'],
 ['FU-B02','Testing Activity history','steam-sql','Own archived-game artwork remains available through restricted own-report lookup.'],
 ['FU-B03','Testing Activity history','steam-browser','Missing and failed artwork show graceful fallback, including failure before hydration.'],
 ['FU-B04','Testing Activity history','steam-sql','Original developer_name is returned rather than fabricated from the tester profile.'],
 ['FU-B06','Testing Activity history','steam-browser','Compact actual history header shows Accepted separately from developer usefulness.'],
 ['FU-B08','Testing Activity history','steam-browser','All three developer assessment values display correctly in history header.'],
 ['FU-B11','Testing Activity history','steam-browser','Actual shared history/header/referral components fit 390px viewport without page overflow.'],
 ['FU-B12','Testing Activity history','steam-browser','Actual components fit 150% CSS zoom without horizontal page overflow; browser toolbar zoom remains manual.'],
 ['FU-B14','Testing Activity history','steam-development','Hosted own-history metadata contains only reports belonging to the signed-in development tester.'],
 ['FU-C01','Storefront links','steam-routes','A valid saved numeric Steam app URL labels View Steam Page.'],
 ['FU-C02','Storefront links','steam-routes','A valid creator.itch.io game URL labels View itch.io page, never Steam.'],
 ['FU-C03','Storefront links','steam-routes','Missing destination is rejected by the link helper.'],
 ['FU-C04','Storefront links','steam-routes','Arbitrary hosts, malformed URLs, credentials and unexpected ports are rejected.'],
 ['FU-C05','Storefront links','steam-routes','javascript, data and insecure http destinations are rejected.'],
 ['FU-C06','Storefront links','steam-browser','Real link activation opens the exact destination in a new tab (destination network mocked).'],
 ['FU-C07','Storefront links','steam-browser','New tab navigation preserves existing Results selector state in the original page.'],
 ['FU-C08','Storefront links','steam-sql','Archived own-history metadata retains the original valid store URL.'],
 ['FU-C09','Storefront links','steam-routes','No helper derives a store URL from a game title; unsupported destinations return null.'],
 ['FU-D01','Steam recording','steam-browser','One deliberate primary click submits one event; no render/prefetch submission.'],
 ['FU-D02','Steam recording','steam-sql','Event uses the actual source game UUID and kind resolved from the owned report.'],
 ['FU-D03','Steam recording','steam-sql','Stored source is exactly tester_activity.'],
 ['FU-D04','Steam recording','steam-routes','Catalogue/Home does not mount the activity tracking link.'],
 ['FU-D05','Steam recording','steam-routes','Game details do not mount the activity tracking link.'],
 ['FU-D06','Steam recording','steam-development','Real admin-originated recording is rejected; no admin UI tracking link exists.'],
 ['FU-D07','Steam recording','steam-browser','itch.io activation opens normally without a Steam analytics request.'],
 ['FU-D08','Steam recording','steam-browser','Rendering and opening the fixture do not record clicks.'],
 ['FU-D09','Steam recording','steam-sql','Retrying the same event UUID produces one event; a separate UUID counts separately.'],
 ['FU-D10','Steam recording','steam-browser','Repeated deliberate primary activations generate distinct event IDs.'],
 ['FU-D11','Steam recording','steam-browser','Network failure of analytics never blocks direct external navigation.'],
 ['FU-D12','Steam recording','steam-browser','No choice, refusal and old general permission suppress recording; Steam still opens.'],
 ['FU-D13','Steam recording','steam-browser','Withdrawal suppresses future recording without disabling Steam links.'],
 ['FU-D14','Steam recording','steam-sql','Event schema has only event UUID, game UUID/type, constant source and server time; no personal/session fields.'],
 ['FU-D16','Steam recording','steam-sql','Server-derived expired own reservations qualify from Testing Activity without changing stored drafts; current active claims remain excluded.'],
 ['FU-D15','Steam recording','steam-sql','Archiving and renaming preserve game attribution and counts.'],
 ['FU-E01','Admin Steam referrals','steam-sql','Total qualifying clicks matches seeded SQL events.'],
 ['FU-E02','Admin Steam referrals','steam-sql','Distinct games counts game ID/type groups, not report rows.'],
 ['FU-E03','Admin Steam referrals','steam-sql','All per-game counts sum exactly to overview total.'],
 ['FU-E04','Admin Steam referrals','steam-sql','Two-click game precedes one-click games.'],
 ['FU-E05','Admin Steam referrals','steam-sql','Equal counts sort deterministically by stable kind/ID, unaffected by title changes.'],
 ['FU-E06','Admin Steam referrals','steam-browser','Top 10 displays at most 10 games.'],
 ['FU-E07','Admin Steam referrals','steam-browser','Top 25 displays at most 25 games.'],
 ['FU-E08','Admin Steam referrals','steam-browser','Top 50 displays at most 50 games.'],
 ['FU-E09','Admin Steam referrals','steam-browser','All loads 142 aggregate game rows across bounded 100-row requests.'],
 ['FU-E10','Admin Steam referrals','steam-browser','Selector changes do not change overview totals.'],
 ['FU-E11','Admin Steam referrals','steam-browser','Footer reports actual displayed/total game counts.'],
 ['FU-E12','Admin Steam referrals','steam-sql','A one-game dataset returns one result for Top 10.'],
 ['FU-E13','Admin Steam referrals','steam-browser','Empty results have useful consent-aware wording and Showing 0 of 0 games.'],
 ['FU-E14','Admin Steam referrals','steam-browser','142-game All list is height-limited and uses aggregate pagination, not raw event history.'],
 ['FU-E15','Admin Steam referrals','steam-browser','Collapse/reopen retains All selection and fetched list.'],
 ['FU-E16','Admin Steam referrals','steam-browser','Results UI works at mobile width and 150% CSS zoom.'],
 ['FU-E17','Admin Steam referrals','steam-development','Real anonymous/tester HTTP access is denied and administrator aggregate HTTP access succeeds.'],
 ['FU-E18','Admin Steam referrals','steam-development','Admin payload contains aggregate games/counts, not tester account IDs.'],
 ['FU-E19','Admin Steam referrals','steam-sql','Archived games retain recorded click totals.'],
 ['FU-E21','Admin Steam referrals','steam-sql','Pinned aggregate cutoff excludes later events so All pages keep stable counts while new clicks arrive.'],
 ['FU-E20','Admin Steam referrals','steam-sql','Source/view joins do not multiply counts; overview and per-game totals reconcile.'],
 ['PC-009','Game requirements','pc','Anonymous closed/private campaign references fail closed despite NULL auth.uid; approved source checks remain.'],
 ['PC-001','Private PC details','pc','Whitelist, numeric bounds, allowed optional fields and forbidden identifier keys validate in JS and SQL.'],
 ['PC-002','Private PC details','pc','Owner-only RLS supports save/edit/clear and denies cross-account/anonymous access.'],
 ['PC-003','Game requirements','pc','Canonical submitted/approved game requirements share one record and never reveal account specs.'],
 ['PC-004','Game requirements','pc','Atomic submission create retries are idempotent and transaction failures roll back game/requirements together.'],
 ['PC-005','Game requirements','pc','Private/pending/archived listing permissions and public min/recommended-only/removal states are preserved.'],
 ['PC-006','Private PC details','pc-browser','Real development Account save, invalid-save retention, clear and cross-account privacy pass.'],
 ['PC-007','Game requirements','pc-browser','Actual submit/edit/public requirement and private comparison workflows pass without AI reassessment changes.'],
 ['PC-008','Game requirements','pc-browser','Actual shared requirement fields/disclosures work at mobile width and 150% CSS zoom.'],
 ['RS-001','48-hour reservations','48-hours','New claims receive exact server-issued 48-hour deadlines.'],
 ['RS-002','48-hour reservations','48-hours','Issued 72-hour deadlines and unrelated capacity/policy values survive cutover.'],
 ['RS-003','48-hour reservations','48-hours','Boundary expiry releases capacity once and retains drafts; future/extended deadlines remain active.'],
 ['RS-004','48-hour reservations','concurrency','One-active and last-place exclusivity survive concurrent requests.'],
 ['NT-001','Approval notifications','feedback-approval','Acceptance persists an owner-only correctly titled/build-linked event in the same transaction.'],
 ['NT-002','Approval notifications','feedback-approval','Rollback, submission, rejection, duplicate approval and former-owner situations do not produce an extra alert.'],
 ['NT-003','Approval notifications','feedback-approval','Recipient-only read/unread and permissions remain; no tester UUID or private admin notes in message.'],
 ['NT-004','Approval notifications','bell-browser','Closed visible bell polls at 15 seconds, pauses hidden, refreshes focus/open and preserves mark-all-read.'],
];
export const followupManual=[
 ['OS-M01','Native OS popup acceptance','Signed-in development account owner/developer','/account#pc-specifications','Expand My PC specifications and verify TESTER HARDWARE, white title, supporting description and privacy guidance.|Use mouse and keyboard to choose Linux, macOS and Other; save/reload each as needed.|Repeat in minimum/recommended Submit/Edit fields. Verify prior legacy OS can remain unchanged.|At actual browser toolbar zoom 100,125,150 percent and mobile, open the native menu, use Escape/Enter, scroll surrounding panels and confirm CPU/GPU controls still work.','Selected OS is immediately visible and retained after save/reload; native menus remain usable, legacy strings are not replaced and privacy/disclosures/Save/Clear remain.','Restore only original QA OS/requirements or clear your own temporary specs; do not alter unrelated hardware or production.'],
 ['FU-A08','Developer usefulness permissions','Anonymous and ordinary developer','/admin/submissions?tab=playtests','Attempt to open feedback review signed out.|Sign in as an unrelated developer and repeat; inspect get_quality_review_queue network response.','No private review report or assessment is exposed; server rejects non-admin.','Sign out; do not modify records.'],
 ['FU-B05','Testing Activity timestamp','Tester with dedicated submitted QA report','/tester','Open Testing activity.|Compare the Submitted date/time with that report submitted_at using authorised development inspection; note browser timezone.','Timestamp corresponds to the actual submission, not reservation creation or an invented date.','Read-only; leave report unchanged.'],
 ['FU-B07','Testing Activity XP','Tester with dedicated reviewed QA report','/tester','Open Testing activity.|Compare the existing quality/XP label with the actual review and XP history.|Confirm developer usefulness does not replace the admin outcome.','The genuine current award and legacy missing-score explanation are preserved.','Read-only; do not change XP.'],
 ['FU-B09','Feedback disclosure','Tester with dedicated submitted QA report','/tester','Open Testing activity.|Expand View my submitted feedback, inspect all answers and collapse/reopen.|Verify the answers match your original report.','Existing feedback disclosure remains readable and complete.','Read-only; leave history untouched.'],
 ['FU-B10','Reconsideration controls','Tester with eligible rejected or partial-award QA report','/tester','Open Testing activity and the eligible report.|Open reconsideration, enter a dedicated QA explanation and submit once.|As administrator inspect the audit history; do not alter a genuine report.','Eligibility and existing audit trail remain; duplicate pending reconsiderations are rejected.','Retain intentional QA moderation history; close only the dedicated QA request with a reason if authorised.'],
 ['FU-B13','History accessibility','Tester and administrator','/tester','Use Tab/Shift+Tab and Enter/Space through history disclosures, store link and Results selector.|Use Narrator or another screen reader to inspect title, statuses, image fallback and external-link announcement.|Repeat at 150% browser toolbar zoom and 390px mobile emulation.','Logical focus order, meaningful labels and no page-wide overflow; all controls operable.','Reset zoom/emulation; no writes.'],
 ['FU-M01','Full Steam acceptance','Tester then administrator','/tester','Create a dedicated development-only Steam-linked QA submission/campaign using the fixture instructions below; submit your own QA report normally.|Renew Allow optional analytics after reading the new purpose, then activate View Steam Page once.|In a separate admin profile open Steam referrals, check the correct title/count and Top 10/25/50/All.|Reject analytics and click again; confirm store still opens and total does not increase.','One recorded qualifying click; refusal/withdrawal does not block navigation or create a new event; no other links count.','Remove only exact dedicated QA event IDs through an authorised development operator if available; otherwise allow 90-day expiry. Preserve reports, XP and audit history.'],
 ['PC-M01','PC manual acceptance','Signed-in account owner and developer','/account#pc-specifications','Save optional model names and RAM, collapse/reopen and navigate away with an unsaved edit.|Clear after confirmation; verify private values never appear on public profiles.|Edit a dedicated game minimum/recommended field, save and compare in Tester Hub beside your own private specs.','Optional fields preserve edits and show manual comparison only; public game specs do not include private account values.','Restore original game fields and clear only your QA account specs.'],
 ['RS-M01','Reservation manual acceptance','Tester with no active reservation','/tester','Claim a free dedicated QA place.|Check the displayed deadline and compare with server-issued timestamps.|Release only your dedicated test; use tests/test-merge26-48-hours.mjs for controlled expiry rather than waiting.','New reservation is 48 hours; previously issued reservation is not shortened.','Release only your own QA reservation; no real deadline editing.'],
 ['NT-M01','Approval manual acceptance','Tester, administrator, owning developer in separate profiles','/tester','Submit a dedicated QA report.|Accept it as administrator with a reason.|Leave the owning developer bell closed in a visible tab and wait up to 15 seconds plus network latency; open its new alert.','Exactly one owner notification opens the correct workspace/build; another developer receives none.','Keep intended QA report/audit; mark the QA alert read if desired.'],
];
export const steamWalkthrough=`
## STEAM REFERRALS - MY MANUAL LOCALHOST ACCEPTANCE TESTS

Status: **Not Run** by owner. Browser automation uses mocked destinations; an actual Steam page load is not measured or claimed by analytics.

### Safe development fixture setup

1. Open http://localhost:3000 and verify browser Network uses development ktifgybnkdaotdxrvjgq.supabase.co. Stop if it points to production.
2. Use separate existing development tester, owning developer, unrelated developer and administrator browser profiles. Never put their passwords in this document.
3. As developer create a clearly labelled [DEV QA M26 STEAM] submission using your authorised game/build, actual developer name, one genuine thumbnail and a Steam URL copied from that game's real store page. Do not guess an app ID or use a title-generated URL. If no authorised Steam-linked QA game exists, this manual fixture is Blocked until one is available; the disposable SQL/browser suites remain usable without inventing a public listing.
4. Approve only this intended development fixture as administrator and publish a small QA campaign with safe authorised access. A tester claims and submits their own report normally. Admin accepts with a reason if testing reviewed history. Developer marks useful or not useful using the existing control; retain the original moderation audit. Use a second intentional QA report or change your own QA assessment to inspect all three states. Do not delete genuine submitted feedback to reset a fixture.

### Numbered acceptance actions

1. Starting at http://localhost:3000, click Login and sign in with the dedicated development tester.
2. Open Tester Hub, then scroll to Testing activity (not Available games).
3. Find your QA report; verify the genuine thumbnail, title, developer, Submitted timestamp, admin outcome, XP and three-state usefulness. Expand submitted feedback and XP/review history; verify reconsideration remains where eligible.
4. In the footer open Privacy & optional analytics. Read the new referral purpose and press Allow optional analytics again. An older general Allow alone is deliberately insufficient.
5. Note the admin total in a separate admin profile, then as tester activate View Steam Page once. Confirm the expected Steam destination opens in a new tab and Tester Hub state remains intact. The successful external load itself is not something Playtested can confirm.
6. In the separate profile log in as development administrator and open /admin/analytics or Admin Review.
7. Expand Steam referrals. Expect the correct game's count and total to increase by one after refresh/reopening the page. No tester identity should be displayed. A second deliberate activation may add another event.
8. Select Top 10, Top 25, Top 50 and All. Check descending count order, deterministic ties and Showing X of Y games. Overview totals must not change merely because Results changes. With fewer than the limit, only available games are shown. Do not manufacture large hosted datasets: use tests/test-merge26-steam-browser.mjs for 142 mocked aggregate games and SQL fixtures for tie/count boundaries.
9. Collapse/reopen the section; the selected Results value should remain. Other admin UI state must not reset.
10. Return to the tester footer, press Reject optional analytics and activate Steam again. Steam still opens; after refreshing the admin metrics the count must remain unchanged. Also test a fresh profile with no permission and withdrawal after renewed Allow.
11. Visit catalogue/game-details Steam links and a legitimate itch.io link: none adds to these Steam totals. Admin clicks are excluded even if the admin also has tester role.
12. For missing links use a QA game without a storefront: no store control should appear. Archive your own dedicated QA game through the existing owner control, reopen its tester history and check safe retained artwork/store link; signed-out visitors must not gain archive access. Restore only the QA listing afterwards. If a historical image is unavailable, expect Artwork unavailable rather than fabricated art.
13. Use keyboard only, then 390px mobile emulation and actual browser toolbar zoom 150%. Cards stack, thumbnail ratios remain intact, controls are readable and the All list scrolls inside its panel. Return zoom to 100% afterwards.

### Cleanup and evidence

Record actual observations, timestamp, role, test IDs and redacted screenshots against the matching cases; never mark these steps Passed without performing them. Restore QA listing controls/metadata, cancel your own availability requests and release your own unused reservations. Retain intended submitted reports/moderation audit. Do not hard-delete an account with report dependencies. The optional event table has no account/report IDs, so do not attempt to find or erase a person's past clicks by account. Dedicated test event UUIDs, if captured from your own Network requests, can be removed by an authorised development operator using exact IDs only; otherwise normal 90-day retention applies. Do not alter unrelated analytics or production.
`;

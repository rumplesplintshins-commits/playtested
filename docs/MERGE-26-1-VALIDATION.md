# Merge 26.1 validation

Fresh follow-up execution and recovery/migration evidence: [release readiness](MERGE-26-1-RELEASE-READINESS.md). Changed-code lint now includes `next.config.ts` (22 files,11 baseline errors, no new errors). Added passing `test-m261-migration-guards.mjs`, `test-m261-recovery-verifier.mjs` and private-snapshot `test-m261-production-snapshot.mjs`. `tests/run-m261-browser.mjs` provides CI orchestration; `.github/workflows/merge261-readiness.yml` is the latest-head PR check. Historical measurements below are distinguished from the newer evidence files and follow-up report.

Run commands from the isolated feature worktree. Use Node/npm versions in the repository lockfile environment; `npm.cmd` on Windows. Browser tests require the local Next development server on `127.0.0.1:3026` with development Supabase public settings. No production credentials are needed. Temporary browser fixture components are removed in `finally`; do not run the build or changed-file lint discovery while those fixtures exist. Native benchmarking requires the authenticated Supabase CLI on PATH or `SUPABASE_CLI` pointing to its executable; the script hardcodes development project identity. Never substitute a production target.

Implementation checkpoint: `e9488bf`. Embedded catalogue SQL retains reviewed source whitespace because migration guards hash function bodies; do not reformat that body without recomputing and verifying compatibility guards.

| Check | Result / evidence |
| --- | --- |
| TypeScript `npx tsc --noEmit` | Passed |
| Production `next build` | Passed with existing development environment; network needed for existing Google fonts |
| `node tests/test-m261-rules.mjs` | Passed: code-point limits/legacy compatibility, actual SQL title/revision triggers, metrics overlap/claims/archive/Test filtering, service-only ACLs, UK DST/GMT, cache expiry/dedupe/retry |
| `node tests/test-m261-api.mjs` | Passed: metrics 401/403/private/503; screenshot anonymous/foreign/cross-origin rejection, parallel storage completion and cleanup failure |
| `node tests/test-m261-catalogue-volume.mjs` | Passed: 195,362 imports, 9,550 eligible; pages 1–7, filters/search/NSFW, all sorts, Playtested-first ranking, dedupe and hidden/Test exclusions; output `performance/MERGE-26-1-CATALOGUE-VOLUME.json` |
| `node scripts/m261-native-benchmark.mjs` | Passed on DEVELOPMENT ONLY: actual PostgreSQL EXPLAIN ANALYZE/buffers, rollback-only data and function/index changes; `performance/MERGE-26-1-NATIVE-BENCHMARK.json` |
| `node tests/test-m261-browser.mjs` | Passed actual local components with mocked external services: pages 1–7, backwards cache, sorts, debounce/stale/empty, prefetch/data-saver, screenshots add/replace/failure/remove/scroll, correction title counter, notification/review 320/375/400px and CSS 100/150%, disclosure keyboard, separate timestamps; timings `performance/MERGE-26-1-BROWSER.json` |
| `node tests/test-m261-admin-browser.mjs` | Passed full admin page with synthetic intercepted admin session, long legacy title/developer and 320/375/400px at CSS 100/150%. At 320px/150% Chromium rounds document width by 3px; tested tolerance is 4px, with content wrapping independently. `performance/MERGE-26-1-ADMIN-BROWSER.json` |
| `node tests/test-m261-lint.mjs` | Passed baseline comparison against `1c85227`: no additional error rules/counts in changed TypeScript files; 11 existing errors in changed files remain technical debt. Raw per-file comparison `performance/MERGE-26-1-LINT.json` |
| Existing `test-game-screenshots.mjs`, `test-proxy-origin.mjs` | Passed content/Sharp/security/storage cleanup, reverse-proxy origin handling and real route permissions |
| Existing `test-developer-workspace.mjs --server-only`, `test-submission-corrections.mjs --listings` | Passed ownership/editing/save regressions |
| Existing `test-merge26-pc.mjs`, `test-merge26-48-hours.mjs`, `test-merge26-privacy-controls.mjs`, `test-notification-routing.mjs` | Passed PC privacy/fields, reservation deadlines/capacity, independently withdrawable consent/attribution masking, audited restriction/XP preservation, notification recipient/RLS/dedup/read/dismiss |

Production read-only evidence: `performance/MERGE-26-1-PRODUCTION-BASELINE.json`. This captures HTTP 500/57014 rather than misreporting a failed grid as loaded. No production EXPLAIN or after-change timings are available; public plan endpoint returned 406. Baseline index/function definitions were inspected without extracting user rows.

## Manual localhost acceptance — not yet performed by owner

1. Run localhost using development Supabase. Sign in with separate developer/admin/tester accounts; do not use production fixtures.
2. Catalogue: visit pages 1–7, revisit them, change every filter and sort, search rapidly and clear; confirm counts, approved Playtested-first Featured, hidden/NSFW exclusions and no duplicate Steam identities. Revisit within/after 30 seconds and with browser data saving enabled.
3. Developer: open a real existing listing, change a title to 60 then 61 characters; reload saved 60-character and unchanged legacy titles. Confirm CPU/GPU canonical IDs and PC requirements survive unrelated edits.
4. Screenshots: with normal then throttled network upload 1/3/5 valid images; observe transfer versus processing, replace/remove, fail a transfer and retry without duplicate slots. Check unchanged scroll/focus and gallery content. Reject renamed non-images/over-size/over-pixel images; unrelated developer cannot mutate.
5. Admin: long selected/list titles and developer names at 320/375/400px, actual browser zoom 100%/150%; moderation controls remain reachable. Compare real metrics to a read-only SQL aggregation. Never mark mock-session tests as database authorization evidence.
6. Notifications: long titles/messages, read/dismiss/clear at the same widths/zoom; keyboard Escape and links. Playtest reviews: collapsed guidance, Enter/Space disclosure, separate submitted/moderated UK times and missing historical fallback; screen-reader labels.
7. Tester: confirm existing feedback, XP, reconsideration, reservations and privacy choices are unchanged.

Use existing safe development QA accounts and remove only newly created fixtures by their recorded IDs. No fixtures are copied to production. All above owner walkthrough steps remain **Not Run** unless independently recorded.

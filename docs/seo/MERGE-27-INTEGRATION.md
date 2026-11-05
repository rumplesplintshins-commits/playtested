# Merge 27 integration gate

Branch codex/merge-27-seo was created from latest origin/main 37809c7 in its own worktree, dependencies, node_modules, .next output and localhost3027 test server. No environment file was copied. Turbopack root is pinned to that worktree. Original Merge 26 working tree/untracked files were not modified.

At inspection, main is200 commits behind production v11 b7d8617. Open PRs:26(feature/merge-26→v11, draft),20(notifications→v11),13(account erasure→v11). PR #26 head was7b9e8dd, ahead of the local Merge 26 checkout. Those PRs were read only; none was updated or merged. **PR #26 targets v11, not main**, so its merge will not necessarily update main.

## Required sequence after Merge 26 approval/merge

1. Fetch and record exact origin/main, production deployment branch and approved Merge 26 merge commit. Confirm the actual live deployment independently. Verify `git merge-base --is-ancestor <approved-merge26-commit> origin/main` before treating main as the combined baseline.
2. If main still lacks the release, record the mismatch and obtain the intended stable-branch alignment through the established owner-approved workflow. Do not silently merge v11 into main, rebase/change PR #26 or replace this branch's base with unfinished work.
3. Once main contains the approved release, merge latest main into codex/merge-27-seo without rewriting shared history. Resolve conflicts only here. Preserve the newer application as the functional source of truth; do not use blanket ours/theirs conflict resolution.
4. Review the file-specific rules below. Update SEO tests to cover all real sitemap profiles and actual public/private resolvers. The current main-only fixture tests cannot certify application features it does not contain.
5. Rerun lint (classify baseline versus new issues), tsc, focused unit/integration/security/browser suites and production build. Revalidate server-rendered metadata, mobile/actual150% zoom, all CTAs and public-approved-only visibility.
6. Update the dedicated draft PR with the final combined diff/evidence, unresolved risks and release order. Remove the integration blocker only after actual checks. Explicit owner approval remains required before any merge/deployment.

## Conflict map — mandatory resolution rules

| Files | Rule |
|---|---|
| app/page.tsx | Keep Merge 26 real catalogue, ranking/filtering, PULSE, auth/header/privacy and actual data. Add only the reviewed H1/intro and guide cards. NEVER ship main's fictional records/stats or replace the whole page. |
| app/layout.tsx | Keep real site providers, notifications, privacy UI, metadata/noindex behaviour and fonts. Merge only brand metadata defaults as justified; keep route-specific overrides. |
| app/sitemap.ts | Keep approved-only dynamic catalogue/profile enumeration and contact. Append organicPages URLs; do NOT replace with this main-only five-URL sitemap. Preserve exclusion of archived/unapproved/private/QA data. |
| app/robots.ts | Preserve current noindex-compatible allow-public/disallow-api policy. Crawlers need to see private-page noindex responses; never substitute robots rules for authorisation. |
| app/games/[slug]/page.tsx; app/not-found.tsx | Keep real database resolution, media, approval/auth controls and proper404. Do NOT port prototype game data, generateStaticParams demo list or blanket noindex onto genuine approved game pages. Current streamed HTTP200/noindex is a main-prototype limitation, not a production fix. |
| next.config.ts | Preserve production security headers, images/redirects/experimental settings. The isolated root setting is a worktree containment choice; review whether needed in the final runtime. |
| package files | Retain current app dependencies/lock. Add only compatible dev test dependency/scripts; no downgrade to main's minimal manifest. |
| New guide/helper/social files | No pending Merge 26 dependency. Check for intervening route/name collisions; update catalogue anchor if the final app uses a different target than #discover. Absolute live CTAs currently avoid broken local auth forms on main; validate real /submit and /tester after integration. |

## Combined functional/security checklist — NOT RUN

- Authentication/login/OAuth/recovery/account rights; noindex and private information remain protected.
- Developer submissions/editing/media, allowances, review/approval and notifications; no real fixture imports.
- Tester Hub, reservations/expiry, PC specifications, feedback/XP/history and ranks/restrictions.
- Catalogue Featured prioritisation: Playtested games before unclaimed Steam imports; PULSE and genuine public approved profiles.
- Bell counts/read states/toasts and existing availability processing.
- Separate page/Steam consent and withdrawal; no guide interaction misclassified as tester_activity Steam referral. No new tracking/provider consent bypass.
- Privacy/GDPR controls, RLS, erasure guards and legal draft visibility retained. SEO must never reveal archived/private identifiers or remove authorisation to increase indexability.

None of those combined checks is represented as Passed by the independent SEO suite. No production database, migrations, Render configuration, credentials, live data, branch merge or deployment was changed.

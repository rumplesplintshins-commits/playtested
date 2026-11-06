# Merge 28 — SEO and Core Web Vitals

## Baseline (6 November 2026)
- Seobility homepage on-page score: **83%**.
- Metadata 100%, page structure 100%, server 100%, page quality 73%, link structure 67%, external factors 3%.
- Seobility homepage content: 412 counted words; warning recommends ~800, but prioritise useful content over a word quota.
- Seobility internal links: dynamic parameters warning; identify specific offending links before changing any authentication or app navigation.
- Backlinks: one detected referring domain and backlink; external acquisition, not a code-only fix.
- Earlier lab CLS: **0.308** (hero/header/logo implicated); LCP variable; remeasure in repeatable desktop/mobile lab runs and distinguish lab from field data.
- Merge 27 is live on v11 at commit 6ae6849eb6a41e1c5791f5a6400b04b90e062ef2; sitemap 28 URLs (22 approved profiles, four guides, homepage and contact).

## Scope and acceptance criteria

### A. Layout stability (highest priority)
1. Reproduce CLS on production and local build with Playwright PerformanceObserver/layout-shift attribution, at mobile 390px, tablet 853px, desktop 1280px and 150% zoom; measure cold load and loaded catalogue separately.
2. Fix verified causes of shifts in header, logo, fonts, hero, catalogue loading, images or other components by reserving dimensions/space or stabilising rendering. Avoid visual redesign, avoid hiding content, and preserve scroll/keyboard behaviour.
3. Capture before/after CLS with same throttling and viewport; aim for <=0.1 lab CLS where reproducible, and no regression in LCP/INP proxies. Do not claim field Core Web Vitals without CrUX data.

### B. Homepage copy and links
1. Audit server-rendered text on / and identify opportunities for concise, truthful explanations of indie discovery, build-specific feedback, tester experience and AI-use disclosures. Do not claim independent verification or paid testing where not supported. Avoid repetitive keyword stuffing and arbitrary 800-word padding.
2. Keep hero/CTA hierarchy, existing brand voice and four Merge 27 guides.
3. Identify exact internal hrefs with query parameters and their purpose. Preserve necessary login/signup/return-to links; only replace nonessential crawlable links with clean canonical destinations. Do not change auth redirect behaviour.
4. Improve useful contextual links from relevant guide sections to public games, developer submission and tester pathways; preserve navigation and accessibility.

### C. Technical SEO and game pages
1. Audit metadata, canonical URLs, robots/noindex, public profile eligibility, sitemap, redirects, social cards, schema, images and internal links on homepage, all four guides, representative approved game profiles and linked Steam profiles.
2. Never expose hidden/archived/unapproved fixtures in sitemap or indexable pages. Keep existing publicSitemap() logic intact.
3. Verify static HTML without JavaScript for SEO-critical pages and check responsive layouts at 150% zoom.
4. Do not implement speculative structured data, fabricated reviews/ratings or doorway pages.

## Gates
- TypeScript, targeted ESLint, production build and browser regression all pass.
- No catalogue count/search/filter regression (baseline approximately 9,555 games, subject to live data changes); developer/tester login and admin analytics remain functional.
- Sitemap valid and contains all existing eligible profiles plus four guides, no duplicates or hidden records.
- Re-run Seobility on exactly the same homepage URL and document score changes; run repeatable Lighthouse/PageSpeed lab checks and report limitations.
- No migrations, production writes, or merge/deploy until explicit release approval.
- Keep unrelated security PRs and database changes separate.

## Out of scope
- Buying backlinks, fake social proof, social-share widgets solely to satisfy a checker, blanket rewriting of game submissions, unverified performance claims.

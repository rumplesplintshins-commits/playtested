# Merge 27 SEO audit and organic search research

Date:5 November 2026. Production reference: https://playtested.co.uk. Implementation base: origin/main 37809c7. This is independent groundwork, not a release of the production application.

## Evidence and scope

MERGE-27-LIVE-AUDIT.json records30unauthenticated public GETs: all19 URLs in the published sitemap (home, contact,17 game profiles), robots/sitemap themselves, selected account/legal routes and proposed/missing URLs. No scripts, cookies, account operations, database queries or analytics consent were used. The crawl is a bounded current snapshot, not proof of Google indexing, ranking or future approval visibility. Single-request elapsed times are not Core Web Vitals.

| Finding | Evidence | Action |
|---|---|---|
| Existing public catalogue indexing foundations work |17/17 game profiles200;17 distinct titles/descriptions, canonical present, no noindex | Preserve the dynamic approved-profile sitemap and existing visibility guards during integration. |
| Homepage explains the product, but H1 is brand-led | “FIND THE GEMS. SKIP THE SLOP.”; description already discusses indie games/playtests | Propose a direct playtest/developer H1 and role-specific editorial links. Do not replace the live catalogue with the old main prototype. |
| Relevant informational/role landing pages absent | /playtesting, /find-playtesters, /become-a-playtester return404 | Four substantial, distinct SSR guide pages implemented. |
| Private pages already excluded from indexing | /tester has X-Robots-Tag noindex, follow; login/submit/legal drafts have noindex meta | Preserve these. Robots blocking is not access control and can stop crawlers seeing noindex. |
| Production missing game is correctly404/noindex | Deliberately nonexistent game URL in snapshot | Preserve the real application's resolver. Main's old prototype has different streamed-status behaviour; see integration notes. |
| Sitemap/robots exist | Live robots allows public crawling, disallows/api/, advertises sitemap | Do not report them missing merely because a search-tool fetch failed. Direct HTTP audit succeeded. |
| Rankings and field performance unknown | No Search Console/CrUX property data or controlled regional rank tracker supplied | Do not invent volumes, CPC, positions, traffic uplift or CWV scores. Optional owner-provided read-only data can refine priorities later. |

## Keyword intent and destination map

Research used public search-result discovery plus primary competitor pages on5 November 2026. It is qualitative intent research, not a paid keyword-volume dataset or a claim about exact Google UK positions. Priority reflects product fit and usefulness, not invented traffic estimates.

| Cluster | Intent | Destination | Content distinction |
|---|---|---|---|
| playtest, play test, playtesting, what is playtesting | Understand the activity/method | /playtesting | Definition, QA distinction, focused test sequence and paths for both audiences. Spelling variants share one page, not doorway pages. |
| find playtesters, playtesters for indie games, get game feedback | Developer recruitment | /find-playtesters | Build/brief checklist, audience fit, recruitment routes and interpretation. CTA opens existing live submission flow without promising participants. |
| become a playtester, how to playtest games, indie game tester | Player participation | /become-a-playtester | Eligibility, choosing a session, practical observation and safety. Clarify that community XP is not wages or a paid QA vacancy. |
| playtest feedback template, how to write game feedback, report playtest bugs | Practical task | /guides/playtest-feedback | Original structured report prompts, a clearly fictional example and reproduction/privacy guidance. |
| indie games to playtest, Playtested | Discovery/navigation | Existing homepage/catalogue | Add guide navigation, preserve real game listings, Featured order and approved-profile canonicals. |

Avoid targeting paid testing jobs, guaranteed earnings, children’s testing or geographic “near me” pages that do not match the service. Do not repeat synonyms mechanically in headings or add keyword meta tags as a ranking strategy.

## Competitor analysis

| Primary source | Observed positioning | Implication for Playtested |
|---|---|---|
| [PlaytestCloud indie page](https://www.playtestcloud.com/indie-studios) | Dedicated indie audience page, development-stage questions and demonstrations | Explain the development decision a test supports. Do not copy testimonials, panel-size claims or promise a research service Playtested does not provide. |
| [Antidote](https://antidote.gg/) | Clear developer/player segmentation and research-method resources | Give the two audiences distinct entry points, supported by practical editorial content. Do not imply cloud streaming or managed research capabilities. |
| [Steam Playtest documentation](https://partner.steamgames.com/doc/features/playtest) | Authoritative Steam-specific access/distribution guidance | Reference the official source for Steam functionality; distinguish access management from collecting/interpreting feedback. Do not impersonate Steam or guess store links. |
| [Playcocola](https://playcocola.com/) | Community/iteration focus in its public positioning | Explain a concrete build–feedback–iteration workflow, without inventing Playtested outcomes or superiority claims. Search-discovery observation; no pricing comparison made. |

GameTester returned403to the research fetch; no detailed capability/pricing assertions are based on it. Competitor pages are marketing sources, not independent proof of their performance. No outreach, account creation, backlink purchase or external publication was performed.

## Technical implementation choices

- Server-rendered, statically prerendered guide text and genuine links work without JavaScript. No account, database or Merge 26 component dependency was introduced.
- Unique titles/descriptions, stable production canonicals, consistent Open Graph/Twitter metadata and a1200×630first-party PNG. No external thumbnail request or pixel is needed.
- Visible breadcrumbs match BreadcrumbList markup. Homepage WebSite markup identifies the brand only; no unverified legal entity, aggregate ratings, testimonials, purchases, SearchAction or employment data is fabricated.
- New public editorial sitemap paths have no guessed lastmod, priority or ranking promises. Main's fictional demo games are excluded and explicitly noindex; their fake scores are not structured review data.
- No FAQ rich-result eligibility claim or unnecessary FAQ schema. Responsive layout and keyboard/zoom/no-JS checks matter more than adding schema volume.

Guidance: [Google helpful-content principles](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [robots/noindex limitations](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview). These mechanisms aid discovery/interpretation; they do not guarantee indexing or rankings.

## Organic growth and measurement

1. Before publication: integrate with the real application, review guide accuracy, accessibility and CTA destinations, then run the combined release checks. Do not deploy this old-main application as a shortcut.
2. After an approved deployment: verify public200/canonical/indexability, inspect the four URLs in the existing Search Console property and submit/recheck the real combined sitemap. No property credentials, site-verification changes or sitemap submissions were made in this task.
3. Establish a comparable28-day baseline and monitor each page/query cluster: impressions, organic clicks, CTR and average position, clearly distinguishing brand/non-brand and country/device. Low-volume data is inconclusive; do not label query movement caused by this change without evidence.
4. Use existing consent-respecting acquisition reporting only where permission exists. Do not count nonconsenting visitors as zero engagement, extend Steam tester_activity metrics to editorial CTAs or add covert conversion tracking.
5. Over subsequent weeks, prioritise actual reader questions: a focused test brief, interpreting contradictory feedback, and retesting an updated build. Publish only reviewed useful content; avoid mass-generated thin pages or unverified success stories. Link genuinely relevant public games once integration can safely resolve approved listings.
6. Reassess field Core Web Vitals and indexing after sufficient observations. Lighthouse/lab runs can diagnose, not replace CrUX/Search Console field evidence. No field-score pass or Google visibility uplift is claimed yet.

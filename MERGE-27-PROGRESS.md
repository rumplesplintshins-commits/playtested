# Merge 27 SEO — independent implementation

Status: substantial independent implementation/tested; integration and deployment gated. Base origin/main 37809c7. Branch codex/merge-27-seo, separate .backup-tools/merge27-seo-worktree. PR #26 and its working tree preserved. Production unchanged.

Implemented four original server-rendered guides: /playtesting, /find-playtesters, /become-a-playtester and /guides/playtest-feedback. Distinct intents cover playtest/play test/playtesting/playtester/playtesters without duplicate doorway pages. Added canonical/social metadata, matching breadcrumb markup, homepage editorial entry links, first-party social PNG, public-editorial sitemap, safe JSON-LD, explicit prototype noindex and a helpful missing page. Fixed measured narrow/150% homepage overflow and link lint errors in touched baseline files. No tracking, databases, accounts or environment-file changes are introduced by the implementation.

Research and read-only crawl:30 public GETs, all19 published sitemap URLs.17/17 public profiles200, distinct titles/descriptions and canonical URLs. Live private-page noindex and missing404confirmed; no false claim those production foundations were absent. Qualitative keyword/competitor/growth research is in docs/seo/MERGE-27-AUDIT-AND-KEYWORDS.md; no search volumes, rankings or uplift invented.

Executed: full isolated lint, TypeScript and production build passed; tests/seo.mjs passed helper safety and real HTTP/browser checks for all4 guides, canonicals, JSON-LD, internal links, no-JS access, desktop/mobile/simulated150%, sitemap, robots, PNG dimensions, zero page errors and zero new third-party runtime requests. npm audit --omit=dev reported0 production vulnerabilities. Initial install reported8 moderate advisories in development dependencies; no force upgrade was performed. Explicit test evidence is in docs/seo/MERGE-27-TEST-RESULTS.json. Actual toolbar zoom/screen-reader acceptance, field CWV and combined functional checks remain pending.

Main is200 commits behind v11, and PR #26 targets v11. Final integration cannot be assumed after its merge: main must contain the approved release before updating this branch. docs/seo/MERGE-27-INTEGRATION.md lists mandatory conflict rules and application regressions. Main's prototype missing game can streamHTTP 200 with noindex under Cache Components; the real live route already returns 404. Preserve that real route during integration. Do not deploy this main-based prototype or its static five-URL sitemap over the real app.

No merge or deploy is authorised for Merge 27. Draft review can proceed independently while Merge 26 recovery/migration work continues.

Implementation checkpoint: e4aec26. Final lint, typecheck, build and focused browser tests passed on this implementation. Separate documentation/evidence checkpoint follows. New routes work without JavaScript; real browser-toolbar zoom, screen-reader and combined-application checks are not marked passed.

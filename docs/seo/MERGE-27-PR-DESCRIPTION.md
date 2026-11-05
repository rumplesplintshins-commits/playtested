# Merge 27: playtesting SEO guides and independent technical groundwork

Playtested currently has real indexed-profile foundations but no dedicated pages for people learning about playtesting, finding playtesters or becoming one. This adds four original server-rendered guides, clear audience entry links, unique canonical/social metadata, matching breadcrumbs and a first-party social image. No tracking or database work is introduced.

**Draft/integration blocked.** Base is main 37809c7,200 commits behind production v11. PR #26 is still separate and targets v11. Do not merge or deploy this old-main prototype. After the approved release is present in main, integrate using docs/seo/MERGE-27-INTEGRATION.md: preserve real catalogue/ranking/PULSE, dynamic approved-only sitemap, auth/notifications/tester/privacy and real game404s. Never replace them with main's demo pages or static sitemap.

Validation passed: isolated full lint, TypeScript, production build and focused SEO/Playwright suite, including no-JS text, four guides' SSR/canonicals/breadcrumbs/internal links, PNG dimensions, keyboard/mobile/simulated150% and no new third-party requests/page errors. Read-only live audit covered all19 published sitemap URLs. Real toolbar zoom/screen-reader, field metrics, combined app regressions and final integration remain pending. No ranking/traffic result claimed. See committed evidence and test plan.

No production database/configuration/data write, environment changes, PR #26 mutation, branch merge or Render deployment occurred. Owner approval required before Merge 27 merge/deployment.

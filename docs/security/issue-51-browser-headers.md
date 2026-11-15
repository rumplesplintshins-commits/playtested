# Issue 51: browser security hardening

Code-only candidate, based on v11 ec246f3. No deployment, edge/auth settings,
production SQL, or database migrations are part of this change.

## Observed dependencies and edge baseline (2026-11-12)

Read-only GETs of https://playtested.co.uk/, /login and /store returned 200 HTML
through Cloudflare. All nine listed security/isolation headers were absent.
Existing Cache-Control was private, no-cache, no-store, max-age=0,
must-revalidate. /login retained X-Robots-Tag: noindex, follow. No duplicate
CSP, frame, HSTS or isolation header was observed. Dashboard/edge settings
were not changed; recheck actual gateway responses before any rollout.

Source and built HTML inventory: executable scripts/styles are first-party
Next chunks plus inline hydration/streaming and JSON-LD. next/font self-hosts
Inter/Rajdhani. Browser auth, RPCs, uploads and Realtime use the configured
NEXT_PUBLIC_SUPABASE_URL and corresponding websocket origin. Images include
Supabase Storage, Steam/Fastly/CDN URLs, data/blob previews and arbitrary
HTTPS developer thumbnails/screenshots. The live homepage contained Supabase
image URLs. GameplayFootage loads only on click: www.youtube-nocookie.com,
player.vimeo.com, drive.google.com. YouTube posters are served through the
existing first-party API; unrelated outbound store/support links do not need
script/frame/connect permission. Backend-only GitHub/Steam downloads are not
browser CSP dependencies.

## Policy and remaining scan categories

Enforce DENY/frame-ancestors, nosniff, restricted base/object sources, referrer
policy, unused-feature permissions and COOP same-origin-allow-popups. Apply
private, no-store after Supabase getClaims/setAll to private paths, APIs and
requests carrying Supabase auth-token cookies. Keep the same response/cookies
and robots header. Do not override hashed-asset caching or public pages
without sessions. Next may already use stricter no-store on dynamic pages.

The fuller CSP is Report-Only, **not strict XSS protection**. unsafe-inline is
retained for Next 16.4.1 streaming and existing inline styles; unsafe-eval is
development-only. img-src deliberately permits HTTPS to preserve data-driven
catalogue images. No fake nonce or dynamic/static-rendering refactor. Nonces
would require per-request rendering and are not compatible with the present
static/cacheComponents strategy without a separate design change. Report-Only
violations are observable in browser events/console; this PR adds no report
collector, tracking endpoint or external reporting service.

| ZAP category | Disposition |
|---|---|
| CSP absent | Fixed baseline enforcement + phased Report-Only resource policy; inline/HTTPS-image residuals above |
| Anti-clickjacking absent | Fixed: DENY and frame-ancestors none |
| SRI missing | Justified N/A for observed first-party generated chunks/inline scripts; no third-party executable script/style dependency found; provider iframe internals are not site-controlled |
| COEP absent | Justified N/A: cross-origin isolation not required; require-corp could break media |
| COOP absent | Fixed: same-origin-allow-popups preserves OAuth popups |
| CORP absent | Justified N/A: no blanket same-origin restriction on shareable media |
| Permissions-Policy absent | Fixed: camera/microphone/geolocation/USB/payment denied; fullscreen/picture-in-picture not disabled |
| HSTS absent | Fixed conditionally for verified HTTPS apex + forwarded HTTPS; max-age=31536000, no includeSubDomains/preload; hosted edge verification still required |
| Unix timestamp disclosure | Needs targeted URL/field evidence; do not strip legitimate auth expiry/activity timestamps |
| X-Content-Type-Options absent | Fixed: nosniff |
| Missing Content-Type | Needs offending response evidence; tested HTML, JSON and built JS have correct types; bodyless redirects/204/304 may legitimately omit it |
| Non-storable content | Justified for session/private/API data; not a reason to enable shared caching |
| Cache-Control review | Fixed private-path/API/session boundary; public endpoint-specific tuning needs evidence |
| Storable/cacheable | Justified for immutable fingerprinted assets; verified preserved |
| Storable/non-cacheable | Needs targeted response evidence; do not blanket-cache authenticated or dynamic responses |

## Verification and rerun

- `node tests/test-browser-security.mjs`: policy allowlists, HTTPS-apex HSTS,
  public-vs-private caching and mocked chunked auth refresh/robots preservation;
  included in the existing v11 pull-request readiness workflow.
- `node tests/test-browser-security-browser.mjs`: builds a temporary local
  production fixture, starts port 3051, checks real page/API/redirect headers,
  private cache, immutable JS, content types and forwarded-HTTPS HSTS. Uses
  actual Chrome tab zoom 150% at desktop/mobile widths, real GameplayFootage,
  three intercepted providers, Storage/Steam/external images, notification bell
  and intercepted login/signup calls. No accounts or SQL written. Local
  Supabase URL required; refuses hosted backends. Fixture is cleaned afterward.
- Measured production-browser CSP violations: **0** in those exercised flows.
  This is not a full hosted authenticated scan or evidence of a strict CSP.
- `npm run build`; `npx next typegen`; `npx tsc --noEmit`; existing focused
  auth, password recovery, media, screenshots, notifications, tester, developer
  campaign and submission regressions. See PR validation for final results.
- Full fresh-signup/mail confirmation rehearsal is not run here: the existing
  test requires isolated Linux networking, Supabase port 54321 and Mailpit.

Before any separately authorised rollout, recheck Cloudflare/Render headers
for overrides, actual HTTPS HSTS, real OAuth, uploads and provider availability.
Re-run the original authenticated ZAP scan against the reviewed deployed SHA,
export per-alert URLs/request/response evidence (including remaining
endpoint/cache/timestamp classifications above), and capture browser CSP events
before tightening Report-Only. No scan/deployment is authorised by this PR.

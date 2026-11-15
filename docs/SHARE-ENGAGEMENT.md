# Game links and engagement

Implemented locally, 28 October 2026. Migration 011 is prepared, **not applied to the source database**. No deployment, push or recovery changes.

## Placement and use

My Games → select a game → **Links & engagement**, below campaign management and outside playtest results. Create an immutable link for Reddit, Discord, Steam or a custom marketing source. An optional label and advanced medium become URL-safe UTMs; obvious emails, URLs and long numeric identifiers are rejected. Never enter personal information in marketing labels.

Choose an existing public game page or an owned, open Tester Hub campaign. Submissions without an existing approved public page offer only an available campaign; no broken public route is invented. Campaign links retain their campaign/build snapshot when the results build selection changes. Copy uses the current site's origin: localhost links are only useful on that machine. Public sharing requires the subsequently authorised hosted origin.

The `/share/<uuid>` landing page resolves only server-approved internal destinations. UTMs on an incoming request cannot change the stored link identity or source. Private campaign access URLs are never returned by the public resolver. Tester Hub retains its existing role, rank, genre, capacity and one-active-test enforcement.

## Definitions

| Metric | Counted action |
| --- | --- |
| Tracked visits | A non-filtered browser opens the share landing page and its visit POST succeeds. Approximate, not unique people. |
| Game-access clicks | A click on the public game's game-access link or an eligible/claimed campaign access link. Does not establish gameplay. |
| Successful tester claims | A new authoritative claim insert succeeds, in the same database transaction as its attribution. |
| Submitted feedback | The attributed claim successfully transitions to submitted. Not admin acceptance and not an XP award. |

Refresh/retry access is deduplicated by link and short-lived rate digest in 15-minute buckets; each journey can produce at most one access event. Claim/submission events are unique per claim and event type. Review/rejection/reconsideration cannot add another conversion. Existing claims are not backfilled. Released unsubmitted claims retain their historical successful-claim event.

Report dates are inclusive UTC calendar dates, selected within the last 90 days. Each event uses its own timestamp: a report submitted today can belong to a claim made earlier. General-game and direct-campaign links are distinct, with original labels/build associations stored on events. No title-based merging: known Steam app IDs and corresponding source UUIDs establish canonical identities. Changed/conflicting identities stop link creation/resolution for reconciliation. Reports show the requesting developer's links only.

## Agreed attribution and privacy boundary

The user chose **current journey only, no persistent analytics storage**. There are no analytics cookies, localStorage or sessionStorage. Existing authentication and feedback-draft storage are separate and unchanged.

An opaque capability travels as `pt_visit` in the URL through the tagged page, Tester Hub and existing sign-in/confirmation return path. The most recent carried eligible same-game capability can attribute a new claim, for at most **30 minutes**; the database additionally enforces the requested 30-day upper lookback. This deliberately does **not** implement 30-day cross-visit attribution. Leaving the tagged path, losing its capability or returning separately ends attribution. A different game's capability cannot attribute this game's claim or change an existing claim binding; an earlier separately open journey retains its own capability until expiry. Later feedback follows the stored successful-claim binding, even after the URL capability expires.

Only capability hashes are stored. Do not publish or log capability-bearing URLs unnecessarily: they are short-lived bearer capabilities and can appear in browser history. Raw IP addresses, user-agent histories and visitor accounts are not stored on public events. The server uses a keyed, daily rotated address digest for rate limiting/deduplication, using its existing server-only service credential. Rate/dedup records older than 24 hours and events/visits older than 90 days are pruned on reporting/event activity, **not by a scheduled hard deletion deadline**. Claim bindings remain while a claim is active or its submission is within retention; no gameplay records are removed.

Recognised bots, previews and prefetch requests are ignored; identifiable developer previews are excluded. Hourly event requests are capped at 60 per digest. Shared networks, missing proxy addresses, blocked JavaScript, lost journeys and automated traffic affect accuracy. Hosted infrastructure must overwrite/strip untrusted forwarded-address headers; these basic measures are not fraud-proof. No external analytics service, fingerprinting, wishlist/purchase claims or gameplay verification is added. Public events cannot award XP or change permissions. Analytics-trigger failure never prevents the underlying claim/submission.

## Validation and remaining enablement

Passed: full-project TypeScript; lint for new modules/tests; isolated PGlite SQL workflow and permission tests; mocked API/helper tests; mocked browser checks using the actual UI at desktop/mobile widths; existing server workspace scope/dedup tests. Browser tests cover loading, empty, creation, copying, date filters, failure/retry, build-labelled metrics, tagged continuation and access clicks, with no analytics browser storage. All external browser requests were intercepted; no source writes or live integration verification occurred. Existing lint failures in unchanged sections of SiteHeader, public game routes and tester draft handling remain separate.

Reproduce only affected checks when changing this feature:

```powershell
node tests/test-share-links.mjs
node tests/test-share-engagement.mjs
node tests/test-share-engagement-browser.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The browser test requires the existing local Next development server. Its temporary fixture route is removed afterwards. It uses mocked backend/API responses; SQL tests use the reduced isolated fixture, not the restored source database or multi-connection concurrency testing.

Remaining actions, in order:

1. Obtain explicit authorisation for the intended database. Apply **only** `supabase/migrations/202610280011_share_engagement.sql` once, using the project's existing authorised SQL workflow. It owns its transaction and reloads PostgREST's schema cache. Requires the existing testing-policy/genre baseline (001–006); it does not require applying unrelated pending 010 or reapplying successful migrations. Stop on any SQL error; do not rerun blindly.
2. Confirm server-only `SUPABASE_SERVICE_ROLE_KEY` remains available alongside the existing public Supabase configuration; never expose it to client code. No new provider or secret is required.
3. My Games: create a campaign link, confirm its build label and copy URL. Open it in a separate non-owner browser, continue through sign-in, claim an eligible game, click its access link and submit feedback. Refresh the developer's date-filtered report: expect one claim and one submission; admin acceptance is not required. A blocked claim must not increase conversions; refreshing/reviewing must not duplicate them.
4. For a future public deployment, use the authorised public origin and trusted proxy address configuration. Do not share `localhost` URLs externally. Deployment and production SQL remain on hold until separately instructed.

Until 011 is enabled, this optional panel explains that reporting is unavailable; existing campaign/feedback workflows remain usable. No live enablement command was run for this feature.

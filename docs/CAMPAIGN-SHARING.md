# Campaign sharing and traffic — 29 October 2026

Implemented locally; **migration 018 is not applied live**. No deployment, fake production events, Auth changes or push. The existing tracking server key is configured locally; validity and hosted database setup were not verified. This is not a verified live end-to-end result.

## Setup and permissions

Apply `supabase/migrations/202610290018_campaign_share_results.sql` only after authorisation, after **011 tracking**, **014 entitlements** and their baseline dependencies. The existing community feedback workflow must already exist. The migration checks the original community submission RPC signature and stops transactionally if it differs; inspect the deployed definition rather than guessing or rerunning other migrations. It does not activate reservations, change allowances/capacities or rescore feedback.

Read-only SQL Editor preflight:

```sql
SELECT
  to_regprocedure('public.get_share_context(text,uuid)') AS sharing,
  to_regprocedure('public.get_share_engagement(text,uuid,date,date)') AS reporting,
  to_regprocedure('public._assert_developer_targeting(jsonb,jsonb)') AS targeting,
  to_regprocedure('public.submit_community_playtest_feedback(uuid,integer,integer,integer,integer,text,text,text,text,text,text)') AS community_submission,
  to_regprocedure('public.submit_community_feedback_with_attribution(uuid,integer,integer,integer,integer,text,text,text,text,text,text,text)') AS tracked_community_submission;
```

NULL original sharing/reporting means the 011 setup is missing. NULL targeting means 014 is missing. NULL tracked community submission is expected before 018. A non-NULL original function with a missing API-cache entry requires project/signature/cache diagnosis, not blind migration reapplication. Original community submission signature mismatch is a genuine setup blocker for 018.

The existing server-only `SUPABASE_SERVICE_ROLE_KEY` is still needed by `/share` and `/api/engagement`; never expose it through a public environment variable. Raw analytics remain private. Existing approved developer ownership checks govern link creation/private reporting; the new submission wrapper is authenticated-only and calls the original community validation/permissions first.

## Behaviour

- Published open campaigns show **Share this playtest** beside management. Normal copy uses the community invitation for community/mixed audiences and the exact Hub campaign for Hub-only audiences. Tracked creation reuses existing link IDs, UTM normalisation, source/label form and copy controls. It records no visit.
- Community and Hub invitations have distinct destinations, permanently bound to that campaign. New tracked campaign links record a private build fingerprint; changed builds, paused/closed campaigns and unavailable invitations do not silently redirect to another round. Older links retain their original metadata; missing historical fingerprints are not invented.
- **View traffic & results** refreshes, selects that campaign's link rows, focuses and scrolls to the existing game-specific report. General-game links remain available under All links. Historical campaign filters are derived from saved links, not a new destination lookup.
- Zero-traffic links remain visible. Feedback totals show independent/community contributions separately. Community-link claims display Not applicable. Sources are developer-assigned labels, not proof of a referrer or analytics supplied by Discord/Reddit/Steam.
- A community feedback event is written only after the original submission succeeds, once per participant, while a valid same-campaign tagged journey is present. Failures/duplicates/expired or absent tokens create no extra conversion. It creates no Hub claim, place usage or XP. Existing Hub attribution still follows a successful claim to later feedback, even after the visit token expires.
- No cookies, local/session storage, cross-site identifiers or new consent system were added for analytics. The existing 30-minute journey policy remains. Normal untracked feedback still uses the original RPC; a missing new tracking RPC falls back to that submission path with an explicit reporting warning, never fake results.
- Community-only Hub targeting controls are hidden while retaining state. Mixed/Hub targeting remains server-enforced. Community publication does not create a grandfathering route around Pro targeting on a first Hub conversion.

## Checks and limitations

Existing tests extended: `node tests/test-share-engagement.mjs --campaign-sharing`, `node tests/test-share-engagement-browser.mjs --campaign-sharing`, normal sharing browser/unit checks, typecheck and targeted lint. SQL is disposable PGlite; the reduced fixture uses an explicit contract stub for the deployed community submission RPC. Browser services are fully mocked. Actual hosted join/submission RPCs, SMTP/sign-in and reporting setup still need the manual checks below.

## Manual verification

1. After approved setup, use an admitted game to publish a **My own community** playtest. Confirm no Hub rank/genre controls are required. In Share this playtest, normal copy must point at this exact community invitation.
2. Create two tracked links for that campaign: Discord and Reddit, with descriptive labels. Copy each. View traffic & results: both rows should exist at zero until actually visited; creating/copying does not record traffic.
3. Open the Discord tracked link in a separate browser/profile using a non-owner account. Click View this playtest, sign in if needed, and confirm the same campaign/build is retained. Join the community playtest, open the game and return to the tagged tab.
4. Submit valid feedback within the 30-minute journey. In the developer browser, refresh real results for that game/campaign. Discord should gain its approximate visit/access and one community feedback submission; Reddit stays separate. Claims should be Not applicable and Hub places/XP unchanged. Refresh/retry must not duplicate feedback counts. Reopening separately without the token must not create cross-visit community attribution.
5. For a separate Hub campaign, create a Hub-destination link. With an eligible non-owner tester, follow it through login, successfully claim and submit feedback. Confirm the same source/campaign row records one claim and one independent submission. Failed eligibility/claim attempts must not count as claims. Later feedback may follow its stored successful claim.
6. Check closed/paused/changed-build invitations are unavailable rather than redirected to another build. Check mobile layout, report navigation and that sample data remains an explicit labelled preview separate from real reporting/errors.

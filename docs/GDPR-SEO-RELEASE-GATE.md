# GDPR + SEO production release gate

Reviewed: 2 November 2026

## Completed in code/review

- 18+ declaration is required for new accounts, including the reviewed Google account-creation path.
- Terms and Privacy Notice describe the 18+ account policy.
- Account settings expose an authenticated deletion-request route; requests are staged rather than pretending erasure is immediate.
- New shared-link journey attribution is disabled; historical attribution has a 90-day pruning design.
- No advertising pixel or third-party analytics SDK was found in the reviewed application source.
- Developer feedback follow-up choices now expire after 180 days from last change.
- Authentication, browser storage, public/private visibility, retention targets and data-subject request routes are documented in the Privacy Notice draft.
- Legitimate-interest balancing assessment is documented in `docs/GDPR-LIA-2026-11-02.md`.
- Public SEO has canonical URLs, Open Graph/Twitter metadata, robots, sitemap generation and per-game metadata.
- Sitemap uses public/linked game profiles rather than blindly indexing every imported Steam record.
- Homepage SEO title/description now explicitly target indie-game discovery and community playtesting.
- Free Tester Hub capacity migration sets the current policy to 3 places.
- New/changed build/release labels are protected at the database boundary with a 30-character limit; legacy labels are not destructively rewritten.

## Must be completed before calling the privacy notice final

1. Add the controller/operator legal name and a suitable public service/contact address to the Privacy Notice. Do not invent these values.
2. Confirm production hosting/data regions and the applicable processor terms/DPA and international-transfer safeguards for the deployed hosting/Supabase/Google configuration.
3. Finish and test the account-deletion processor. It must remove account-only personal data, remove current developer relationships, de-identify historic tester/developer/moderation records where retention is justified, and only then remove the authentication identity. Do not run this against production until a current recovery point exists.
4. Add the planned 30-day expiry for unsubmitted Tester Hub browser feedback drafts and update the Privacy Notice wording after deployment.
5. Update the Privacy Notice wording for developer follow-up choices to the implemented 180-day expiry.
6. Change the legal version from `production review in progress` only after the items above are resolved.

## UI polish still required before merge

- `StartPlaytest.tsx`: change the Build / release label input from 100 to 30 characters and show a live `x / 30` counter. Backend protection already exists in the migration.
- Verify the UI displays 3 Tester Hub places after the policy migration and remains usable at 150% browser zoom.

## Production sequence

1. Complete the remaining code/legal items above on the branch.
2. Run lint/typecheck/build and focused auth/playtest/deletion/storage tests.
3. Create a fresh current production recovery point. The 28 October archive is historical and is not the release recovery point.
4. Review/apply database migrations.
5. Smoke-test signup, Google signup, account deletion request, playtest create/edit, 3-place capacity, 30-character build label, Tester Hub feedback draft behaviour, public game pages, `/robots.txt` and `/sitemap.xml`.
6. Merge/deploy only after those checks pass.

Do not describe the site as fully GDPR-compliant solely because this checklist passes; compliance also depends on the operator's real processing, provider configuration and ongoing handling of data-subject requests.

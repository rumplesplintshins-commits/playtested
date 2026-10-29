## Four-place / 72-hour reservation rules (migration 012)

Run `npm run test:reservations:concurrency` from the repository root. It reuses the existing policy test harness, starts PostgreSQL 17 in a disposable Docker container with `--network none`, no ports/volumes/source credentials, loads synthetic fixtures and migrations, then removes the container. It checks a final-place reclaim racing a new claim (one winner), rollback allowing the waiting claimant, a submission waiting across expiry, and one tester in two tabs. These are real independent PostgreSQL connections, distinct from `npm run test:reservations` single-engine simulations. No production or recovery container is used. Requires the existing cached PostgreSQL image; does not install or pull dependencies.

The instructions below document the earlier two-place baseline. For migration 012, use a new four-place campaign with three consumed places when testing the final place; retain existing campaign capacities. Submitted reports still count after their reservation deadline and review rejection; only the audited moderator exception frees one.

# Real multi-connection checks (not yet run)

Use a staging copy after applying the five migrations. Use dedicated disposable tester accounts and campaigns. Do not run the schema fixture against staging or production.

Open two independent SQL Editor sessions or database connections. For each test, use `BEGIN ISOLATION LEVEL READ COMMITTED`, `SET LOCAL ROLE authenticated`, then set the identity with `SELECT set_config('request.jwt.claim.sub', '<TESTER_UUID>', true)` and `SELECT set_config('request.jwt.claims', '{"sub":"<TESTER_UUID>","role":"authenticated"}', true)`. Use the real UUID of a dedicated tester with the Tester role. PostgREST normally supplies these settings; setting them manually is a staging-only SQL test.

## Final place

Prepare an open Bronze/any-genre Hub campaign with one consuming place and two other eligible testers with no active test.

1. Session A, tester A: `SELECT public.claim_community_game_test('<CAMPAIGN_UUID>');` Keep the transaction open.
2. Session B, tester B: call the same RPC for that campaign. It must wait on the campaign lock, not immediately return a second successful reservation.
3. Commit A. B must now fail with “This campaign is full”. Roll back B.
4. As an administrator/database owner, inspect `community_game_tests` for that campaign. Exactly two records without `replacement_at` may reserve/use places. Repeat with A rolling back instead: B should then succeed, with the final count still two.

## One tester, two tabs

Prepare two eligible campaigns with room. In both sessions use the same dedicated tester identity with no active claims. A claims campaign A and leaves its transaction open. B claims campaign B and must wait. Commit A; B must fail with the one-active-test restriction. Roll back B. Verify exactly one active record for that tester. Repeat for the same campaign: only one claim may exist, and B must fail as a duplicate after A commits.

## Approval and reversal

Prepare one submitted report. In both sessions use an existing admin whose `profiles.role` is `admin`. A calls `review_test_quality` with all five criteria true, outcome `accepted` and a specific quality reason, then holds its transaction. B calls the identical approval and must wait. Commit A; B may complete as a no-op. Verify one +100 ledger event and one XP increase. Repeat with rejection, then restoration: -100 and +100 each occur exactly once. Confirm a developer cannot call this RPC or `replace_unusable_test`.

## Submission versus release

Prepare one active claim. A submits valid feedback, leaving its transaction open. B, with the same tester identity, calls `release_community_game_test`. Commit A. Release must fail; the submitted report must remain and its place must still count. Reverse the ordering: hold release in A, submit in B, then commit A. Submission must fail because the claim no longer exists; no report or phantom reservation should appear. Rollback variants must leave the original claim intact.

## Live integration checklist

Using actual authenticated browser sessions, verify Bronze cannot obtain a higher-rank campaign's build link through the listing RPC or claim API; All genres cannot bypass mandatory genre matching; Platinum still needs that match; own claims remain usable after eligibility changes. Verify direct table writes and private helper calls are denied. Confirm community-token participation retains its community label and does not use independent places. Review existing over-capacity campaigns without deleting or resetting any report.

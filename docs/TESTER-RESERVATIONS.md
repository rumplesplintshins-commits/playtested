# Four places and 72-hour reservations

Implemented locally on 28 October 2026. Migration `202610280012_tester_reservations.sql` is prepared, **not applied live**. No deployment, push or backup/recovery operation.

## Rules and preservation

- The authoritative `testing_policy` default becomes four places; only newly inserted campaigns receive it. Existing campaign `target_testers` values are retained, including during edits. Capacity is read per campaign, not inferred from the new default.
- Every new claim reserves a place for 72 hours using server time. Starting, refreshing or opening access links cannot extend it.
- Capacity counts submitted/reviewed reports plus current, unexpired reservations, excluding existing audited moderator replacements. Three submitted plus one reserved is full; four submitted remains full after deadlines/rejection. Community feedback is unchanged and separate.
- Expiry is a timestamp predicate, not dependent on a cleanup worker or a persisted status change. An expired claim remains in the database; it stops consuming capacity and the tester's active slot immediately on the server. There is no XP penalty.
- Reclaim uses the existing claim RPC, rechecks current eligibility, campaign availability, capacity and the one-active-test rule, and renews the **same participation ID**. Retries cannot extend an already-current reservation. Existing submitted participation cannot be reclaimed.
- Historical pre-campaign claims keep their original ID/draft. After expiry, they may explicitly reclaim a currently open campaign whose submission/approved-game UUID matches their original source. The original reference is retained in `legacy_submission_id`. If no matching eligible campaign exists, the draft remains readable and reclaim stays unavailable; no title/Steam guess or automatic conversion is made.
- Existing feedback, reviews, XP, moderator replacement auditing, build locks, launch allowances, rank/genre restrictions and unexpired own-claim access are preserved. Expired claims no longer confer private access through the own-claim exception.

Existing active claims have **no new deadline until explicit activation**. The migration does not immediately expire them or use their old claimed-at dates. New claims made after migration already receive their own 72-hour deadline.

## Interface

Developer/tester capacity summaries use actual campaign capacity, e.g. “4 places · 2 submitted · 1 reserved · 1 available”. “All places reserved” differs from “Feedback capacity reached”. Historical participation counts are labelled as history, not current reservations.

Before claiming, the tester sees the estimated deadline if claimed now; after confirmation, the stored deadline and remaining time are displayed. The final 24 hours receive an in-app warning. Countdown calculations start from the server's timestamp; local timers refresh presentation at the warning/expiry boundary without database polling. All authoritative checks use database time after locks.

Expired tests appear in activity as “Reservation expired”, with Open saved draft and Reclaim place actions. Expiry never deletes the browser draft. An open editor remains mounted and keeps even unsaved in-memory answers if browser storage is unavailable; submission is disabled until reclaim succeeds. Normal explicit release retains its existing draft-discard confirmation and clears the draft only after confirmed success. Browser drafts are local to that account/browser, not server backups.

Short explanations live under “How places work”. There is no participation, gameplay or acceptance guarantee. If the new policy RPC is unavailable, new campaign creation/claiming explains that rules are unavailable rather than silently promising the new terms against an old database.

## Checks

Extended existing helpers/tests, without new dependencies or standalone test scripts:

```powershell
npm run test:reservations
npm run test:reservations:concurrency
npm run test:tester-browser
node tests/test-build-results-selection.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The isolated fixture checks cover new/existing capacities, explicit/idempotent legacy activation, expiry without cleanup, exact deadline boundary, release, permanent submitted consumption, rejected reports and audited replacements, same-ID campaign and pre-campaign reclaim, eligibility, one-active handling, ownership/private permissions, XP and build-lock preservation.

**Real PostgreSQL 17 multi-connection checks passed**: final-place reclaim versus another claimant, commit/rollback outcomes, a submission waiting on a capacity lock across its expiry, and one tester in simultaneous tabs. The existing policy harness creates/removes a disposable container with no network, published ports, host volumes, source credentials or recovery-container access. Embedded-engine queued requests are separately labelled simulation.

Mocked browser checks passed: deadline/final-24-hour warning, expired activity/freed active slot, blocked expired submission, saved draft after reload and failed reclaim, successful same-ID reclaim, in-memory editor preservation when storage fails, and desktop/mobile layout. Source integration was not run. TypeScript and changed policy/test lint passed; existing effect-state lint errors remain in unchanged sections of tester draft loading and StartPlaytest (plus existing image/dependency warnings).

## Exact remaining application steps — require separate authorisation

1. Apply **only** `supabase/migrations/202610280012_tester_reservations.sql` once to the intended authorised database using the existing SQL workflow. It owns its transaction and reloads the schema cache. Requires the existing testing/genre/discovery baseline (001–009). Pending 010/011 are independent and need not be applied for this feature. Stop on any error, including an unexpected discovery-function definition; do not rerun blindly.
2. Run the matching local application changes. Confirm a new campaign shows four places and an existing campaign retains its capacity. Existing active claims should still be undated at this stage.
3. Explicitly activate historical deadlines, as the database owner or authorised service role:

   ```sql
   SELECT public.activate_testing_reservations();
   ```

   Save the returned UTC activation timestamp. Historical active claims then expire 72 hours after that timestamp. Repeating this call returns the original timestamp and does not extend deadlines. Ordinary authenticated developers/testers cannot execute it.
4. Verify with dedicated test accounts: claim a place, confirm its deadline, start without extending it, submit feedback, and confirm submitted capacity persists after review rejection. Check release restores an unsubmitted place. Use the isolated tests for expiry/races; do not alter live deadlines or production reports to simulate expiry.

No cleanup service, secret, provider, notification delivery or deployment is required. Before activation, a failed application change can be reverted while keeping undated historical claims. After activation, do not reset policy timestamps/deadlines or run a destructive down migration: use an authorised forward correction, preserving reservations/reports and existing evidence.

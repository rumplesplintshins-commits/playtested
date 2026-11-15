# Testing policy implementation

Status: five local migrations prepared and executed in an isolated PGlite database. **Not applied to Supabase. No live data, deployment or Git push was performed.** V10 remains the remote backup. The updated UI requires these migrations; until applied, new RPC calls will report errors.

## Inspection and policy decisions

The supplied live audit, dated 28 October 2026, is the schema source. The repository previously had no migration history. Relevant tables are `profiles`, `community_playtests`, `community_game_tests`, `community_playtest_participants`, the three game sources and `game_developer_links`. Hub operations use security-definer RPCs directly from client components. The existing launch trigger and unique active-campaign indexes are retained. Existing tester-lock logic is retained. The existing campaign SELECT policies allow owners/admins; tester discovery uses the filtered RPC rather than a broad new SELECT policy.

The audit contained five profiles, two with positive tester XP, ranging from 100 to 200. There were two explicitly XP-awarded accepted reports, 26 accepted reports without XP, one pending report and one active report. The sample is too small for empirical percentile-based promotions. Initial thresholds are deliberately modest multiples of the existing 100-XP award, with independent minimum experience requirements:

| Rank | XP | Accepted tests with recorded XP awards |
| --- | ---: | ---: |
| Bronze | 0 | 0 |
| Silver | 500 | 5 |
| Gold | 2,000 | 20 |
| Platinum | 5,000 | 50 |

After five reports reviewed with the new rubric, at least 80% of those reports must currently be accepted to hold a rank above Bronze. Before five reviews, the rate does not block progression. Pending reports and legacy reports without a rubric do not enter this denominator. Reversals update the current quality history. Existing XP and completed-test totals are unchanged; existing explicitly awarded accepted tests count toward experience. Accepted reports without XP do not silently gain XP or invented rubric scores. On the audited data, everyone initially maps to Bronze. Developer levels remain; tester level/title displays in Hub, Account and the shared header are replaced by rank.

The five quality criteria are specific build observations, examples where applicable, useful explanations, task relevance and originality. All must be satisfied for acceptance, with a recorded reason. Examples may be marked satisfied when not applicable. Neither sentiment, rating, time, length nor bug discovery determines acceptance. Required written answers must be nonblank, with existing maximum field sizes retained. No minimum writing-length quality proxy remains in either submission overload or the browser form.

Admin review uses a locked report and profile balance update in one transaction. Identical repeated decisions are no-ops, except that resolving a pending reconsideration can record an upheld rejection with zero XP change. New review events record actor, rubric, reason, outcome, time and XP delta. Acceptance adds 100 XP; reversal subtracts the amount recorded for that report, and restoration adds the configured award. Existing award flags are annotated with the audited legacy amount (100), without changing profile balances. Historical ledger events are not invented. Inconsistent legacy balances cause a transaction failure, requiring explicit investigation rather than a silent recalculation. The old review RPC rejects requests lacking the rubric. Reconsideration requests are stored in the same admin-visible event stream. One request per review decision is allowed; event sequence IDs associate requests with decisions even when concurrent transactions have overlapping timestamps.

Developer Helpful/concern signals require a reason and never change XP, rank, outcome or capacity. Owners can read all submitted independent reports, including pending and rejected reports. Moderator replacement is a separate, reasoned, idempotent exception: the report stays stored and the place is excluded from consumption; XP requires a separate explicit quality decision. Original participation uniqueness remains, so replacement cannot let the same tester occupy another place in that campaign. Accepted-build locks persist even after a later quality reversal.

## Discovery, genres and claims

Minimum rank is ordered: a higher rank qualifies for every lower minimum. Campaigns default to Bronze and any genre. Genre preferences use existing game values plus the existing submission/catalogue choices, including legacy free-text values. Matching ignores case and repeated whitespace, but uses explicit whole-genre equality rather than guessed expertise or fuzzy matching. Unknown, Other and uncategorised values cannot satisfy a mandatory restriction. A campaign with no explicit testing genre inherits its game genre when saved; restricting genres requires a known explicit genre.

Hub preferences default to matching genres; empty preferences show all eligible games with an Account route. All genres changes only the client discovery filter. The server eligibility predicate still applies to listings and inserts. Private rank/capacity helpers cannot be called through the API. Owners and existing participants can read their campaign metadata; eligibility alone only exposes metadata for open Hub campaigns. The existing public catalogue exposes public game information, not restricted campaign build links. Public token-based community participation remains a separate community source and does not become verified independent Hub participation.

**New direct legacy-submission claims are disabled.** Otherwise closing a campaign would reveal the approved submission as an unlimited Hub entry, bypassing both limits. Developers must publish a campaign for new Hub participation. Existing legacy claims still appear to their owner and can be started, submitted or released. Existing campaign claims remain visible and usable after rank, preference, audience or availability changes. Existing public game/Steam access links are not blocked.

Each new claim retains the existing authentication, Tester-role, duplicate and one-active-test checks. The existing per-tester transaction lock serializes same-tester requests. A campaign transaction lock is acquired before reading capacity and inserting a reservation. Insert-time checks cover eligibility and availability even if another caller reaches the table through an existing RPC. The normal read-committed isolation level is required, so statements following a lock wait see committed reservations.

Capacity is derived from independent participation records, rather than a separately incremented counter: claimed/in-progress reserve a place; submitted/reviewed permanently use it. Only pre-submission voluntary release deletes a claim. Release now locks its row, preventing concurrent submission from being deleted. Submitted records cannot be reset to active, moved or deleted. Rejection and developer signals never free a place. Existing over-capacity records are untouched and can finish; new claims wait until fewer than two consuming places remain. External community participant records are excluded.

The server-owned `testing_policy` singleton is the authoritative free configuration: one launch in 720 hours, two places, 100 base XP. No client-editable plan or capacity is introduced. The old target argument is retained for compatibility but the server fixes it to two; it does not control capacity. Future entitlements require deliberate server-side changes to this policy, not a client plan flag.

Launch history remains `tester_hub_started_at`, immutable under the existing trigger. One first Hub publication per game is allowed in the preceding 720 hours. At exactly 720 hours a launch leaves the window. Drafts and community-only publications do not count. First switching an open community campaign into a Hub audience does count. Closing does not erase history; resume and later audience changes do not consume a second launch. Existing active-slot unique indexes remain. Historical launch dates and excess participation are unchanged.

## Applying the migrations

**Live-write hold:** the user has explicitly prohibited live Supabase migrations and data changes. Their Free project has no managed backup available. Complete [the database recovery-point procedure](database-recovery-point.md) before requesting any later migration authorisation. The following steps are future rollout instructions, not permission to execute them.

1. Take a database backup and use a staging copy of the audited database first. The V10 Git checkpoint is a source backup, not a database backup. These are incremental migrations against the audited schema, not a fresh-project bootstrap.
2. In Supabase SQL Editor, run each complete file below, **once, in order**, checking that its transaction succeeds before running the next:
   - `supabase/migrations/202610280001_testing_policy.sql`
   - `supabase/migrations/202610280002_workflow_integration.sql`
   - `supabase/migrations/202610280003_testing_read_models.sql`
   - `supabase/migrations/202610280004_claim_integrity.sql`
   - `supabase/migrations/202610280005_developer_quality_signals.sql`
3. The last migration requests a PostgREST schema-cache reload. Reload the application. Test with separate tester, developer and admin accounts. Keep application changes and migration rollout coordinated: old clients cannot perform rubric-free reviews, and new clients require the new RPC signatures.
4. Complete the staging checks below before a production rollout. Production migration execution and deployment require a separate explicit instruction. Do not run the test fixture against a real project: it creates synthetic schema objects and users.

If an individual file fails, its transaction rolls back; stop and retain the error before proceeding. Do not rerun already successful files. No down migration is supplied: dropping the review ledger or restoring old unrestricted claims would discard audit history or reopen bypasses. A source-only V10 revert does not revert database policy.

## Validation

Run `npm run test:testing-policy` for embedded PostgreSQL and actual page-helper tests. Run `npm run typecheck:testing-policy` for the changed UI and its imported dependencies. Start the local app with `npm run dev`, then run `npm run test:tester-browser` (default `http://localhost:3000`; optional `TEST_APP_URL`). The browser suite intercepts all browser Supabase requests and strips fixture cookies from requests to the Next server, so synthetic authentication cannot reach real Supabase. It uses the configured public endpoint only as an interception target and never prints keys.

Passed locally:

- All five migrations compile and execute on a reduced structural fixture derived from the live audit, in real embedded PostgreSQL through PGlite.
- Equal awards for useful positive and negative reports; duplicate decisions; rejection/restoration; reasons and reconsideration; moderator-only replacement; build locks surviving reversals.
- Rank XP boundaries and 80% history boundary; legacy XP preservation; hidden restricted campaigns; direct claim denial; strict genres and missing preferences; active claims still usable after eligibility changes.
- Fixed server capacity through create/update RPCs; reservations, release, submission, rejection and replacement; old excess claims preserved; external community participants excluded.
- Exact launch boundary, drafts, closing, audience changes, pause/resume, community exemption and the active-campaign slot.
- Database-role checks for profile RLS, private helpers and forbidden XP edits.
- Queued retry simulations for final-place claims and one tester claiming two campaigns. **PGlite serializes these requests; they are not genuine multi-connection lock tests.**
- Actual page helpers: blank ratings, nine-answer progress, concise answers, account/test draft isolation, cleanup, active/available separation and build/Steam link handling.
- Mocked-service Playwright browser: default preferred-genre filtering and All genres; blank ratings; local drafts after failed submission, reload and failed release; cleanup only after confirmed submission/release.
- Targeted TypeScript check; lint on new shared policy components and the rewritten admin review page.

Full-project TypeScript is blocked by pre-existing JSX in `app/api/pulse/history/route.ts`. Full-project lint also fails on existing issues across the repository, including effect state updates in the existing Tester Hub, header and campaign components. These unrelated failures were not suppressed. The reduced database fixture omits foreign keys/view internals and unrelated triggers; it is not a full Supabase clone. No live Supabase integration or true multi-connection checks were performed.

Before production, test real sessions and RLS with the complete schema, existing build history/results, public community links and a device-local draft. In particular, perform the two-session checks in `supabase/tests/concurrency-checks.md`. Recheck successful/failed release versus submission using independent connections, duplicate admin approvals, and existing accepted-feedback build locks. These checks need an isolated database or staging copy; do not use live users' claims.

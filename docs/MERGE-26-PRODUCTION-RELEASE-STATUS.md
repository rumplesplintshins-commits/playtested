## Latest release verification — 5 November 2026

- GitHub Actions run **#30** for commit `b7d99c647f548ad660117f79eefc3317d93d1eac` completed **successfully**. Privacy and regression jobs passed, including the new legacy-numbered-to-rank-only upgrade rehearsal and production build.
- The mounted historical database backup at `/mnt/data/database.dump` was independently SHA-256 checked: `83354c14882be6d869bf4a206683bcc7fbe17b177bce811461a9f6424319326c`. It remains a **4 November** snapshot, not a verified current production recovery point. Attempted PostgreSQL package installation in the working environment timed out; isolated restore remains unverified.
- **Release decision:** hold production writes and `v11` merge until fresh backup/restore assurance and final controller/privacy decisions. The owner's general instruction to ship does not establish missing legal identity, controller notice, provider account agreements or a recoverable current backup. No production migration or deployment occurred.

---

**Additional read-only production prerequisites (5 November):** `pg_cron` is installed; existing new-campaign capacity is 3; Pro launch limit is 15 (an explicitly supported input for migration 122 to change to 5); `_share_key(text,uuid)` exists; `_m26_activity_game(uuid,uuid)` is absent before the earlier Merge 26 migration that creates it. These checks do not substitute for full ordered migration execution. The privacy CI test now also runs migration 126 after 124 on its clean test fixture (commit `7b57e07`), with CI outcome pending independent verification.

## 5 November 2026 — release-gate recheck (latest)

- **Production remains unchanged:** PostgreSQL 17.11; 48 profiles, 40 feedback rows, 90 submissions; Merge 26 listing and privacy tables absent. The Supabase migration-list API reports no tracked migration entries for production. Do not infer that the baseline schema is absent from this empty list.
- **Hosted development reverified:** PostgreSQL 17.11; 9 profiles, 5 feedback rows, 12 submissions; 48-hour reservations, three-place capacity, Pro launch limit, private PC and analytics grants, ranks-only resolver, one active availability scheduler and most recent scheduler run succeeded. These are hosted checks, not only offline tests.
- **Rank-only schema drift resolved:** migration 126 was applied on development. Public feedback resolver returns `(test_id uuid, current_rank integer)`; legacy number allocation trigger is disabled. Twenty-nine historical development number mappings remain for controlled review. No production migrations applied.
- **Migration history caveat:** the Supabase migration-list API reports only the connector-applied forward reconciliation migration on development; earlier 101–125 were applied outside its tracked history. Treat the development schema as a test environment, not as proof of a clean production migration chain.
- **Backup evidence:** the user-provided 4 November `database.dump` still matches SHA-256 `83354c14882be6d869bf4a206683bcc7fbe17b177bce811461a9f6424319326c`. It is not a fresh backup and no isolated PostgreSQL restore was completed. The current execution environment lacks `pg_restore`/PostgreSQL binaries; package installation could not be completed. Do not claim recovery is proven.
- **Code:** hosted postflight assertions now check the rank-only function signature and absence of legacy number-allocation trigger, rather than uniqueness of rejected public numbers. Commit `2d75bb1f07c9c41e4faedae8174aba7f85c5a52d`.
- **Security advisor comparison:** both production and development flag the same two pre-existing `security_definer_view` errors on `public.approved_games` and `public.published_game_verifications`. These are not newly introduced by migration 126. The development advisor also reports numerous executable security-definer functions, mutable search paths and an Auth leaked-password-protection warning. Do not change these baseline views without reviewing public catalogue RLS and access behaviour. Advisor guidance: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view .
- **Release:** no merge to `v11`, no production migration, no Render deployment. Required before release: verified fresh database/Storage recovery, complete clean-schema migration rehearsal, privacy/controller approval, and deployment smoke tests. Do not turn general enthusiasm to launch into a claim these safeguards have passed.

---

# Current Merge26 privacy/recovery readiness ? 5 November 2026

Implementation directions selected, not blanket legal approval. Independent versioned page/Steam choices and audited attribution restriction/partial minimisation are implemented and tested; old combined-consent/no-control statements below are historical snapshots. Migrations123?125 applied/verified ONLY in development; production untouched. Hosted disposable-account testing exposed and corrected a NOT NULL profile-name mismatch in the uncommitted124 implementation. The neutral replacement is Restricted account; no genuine report was altered.

Real Auth test: ban rejects new sign-in and refresh, but an existing JWT can still read until expiry. RIGHTS-RUNBOOK therefore requires verified containment/expiry before case minimisation; public masking does not pretend to revoke account access or complete erasure.

Fresh complete Storage recovery VERIFIED:66objects/72810736bytes, all hashes and stable before/after inventory, restricted local ACL. Fresh database recovery BLOCKED: no existing usable connection/provider recovery point; old4November export is not fresh. Full isolated restore remains Not Run.

Remaining external gates: required legal identity/address disclosure (N Quanja is an alias; email/individual status confirmed), accountable full DPIA/LIA/actual audience review, named rights/retention operator and schedule, actual Render region/provider-account contracts/retention, fresh database recovery. No further permission to implement the already selected controls is needed. Production125 must install the absent minute worker during a later explicitly authorised release.

See OWNER-PRIVACY-DECISIONS, RIGHTS-RUNBOOK, DPIA-SCREENING and PRODUCTION-COMPATIBILITY. No production migrations, v11 merge or deployment occurred.

---

## Historical preparation snapshots

## Current preparation: proposals requested, not approvals

The owner explicitly requested implementation/documentation of proposed privacy decisions and read-only production checks, **without blanket legal approval**. The prior general approval question is superseded by specific D01-D07 in docs/MERGE-26-OWNER-PRIVACY-DECISIONS.md. Exact proposed Privacy/cookie/Terms copy is implemented locally and reproduced there; /privacy and /terms remain draft/noindex with no effective date.

Read-only production inspection is now complete at metadata level: eu-west-1 primary Supabase region, PostgreSQL17.11;44profiles,40reports/32accepted,66Storage objects. Existing column types match development; eight Merge26 tables are absent, and policies remain Free1/Pro15, places3 and72-hour new reservations. The ordered candidate plan and a tested forward dependency correction123 are in docs/MERGE-26-PRODUCTION-COMPATIBILITY.md.123 is prepared locally only, not applied to hosted databases. Production migration history is absent; this is not a full-chain rehearsal or clearance to run blindly.

The historical4November database archive passes SHA/size/list/full offline decode. Its45Storage files and manifest pass rehash. Production now has66objects; that copy is incomplete for current recovery. Backup API returns no recoverable timestamp/entries (PITRfalse, WALflagtrue), so fresh database and full Storage protection remain required. No backup/retention setting or production data was changed.

Specific technical/operational blockers: no dedicated public-attribution restriction control; NOT NULL tester/Auth CASCADE plus non-cascading audit/signal FKs and submitted-report guards block naive account erasure; consent has no notice-version/durable scope evidence and uses combined choice pending D03; the new production availability job is absent; Render region/agreement/retention evidence is unavailable through current tools. Owner-approved handling/designs, not wording alone, must address applicable gaps. DPIA screening outcome remains undetermined, not waived by modest current counts.

No production migrations, QA import, v11 merge or Render deployment. No fresh restore rehearsal or new live release smoke test. See the decision record for the exact remaining owner choices, PRIVACY-OPERATIONS for the manual rights/DPIA/provider assessment, and PRODUCTION-COMPATIBILITY for recovery/migration steps.

---

# Merge 26 production release status - BLOCKED

## Verified release inputs

- Repository: rumplesplintshins-commits/playtested. Working branch feature/merge-26. Code commit cd784b72ac88a633f5866e022fc92f98f9458fb5 was pushed and independently verified with git ls-remote. Existing untracked debug.log, playtested_schema.sql and supabase/.temp were excluded.
- Remote production branch v11 remains b7d861762e112598241d2270b29390a8a059b43b. This is a Git reference, not independent confirmation of Render's currently deployed commit.
- Sixteen final release-critical checks Passed: plan-policy, PC SQL/privacy, 48-hour reservations, Steam consent routes, core catalogue/Featured ordering, availability, isolated concurrency, security, trusted origins, notification routing, build selection, workspace, graded XP/moderation, TypeScript, targeted lint and final production build. Unchanged earlier evidence remains retained; not all 35 recorded suites were rerun. See MERGE-26-AUTOMATED-RESULTS.json. No feature/ranking change was made.

## Specific blocking gate: documented privacy decisions

The owner authorised deployment but explicitly instructed not to assume unresolved legal decisions were approved. MERGE-26-PRIVACY-REVIEW.md still calls the following unresolved production decisions. No separate decision record was supplied in the release request:

1. Approve/document proposed bases and notices for private PC/history processing and stable public tester attribution.
2. Approve analytics purpose/consent wording, granularity and consent evidence, including grouped page/referral analytics and the renewed opt-in requirement.
3. Approve retention/withdrawal/rights/erasure handling, including existing account/feedback/audit deletion dependencies; assign an operational procedure and responsible owner.
4. Confirm final controller/contact details, processor agreements, hosting/transfer safeguards and provider logging/backup retention; approve accurate published notices.

These are decisions recorded in the repository, not a new claim about legal compliance or a general request to re-authorise deployment. A concrete owner/legal sign-off/record covering them, or explicit corrections to implement, is required. No elapsed time or general deployment approval counts as that sign-off. An asynchronous clarification was requested during this run; pending responses are not approvals.

## Not executed / not certified

- A fresh Merge 26 production backup/provider recovery snapshot has not been verified in this run. Historical private backup directories, including Merge24, exist; their existence does not prove a current recovery point or current Storage coverage. The earlier recovery/rehearsal deferral is not a completed check. No credentials were requested or exposed.
- Current production migration compatibility and exact required pending versions have not been certified. Development migrations 101-122 and the release notes are inputs for the later production-specific comparison, not permission to replay development schema/seeds. The QA-only capacity script must never be applied to production.
- Production migrations applied: NONE. No users/games/submissions/feedback/XP/imported listings or production configuration were changed. No development QA records were imported.
- No v11 merge or Render action. No new production commit/deployment. Render release verification and post-release live smoke tests are Not Run because no release occurred.

## Resume order

Resolve the specific privacy decisions above. Then independently verify a fresh recoverable production backup and Storage protection, inspect current production schema/migration dependencies read-only, prepare/review only genuinely required non-destructive changes preserving plans/data and agreed Featured priority, and stop on any unsafe difference. Only after all mandatory gates pass may the already authorised production migrations, v11 merge, existing Render deployment and essential live smoke tests proceed. Do not weaken consent, RLS, authentication or release safeguards to unblock this status.

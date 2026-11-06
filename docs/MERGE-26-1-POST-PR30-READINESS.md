# Merge 26.1 readiness after PR30 deployment — 6 November 2026

**NOT READY for production migration approval until a fresh database recovery point is verified.** No migrations, production data changes, PR29 merge or deployment were performed. Worker execution must remain disabled pending its separate security fix or verified isolation.

## Integrated candidate and checks

PR29 incorporates production `v11` commit `9334c192283a7152069f445f70438a863abb033a` through merge commit `414833ea47b74d221b5cdca6b50d1343093bdb4a`, pushed only to `codex/merge-26-1-performance`. The merge was conflict-free. Other agents' branches/worktrees were not changed. An existing tag also named v11 means fetches must explicitly select `refs/heads/v11`; the production branch was fetched and verified explicitly.

Local combined TypeScript, production build, 24-file differential lint (11 baseline errors, no new rule counts), SSRF tests, SQL/API/migration guards, recovery-verifier/export-probe tests, realistic catalogue volume, screenshot/origin/submission/workspace tests and PC/reservation/privacy/tester/approval/availability/security/notification regressions passed. Browser checks passed at 320/375/400px and 100/150% CSS zoom. Browser timings use mocked services; they do not prove production catalogue performance or actual browser-toolbar zoom acceptance.

CI was requested by pushing the integrated branch. See exact-head workflow results before approval; neither an earlier green commit nor local checks substitutes for latest-head CI.

## PR30 live smoke evidence

The owner confirmed Render `playtested`, branch v11, commit9334c19, Live. Subsequent GETs returned homepage200 with catalogue markup, worker readiness401 and availability200/unavailable. `/games` returned404; it is not the catalogue listing route (the catalogue lives on the homepage). No authenticated admin preflight or mutation was invoked; those preflight requests can create reports. Actual Render build/runtime logs and authenticated browser smoke remain operator checks because connected Render access is unavailable. Public200 responses are not proof of a deployed SHA or a full catalogue data-load test.

PR30 hardens admin reachability only. The separate worker downloader vulnerability remains outside this release; do not enable execution. The owner confirmed absent execution variables on the public web service; code fails closed unless execution is exactly true and the runner is authenticated. A separate execution host's configuration is not certified by these checks.

## Production compatibility

SELECT-only capture at09:23:38 UTC: PostgreSQL migration history still ends `20261105200930`;128–131 remain unapplied. Relevant catalogue/fixture guard function hashes, policies and triggers match the earlier reviewed baseline. Counts:56profiles,95submissions,21approved,41reports,195362imports,9574eligible imports,126Storage objects, zero active archive/Test controls. Counts are point-in-time evidence, not invariants against normal user activity.

Using the newly captured production guard definitions, the four exact release-pack files again passed ordered synthetic PGlite execution, same-transaction ledger recording and duplicate/out-of-order rejection. This is not a production restore. Existing source hashes/order are recorded in `performance/MERGE-26-1-RELEASE-PACK.json`.

## Recovery gate

The existing protected database export at `database-20261106-retry2` was independently rehashed; archive listing and full decode to the null device passed. Auth users, listing_controls and migration-history data entries remain present. Capture was00:43 UTC. It is **not a fresh production recovery point**: profiles increased from55 to56. Matching schema or stable other counts cannot establish coverage of later writes or updated rows.

The export script requires hidden local operator credential entry; no PostgreSQL credentials are available in the current process. Do not retrieve or print credentials to bypass this requirement. The operator must run a fresh export into a new private directory, then request independent hash/decode/schema/data/Storage reconciliation. Run from the PR29 worktree:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/recovery/export-m261-database.ps1 -OutputDirectory "C:\PrivateBackups\Playtested\Merge261\database-post-pr30-fresh" -Execute
```

The directory must not already exist. Enter the existing connection URL only at the hidden prompt. Do not paste it into chat or put it in command arguments. Successful export alone does not authorise migration or release.

A fresh full Storage download was started into a new private directory using the installed CLI's supported project flags. Record its final verification outcome separately; an in-progress or partial copy is not a cleared recovery gate.

Full isolated database restoration remains **Not Run**: the verified native environment lacks required Supabase extensions and Docker. Retaining this deferral can be reasonable for additive, transactional migrations with current verified recovery coverage and a data-preserving code rollback, but it remains an explicit owner risk decision. It does not compensate for the currently stale database export.

## Exact approval-controlled sequence

1. Finish and independently verify fresh database/Storage recovery; reconcile metadata and capture times. Confirm responsible recovery operator and explicitly accept the full-restore deferral. Do not interpret this document as approval.
2. Verify latest PR29 head CI/mergeability against still-current `refs/heads/v11`; recheck Render current SHA, source/release-pack hashes, production ledger/fingerprints and competing security/claim changes. Stop and revalidate on drift. Capture9334c19 or the actual newer approved security baseline as the app rollback target.
3. Obtain explicit owner approval for the exact candidate and migration pack, including the low-traffic window and bounded locking. Keep worker execution disabled; preserve all live data, plans, secrets and configuration.
4. Apply prepared transactional release-pack files **128 →129 →130 →131**, one at a time, verifying each result and ledger before continuing. No blanket db push, seeds or historical migration replay. The installed CLI uses `db query --linked --project-ref qtcmzckdhgahuqqilmzj --file <reviewed-release-pack-file>`; older `--remote` syntax in historical documents is not supported by this installed binary. This is an unexecuted future write command, usable only after explicit approval.
5. Post128 verify guard hashes/owners/ACLs; post129 verify both index definitions/validity, catalogue invoker signature/ACL/ranking/filter/visibility; post130 verify aggregate shape and anon/authenticated denied, service-role-only execution; post131 verify both triggers, legacy preservation and source definitions. Use SELECT inspection and synthetic tests; do not mutate genuine records. Stop on any unexpected result.
6. Merge only the approved PR29 into approved v11. Let the existing Render On Commit workflow deploy. Preserve environment variables; no replacement services or databases. Confirm exact deployed merge SHA, Live status and build/runtime logs through Render.
7. Smoke-test catalogue first/cached pages and filters/Featured order, authentication, existing developer submissions/allowances/PC data, screenshots, admin metrics/review, Tester Hub/history/notifications, consent and PULSE auth. Prefer read-only checks; any mutation fixture needs explicit safe scope. Record actual browser/server errors and performance rather than substituting mocked timings.
8. On migration failure stop and inspect transaction/ledger state; do not replay committed steps. On app regression use the captured post-PR30 last-good application or an approved Git revert, retaining additive schema and live data. Do not remove PR30, force-reset v11, restore the old database or reverse data-bearing changes blindly. Schema repairs require a reviewed forward correction. Disaster recovery requires separate approval and loss assessment.

Remaining independent work: monitor latest-head CI and finish Storage verification. Remaining operator gates: fresh hidden-prompt database export plus independent verification, Render logs/authenticated smoke, explicit recovery-risk acceptance and production release approval.

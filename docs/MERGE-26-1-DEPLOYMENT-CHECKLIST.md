# Merge 26.1 production deployment checklist

**Not executed. Owner approval required before production writes, merge or Render deployment.** Target PR base `v11`; branch `codex/merge-26-1-performance`, based on `1c85227`. Merge 27 stays independent.

## Preflight

1. Confirm reviewed commit, clean worktree, dependency lockfile unchanged, no secrets/dumps/QA records. Re-run changed-code tests/build if integration changes code.
2. Obtain a fresh verified production PostgreSQL backup AND backup current Storage object bytes/manifest, using `docs/MERGE-24-BACKUP-RESTORE-PROCEDURE.md` and current release recovery policy. A database dump alone does not back up Storage files. Record hashes, readable restore TOC, coverage and recovery owner; do not reuse stale Merge 24 backup as proof of current coverage. Isolated restore rehearsal status must be stated accurately.
3. Read-only production checks on `qtcmzckdhgahuqqilmzj`: migration history, current function language/body/ACLs, indexes, title triggers and dependencies. Preserve plan limits, testing policy, imported listings and live configuration. Do not apply development seeds.

```sql
select version,name from supabase_migrations.schema_migrations order by version;
select p.oid::regprocedure, l.lanname, p.prosecdef, p.proacl, md5(p.prosrc),p.proconfig
from pg_proc p join pg_language l on l.oid=p.prolang
where p.oid in ('public.beta_fixture_hidden(uuid)'::regprocedure,
 'public.m26_listing_hidden(uuid)'::regprocedure,
 'public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'::regprocedure);
select indexname,indexdef from pg_indexes where schemaname='public'
and tablename in ('imported_games','game_submissions');
select count(*) from public.imported_games;
select count(*) from public.game_submissions;
select count(*) from public.listing_controls where archived or is_admin_test;
```

Save function definitions/ACLs and baseline aggregate counts securely before release. The production baseline already has repository migrations through 127 plus named fixture-guard hotfixes ending `merge26_catalogue_fixture_guard_plpgsql_hotfix` (20261105200930). **Do not replay migration 127 over the newer guard.** Stop if migration lineage or bodies differ from the reviewed known variants. Migration 128 explicitly refuses unknown bodies.

## Ordered migrations — only outstanding versions

1. `202611060128_reconcile_catalogue_fixture_hotfix.sql`: known current production guard bodies are no-ops; compatible known older SQL guards reconcile to the reviewed PL/pgSQL fast paths. Check resulting function definitions and ACLs before proceeding.
2. `202611060129_catalogue_custom_plan.sql`: two ordinary indexes and invoker catalogue custom planning; same signature/result/filters. Check guard hash compatibility first. Index creation takes locks: choose a low-traffic window and a bounded lock timeout at the migration connection. If lock timeout/failure occurs, stop and inspect transaction/history; do not improvise `CONCURRENTLY`, disable RLS or remove guards. Capture anonymous actual RPC timings and compare result totals before continuing.
3. `202611060130_developer_game_metrics.sql`: private identity helper and service-role-only aggregate RPC. Verify ordinary/anonymous cannot execute, service aggregate matches read-only reconciliation, no user identities returned.
4. `202611060131_game_title_limits.sql`: title and listing-revision triggers; no backfill/truncation. Check legacy unchanged rows remain editable and >60 changed/new titles fail in a rollback-only test. Preserve existing claim title compatibility.

Each file is transactional. Verify successful migration/history and expected definitions before the next file. All are compatible with the current app; new metrics UI is deployed only after its RPC. Unknown/failing results stop release.

```sql
select indexname from pg_indexes where schemaname='public' and indexname like 'm261_%';
select tgname,tgenabled from pg_trigger where tgname in ('m261_game_title_limit','m261_revision_title_limit');
select has_function_privilege('anon','public.m261_developer_game_metrics()','execute') anon_allowed,
 has_function_privilege('authenticated','public.m261_developer_game_metrics()','execute') member_allowed,
 has_function_privilege('service_role','public.m261_developer_game_metrics()','execute') service_allowed;
-- Expected: false, false, true. Existing data counts are unchanged.
```

## App deployment and essential checks

After explicit approval and migration verification, merge reviewed PR into `v11` using the established workflow. Existing Render service `playtested` follows `v11` On Commit; do not create services or change secrets/environment. Confirm actual deployed SHA and health before declaring release complete.

Anonymous fresh-browser catalogue: pages 1–7, exact totals, Featured Playtested-first ranking, search/all filters/NSFW/fixture exclusion/dedupe; record real page/RPC timings and errors. Check cached revisits and data-saver behavior separately. Aim for first usable catalogue under two seconds; **this target has not been demonstrated on production**. Stop/assess if new 500s, authorization leaks or material regressions occur.

Authenticate existing accounts; check developer edit/title/PC/save, thumbnails and screenshots/gallery, admin review/moderation, metrics permissions/totals, Tester Hub/XP/reservations, notifications, consent. Prefer read-only checks and existing safe records. Real mutations require a recorded minimally invasive fixture/cleanup plan; never overwrite a real user's content for a smoke test. Check mobile/150% actual browser zoom and critical browser/server errors.

## Rollback

Prefer an approved code revert to the previous deployed commit; retain compatible additive migrations and all user data. Do not reset branches or restore a database over post-release writes. If catalogue planning regresses, use the securely captured pre-release **exact** invoker function definition/ACL and verify with anonymous RPCs; drop only the two new indexes if independently justified. Preserve the PL/pgSQL fixture guard (128), especially the production hotfix; never blindly rerun 127. New metrics functions can remain unused. Title triggers can be disabled/reverted only after approved impact review; do not truncate titles or delete revisions to force rollback.

A database restore is a separately authorized recovery incident with a write cutoff/data-loss assessment and isolated verification, not the default rollback. Storage restoration requires corresponding object bytes and manifest. Record final deployed SHA, migration versions, backup identity, timings, smoke results and any deferred checks.

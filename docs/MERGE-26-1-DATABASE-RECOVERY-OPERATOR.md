# Database recovery gate — 6 November 2026

**NO-GO. A current restorable production recovery point is not established.** Application candidate4caef4c and its passing CI remain unchanged; this follow-up concerns recovery only.

## Fresh evidence

- Authenticated read-only `supabase backups list --remote=qtcmzckdhgahuqqilmzj` returned region `eu-west-1`, `pitr_enabled:false`, `backups:[]`, `physical_backup_data:{}` and `walg_enabled:true`. WAL being enabled does not establish a listed restorable backup or recovery window. No restore, backup setting, paid service or production write was invoked.
- No existing production PostgreSQL connection/password was found in process/user/machine PostgreSQL environment settings, the authorised local environment files, or the checked default pgpass/service-file locations. Only presence was reported; no secrets were printed. This is not a claim that the operator has no credentials elsewhere.
- The installed CLI documents possible `database_write` use for credentialless remote exports. That path was deliberately not executed: temporary-role creation or credential/configuration changes would exceed the no-production-write boundary.
- Native PostgreSQL17.11 verification/export tools are available. The existing17:50 dump remains a historical archive: it passes integrity/decode checks but lacks current `public.listing_controls`. Its prior verification cannot close this gate. No fresh export or isolated restore occurred in this follow-up.
- Previously verified126/126 Storage objects remain a separate recovery package, not database recovery. Storage was not recopied or altered here. Reconcile its manifest against live inventory immediately before any approved release.

## Exact operator action required

Use the **existing** production direct/session connection from the correct project's Connect panel. Do not reset passwords, create temporary roles, paste secrets into chat or put the URL in command arguments/files. From a trusted local PowerShell terminal run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\OWNER\playtested\.backup-tools\merge26-1-performance-worktree\scripts\recovery\export-m261-database.ps1" -OutputDirectory "C:\PrivateBackups\Playtested\Merge261\database-20261106" -Execute
```

The script requests the connection through a hidden prompt. It verifies production project/port/database, uses process-only libpq credentials with read-only source connections, creates a new restricted private directory and never overwrites one. It uses one full custom-format `pg_dump` snapshot without schema/data exclusions, then exports roles without role passwords separately. It checks required Auth/application/Storage-metadata/migration-history table-data entries, including `listing_controls`, independently lists and fully decodes the archive to the null device, and records hashes/capture window in `verification.json`. Source credentials are restored/cleared from its process environment in `finally` and never passed in process arguments.

Preparation validation: PowerShell parser and no-execution preview passed; preview created no directory or connection. **The credentialed export path has not been executed/tested against production.** A failed probe/export/coverage check leaves an explicitly incomplete private directory; use a new output directory for any subsequent attempt after investigating privately. Raw diagnostics stay private. Existing backup files are untouched.

Return only the output folder and success/failure status to the agent, never the connection/password. Then independently rehash/list/decode, compare required current schema/function/ACL and migration coverage, and inspect source/archive consistency. A parseable archive is not a completed restoration. Use a new isolated disposable target if a compatible safe restore environment is available; never production, development or an existing database. Preserve the earlier restore-rehearsal deferral as an uncompleted residual risk unless an actual isolated restore is performed and verified.

The export does not contain Storage object bytes, provider secrets or a whole-service atomic snapshot. Roles and Storage captures have separate windows. Named recovery ownership/access, protected independent copy and agreed recovery-point/rehearsal policy remain to be recorded; do not silently certify them.

## Release sequence after the gate is resolved

1. Independently verify the fresh database export/provider recovery point and recovery feasibility; reconcile the126-object Storage backup and any subsequent changes.
2. Confirm current production function/migration fingerprints still match the reviewed128–131 guards and exact candidate commit. Obtain explicit owner production-release approval.
3. Apply only pending128→129→130→131, verifying each result/history/ACL/RLS and preservation before proceeding. Stop on unknown definitions or errors; never replay127 over the fixture hotfix or import development seeds.
4. Merge PR29 into `v11` through the established workflow, let the existing Render service deploy, and verify the deployed commit/health.
5. Run essential live smoke tests and real catalogue timings. Prefer approved code rollback retaining compatible schema/data; any database restore is a separate recovery incident and approval decision.

Until the fresh recovery gate and explicit release approval are satisfied: **no migrations, v11 merge or deployment**.

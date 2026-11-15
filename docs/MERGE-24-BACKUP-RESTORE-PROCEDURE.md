# Deferred production backup and isolated restore procedure

**NOT EXECUTED. BLOCKED at the owner's explicit request on 4 November 2026.** Do not request, retrieve or store production database credentials in the current run. These are instructions for a later separately authorised operator session, not authorisation to perform it. No production restore is part of this procedure. No existing database, including development, is a target.

## Evidence available now

- The archived `C:\PrivateBackups\Playtested\20261028-104630` roles/schema/data files match their manifest sizes and SHA-256 values when checked in this gate pass. That proves those files have not changed relative to the old manifest; it does not prove current coverage, a common snapshot, successful restoration or Storage-file recovery. The old manifest leaves those verification flags false. Historical package/rehearsal artefacts exist, but they do not demonstrate restoration of today's production baseline.
- Current production metadata was read only: PostgreSQL 17.11, expected policy rows and preflight fingerprints. A metadata JSON snapshot is **not a data backup**.
- Docker 29.9.2 is reachable with the approved local tool sandbox access. Supabase PostgreSQL 17.11 images are cached. Existing stopped recovery containers/volumes were inspected but neither started, restored into, overwritten nor deleted. The Supabase CLI is installed locally rather than on PATH. No new paid project or hosted preview is needed.
- The current production database password/connection was not requested after the owner deferred this gate. No passwordless CLI dump was attempted: the installed CLI documents that a no-password remote path may require `database_write` privileges. Any temporary-role/configuration operation would require separate approval and is not an acceptable silent substitute for an existing credential.

## Preconditions for a later run

1. Owner explicitly resumes this gate and authorises a **read-only export** of production `qtcmzckdhgahuqqilmzj`, local handling of its sensitive contents, a new disposable restore and local application of the reviewed migrations. Decide an acceptable recovery-point age and backup retention. A production write-quiescent/maintenance window, if chosen, needs separate approval; it has not occurred.
2. Use a trusted operator workstation/hidden prompt and the **existing** connection from the correct project's Connect panel. Do not paste it into chat, a command line, `.env.local`, Git, shell history or a transcript. Do not reset the database password, create a role, upgrade a plan or copy the development service key. The user's current prohibition on credential access remains in force until separately changed.
3. Allocate a new private directory outside Git and check disk space for the dump, encrypted archive, isolated cluster and a preservation comparison. Set restrictive permissions on the new directory only; do not repurpose/overwrite the 28 October archive or existing databases. Protect/encrypt the workstation and keep decrypted backup files out of synced/public folders. Existing inherited ACLs on older folders have not been certified as least-privilege.
4. Verify the cached image's `pg_dump --version` and `pg_restore --version` are compatible with production 17.11; pin and record its digest. Use `--pull=never` unless a separate image download is approved. Review extension availability and managed Auth/Storage/Vault dependencies before export/restore. Do not silently exclude unsupported data or call encrypted Vault contents recoverable without the required key path.

## Source export — prepared operator commands

Use PostgreSQL tools directly to avoid a CLI credential-management path. The following skeleton is for the later approved session; it does not create or alter a source database role. Supply the hidden URI only at that time. A local privileged user can inspect Docker process environment; a hidden prompt is not protection against a compromised workstation. Dumps can contain Auth hashes/session data and other secrets even though the connection password is not written to them.

```powershell
# DO NOT RUN in the current deferred session.
$releaseRoot = 'C:\PrivateBackups\Playtested\M24-Release-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
if (Test-Path -LiteralPath $releaseRoot) { throw 'Choose a new, unused directory.' }
New-Item -ItemType Directory -Path $releaseRoot | Out-Null
# Before export: apply/verify owner + SYSTEM + Administrators-only ACLs on THIS
# new directory, and encrypted-disk protection. Do not alter an old backup's ACL.
$releaseImage = 'public.ecr.aws/supabase/postgres:17.11.0.011' # pin its verified digest
$releaseSecret = Read-Host 'Existing PRODUCTION PostgreSQL URI (hidden)' -AsSecureString
$releasePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($releaseSecret)
$releaseNames = @('PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGOPTIONS','PGAPPNAME')
$releaseSaved = @{}
foreach ($releaseName in $releaseNames) { $releaseSaved[$releaseName] = [Environment]::GetEnvironmentVariable($releaseName,'Process') }
try {
    $releaseUriText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($releasePtr)
    $releaseUri = $null
    if (-not [Uri]::TryCreate($releaseUriText,[UriKind]::Absolute,[ref]$releaseUri)) { throw 'Invalid connection URI; value withheld.' }
    if ($releaseUri.Scheme -notin @('postgres','postgresql')) { throw 'Expected PostgreSQL URI.' }
    $releaseUserInfo = $releaseUri.UserInfo.Split(':',2)
    if ($releaseUserInfo.Length -ne 2) { throw 'Existing credential required; do not reset it.' }
    $env:PGHOST = $releaseUri.Host
    $env:PGPORT = if ($releaseUri.Port -gt 0) { [string]$releaseUri.Port } else { '5432' }
    $env:PGUSER = [Uri]::UnescapeDataString($releaseUserInfo[0])
    $env:PGPASSWORD = [Uri]::UnescapeDataString($releaseUserInfo[1])
    $env:PGDATABASE = [Uri]::UnescapeDataString($releaseUri.AbsolutePath.TrimStart('/'))
    $releaseDirect = $env:PGHOST -eq 'db.qtcmzckdhgahuqqilmzj.supabase.co'
    $releaseSession = $env:PGHOST.EndsWith('.pooler.supabase.com') -and $env:PGUSER -eq 'postgres.qtcmzckdhgahuqqilmzj'
    if ((-not ($releaseDirect -or $releaseSession)) -or $env:PGPORT -ne '5432' -or $env:PGDATABASE -ne 'postgres') { throw 'Wrong project/database or not direct/session pooling.' }
    $env:PGSSLMODE = 'require' # use verify-full + the verified provider CA where configured
    $env:PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=0'
    $env:PGAPPNAME = 'playtested-m24-readonly-backup'
    $releaseArgs = @('run','--rm','--pull=never','--network=bridge','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges')
    foreach ($releaseName in $releaseNames) { $releaseArgs += @('--env',$releaseName) }
    $releaseArgs += @('--mount',("type=bind,source=$releaseRoot,target=/backup"))
    $releaseProbeArgs = $releaseArgs + @('--entrypoint=psql',$releaseImage,'-X','-qAt','--set=ON_ERROR_STOP=1','--command',"select json_build_object('read_only',current_setting('transaction_read_only'),'version',current_setting('server_version_num'))")
    $releaseProbe = (& docker @releaseProbeArgs 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { $releaseProbe | Set-Content -LiteralPath (Join-Path $releaseRoot 'probe-private.log'); throw 'Source read-only probe failed.' }
    try { $releaseProbeValue = $releaseProbe | ConvertFrom-Json } catch { throw 'Unexpected probe response; value withheld.' }
    if ($releaseProbeValue.read_only -ne 'on' -or $releaseProbeValue.version -ne '170011') { throw 'Unexpected source read-only/version state; re-review before exporting.' }
    $releaseDumpArgs = $releaseArgs + @('--entrypoint=pg_dump',$releaseImage,'--format=custom','--file=/backup/database.dump','--verbose')
    $releaseDiagnostics = (& docker @releaseDumpArgs 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { $releaseDiagnostics | Set-Content -LiteralPath (Join-Path $releaseRoot 'dump-private.log'); throw 'Export failed; incomplete backup. Review the private log.' }
    $releaseRoleArgs = $releaseArgs + @('--entrypoint=pg_dumpall',$releaseImage,'--roles-only','--no-role-passwords','--file=/backup/roles.sql')
    $releaseDiagnostics = (& docker @releaseRoleArgs 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { $releaseDiagnostics | Set-Content -LiteralPath (Join-Path $releaseRoot 'roles-private.log'); throw 'Role export failed; backup incomplete.' }
} finally {
    foreach ($releaseName in $releaseNames) { [Environment]::SetEnvironmentVariable($releaseName,$releaseSaved[$releaseName],'Process') }
    $releaseUriText = $null; $releaseUri = $null; $releaseUserInfo = $null; $releaseDiagnostics = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($releasePtr)
    $releaseSecret.Dispose()
}
Get-Item -LiteralPath (Join-Path $releaseRoot 'database.dump'),(Join-Path $releaseRoot 'roles.sql') | Select-Object Name,Length
Get-FileHash -LiteralPath (Join-Path $releaseRoot 'database.dump'),(Join-Path $releaseRoot 'roles.sql') -Algorithm SHA256
```

The operator must complete the marked ACL, pinned-image and SELECT checks before using this skeleton. Capture UTC start/end times, exact tool/image versions, project reference and byte/hash manifest privately, without credentials. Do not enable PowerShell transcription or echo raw diagnostics/URI/environment values. If the data export fails, retain a clearly marked incomplete artefact; never reuse its path as a successful recovery point.

`pg_dump` provides a consistent snapshot for its own schema/data export while normal source writers may continue; it does not synchronise the separate roles, service configuration or Storage-object copies. Keep these distinctions in the manifest. Do not assert a single common whole-service snapshot unless that has actually been established. The existing `scripts/recovery/backup-database.ps1` is an alternative split-export helper, but its separate roles/schema/data stages deliberately leave common-snapshot/Storage/restore flags false; it is not interchangeable with a verified full recovery point.

## Integrity and coverage before any rehearsal

1. Check both files are non-empty and every process exit code is zero. Recompute SHA-256 independently and verify manifest equality after copying; do not rely on a logged “success” message. Run the compatible `pg_restore --list /backup/database.dump` in a read-only, no-network tool container and save its table of contents privately. A parseable TOC alone does not validate all compressed data blocks.
2. Inventory coverage: public tables/views/functions/grants/RLS/triggers/indexes/sequences, Auth users/identities, Storage buckets/object metadata, existing policy seeds/entitlements, managed-schema customisations and any migration history. Check extension/owner prerequisites against the fresh production metadata. A custom-format full export should include the source objects, but inspect rather than assume it; special platform objects and encryption keys need explicit treatment.
3. Back up Storage object **bytes** separately by authorised read/download operations, with object metadata, version/path, size and digest inventory for every relevant bucket. No upload/delete/policy change is part of backup. SQL Storage metadata is not file content. Reconcile concurrent file changes or arrange a separately approved maintenance strategy; a copy without a coherent inventory is incomplete. No production Storage keys are requested in this deferred run.
4. Separately record Auth/provider settings, application/worker configuration and required secrets in approved secure storage. Do not put raw settings or keys in Git. If Vault/encryption dependencies cannot be restored/decrypted in isolation, mark that coverage blocked instead of silently omitting them.
5. Encrypt the recovery package and filenames using the existing reviewed AES-256 7-Zip workflow (hidden password, saved separately). Test the encrypted archive, record its digest, and verify an independent protected/off-site copy by roundtrip hash and decryption test. No paid storage, third-party upload or password is authorised in the current run. Hash equality proves copying; a successful restore is still required.

## New isolated disposable restore — never an existing target

After the gate is resumed and the current export is verified:

1. Generate unique names for a new internal Docker network, new volume, new container and new target database, e.g. `m24-restore-<UTC-run-id>`. Abort if **any** name already exists. Never reuse `playtested-rehearsal-db`, its volume, the normal Supabase local project, development, production or an existing database. No `db reset`, remote restore URL, existing-volume mount or `--clean` operation is allowed.
2. Use `docker network create --internal <new-network>`, `docker volume create <new-volume>`, then a cached, verified PostgreSQL 17.11 Supabase-compatible image with `--pull=never --restart=no`, that new network/volume, **no `-p`/published ports**, and the backup directory mounted read-only. Use a newly generated local-only database password; do not pass source credentials. Do not launch Auth, REST, SMTP, workers, webhooks or application services against restored real-user data.
3. Configure local PostgreSQL's needed extension libraries, `cron.database_name=<new-database>` and `cron.launch_active_jobs=off` before startup. Keep the network internal and no ports even if a restored extension/webhook contains an external URL. Verify `docker inspect` shows precisely the new volume/network, no source environment variables, no published ports and restart=no; verify the network is Internal=true. Record the commands/inspection without passwords. If these checks fail, stop before loading data.
4. Through `docker exec`/local socket only, create the new target database from `template0`. Reconcile source owners/role grants from `roles.sql` with the fresh image's bootstrap roles: prepare a reviewed, private **missing-role/compatibility overlay for this new cluster only**, preserving the roles needed for owner/ACL restoration without copying passwords or blindly replaying duplicate managed roles. Stop on an unreviewed incompatibility; do not suppress all errors or use `--no-owner --no-acl` and then claim a security-faithful restore.
5. Restore into that new empty database, for example `docker exec <new-container> pg_restore --exit-on-error --single-transaction --dbname=<new-database> --username=<local-admin> /backup/database.dump`. Capture output privately. A successful exit is required; unsupported platform objects or missing extension dependencies must be resolved narrowly and recorded, never ignored wholesale. The command accepts **no hosted URL**. Verify this is the first load into an empty target. Source accounts/data remain untouched.
6. Compare restored table/row inventories, PK/FK validity, sequences, view/function definitions, grants/RLS/policies and owner/role behaviour with the export and source metadata. Record aggregate hashes/counts, not user rows, in non-private reports. Verify Auth/Storage coverage separately; no real-user email or login is needed. A restored-but-unreadable table or missing managed policy is not success.

The exact bootstrap overlay cannot be certified before the future current export and isolated image are inspected. This prepared procedure is intentionally **not marked tested or complete**. An old restore image, a schema-only check or synthetic PGlite tests do not close this gate.

## Exact migration rehearsal and preservation

1. Verify the 16 LF-normalised hashes using `node scripts/maintenance/prepare-m24-release.mjs`; use only the manifest's 001–016 chain in `MERGE-24-PRODUCTION-PLAN.md`. Capture an immutable local pre-migration inventory of the restored existing public/Auth/Storage data, with row counts and stable row hashes; run no application that could alter it during comparison.
2. Apply each reviewed file to the **new isolated database via local socket**, with ON_ERROR_STOP and a per-file hash/transaction outcome ledger. This is the first place migration writes are allowed. Stop on any failure; never advance or rerun the entire chain over partially applied state. Do not execute development seed/account/demo scripts.
3. Prove unchanged existing Free/Pro rows, existing testing `places=3`, activation timestamp, capacities and launch history. Prove unchanged user/profile/Auth rows, games/submissions, claims, reports, ownership and other pre-existing records. Allow only reviewed migration effects: new private tables/indexes/policies/functions, thumbnail/screenshot bucket metadata and the notification changes below. Review any other difference as a failure.
4. For migration 013, compare every existing notification by ID: recipient, kind/title/message, read state and creation timestamp stay equal; only the reviewed destination rewrite is allowed. Verify one durable key per existing recipient/event and no duplicate event delivery. Run owner/admin/unrelated/anonymous access and column-grant tests using isolated synthetic identities; no real-user messages leave the internal network.
5. Run the SELECT-only postflight and current focused database/RLS/integration tests against the isolated target. Test actual concurrent final-place/plan requests there separately from queued simulations, mutation denial, approved/pending media access, revocation, contact policy, retention boundaries and deletion/cleanup fulfilment. Keep cron disabled globally while testing a retention function manually on isolated aged synthetic data; do not unexpectedly age/purge restored real-user records and then claim all source rows were preserved.
6. Record wall time, locks, disk footprint, exact image/source/migration hashes, every compatibility accommodation, preserved-row checks and results. A local migration failure, unverified roles/managed schemas, missing objects/keys or unexplained data difference keeps the production gate **NO-GO**. Archive the redacted report with the encrypted recovery package. Do not clean up old containers/volumes; any later disposal must identify and verify only this run's newly created resources.

Primary references: [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [Supabase CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Supabase backup coverage](https://supabase.com/docs/guides/platform/backups). These support the snapshot/coverage distinctions; they do not establish that this deferred export or restoration has occurred.

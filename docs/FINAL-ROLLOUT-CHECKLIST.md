# Playtested rollout preparation — 28 October 2026

**Production writes, migrations, deployment and push remain prohibited.** Commands below are preparation or future proposals, not permission to execute production changes. No existing work was discarded, committed or pushed. Completed tests were reused.

## Verified release identity and current drift

- Git HEAD: `af14fee7d92ffd4f2231c7d05bba3decb5642a23`, with uncommitted/untracked work. HEAD alone is not the release identity.
- Exact tested app-content manifest: `d1d06c3754031fb82bd47fff35837472981abe7e8a502957d5fec2f3c5c70288`; per-file working/tested hashes and declared offline-font/TypeScript snapshot differences are in `rehearsal-source-manifest.json`.
- Current application files match all recorded working-tree hashes; all five migration files match the rehearsed hashes below. No application changes require repeating the completed suites.
- Completed evidence: five local migrations, original-row preservation, 80 FK checks, 12 real session races, real Auth/browser workflow, fresh signup with automatic profiles/wallets and affected Storage RLS tests. The offline font accommodation is not proof of an optimized build of the untouched release layout; production build remains a release gate.
- Encrypted off-site archive verified: `Playtested-Recovery-20261028-r2.7z`, SHA-256 `78B3A2D496AC1545B224ED2A1FEA3ECEC43DD67B8C411A206CD4F7339C695C9D`. Cloud-download byte identity is user-confirmed; saved local AES-256/header/decryption evidence is reused.
- New read-only production snapshot at `2026-10-28T12:41:36.684578+00:00`: **zero net row-count or original-column-value differences in all 59 exported tables**, compared with the private pre-migration backup snapshot using sorted SHA-256 row fingerprints. Evidence: `rollout-production-drift.json`; private source audit: `C:\PrivateBackups\Playtested\rollout-drift-20261028-124158`.
- This establishes matching data at the compared endpoints, not absence of intervening writes. It does not compare new columns/tables, DDL, permissions or external settings. Original roles/schema/data exports did not prove one common snapshot. Therefore take a fresh coordinated backup immediately before an authorized rollout and review source schema drift; do not repeat unrelated tests solely because time passed.

| Full migration filename | SHA-256 |
| --- | --- |
| `202610280001_testing_policy.sql` | `6ec4385a9403348860918f2ed53f437f4c3fa50694db27342c06ec933c26535a` |
| `202610280002_workflow_integration.sql` | `c44816d26dbf2182af062a80b278d3949756cfd498fe5cbf0dc3d5f4384da1a9` |
| `202610280003_testing_read_models.sql` | `0270f3e16fb8c41a16f654aa4bff329813e20b6e46ceb8a566fcad88ba7cd28b` |
| `202610280004_claim_integrity.sql` | `7154d80d3dfe2829bb9877a9f2060722d129b924e606c99d31058d8d19ccebf5` |
| `202610280005_developer_quality_signals.sql` | `9155e3e7b9031bea41c8e5f7d538f7b2b6c89b2c71bc326a3790fcf7c81c9f80` |

## Only services and recovery material used by this application

Names/locations below deliberately contain no secret values. An ignored development file is not a verified secure recovery copy. Password-manager entries listed as needed must be confirmed by the owner; their existence is not assumed.

| Component | Evidence / applicability | Recovery configuration and location |
| --- | --- | --- |
| Supabase PostgreSQL, Auth and private Storage | Required by all current clients; source project `qtcmzckdhgahuqqilmzj`, PostgreSQL 17.11 | Verified SQL/off-site archive and separate recovered signup-trigger/Storage-policy supplement. Dashboard remains the source for project settings. Existing database password must be recoverable from the owner's password manager; vault/item location unconfirmed. |
| Email/password Auth | Public source settings GET at `2026-10-28T12:41:33.2603079Z`: email enabled, signup enabled, email confirmation required | Record source Site URL/redirect allowlist, confirmation behavior and templates from Auth settings. SMTP provider/host/port/sender and secure credential location are not exposed by that endpoint and remain owner-confirmed items. If built-in mail is used, custom SMTP credentials are N/A; do not assume custom SMTP exists or that public delivery has been verified. |
| Supabase app endpoint/public key | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` referenced by clients/proxy; names present in `.env.local` | Development copy: ignored `.env.local`. Public values are recoverable from project API settings; record intended release-host environment names. No service key belongs in a `NEXT_PUBLIC_` variable. |
| Pulse history public key alias | `/api/pulse/history` explicitly requires `NEXT_PUBLIC_SUPABASE_ANON_KEY`; absent from local environment-name inventory | Release configuration must provide a valid public Supabase key under this name if this route is in scope, or owner must explicitly exclude the feature. No code/key change made here. Production presence is unknown. |
| Server/worker Supabase access | `SUPABASE_SERVICE_ROLE_KEY` used by admin Steam/Pulse API routes and workers; name present locally | Current development copy: ignored `.env.local`; authoritative key recovery: Supabase project API settings with account access. Secure independent recovery location and release environment assignment need owner confirmation. SQL/source archives deliberately exclude `.env` and this value. |
| Steam queue worker | `scripts/workers/steam-queue-worker.mjs`, POST `/api/admin/process-steam-queue` | `STEAM_WORKER_SECRET` in local `.env.local`; secure recovery location unconfirmed. `PLAYTESTED_PROCESS_URL` is optional (defaults to local endpoint), not present locally. Production worker host/startup/scheduler status is unconfirmed. Needed only if queue ingestion runs. |
| Steam content backfill | `scripts/workers/steam-content-backfill-worker.mjs`, POST `/api/admin/backfill-steam-content` | Same worker secret; script currently targets `http://localhost:3000`. If retained, identify its real host/start method. Can be stopped during rollout or declared inactive; do not label it inactive without confirmation. |
| Pulse runner and technical worker | `scripts/workers/pulse-job-runner-v9.mjs`; preflight resolves `scripts/workers/technical-test-worker-v6.10.mjs` and executes it | `PULSE_RUNNER_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `PLAYTESTED_BASE_URL`. Names are present locally; base URL is `http://localhost:3000`. Requires Node/process execution, writable temporary build space and ClamAV binary/signatures. `CLAMSCAN_PATH` / `CLAMAV_DATABASE_PATH` are optional path overrides, absent locally. Production runner host and secure recovery locations unconfirmed. These are conditional on Pulse being in release scope; not evidence that generic serverless hosting supports it. |
| Steam Store/GitHub build downloads | Source uses public Steam Store discovery and caller-supplied GitHub/build URLs | Internet egress for these features; no referenced API credential found. `STEAM_WEB_API_KEY` exists as a local name but has no use in current app/lib/scripts: N/A for this release, do not add it to hosting merely because it exists. |
| Google fonts | Original layout uses `next/font/google` | No secret. Production build must resolve/cache its fonts or use a separately reviewed change; local offline font substitution is documented and was not applied to application source. |
| OAuth/SMS/anonymous Auth | All provider flags returned disabled by the source public settings endpoint; app uses email/password signup | N/A: no OAuth client IDs/secrets, OAuth callbacks or SMS credentials needed for this release. Mailpit is local test infrastructure only; N/A in production. |
| Payments, third-party app mail, external webhooks, Edge Functions | No Stripe/Resend/SendGrid integration, webhook dispatch or Edge Function dependency found in the app paths needed here; backup schema contains no `net.http`, `cron.schedule` or Vault references, and restored Vault secrets were empty | N/A to the rehearsed testing-policy release. This is scoped code/backup evidence, not an account-wide assertion that no unrelated service exists. No invented webhook signing secrets or function deployment steps. |
| Hosting and background startup | Repository README is generic; no verified production deployment/scheduler configuration was found | Owner must identify the actual host, deployment method, environment store, startup commands and which workers run. Supabase database hosting does not identify application hosting. No production deployment command can be truthfully specified before this decision. |
| Off-site archive password | Used only by private 7-Zip prompts | Owner-designated password manager, separate from the cloud archive. Do not put it into `.env`, Git, commands or a new inventory file. |

## Callback URLs and release scope to confirm

Verified local application origin: **`http://localhost:3000`**. Exact local callback route: **`http://localhost:3000/auth/callback`**; the tested Tester redirect is **`http://localhost:3000/auth/callback?next=/tester`**. Signup also uses that callback with other application `next` paths, including community playtests. Source Supabase origin is **`https://qtcmzckdhgahuqqilmzj.supabase.co`**.

The intended public application origin has not been provided. Do not substitute the Supabase API origin for it or mix `127.0.0.1` with `localhost`. The callback route must use the chosen application origin, preserve only intended internal redirects, and match the source Auth redirect configuration. Confirm the release origin and its exact required callback/query variants before a public release. If the app remains local-only, the localhost URLs above are the candidate release URLs; owner confirmation is still needed.

## One rollout sequence — proposed only

### 1. Resolve decisions, verify identity and build

Owner confirms app host/origin, active workers/features, source Auth/SMTP configuration and secure secret recovery entries. Freeze the release file inventory in a reviewed revision without discarding current work. A commit, push or deployment requires a later instruction; none is performed here.

Read-only hash gate from repository root:

```powershell
$release = Get-Content .\docs\rehearsal-source-manifest.json -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -ne $release.git_head) { throw 'HEAD changed; review the release identity.' }
foreach ($file in $release.tested_files) {
    if (-not (Test-Path -LiteralPath $file.path) -or (Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash -ne $file.working_tree_sha256) { throw 'Application changed; review affected evidence.' }
}
foreach ($file in $release.migrations) {
    if ((Get-FileHash -LiteralPath (Join-Path .\supabase\migrations $file.name) -Algorithm SHA256).Hash -ne $file.sha256) { throw 'Migration changed; rehearse it before rollout.' }
}
```

Expected: no error. Stop on drift; reassess/retest only affected changes. Any source changes after the recorded fingerprint require a new release identity.

In the selected release build environment with reviewed build configuration and safe build-time credentials, command: `npm.cmd run build`. Expected: exit 0 and a production artifact for the intended source. Stop on build/type errors; the successful dev/browser rehearsal does not waive this gate. No production build was run in this pass. The host-specific deployment command remains blocked on the host decision and later authorization.

### 2. Freshness, consistency and recovery gate

Agree a short maintenance/write-quiescence window covering users, Auth writes, all active workers and any other actual writers, or use a reviewed consistent-snapshot method. **No maintenance control or worker stop command is invented here:** the actual host/startup details are an owner decision, and pausing production requires specific authorization.

During that authorized window, take fresh read-only exports into an unused directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\recovery\backup-database.ps1 -OutputDirectory "C:\PrivateBackups\Playtested\pre-rollout-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Execute
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\recovery\inspect-source-recovery.ps1 -Execute
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\recovery\inspect-source-recovery.ps1 -Inspection Drift -Execute
node .\scripts\recovery\compare-rollout-drift.mjs
```

Enter existing source credentials privately, not as command arguments. Expected: successful export plus hashes/manifest; source inspections explicitly report read-only `on`. The original verified archive is retained. Changed data requires use of the new backup, not destructive reconciliation to the old snapshot. Review the fresh schema/role dump against the archived original for DDL/permission drift; the row-hash comparison alone does not do this. Review fresh managed definitions without blindly replaying the existing supplement.

If schema, migration contents or relevant configuration changed, stop and restore/rehearse only the affected changes in the isolated target. If source Storage objects now exist, separately copy and verify the actual objects. Encrypt and retain the fresh coherent recovery artifacts off-site using the established procedure with new paths; do not overwrite the verified r2 archive. Record activity/window, hashes and recovery destination. A separate-operations export is not called one snapshot without an established consistency method.

### 3. Apply the five files only after specific production approval

**Do not run this block now.** The destination must be confirmed as source project `qtcmzckdhgahuqqilmzj` and an exact release/window approved. Use the Session pooler hostname from that project's Connect panel; do not use transaction pooling. No Windows PostgreSQL install is needed: Docker supplies the already-used psql client.

```powershell
$poolerHost = Read-Host 'Approved source Session pooler hostname'
$release = Get-Content .\docs\rehearsal-source-manifest.json -Raw | ConvertFrom-Json
$migrationDirectory = (Resolve-Path .\supabase\migrations).Path
foreach ($migration in $release.migrations) {
    if ((Get-FileHash -LiteralPath (Join-Path $migrationDirectory $migration.name) -Algorithm SHA256).Hash -ne $migration.sha256) { throw 'Migration hash changed.' }
    docker run --rm -it --read-only --cap-drop=ALL --security-opt=no-new-privileges --user=postgres --env PGSSLMODE=require --mount "type=bind,source=$migrationDirectory,target=/migrations,readonly" --entrypoint=psql public.ecr.aws/supabase/postgres:17.11.0.006 --host=$poolerHost --port=5432 --username=postgres.qtcmzckdhgahuqqilmzj --dbname=postgres --password --set=ON_ERROR_STOP=1 --file="/migrations/$($migration.name)"
    if ($LASTEXITCODE -ne 0) { throw ('STOP: failed '+$migration.name+'. Do not rerun prior successful files.') }
}
```

Expected: each file reaches its own COMMIT and exits 0. Record file/hash/time/outcome after every file. There is no outer transaction: prior successful migrations remain committed if a later one fails. Do not rerun the entire loop after partial success. **Do not apply `managed-customizations.sql` to production**; it is for restoring missing objects into a recovery destination, and those objects already exist on source.

### 4. Coordinated app release, checks and recovery

Use only the chosen host's reviewed deployment command after later authorization; there is deliberately no guessed Vercel or other provider command. Keep the changed UI/RPC versions coordinated during maintenance. Expected: exact approved artifact/configuration, successful callback/signup/access behavior, normal error rates, no unintended background writers.

Production claim/submit/review/XP smoke tests create data: obtain specific approval for dedicated accounts/campaigns and the exact writes before running them. Reuse local concurrency evidence rather than load-testing production. Resume only the previously confirmed workers and writers after authorized checks; do not start every script found in the repository.

Stop on SQL errors, missing/changed expected objects, build/deployment failures, Auth/callback failures, permission regressions, unexplained XP/data changes, or sustained lock/errors. Preserve private diagnostics and successful-migration records; do not reset credentials or repeatedly rerun operations. Keep incompatible UI/writers out of service while assessing the failure.

Recovery: reproduce the failure on the isolated restored database and prefer a reviewed forward repair. There is no automatic down migration. A Git revert does not revert database schema or policy. A full production restore requires separate explicit authorization, verified artifact hashes, a tested isolated destination, a plan for writes since backup, coherent database/Storage/settings recovery and agreed downtime. Never point the fixture or local test harness at production.

## Decisions still requiring the owner

1. Confirm whether this release is local-only; otherwise supply the exact public origin/host and deployment method, plus source Auth callback/SMTP settings. Confirm the public-key alias required by Pulse history if Pulse is included.
2. Identify active Steam/Pulse processes, their hosts/startup method, and whether those features are in release scope. Declare unused workers N/A rather than inventing their status.
3. Confirm secure recovery vault/item locations for the database password, service-role key, active worker secrets and any real custom-SMTP secret. Names/locations only. Local `.env.local` is not an independent recovery copy.
4. Choose the consistency/maintenance window and later authorize the precise production actions. Until then, no production writes, build deployment or push.

Optional improvements, not blockers for the rehearsed policy itself: cleaning up unused legacy worker versions, removing unused local Steam API-key configuration, a nicer inventory UI, and repeated performance/concurrency testing without a relevant change. They are outside this pass.

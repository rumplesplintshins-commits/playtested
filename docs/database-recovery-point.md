# Database recovery point — live writes on hold

As of 28 October 2026, the user reports a Free project without managed project backups. **A database backup has not yet been created or verified. No live migration or data change is authorised.** All current local source changes must be retained. Do not reset Git, undo files, reset database credentials, change the plan, or restore production automatically.

## Execution record

| Activity | Executor / target | Outcome |
| --- | --- | --- |
| `supabase/inspection/v11-policy-audit.sql` | User, live Supabase SQL Editor | User supplied the result. The script uses `BEGIN TRANSACTION READ ONLY`, catalogue/aggregate SELECTs and `COMMIT`; it does not modify schema or data. |
| Reading the supplied audit export | Agent, local attachment | Read locally; no database connection. This export is not a data backup. |
| Five `202610280001` through `202610280005` migrations | Agent, disposable in-memory PGlite | Committed successfully **only inside the local test database**. The test database is closed after each run. None was submitted to live Supabase. |
| Fixture inserts, updates, releases, reviews and failure tests | Agent, disposable PGlite | Synthetic local rows only. Expected failures roll back locally. |
| Playwright submission/release requests | Agent, mocked browser service | Intercepted and fulfilled locally, never forwarded to Supabase. Fixture cookies are stripped before local Next server requests. |
| Live Supabase queries issued by agent | None | No direct read-only SQL inspection or writes executed by the agent. |
| Live writes, migration commits, restores | None by agent | No live commands or committed writes to report. |

The remote V10 branch/tag is a code recovery point, not a database recovery point. No live access is needed for the current embedded tests.

## Backup path for the Free project

Account inspection is unavailable: the Free-plan status is user-reported, not independently verified through a connector. To confirm, open the intended project in Supabase Dashboard, then **Database → Backups** (daily backup availability/retention) and its **Point in Time** section (PITR enabled state and recoverable range). Confirm the organisation's plan under its **Billing** page. Viewing these pages does not require enabling or purchasing anything. Record the project identity and displayed timestamps without sharing credentials.

| Recovery component | Current coverage / action |
| --- | --- |
| Source code | Remote V10 checkpoint; current local work preserved. Not a data backup. |
| Managed daily backups / PITR | User reports unavailable on Free; no recovery window independently verified. |
| Application tables, schema, routines, indexes and policies | Manual database export required; validate actual exported coverage on restore. |
| Auth users and managed-schema customisations | Verify data coverage and separately preserve custom policies/triggers; do not assume a public-schema export covers everything. |
| Storage object contents | Separate file backup required. `GameBuildManager.tsx` uploads private ZIP files to `game-builds`; inventory all other buckets too. Storage metadata is not file contents. |
| Edge Functions, worker configuration, Auth/provider settings, API keys and other service settings | Inventory separately; keep secrets in secure storage outside Git. No automated project configuration export has been performed. |
| Encryption dependencies / Vault | If used, use the encryption-aware recovery path and verify decryption in the isolated target. |
| Device-local feedback drafts | Stored in each tester's browser, not Supabase or Git; database recovery does not restore them. |

Supabase recommends manual CLI exports for Free projects. Its current backup guide exports roles, schema and data separately. Database backups do not contain Storage file contents; those require a separate copy. References: [database backups](https://supabase.com/docs/guides/platform/backups), [CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

The Supabase CLI, PostgreSQL command-line tools and Docker were not found on PATH in this session. Their installation, any live export connection and any restore rehearsal have **not** been performed. A manual backup is possible without a plan upgrade, but needs the appropriate local tools and a secure database connection.

1. Choose a private backup directory outside this Git repository, with sufficient space and an encrypted/off-site copy location. Never commit SQL dumps or credentials to Git.
2. Follow the official CLI installation prerequisites, including Docker. For a restore rehearsal, PostgreSQL client tools are also required. Do not install or change system services automatically.
3. In the project Dashboard's **Connect** panel, obtain the direct database connection details, or the Session pooler details if required by the network. Use the existing database password through a local secret mechanism. Do not paste it into chat, source files or recorded command text. Do not reset it as part of this process.
4. Capture a manual logical export using the current CLI's documented flags. Below, `$env:PLAYTESTED_BACKUP_DB_URL` must already have been populated privately, and the working directory must be the private backup directory. These commands are **prepared instructions, not executed commands**:

   ```powershell
   supabase db dump --db-url $env:PLAYTESTED_BACKUP_DB_URL -f roles.sql --role-only
   # Continue only if exit code is zero.
   supabase db dump --db-url $env:PLAYTESTED_BACKUP_DB_URL -f schema.sql
   # Continue only if exit code is zero.
   supabase db dump --db-url $env:PLAYTESTED_BACKUP_DB_URL -f data.sql --use-copy --data-only -x storage.buckets_vectors -x storage.vector_indexes
   ```

   The URL is expanded into the CLI process arguments: run on a trusted machine and do not share process listings or diagnostics containing it. An environment variable avoids putting the literal password in command history, but does not make process arguments secret. If that exposure is unsuitable, stop and select a client/credential mechanism with the operator before exporting.

   Alternatively, `scripts/backup-database.ps1` implements these three stages with hidden interactive URL input, exit-code checks and an integrity manifest. It refuses output inside this repository or an already existing output directory. Its default is a preview; it does not read credentials or create files. Example preview:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/backup-database.ps1 -OutputDirectory C:\PrivateBackups\Playtested\UNUSED-RECOVERY-POINT
   ```

   Only after tools are installed and the source connection is privately configured, the operator can explicitly add `-Execute` to perform the read-only exports. The URL is entered at the hidden prompt, not provided as a script parameter. The process-level execution-policy override does not change the system execution policy. The helper never applies migrations, restores data, upgrades the plan or resets a password. Its manifest deliberately leaves snapshot, Storage coverage and restore verification false. CLI diagnostics are suppressed to avoid disclosing credentials; a failed run must be investigated privately and partial files retained as incomplete, not reused as a backup.

5. Roles/schema/data exports are separate operations, not one guaranteed common snapshot. Record UTC start/end times. For a tightly defined recovery point, coordinate a write-quiescent window that includes background workers and user submissions, or use a reviewed consistent-snapshot export method. No pause of live traffic or workers has been performed or authorised here.
6. Include any existing migration history and customisations in managed schemas (`auth`, `storage`, etc.) using the official guide's special-case steps. Check all application-dependent schemas rather than assuming a public-only dump is enough. Keep export errors private if they contain connection details.
7. Copy Storage objects separately, particularly uploaded builds. Also retain the project configuration needed for recovery (Auth/provider settings, relevant secrets through secure storage, functions/workers and other external services). A database export alone does not reconstruct every project service. If Vault or column encryption is used, follow the official encryption-specific recovery procedure; do not assume a manual restore to another project can decrypt everything automatically.
8. Check exit codes, nonempty export files and hashes, then store an encrypted off-site copy. File presence and hashes prove integrity of saved files, not successful restorability.
9. Restore into an isolated disposable destination, following the current Supabase restore guide and reviewing the destination before issuing commands. **Do not point restore commands at production.** Record the outcome and verify profile IDs/XP, campaign launch timestamps, active claims, reports, functions, grants/RLS, Auth behaviour and build-file access. A restore is a write operation and requires explicit destination approval; none has occurred.

## Recovery-point record — fill after export and rehearsal

- Source project identifier (no credentials): **pending**
- Export UTC start/end and write activity during export: **pending**
- Private artifact location, file sizes and SHA-256 hashes: **pending**
- Storage objects and managed-schema customisations covered: **pending**
- Secure off-site copy confirmed: **pending**
- Isolated restore destination and verified results: **pending**
- Accepted recovery time / potential data-loss window: **pending**
- Explicit later authorisation for any live migration: **not given**

Keep the five local migrations unapplied until the recovery record and restore test are complete and the user explicitly authorises the specific live action. A backup does not itself grant permission to migrate or restore. Local implementation and isolated tests can continue throughout.

## Restored-development-database validation gate

This gate is **pending**: there is no suitable verified backup or configured restored development database yet. Passing the synthetic PGlite fixture tests does not satisfy it.

1. Select a separate disposable local Supabase-compatible development database. Confirm the connection is local, and record its identity before any restore. Do not reuse production or an ambiguous service alias. Disable outbound workers, webhooks, email delivery and other integrations that could contact real users or live services. Keep personal data access restricted; use a sanitised derivative where feasible without losing the schema and edge cases being validated.
2. Restore the reviewed exports using the current official restore procedure. Its no-encryption variant is shown below as a prepared template; `<LOCAL_DEV_PORT>` must be replaced only after confirming the local instance. PostgreSQL's `--password` prompts locally; no password appears in the command. Run from the private export directory:

   ```powershell
   psql --host=127.0.0.1 --port=<LOCAL_DEV_PORT> --username=postgres --dbname=postgres --password --single-transaction --set=ON_ERROR_STOP=1 --file=roles.sql --file=schema.sql --command="SET session_replication_role = replica" --file=data.sql
   ```

   Do not use this generic variant for encrypted/Vault data until the corresponding recovery procedure is reviewed. Managed roles/extensions can need destination-specific preparation. Preserve the original exports unchanged; document any changes in a separate reviewed restore copy. A nonzero exit code blocks progression. Confirm triggers are active again in subsequent sessions.
3. Restore separately backed-up Storage objects to the isolated target; verify bucket settings, private access, full paths, counts, sizes and representative hashes/downloads. Preserve metadata needed by the app. Do not upload anything to the production source. Validate Auth user identities, policies and application baseline behaviour before adding migrations.
4. Capture private before-migration row counts and balances, launch timestamps, claim/report identities and schema state. Test an existing campaign, accepted build lock and active claim. Record export hashes and source migration hashes.
5. Against **only that local restored database**, apply the five numbered migration files in filename order using `psql --host=127.0.0.1 --port=<LOCAL_DEV_PORT> --username=postgres --dbname=postgres --password --set=ON_ERROR_STOP=1 --file=<ONE_MIGRATION_FILE>`. Each file owns its transaction. Check each exit code before continuing; do not add a transaction wrapper around all five.
6. Compare preserved data to the captured baseline. Run the real multi-connection checks in `supabase/tests/concurrency-checks.md`, actual Auth/RLS tests and the application's browser workflows against the isolated target. Include approved/rejected reviews, reversals, launch boundaries, legacy excess claims, strict genre/rank visibility, Storage access and report/draft preservation. The existing browser mock suite is a separate test, not proof of this integration.
7. Record results, failures, exact migration hashes and restore duration. If any migration changes, repeat the rehearsal from a new restored development copy. Leave production paused until the user separately approves a specific rollout with a verified recovery point.

## Migration effects and recovery

The planned migrations do not intentionally drop application tables or delete existing claims/reports. They do replace RPC implementations, drop/recreate the old create/update function signatures, add tables/columns/triggers, annotate legacy awarded reports with the known 100-XP award amount, and seed permanent accepted-build locks. They restrict new legacy direct claims and rubric-free reviews. These are meaningful behaviour and schema changes, even though existing feedback and profile balances are preserved by the migration.

Later review actions can reverse XP, and a moderator replacement records a place exception. These actions are auditable but must be assessed separately from restoring a whole database. Submitted-report deletion guards may affect cascaded account/campaign deletion; rehearse those dependencies before rollout. A failed migration file rolls back its own transaction; earlier successful files stay committed. A Git revert will not undo those database changes.

No automatic rollback/down migration is prepared because dropping new ledgers would discard audit history. On failure: stop further application, retain errors and hashes, assess a forward repair on a restored development copy, and request explicit approval before changing production. If a full recovery is chosen, first prove the selected backup in isolation, reconcile writes made after its capture, then explicitly approve the production restore and any downtime. Restoring an older database can lose later reports, claims and XP changes; Storage and project settings must be recovered coherently. No production restore or destructive cleanup is authorised by this checklist.

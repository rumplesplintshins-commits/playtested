# Independent completed backup verification — 6 November 2026

**Fresh database/Storage integrity and coverage gate: PASS.** This supersedes the earlier missing-current-database findings. **Full isolated restoration: Not Run. Production release: not authorised.** Retain the existing restore-rehearsal deferral as a recovery risk; these results do not turn it into a passed restore test.

Source archive: `C:\PrivateBackups\Playtested\Merge261\database-20261106-retry2`. Operator capture window: **00:42:35–00:43:05 UTC, 6 November**. Independent verification completed shortly afterwards. Original backup files were read only; no production schema/data/settings were changed, migrations applied, branches merged or deployment performed.

## Results

| Area | Result | Independent evidence |
| --- | --- | --- |
| SHA-256 and sizes | **PASS** | `database.dump`:44,116,256 bytes, SHA256 `e460d3572cc1f44fefb1da5f349f82c95fbfb2eb1c2dd46ea39e637a77ce804f`; `roles.sql`:6,173 bytes, SHA256 `12883f7f093394b6ca72c8943e10b88bd9833a38f45116d07c94e990b0983b95`. Both match operator `verification.json`. |
| Archive integrity | **PASS** | Independent PostgreSQL17.11 `pg_restore --list`, full decode to NUL and streaming decode of all112 table-data sections succeeded. No restore/database connection was used for these operations. |
| Required schema/security/history coverage | **PASS — coverage, not restored behavior** | All107 checked tables are present, including `public.listing_controls`;95 source RLS-enabled tables have ENABLE RLS statements; all71 policy definitions are present;191 public function names/bodies match with line-ending normalization. Owner-role definitions are covered;451 ACL and27 default-ACL entries plus GRANT/REVOKE statements are included. All29 migration version/name records match current read-only production metadata, ending `20261105200930 merge26_catalogue_fixture_guard_plpgsql_hotfix`.128–131 remain unapplied. |
| Auth/application data | **PASS** | Archived counts reconcile with current read-only source counts:55 Auth users,57 identities,55 profiles,95 submissions,195,362 imported games and41 feedback reports. Archive also includes18 campaigns,1 listing revision and the empty current listing-controls table. Auth rows were not printed, imported into development or used to log in. |
| Database/Storage consistency | **PASS** | Archive Storage metadata and fresh source inventory both contain126 objects. Every object ID/key/version/update timestamp/size reconciles with the protected126-file manifest. All126 files independently rehashed:92,507,259 bytes, zero missing/changed objects. Three buckets are included in SQL data. Manifest SHA256 `c575e1c3a8a32da18338f909d38de2ee44d6dd5bdff1cfa472e03cc379dd7554`. |
| Faithful isolated restore on current host | **FAIL prerequisites / NOT RUN** | Native PostgreSQL17.11 tools are installed, but matching `supabase_vault`0.3.1 and `pg_cron`1.6.4 are unavailable in the installed Windows extension controls. Docker is not available through the verified toolchain. No existing database was used, no native cluster was started, and no errors were suppressed to claim a successful restore. |

The export directory/files have **zero Allow ACL entries for Everyone, Authenticated Users or local Users**. SQL data and file bytes remain in protected local recovery storage; only aggregate metadata/hashes are committed. SQL includes0 Vault secret rows and2 cron job rows; no restored jobs were activated.

## Independent method and comparison limits

The agent recomputed hashes rather than relying on script success flags, independently regenerated the TOC/schema, decoded all compressed blocks and streamed COPY records in memory. A separate authenticated SELECT-only metadata capture supplied current table/function/RLS/policy/migration metadata and aggregate counts (`tests/m261-recovery-readonly-metadata.sql`). No credential was requested or printed. No arbitrary archive SQL was executed.

COPY records were counted by LF boundaries, preserving embedded carriage returns instead of treating them as extra rows. Windows text-output line endings were normalized when comparing function bodies. Migration records were compared as ordered version/name pairs rather than JSON object-key order. Initial comparison artifacts were resolved without changing source data, ignoring rows or weakening policy checks. Final comparisons have zero missing tables/functions/policies/RLS markers and all compared counts agree.

These checks demonstrate archive/security **coverage**, not operational restoration of every permission, extension or application workflow. An isolated restore is the stronger behavioral check and remains unperformed. The metadata comparison covers the documented production schemas and public application functions, not an unsupported claim that every provider-internal service setting is exportable SQL.

## Recovery limitations retained

- This is a consistent custom-format `pg_dump` snapshot; roles and Storage bytes were captured separately. It is not a whole-service atomic snapshot. Reconcile Storage/live changes again immediately before an approved release.
- Provider configuration, environment secrets, Auth provider settings, encryption keys and third-party services are separate recovery dependencies. SQL coverage is not evidence that those operational settings were backed up or tested. No Vault secret rows were present in this archive, but the extension remains a restoration prerequisite.
- Protected local access is verified; independent/off-site copy, encryption-at-rest policy, retention and named incident/recovery ownership are not newly certified here. Follow the existing recovery runbook and agreed policy.
- A faithful rehearsal requires a new isolated Supabase-compatible PostgreSQL17 environment with the required extension versions, an internal network/no public ports, disabled cron/job launch before data loading and a reviewed owner/role compatibility overlay. Never restore into production, development or an existing database. Preserve source owners/ACLs and stop on unsupported objects instead of discarding errors.
- Any incident restoration can lose post-snapshot writes and needs a separate recovery decision. Prefer approved code rollback preserving data for a release regression.

## Gate decision and release sequence

The **missing fresh database backup blocker is cleared**: current required schema, security/migration and Auth/application data coverage, archive integrity and matching Storage file protection are independently evidenced. Full restore assurance is explicitly still **Not Run** under the existing deferral. If a completed full rehearsal is required before deployment, that separate gate remains open; do not label it passed.

Before production writes: check the exact reviewed candidate/latest CI, recheck production guard/history fingerprints and backup freshness/Storage reconciliation, and obtain **explicit release approval** retaining the documented recovery risks. Then follow the existing checklist: pending128→129→130→131 with per-file verification/history/security checks; merge PR29 into `v11`; allow the existing Render service to deploy; verify SHA/health and essential live smoke tests/real performance. No release operation is authorised by this verification report.

Evidence: `docs/performance/MERGE-26-1-INDEPENDENT-DATABASE-VERIFICATION.json`. Earlier failed/historical backup reports remain history and are superseded for the fresh-backup coverage gate only.

Current update: reviewed candidate sequence now101?125.123?125 applied/verified in development only; production remains unchanged. See the updated-candidates/recovery section below; earlier45-object backup findings describe the historical archive, superseded for Storage by the verified66-object copy (fresh database recovery still blocked).

# Merge 26 read-only production compatibility and recovery plan

Source inputs: feature/merge-26 after f16af99. No production DDL/DML, migrations, schedules, v11 merge or deployment. Collected metadata via explicit --remote=qtcmzckdhgahuqqilmzj --read-only; no individual profile/report rows were exported. Sanitised evidence: MERGE-26-PRODUCTION-EVIDENCE.json. Full intermediate metadata remains ignored locally.

## Compatibility findings

Production PostgreSQL17.11 has 63 public tables/views and159 functions; development71 and190. No existing public column-name/type mismatch was found. Eight new tables are absent in production: account_pc_specs, campaign_availability_state, game_pc_requirements, listing_control_events, listing_controls, m26_steam_clicks, tester_availability_preferences, tester_public_identities. Neither environment has a migration-history table certifying this work; do not infer versions from filenames or blindly run db push.

Production policy: Free1/Pro15 launches over720hours, Pro48-hour gap, places3, new reservations72hours. The accepted Merge26 application expects Pro5 and48-hour reservations; 114/122 intentionally change those policies while retaining old launch history and issued deadlines. 121 is already a row-value no-op for places3, preserves the existing1..50 bound and saved targets. Confirm defaults/constraints immediately before any approved application. No development QA capacity correction or seed data belongs in production.

Existing-function fingerprints differ for: _listing_base(text,uuid), _share_key(text,uuid), beta_fixture_hidden(uuid), campaign_eligible(uuid,uuid), confirm_listing_reassessment(bigint,integer,text), get_discoverable_community_test_games(), get_public_catalogue(integer,integer,text,text,text,text,boolean,text), m24_analytics_retention(), m24_analytics_summary(), notify_developer_feedback(). Nine are accounted for by Merge26 replacements/visibility-wrapper changes. One dependency was unversioned: development _share_key(approved,id) resolves the raw Approved submission; production uses approved_games, whose new visibility filter can hide archived IDs. Candidate migration123 now versions the private identity resolution without changing public caller authorisation, rows or grants. A local actual-SQL regression confirms archived approved aliases preserve owner requirements while anonymous archive reads remain denied. It has NOT been applied to production or development in this preparation pass.

The existing production daily m24-analytics-retention job is active at17 3 * * *; the Merge26 minute availability job is absent. The116 retention function adds Steam events to the existing job. The110 worker must be scheduled and verified under future production authorisation before claiming waiting/alert cleanup works there. Do not print cron command bodies or secrets.

Metadata compatibility is positive but not a full production-baseline migration rehearsal. Fresh backup/recovery, remaining privacy decisions, exact per-function text guards and dependency/permissions verification remain gates. No destructive data rewrite or QA import is authorised. Featured priority remains the reviewed102 logic with Playtested games before unclaimed imports; no change was made.

## Ordered candidate migration set

Only after gates and preflight determine each is genuinely pending, use the following version order. Preserve original files; verify each transaction before continuing.123 is the newly prepared dependency correction for review.

1. 202611040101_merge26_listing_controls.sql
2. 202611040102_merge26_catalogue.sql
3. 202611040103_merge26_reporting.sql
4. 202611040104_merge26_historical_acquisition.sql
5. 202611040105_merge26_control_audit_retention.sql
6. 202611040106_merge26_private_listing_management.sql
7. 202611040107_merge26_public_claim_ranking.sql
8. 202611040108_merge26_tester_identity.sql
9. 202611040109_merge26_tester_analytics.sql
10. 202611040110_merge26_availability_notifications.sql
11. 202611040111_merge26_private_rank_helpers.sql
12. 202611040112_merge26_explicit_availability_choice.sql
13. 202611040113_merge26_pc_specifications.sql
14. 202611040114_merge26_48_hour_reservations.sql
15. 202611040115_merge26_immediate_feedback_approval.sql
16. 202611040116_merge26_testing_activity_steam_referrals.sql
17. 202611040117_merge26_closed_campaign_requirements_guard.sql
18. 202611040118_merge26_referral_snapshot_pagination.sql
19. 202611040119_merge26_expired_activity_referral_scope.sql
20. 202611050120_merge26_history_published_artwork.sql
21. 202611050121_merge26_new_campaign_capacity.sql
22. 202611050122_merge26_pro_launch_contract.sql
23. 202611050123_merge26_private_approved_identity.sql

Explicitly exclude scripts/merge26-qa-capacity-correction.sql, QA fixtures/tests/seeds, dumps and .temp. Production migrations contain necessary new-table/backfill/policy operations, not permission to import development rows. A failed/unexpected guard or schema difference means stop and review, not disable protection.

## Recovery evidence and remaining gap

The private 4 November database.dump is43913321bytes; its SHA matches the prior verification manifest. pg_restore list and full offline decode succeeded again with the cached PostgreSQL17 image, network disabled/read-only archive mount and output discarded, with no database restoration. All45 separately archived Storage objects (66700326bytes) and their manifest independently match SHA/size checks. These are integrity/coverage facts about that historical archive, not a current backup or a successful isolated restore.

Current production contains66 Storage objects. The45-object copy cannot cover all current files. Production backup API reports PITR false and WAL archiving enabled but returns no physical backup entries/recoverable timestamps. Do not infer a recoverable snapshot from WAL=true or public plan documentation. Database backups alone do not include Storage object bytes: [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

## Verified-method recovery plan for the next approved operator step

1. Agree maximum recovery-point age and whether any write-quiescent window is necessary. Obtain a fresh provider-confirmed recoverable point, or use an existing trusted PostgreSQL connection with hidden local credential entry for a read-only custom-format pg_dump. Do not request/reset passwords, create database roles, change settings, upgrade a plan or use db dump paths needing database_write as a silent workaround. No database credentials were retrieved in this preparation.
2. Create a new private encrypted/access-restricted backup directory outside Git; never overwrite the Merge24 archive. Enter credentials only in a trusted hidden local prompt, never a shell argument/chat/log/env-file commit. Keep protected recovery configuration/managed-service dependencies under a separate authorised operator procedure; pg_dump is not an export of provider settings, JWT secrets or every global role. No secret values belong in the manifest.
3. Require dump exit0, recorded size/SHA, a readable TOC covering Auth/public/Storage metadata and all required schemas, and successful full offline decoding. Preserve tool/server versions. These checks validate archive integrity, not functional restore success.
4. Separately inventory/download ALL current Storage buckets/objects to a fresh protected directory, including private screenshots; record bucket/key/object/version metadata privately, file size/hash and capture window. Reconcile current count/identity/versions and repeat for concurrent changes. Never log signed URLs or import files into a public test bucket. Protect Storage bytes independently of the database.
5. If an isolated rehearsal is approved, use a new disposable local container/cluster, network off, pinned compatible PostgreSQL/Supabase image and a new empty volume; never production or the existing development database. Resolve managed roles/extensions deliberately; suppress outbound jobs only inside the isolated environment. Do not omit ownership/ACLs and then claim original security was restored. Compare baseline counts/schema/grants/RLS and execute reviewed migrations/tests there without sending email or external jobs. Destroy only the exact newly created disposable resources after evidence is preserved.
6. Full isolated restoration remains Not Run. If deferred for this release, explicitly record that residual recovery/compatibility risk; do not count decode/PGlite tests as a completed restore. A fresh verified recovery point and complete Storage protection remain necessary before production writes.

## Approved-write preflight/verification/rollback boundaries

Immediately before the future release, recheck exact ref/commit, backup freshness, object inventory, policy/constraint values, signatures and existing approvals. Capture privacy-safe integrity totals and issued deadline timestamps in protected evidence. Apply only reviewed pending migrations one by one; check tables, existing functions, grants/RLS, defaults, record/XP counts, unchanged old reservations, preserved game/import rows and agreed Featured ordering. Schedule/verify only authorised jobs. Merge/deploy through the existing v11/Render service only after migration verification.

Prefer a code rollback preserving data and private new tables; retain hardware label decoding for saved canonical IDs. Never delete genuine reports/XP/audit or reset public-number mappings. Policy rollback affects future reservations/launches only, with explicit review; it must not rewrite issued deadlines or erase old usage. Restore prior function definitions from reviewed snapshots only. A full production database restore overwrites live changes and needs a separate recovery decision; it is not an automatic rollback. After any approved deployment, run authorised non-destructive live auth/catalogue/submission/workspace/TesterHub/feedback/notification/hardware/consent smoke tests. None ran as a new release in this pass.


## Updated candidates and read-only evidence ? 5 November 2026

Append after123: **24. 202611050124_merge26_attribution_restrictions.sql**, then **25. 202611050125_merge26_availability_schedule.sql**.123?125 are applied and verified only in development. Production still63tables/views/159functions; development now73/192. Existing matching column names have no type differences. Ten new tables (including tester_privacy_restrictions/actions) are absent from production. No production SQL was applied.

124 requires108 identities,110 waiting preferences and113 private PC tables; it renames/revokes the old feedback resolver, then installs the restriction-aware wrapper atomically. Test the anonymous/ordinary/admin paths before proceeding.125 requires pg_cron and process_tester_availability(); it updates/creates named job merge26-tester-availability every minute, refusing differently named duplicate workers. Development has exactly one active matching worker; production has no such worker, only the active daily m24 analytics job. After a future authorised install verify job active, exact command/schedule, cron.job_run_details success, and30/90day fixture cleanup without touching genuine records.

Fresh Storage protection completed:66objects,72810736bytes; stable before/after bucket/object inventory, size checks and independent SHA256 rehash. ManifestSHA256 52980dbaba2f98ffd214597f904cd0506ab57c76a3bf0cf7211a374f90738920, verified2026-11-05T13:01:35.141Z. Local Merge26 recovery directory ACL restricted to current operator/SYSTEM/Administrators; no files retain broad public-group entries. Private manifests retain original keys/bucket settings. Failed earlier partial captures are NOT recovery points. Database metadata is NOT object bytes.

Fresh database recovery remains BLOCKED: no existing usable PG connection is available, no credentials were requested/retrieved/reset, and read-only backup API still gives no listed recoverable point (PITRfalse/WALtrue). An authorised trusted operator must produce the fresh verified custom export through hidden local credential entry using the existing backup procedure, or supply provider evidence of a recoverable timestamp and coverage. Do not use temporary-role creation or configuration changes to work around this. The verified historical export is not fresh. Full isolated restore remains Not Run; no rehearsal is implied by hashing/decoding/isolated SQL unit tests. Render has no connected CLI/API token; region cannot be independently verified here.

Development hosted test caught the actual NOT NULL profiles.display_name constraint; uncommitted124 now uses the neutral status Restricted account and the SQL fixture enforces NOT NULL. Real-admin/disposable-user retest passed. This was a development-only correction, not a production migration. Fresh Auth bans prevent login/refresh but previously issued JWTs remain a documented containment limitation.

Final existing-column definition comparison includes nullability/defaults: no type/nullability differences. Only expected testing_policy defaults differ: production places4/reservation72h versus development places3/reservation48h. Those are addressed by reviewed121/114 respectively; current production places ROW remains3. Preserve row history and existing issued deadlines, not a development seed overwrite.

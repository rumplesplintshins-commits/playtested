# Final controlled release checklist

4 November 2026. Application under review: `94939b9`; later documentation commits do not authorise release. **Current decision: NO-GO.** Fresh backup/restore is explicitly owner-deferred. No checkbox below is implied complete by the existence of a command.

## Before an execution session

- [x] Latest development/manual acceptance and compact layout recorded.
- [x] Current production schema/functions/policies/seeds compared read-only; all eight initial-rollout preflight checks true.
- [x] All 16 migration hashes verified; no development data/ACL dump is a production input.
- [x] Existing 38 lint errors and stale broad-suite failures classified, with justification and bounded proposed exceptions.
- [x] Terms/Privacy/Cookie implementation review and proposed corrections prepared.
- [x] Protected export, integrity and isolated-restore procedure prepared; old archive file hashes checked without claiming current backup coverage.
- [ ] Owner resumes and authorises current backup/isolated restore; procedure successfully executed and evidence accepted.
- [ ] Exact 001–016 rehearsal passes on the current restored production baseline, including preserved live-row comparisons and security/concurrency checks.
- [ ] Owner explicitly accepts the debt exception or remediation is completed; required CI checks are genuinely satisfiable under the approved policy.
- [ ] Owner/legal approve final public notice wording and practical deletion/retention/provider process; approved wording corrections are implemented in a separately reviewed change before public release.
- [ ] Record the correct existing Render web service ID/name, custom domain, linked repository/branch, current live commit/deploy ID, retained successful rollback deploy, auto-deploy mode, build/start/health-check settings and environment-group associations. These live dashboard details have not been inspected during this pass; no service credentials or configuration were accessed.
- [ ] Owner approves the exact application commit, manifest, production migration/configuration actions, controlled `v11` merge and Render deployment/rollback window. Any maintenance, auto-deploy setting or paid-infrastructure action needs explicit scope approval.

## Immediately before approved migrations

1. Verify the separately approved release commit and a clean relevant tree. Run `node scripts/maintenance/prepare-m24-release.mjs`; verify `docs/merge24-migration-manifest.json` has no unreviewed change. Keep the private execution ledger with UTC time, project, file/hash, outcome and operator.
2. Repeat `node scripts/maintenance/audit-m24-release.mjs` and `supabase db query --remote=qtcmzckdhgahuqqilmzj --read-only --file supabase/inspection/merge24-production-preflight.sql`. Stop unless all expected checks match. Check the bucket inventory also: the new screenshot bucket must be absent before step 011, and no unreviewed named retention job/schema/policy conflict may exist. Repeat the aggregate compatibility screen documented in the gate audit. If objects are partly present, stop and reconcile against the ledger; do not rerun the chain blindly.
3. Confirm current protected backup/Storage inventory and restore evidence remain within the agreed recovery-point window. Confirm no other release/schema/configuration work is in progress. Do not pause traffic/workers without separate approval.
4. Confirm schema-before-code ordering. Render may auto-deploy a push/merge to its linked branch. Before touching a deployment branch, the authorised operator must record and, **only if approved**, control auto-deploy behaviour. Do not assume a merge is harmless or deploy code before its schema. No Render action occurs in the current run.

## Exact migration order

All paths are under `supabase/migrations/`; use the checked-in manifest's LF-normalised SHA-256 values. Execute one reviewed file at a time with its own transaction and stop-on-error. Never run old baseline migrations or development fixture scripts. The future approved command form is `supabase db query --remote=qtcmzckdhgahuqqilmzj --file <exact-file> --yes`; it is a production write and must not be executed now.

1. `202611040001_private_submission_contacts.sql`
2. `202611040002_contact_email_validation.sql`
3. `202611040003_acquisition_analytics.sql`
4. `202611040004_gameplay_footage.sql`
5. `202611040005_thumbnail_limits.sql`
6. `202611040006_analytics_retention_schedule.sql`
7. `202611040007_evidence_link_validation.sql`
8. `202611040008_optional_evidence_completeness.sql`
9. `202611040009_contact_email_syntax.sql`
10. `202611040010_platform_user_metrics.sql`
11. `202611040011_game_screenshots.sql`
12. `202611040012_screenshot_delete_cleanup.sql`
13. `202611040013_notification_routing.sql`
14. `202611040014_restore_developer_plan_policy.sql`
15. `202611040015_contact_email_policy.sql`
16. `202611040016_restore_testing_policy.sql`

Preservation requirements: no existing Free/Pro assignment/reset, no overwrite of production's three-place testing policy/activation, no reservation activation/backfill, no account/submission/demo creation, no replay of October baseline/history. The notification destination rewrite/key population and new storage/cron objects are deliberate reviewed effects, not “no data changes”. There is no Supabase history table; use an accurate approved execution ledger rather than falsely repairing history or using bulk `db push`.

## Schema verification before deployment

- [ ] Run `supabase db query --remote=qtcmzckdhgahuqqilmzj --read-only --file supabase/inspection/merge24-production-postflight.sql`. Expect eight new RLS tables, all permission/configuration booleans true, correct private screenshot bucket/gateway, exactly one active named 03:17 UTC retention job, unchanged Free/Pro seed values and unchanged three-place/activation settings. Compare every final policy-array value with `lib/contact-email-policy.json`, not just a few samples.
- [ ] Confirm owner contact reads/writes and server-only admin read; no anonymous/foreign user data access. Confirm aggregate/screenshot mutation functions remain service-only, and notification clients may update read state but cannot rewrite title/recipient/destination. Use the rehearsal's verification queries; do not invoke erasure, retention or review/mutation RPCs on live users as an ad hoc check.
- [ ] Compare the preserved records/notification columns with the authorised backup/rehearsal protocol. Do not put raw user records in release logs. Any new unexpected row/configuration change is a stop condition.
- [ ] No production rollback/deploy is automatic on a failed query. Stop, record the exact last successful file, and obtain approval for a narrowly reviewed repair.

## Render deployment — future authorised operator steps

These are dashboard steps for the existing service, not a request to create another paid service. No Render API token/deploy hook is needed in a chat or a committed file. Confirm the real service before acting; no `render.yaml` or checked live service settings were available to establish its current configuration.

1. In the Render Dashboard, open the existing Playtested production **web service** whose custom domain/repository match the approved release. Record current successful deployment/commit and a retained rollback artefact. If the required rollback artefact is no longer retained under the plan, agree an alternative before proceeding; do not purchase an upgrade automatically.
2. After successful schema verification and approval, complete the controlled merge into the authorised production branch. If automatic deploys are enabled, this can itself deploy; the owner must have approved and controlled that behaviour in advance. Keep the exact resulting SHA; do not use a moving “latest” pointer as release evidence.
3. Review existing settings without exposing values. The browser/server public URL/key must target production `qtcmzckdhgahuqqilmzj`; service keys stay server-only. Do not copy `.env.local` or any development backup/test credentials. Record necessary changes for approval rather than altering unrelated workers, provider settings or environment groups. `NEXT_PUBLIC_*` values are baked into browser builds; a restart is not a substitute for rebuilding changed public configuration.
4. If configuration changes are needed and explicitly approved, use the repository's scripts with a compatible Node runtime: build `npm ci && npm run build`; start `npm run start -- --hostname 0.0.0.0 --port $PORT` on Render's Linux shell. Existing equivalent approved settings may be retained. Verify Sharp native dependency installation and the existing font-download requirement; do not add migration commands, seeders or user-data maintenance to build/start/pre-deploy hooks. Record any health-check path change for approval; no new health endpoint is introduced here.
5. From **Deploys → Manual Deploy → Deploy a specific commit**, select/paste the exact approved SHA and click **Deploy Commit** only after deployment approval. Current Render documentation says this dashboard action disables automatic deploys; that side effect must be within the approved scope and recorded. Avoid “Deploy latest commit”, deploy hooks or API calls that could select the wrong version. Never clear the build cache or change environment groups merely as a routine precaution.
6. Watch build/start logs and the configured health check. Record the deploy ID/SHA/result without secrets. An unexpected key/project URL, migration attempt, worker start, auth failure, missing native dependency, failed health check or unexplained error rate is a stop/rollback trigger. Reconfirm auto-deploy state after the action; do not re-enable it without approval.

References checked: [Render deploys](https://render.com/docs/deploys), [Render rollbacks](https://render.com/docs/rollbacks). Dashboard-specific actions are described according to these primary docs; the current service's actual settings still require owner/operator confirmation.

## Post-deployment smoke tests

Use only explicitly authorised synthetic production identities/data, or non-mutating inspection of existing records. Authorisation for a deploy does not implicitly permit modifying real users or approving their games. Existing development fixtures must never be imported into production.

- [ ] Public catalogue/game details render, compact desktop/mobile layout and actual 150% browser zoom if available; clearly distinguish any simulated zoom. Empty media gallery hidden; AI disclosure remains visible.
- [ ] Representative approved game screenshots preserve ratios, navigation/thumb strip work; pending media remains private and unrelated mutation/direct Storage access is denied. Test creation/removal only on the authorised synthetic submission.
- [ ] Poster shown; no iframe/direct thumbnail-provider connection before Play; retained manual video behaviour, close/switch reset and external restricted-video fallback. Server YouTube poster fetch is separately documented; do not claim no server-provider request.
- [ ] Developer/admin allowance loads from real configuration, action-first ordering/search/filter/selection work, general evidence field absent and claim evidence preserved. Optional contact save/clear/withdraw and suffix/disposable rejection work with no false success; unrelated/anonymous access denied.
- [ ] Admin Platform users/visitor/acquisition reporting is restricted; role overlap and unknown sources are honest. Analytics off by default, Allow/Reject/withdrawal work, private paths are excluded. Verify the named retention schedule/monitoring without executing a purge of live records.
- [ ] Synthetic Tester Hub claim/second-claim denial/release/different-game/feedback workflow works within real production policy (three places). No temporary Pro entitlement, XP fabrication or role widening.
- [ ] Admin review alerts only for reviewers; decisions/feedback only to the owner; precise links, counts/read/dismiss/toasts preserved. Distinct review revisions may legitimately create distinct events; one event/recipient must not duplicate.
- [ ] Public final Terms/Privacy/Cookie text matches the approved version/effective date and real operations. No draft is represented as final or silently treated as accepted Terms.
- [ ] Review errors/retention failures/screenshot cleanup with the named operator and record completion before declaring a release GO. Confirm users can request support/deletion and the approved fulfilment process is usable.

## Rollback / partial failure

1. **Migration failure:** stop at the first error. The failed file's transaction should roll back; earlier files remain committed. Preserve the execution ledger and protected backup. Inspect the exact state and approve a narrow forward repair. Never rerun all files, blindly mark history applied, restore production, drop the new tables or undo live users' later submissions.
2. **Application regression:** after incident/rollback approval, use Render **Deploys → prior successful retained deploy → Rollback → Rollback to this deploy**. Record the resulting deploy ID/commit and auto-deploy state. Dashboard rollback disables auto-deploy; API rollback does not. This is a new service deployment, not a database rollback, and remains outside the current authorisation.
3. Preserve additive contact/media/analytics/notification data when code rolls back. Recheck the old client's behaviour with the stricter server policy and new notification kinds; fail closed rather than relaxing permissions. A function/trigger/policy rollback must use protected pre-migration definitions in a separately approved SQL patch, never a destructive down-migration shortcut.
4. Render rollback does not restore database/Storage contents or all current configuration. Environment groups, platform runtime, disks and external systems have separate behaviour. Verify the target artefact still has correct production bindings; do not assume an old build proves current group values or provider state. A full production restore, traffic pause, password reset, job disablement or extension removal needs explicit incident authorisation.
5. Keep screenshots private, preserve historical evidence/AI records, and stop source mutations if separately instructed. Any local cleanup later must verify exact disposable resource names/paths and leave all earlier databases/backups alone.

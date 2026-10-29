# Playtested rollout preparation

## Beta fixture/claim execution status — 29 October 2026

**Completed in Supabase:** existing reversible pause mechanism applied only to the three confirmed campaign IDs below, with matching submission-ID predicates, in one targeted API PATCH. Read-back confirms all three `paused`; authorised public summary confirms `recruiting=false` for all three. No migrations were replayed, no records deleted, and no claims/feedback/XP were updated. Their public campaign-specific share contexts require open status, so they no longer recruit. Existing test history/relationships remain; active claims were not released or reset. To reverse, explicitly resume only these same campaigns after reviewing the current fixture-hiding decision; no automatic republishing was added.

| Confirmed listing ID | Confirmed campaign ID | Live status |
| --- | --- | --- |
| `d3100000-0000-4000-8000-000000000001` | `d3100000-0000-4000-8000-000000000101` | Paused; not recruiting |
| `d3100000-0000-4000-8000-000000000002` | `d3100000-0000-4000-8000-000000000102` | Paused; not recruiting |
| `d3100000-0000-4000-8000-000000000003` | `d3100000-0000-4000-8000-000000000103` | Paused; not recruiting |

**Completed locally, not deployed:** `/demo-games/neon-courier`, `/demo-games/mosslight-grove`, `/demo-games/orbit-foundry` return HTTP **404** under the built production server. Only that route is gated on production; local development fixtures remain usable. Production build and isolated claim-permission tests pass. No deployment/install/build seeding hook exists. Reporting still defaults to real data; its explicit labelled sample control remains development-only inside the ownership-authorised reporting workspace, with no sample data sent to reporting/claims/rewards. No sample storage or production preview was introduced.

**019 application blocked:** project identity again confirmed as `qtcmzckdhgahuqqilmzj`. Existing service-role API access can read/update authorised rows, but no authenticated SQL connection, CLI-linked project/token or database-password environment is available. The API does not offer arbitrary schema SQL. Therefore migration **019 has NOT been applied or live-verified**. It remains exactly the isolated-tested file, SHA-256 **`0B84A6FBFD055E32CADD963170C7F8C278CA7B346E6503AF5051B6D7DA681D2E`**. The owner has authorised only that migration; run its exact transaction (shown under the claim correction below) in this project's SQL Editor. Then inspect, without synthetic live claims:

```sql
begin read only;
select policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename='game_claims'
  and cmd in ('INSERT','UPDATE')
order by cmd,policyname;
commit;
```

**Full public listing/count exclusion remains BLOCKED, not completed:** pausing hides recruitment/Tester Hub availability, but does not exclude approved listings or historical synthetic results from every public catalogue/statistic. No suitable cross-source approved-listing visibility mechanism was established. The server-side paginated `get_public_catalogue` definition and underlying `approved_games` relation/view were not included in the earlier inspection or repository; filtering cards only after pagination would give incorrect counts/empty pages and is not an acceptable fix. No real imported record or legitimate listing was changed.

Smallest proposed follow-up: an exact-ID reversible public suppression predicate integrated before catalogue counting/pagination and in corresponding public detail/share/reception/aggregate outputs, while preserving owner/admin/tester history. A new migration may be necessary; **none has been applied or guessed from unknown SQL**. To prepare its exact integration safely, run this focused definition-only query in the same SQL Editor and provide its one JSON result:

```sql
begin read only;
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object(
   'signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid)))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f' and p.proname in (
    'get_public_catalogue','get_game_community_reception',
    'get_available_community_test_games','get_public_community_playtest',
    'get_public_submission_playtest_history','get_public_submission_playtest_feedback')),
 'approved_relation',(select jsonb_build_object('kind',c.relkind,
   'definition',case when c.relkind in ('v','m') then pg_get_viewdef(c.oid,true) else null end)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='approved_games')
) as public_fixture_visibility_inspection;
commit;
```

Read-only exact-ID inspection found **one independent test**, **zero community feedback**, **zero community participants** and **one tracked link** associated with these fixtures. All were preserved; the tracked link was not deleted/relabelled (general-game links still need the public suppression gate). A shared fixture owner is not proof of a disposable account; no other accounts or feedback on real listings were classified as synthetic without provenance. No title-word matching or broad account scan was used.

All three confirmed fixture listing/access/artwork destinations contain localhost. They are QA destinations to hide, not blindly rewrite to production. No hard-coded localhost navigation was found in the inspected runtime app/lib; Auth and sharing use the current origin. Worker-local defaults and localhost seed configuration remain deliberate development/worker configuration, not deployment seeding. Real-listing database URLs outside these three IDs were not audited or rewritten.

**Next owner actions (blocking information bundled):** run exact migration 019 plus its read-only policy verification, and the definition-only visibility query above; return only sanitised policy/definition output. Do not supply credentials. Fixture catalogue/count suppression cannot be claimed complete until the targeted SQL change is prepared, reviewed and separately applied. SMTP/Auth configuration, legal operator details and PULSE hosting remain unresolved. Deployment/DNS/Auth settings were untouched.

Manual checks once remaining setup is authorised/completed:
1. Confirm the three campaign statuses are paused and no public recruitment badge/Tester Hub invitation appears; existing participants can still see their history.
2. After visibility integration, confirm these exact IDs are absent from catalogue/search, direct detail/share pages and public counts, while a known genuine Steam and approved developer listing remain visible. This exclusion is still pending, not an already-passed check.
3. Run the production app and verify all three `/demo-games/*` pages return 404. In reporting, real data is the default and production has no sample toggle; authorised local preview is explicitly labelled and returns to real results without changing totals.
4. After 019 is applied and its policy inspected, exercise normal Pending claim submission/admin approval with controlled accounts; retain malicious INSERT/UPDATE attempts in the isolated harness (`node tests/test-submission-corrections.mjs --claims`), not synthetic live records.

## Deployed-state comparison — inspection received 29 October 2026

This section supersedes the earlier “unknown implementation” gate below. User-supplied SQL inspection captured **2026-10-29 15:28:34 UTC**, `transaction_read_only=on`; 86 function definitions, relevant table/column/constraint/index/RLS/grant/trigger definitions and policy configuration were supplied. Attachment SHA-256: `bceb2b62c087bd0a8189e5e3dd3637a41214c222343803c790eefabfeef42822`. Raw output was not copied into Git. All requested table/function names were present. Project selection relies on the user's SQL Editor selection plus the earlier matching API project check; the JSON itself does not identify the project. Migration history remains unavailable and need not be reconstructed.

### Required deployed behaviour confirmed from definitions/configuration

| Area | Comparison result |
| --- | --- |
| 006–009 interests/eligibility/allowance integration | Canonical interest functions and server rank/genre checks present. Discovery's expiry predicate matches 012's amendment. Audience/launch guards enabled. |
| 010 submission correction and 016–017 listing/admission | Completeness and owner/admin guards present, including later optional-evidence/admitted-listing maintenance changes. Admission trigger enabled; imported ownership requires an approved claim plus authorised developer link. Later definitions, not superseded 016 review policy, were compared. |
| 007/014/018 developer allowance | Free **1/720 hours**, no gap; Pro **15/720 hours**, **48-hour gap**; plan targeting flags correct. Account-wide launch lock/window functions match source. 018 community-only targeting exception and Hub-specific grandfathering are present. |
| 012 places/reservations | New campaign default **4**; policy **72 hours**. Activation is recorded at **2026-10-28 21:50:03 UTC**: do not reactivate. Capacity counts submitted/reviewed plus unexpired reservations, excluding audited replacements. Tester/capacity locks, reclaim/expiry guards, wrapper signatures and enabled one-active/submission triggers are present. Existing per-campaign capacities/legacy rows were deliberately not read. |
| 013 graded XP | Active rubric **v2**, maximum **100**, separate originality/relevance eligibility and five scored criteria. Admin-only review function uses row locking and actual-award deltas; audit columns and access restrictions present. No historical rescore is needed. |
| 011/015/018 tracking and recruitment | Owner-checked reporting/creation, private service ingestion, current-journey checks, campaign/build binding, community wrapper and dedup indexes match source. Claim/submission triggers enabled. Public recruitment uses authoritative capacity; bounded public summary grants present. |
| Critical write boundaries | Profiles/independent tests/private tracking cannot be directly written by anon/authenticated; RLS/policies and protected helpers match expected boundaries. Community RPCs check signed-in identity/participant ownership; anonymous EXECUTE alone does not bypass those internal checks. |

Direct stored-function body comparisons against repository SQL were supplemented by review of dynamically amended definitions from 012/017/018. Earlier/baseline renamed community/reservation helpers were inspected for ownership and flow compatibility. These are static enforcement/configuration confirmations, **not live mutation, race or full browser tests**; completed isolated rehearsal evidence is reused.

### Concrete mismatch: ownership-claim INSERT can forge reviewer fields

`game_claims` has RLS enabled, but the permissive INSERT policy **Developers can create their own claims** checks only `claimant_id = auth.uid()`. Authenticated users have table INSERT and there is no additional claim-admission guard: the only claim trigger fills a verification code. A crafted direct INSERT can therefore set `status='Approved'`, `reviewed_by`, `reviewed_at`, `admin_notes` or a claimed verification outcome. This violates reviewer-only ownership decisions even though it does **not**, by itself, create the separate admin-controlled `game_developer_links` row or satisfy the campaign admission path.

The current app inserts `status='Pending'` and omits reviewer fields, so the following smallest policy correction preserves its normal request. Prepared as **`supabase/migrations/202610290019_ownership_claim_permissions.sql`**. **Verified in isolated PostgreSQL; NOT applied live:**

```sql
begin;
alter policy "Developers can create their own claims"
on public.game_claims
with check (
  claimant_id = auth.uid()
  and status = 'Pending'
  and admin_notes is null
  and reviewed_at is null
  and reviewed_by is null
  and coalesce(verification_status, 'Not Submitted') = 'Not Submitted'
);
commit;
```

This changes future INSERT acceptance only; it does not update/delete historical claims, grant ownership or alter the existing admin UPDATE policy. No historical live claims were read, so whether any forged rows exist is unknown. Do not rewrite old claims based on this finding. Before application, recheck this policy has not changed and review the exact diff. If reverting were ever necessary, restore the captured original owner-only WITH CHECK policy deliberately; that restores the known gap and is not a recommended public-beta state.

Verification command: **`node tests/test-submission-corrections.mjs --claims`**. Extended the existing PGlite harness with a narrow fixture reproducing the supplied claim grants/RLS predicates and relevant columns. Passed: legitimate own Pending INSERT; other claimant rejection; forged Approved/Rejected, notes, reviewer, review timestamp and verification-outcome rejection; developer's Pending→Approved UPDATE and notes UPDATE affect zero rows; unrelated developer UPDATE affects zero rows; authenticated admin approval/reviewer-field UPDATE succeeds. Existing seeded claim fields and original admin UPDATE policy remain unchanged. Real PostgreSQL RLS runs under `SET ROLE authenticated`, not mocked permission assertions. The reduced fixture does not reproduce every baseline trigger or execute the hosted admin approval RPC/campaign journey; those remain manual integration checks. Campaign access code, admission functions and developer-link policies are untouched. No new UPDATE policy is needed: the inspected existing admin-only UPDATE policy already prevents owner self-approval and passed the isolated tests.

### Still unverified / next action

The inspection did not include `get_available_community_test_games()` (used internally by discovery), signup-trigger/Auth settings, existing record validity, actual historical capacities/deadlines or real hosted race/browser outcomes. No missing migration is inferred. The supplied capacity/claim enforcement is confirmed statically; do not claim full available-list execution was tested. Public `approved_games` includes SELECT access to its `evidence_link` field and the existing public detail page renders it: this is an existing public field, not a protected private-evidence store; do not place confidential evidence there. No user data was inspected.

**Single next action:** review and separately authorise application of migration **019** after confirming the deployed policy remains the inspected version. It requires the existing `game_claims` table, named owner INSERT policy and reviewed-field columns; it does not require migration-history reconstruction or replaying 006–018. Missing/renamed policy or incompatible schema makes ALTER POLICY fail and the transaction must be rolled back. SMTP/Auth, confirmed-fixture hiding, legal operator details and separate PULSE hosting remain unresolved as previously recorded. No live SQL, commit or push was performed for this fix.

Manual verification after separately authorised correction/testing:
1. Confirm the SQL Editor project is `qtcmzckdhgahuqqilmzj`; review the policy against the captured definition before any write is authorised.
2. Reproduce the isolated verification if needed with `node tests/test-submission-corrections.mjs --claims`; all requested cases already passed. After separately authorised application, submit a legitimate Pending claim through the app, review it with an admin account, and confirm the approved developer relationship behaves normally; an unrelated developer must remain blocked. Use isolated accounts/environment for malicious INSERT/UPDATE attempts rather than creating forged production rows.
3. After hosted setup is ready, run the existing controlled-account allowance/reservation/partial-XP/community-link smoke checks below. Do not repeat reservation activation or old migrations.

## First Vercel beta gate — 29 October 2026

This section supersedes the historical release identity and gates below for the first hosted beta. Branch: **v11**, starting HEAD **04a0c46**. The build fixes/checklist are authorised for the commit `V11: prepare production build for beta` and push to the existing v11 branch; no tag change. Read-only authenticated metadata was inspected as recorded below. No deployment, migration application or Auth/DNS setting change was performed. Earlier recovery evidence remains historical evidence, not a current schema audit.

### Concrete remaining gates

1. Build fixes are ready for the authorised isolated commit/push. `npm run build` passes (40 routes): removed incompatible `runtime`/`dynamic` exports from the POST admin preflight route (Node remains the default), and added a Suspense loading boundary around runtime shared-link lookup. Authentication and uncached request handling remain intact.
2. Confirm exact deployed versions for 006–018 using the read-only history check below. All inspected feature-group RPCs exist on the configured project; none is established missing. Their exact migration application remains **unknown**, not “missing”. The user supplied successful commits for 001–005 on 28 October, with zero original-table fingerprint differences; this is historical user-reported application evidence, not a fresh live verification. Existing pre-001 Auth/community/Storage schema and the recovered signup trigger are also required; this is not a new empty-project bootstrap.
3. Configure the actual Vercel environment, Auth URLs and externally deliverable SMTP; these hosted settings and delivery are unverified. The exact initial project hostname has not been assigned/provided, so do not substitute a guessed domain.
4. Hide confirmed synthetic fixtures before opening public beta. Three seeded listings/campaigns have absolute localhost URLs, and their static demo routes are public. See the scoped proposal below; no data was deleted or changed.
5. PULSE execution needs separate hosting or must remain explicitly unavailable for beta. Vercel can serve the UI/history/queue APIs, but does not supply the required native scanning/game execution environment. Core manual playtesting does not require this worker.
6. Public Terms/Privacy currently explicitly say draft/operator review: operator identity, minimum age, jurisdiction, actual hosting/provider details and retention decisions remain unresolved in `lib/site-information.ts`. Owner review is needed before inviting public users; this task does not invent those facts.

### Environment names (values must be entered privately)

| Name | Visibility | Required use |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Same intended Supabase project for browser, proxy and server. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Publishable/anon privilege only; browser Auth/data and SSR. Never a service-role/secret key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Existing `/api/pulse/history` requires this separate alias; missing locally. Set to that project's appropriate public anon/publishable credential, or explicitly leave this feature unavailable. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret | Reporting service and protected admin/PULSE/Steam APIs. Never prefix with NEXT_PUBLIC or expose in browser code. |
| `STEAM_WORKER_SECRET` | Server-only secret | Required only when using Steam queue/backfill workers; same secret on the API host and worker. |
| `PULSE_RUNNER_SECRET` | Server-only secret | Required only on the PULSE execution host/runner; does not make native execution Vercel-compatible. |
| `PLAYTESTED_BASE_URL` | Worker-only configuration | PULSE runner API origin; defaults to localhost. Use the separately provisioned execution host, not blindly Vercel. |
| `PLAYTESTED_PROCESS_URL` | Worker-only configuration | Steam queue worker's full `/api/admin/process-steam-queue` URL; defaults to localhost. |
| `CLAMSCAN_PATH`, `CLAMAV_DATABASE_PATH` | Execution-host-only configuration | Scanner binary/signature database; paths are not credentials and not Vercel environment substitutes for installing the scanner. |

`NODE_ENV` is framework-managed. No app SITE_URL variable is required: signup/recovery derive the requesting browser origin. SMTP credentials belong in Supabase Auth's private SMTP configuration, not public app variables. No billing, email API or Steam API key is referenced by the inspected runtime code. Configure Production scope first; do not give arbitrary preview branches access to the live service key/database.

Local checks: URL/publishable/service-role/worker-secret names are configured; the history alias is absent. No values printed. No tracked `.env` file, dangerous NEXT_PUBLIC secret name, or client import of service-role/server helpers was found in inspected tracked app/lib/config. Configured private key/worker-secret values were not present in generated `.next/static` browser assets; public key checked was not service-role. This is a current-tree check, not a Git-history credential audit or proof of Vercel settings.

### Database setup evidence and dependencies

Authenticated read-only inspection on 29 October reached **qtcmzckdhgahuqqilmzj.supabase.co**, matching `NEXT_PUBLIC_SUPABASE_URL` directly. Only GET requests were issued using the existing server credential privately: PostgREST OpenAPI metadata succeeded; the migration-history request using `Accept-Profile: supabase_migrations` returned HTTP 406 / `PGRST106` (schema not exposed). This does **not** mean the history table is absent. No linked CLI project, stored CLI token, database URI/password environment or native psql was available; no credentials were requested or printed.

| Migration | Application status | Verified API object present |
| --- | --- | --- |
| 006 | Unknown | `update_my_testing_genres` |
| 007 | Unknown | `get_playtest_eligibility` (shared/replaced by later migrations) |
| 008 | Unknown | `get_discoverable_community_test_games` |
| 009 | Unknown | `get_testing_audience_availability` |
| 010 | Unknown | `submission_completeness` |
| 011 | Unknown | `get_share_context` |
| 012 | Unknown | `get_testing_capacity_policy`; activation not established |
| 013 | Unknown | `get_feedback_quality_rubric` |
| 014 | Unknown | `get_my_developer_plan` |
| 015 | Unknown | `get_public_recruitment` |
| 016 | Unknown | `get_my_listing_edit` |
| 017 | Unknown | `get_public_intent_counts` |
| 018 | Unknown | `submit_community_feedback_with_attribution` |

These are metadata observations, not execution/permission tests or proof that all objects, definitions and data transitions match each file. **No genuinely missing migration is identified, so there is no authorised or justified migration-application list.** Do not rerun these non-idempotent files based on unknown history.

**Required behaviour confirmed:** the prior authenticated GET metadata check established project identity and presence of feature RPCs, not implementation/permissions. **Concrete mismatch found:** none established. **Still unverified:** deployed function bodies/signatures, effective grants/RLS/triggers, allowance rows, reservation activation/defaults/locks, current rubric/XP adjustments and attribution constraints.

The owner now confirms `to_regclass('supabase_migrations.schema_migrations')` returned NULL in SQL Editor. History is unavailable; no reconstruction, history entries or migration reruns are needed to establish the required deployed state. The table above records application provenance only, not missing behaviour.

**Single next action:** open the SQL Editor for project **qtcmzckdhgahuqqilmzj** and run the following one focused inspection. It returns one JSON row of definitions, effective permissions and three non-user policy/rubric configuration tables. It does not invoke application RPCs, activation, cleanup, repair, scoring or attribution functions, and reads no user/game/claim/report/event records. Transaction read-only is enforced. Save/export the full JSON outside Git so it can be compared with the current source; do not truncate function bodies. No connection string, key or token is requested. If a deployed function unexpectedly contains an embedded credential, redact that literal before sharing.

```sql
begin read only;
set local statement_timeout = '20s';
with wanted_functions(name) as (
 select unnest(array['_assert_developer_targeting','_developer_plan','_intent_counts','_listing_base','_listing_current_claim','_listing_edit_validation','_listing_has_admission','_lock_test_reservation','_playtested_developer_launch_window_at','_playtested_guard_launch','_playtested_limit_active_tests','_pre_admission_eligibility','_share_campaign_key','_share_conversion','_share_key','_share_link_context','_share_owned_key','_share_prune','_share_public_path','_share_rate','_start_reserved_test','_submit_reserved_test','_testing_audience_exists','activate_testing_reservations','admin_assign_developer_plan','audit_submission_corrections','campaign_eligible','campaign_places','claim_community_game_test','claim_with_share_attribution','confirm_listing_reassessment','create_share_link','fix_free_target','game_genres','genre_key','get_campaign_testing_details','get_developer_quality_reports','get_discoverable_community_test_games','get_feedback_quality_rubric','get_listing_revision_queue','get_my_developer_plan','get_my_listing_edit','get_my_submission_correction','get_my_test_reservations','get_playtest_eligibility','get_public_intent_counts','get_public_listing_updates','get_public_recruitment','get_share_context','get_share_engagement','get_testing_audience_availability','get_testing_capacity_policy','get_testing_genres','guard_listing_admission','guard_submission_corrections','guard_tester_places','guard_testing_audience_availability','join_community_playtest','normalize_testing_genres','preview_listing_admission_repairs','preview_submission_completeness','record_share_access','record_share_visit','release_community_game_test','repair_listing_admissions','request_test_reconsideration','review_listing_revision','review_test_quality','route_incomplete_submissions','save_my_listing_edit','save_my_submission_correction','share_journey_context','start_community_game_test','submission_completeness','submission_trim','submit_community_feedback_with_attribution','submit_community_game_test','submit_community_playtest_feedback','tester_rank','testing_genre_options','update_my_testing_genres']::text[])
), wanted_tables(name) as (
 select unnest(array['profiles','game_submissions','approved_games','imported_games','game_claims','game_developer_links','community_playtests','community_game_tests','community_playtest_participants','community_playtest_feedback','testing_policy','campaign_build_locks','test_review_events','submission_review_events','feedback_quality_rubrics','developer_plan_policy','developer_entitlements','developer_entitlement_events','listing_states','listing_revisions','listing_admissions','engagement_games','engagement_aliases','engagement_links','engagement_visits','engagement_events','engagement_claims','engagement_limits','engagement_dedup']::text[])
), relations as (
 select c.* from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in(select name from wanted_tables)
), triggers as (
 select t.* from pg_trigger t where t.tgrelid in(select oid from relations) and not t.tgisinternal
), functions as (
 select p.* from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f'
 and (p.proname in(select name from wanted_functions) or p.oid in(select tgfoid from triggers))
)
select jsonb_build_object(
 'transaction_read_only',current_setting('transaction_read_only'),
 'captured_at',current_timestamp,
 'missing_function_names',(select coalesce(jsonb_agg(name),'[]') from wanted_functions w where not exists(select 1 from functions f where f.proname=w.name)),
 'missing_tables',(select coalesce(jsonb_agg(name),'[]') from wanted_tables w where not exists(select 1 from relations r where r.relname=w.name)),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object(
   'signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),
   'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'settings',p.proconfig,
   'anon_execute',has_function_privilege('anon',p.oid,'execute'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),
   'service_execute',has_function_privilege('service_role',p.oid,'execute')) order by p.proname,p.oid),'[]') from functions p),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('name',r.relname,'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,
   'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
     from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped),
   'constraints',(select jsonb_agg(jsonb_build_object('name',c.conname,'definition',pg_get_constraintdef(c.oid))) from pg_constraint c where c.conrelid=r.oid),
   'indexes',(select jsonb_agg(indexdef) from pg_indexes where schemaname='public' and tablename=r.relname),
   'privileges',(select jsonb_agg(jsonb_build_object('role',role_name,'select',has_table_privilege(role_name,r.oid,'select'),'insert',has_table_privilege(role_name,r.oid,'insert'),'update',has_table_privilege(role_name,r.oid,'update'),'delete',has_table_privilege(role_name,r.oid,'delete'),'any_column_select',has_any_column_privilege(role_name,r.oid,'select'),'any_column_insert',has_any_column_privilege(role_name,r.oid,'insert'),'any_column_update',has_any_column_privilege(role_name,r.oid,'update'))) from unnest(array['anon','authenticated','service_role']) role_name)
 ) order by r.relname),'[]') from relations r),
 'triggers',(select coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))),'[]') from triggers t),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from pg_policies p where p.schemaname='public' and p.tablename in(select name from wanted_tables)),
 'configuration',(select jsonb_object_agg(name,case when to_regclass('public.'||name) is null then null else query_to_xml(format('select * from public.%I',name),true,false,'')::text end)
   from unnest(array['testing_policy','developer_plan_policy','feedback_quality_rubrics']) name)
) as deployment_inspection;
commit;
```

Review the final deployed definitions, including renamed private helpers and enabled triggers, rather than comparing each historical function version independently: 014 supersedes 007 allowances; 017 supersedes 010/016 listing behaviour; 018 supersedes 011 sharing and amends 014 targeting. Expected configuration: Free 1/720h, Pro 15/720h plus 48h spacing; new campaigns 4 places, 72h reservations, historical capacity preserved; rubric v2 maximum 100 with two eligibility gates and five 20-XP criteria. Expect one-active-test and final-place locking, server rank/genre checks, admission/ownership restrictions, moderator-only actual-award delta accounting, private tracking tables/service-only ingestion and deduplicated community attribution. Existing claims may have null legacy deadlines before explicit activation; that alone is not a mismatch. Missing helper names in the output are candidates for comparison, not automatic evidence that a migration must run.

Once output is available, classify each required behaviour as confirmed, mismatch or unverified. Static definitions can establish enforcement paths; no live concurrency/write tests are authorised. Reuse isolated concurrency evidence, but do not claim live behaviour testing. **No corrective SQL is prepared now because no concrete mismatch has been demonstrated.** Any correction must target only the demonstrated difference and preserve data/history; do not replay migration files.

Manual verification:
1. Confirm SQL Editor project ref matches **qtcmzckdhgahuqqilmzj**.
2. Run the complete query; verify `transaction_read_only` is `on` and export the one full JSON result outside the repository.
3. Provide that result for the focused source comparison; do not activate reservations, rerun migrations or repair history. SMTP/Auth, fixtures, legal details and PULSE hosting remain unresolved.

If a genuinely absent migration is later established, prepare only that file and its absent dependencies in numeric order after checking existing objects for conflicts. Concrete policy/data risks to review: 006 canonicalises existing interests; 007/014 change account launch/targeting policy; 010 changes submission routing; 012 changes new-campaign default/reservation enforcement and has a separate explicit legacy-claim activation; 013 changes new quality awards/ledger adjustments; 016/017 change listing maintenance/admission policy; 018 changes attribution and audience entitlement handling. Re-executing already present CREATE/ALTER statements can conflict; do not bulk-apply 006–018 or alter existing migration history.

Required feature groups: 006 canonical interests; 007 account launch allowance; 008 discovery; 009 audience checks; 010 submission corrections; 011 tracking; 012 reservation rules; 013 graded feedback XP; 014 Free/Pro entitlements; 015 public recruitment; 016 listing revisions; 017 admission/maintenance/intents; 018 campaign/community attribution. Keep version order and each migration's preflight dependencies. 018 specifically requires 011, 014 and the existing community feedback RPC. Do not rerun existing non-idempotent files or use bulk `supabase db push` without reconciliation.

First inspect Dashboard migration history if maintained, then deployed definitions/grants against the corresponding source. Manually pasted SQL may not have a migration-history row. A read-only existence check is useful but **does not prove matching definitions**:

```sql
select
 to_regprocedure('public.submission_completeness(jsonb)') as corrections_010,
 to_regprocedure('public.get_share_context(text,uuid)') as sharing_011,
 to_regprocedure('public.activate_testing_reservations()') as reservations_012,
 to_regprocedure('public.get_feedback_quality_rubric()') as quality_013,
 to_regprocedure('public.get_my_developer_plan()') as plans_014,
 to_regprocedure('public.get_public_recruitment(jsonb)') as recruitment_015,
 to_regclass('public.listing_revisions') as revisions_016,
 to_regprocedure('public.get_public_intent_counts(jsonb)') as intents_017,
 to_regprocedure('public.submit_community_feedback_with_attribution(uuid,integer,integer,integer,integer,text,text,text,text,text,text,text)') as community_tracking_018;
```

For 006–009 inspect their named RPC/trigger definitions too. Inspect `get_testing_capacity_policy()` output as an authenticated tester to establish whether 012 was explicitly activated; function existence is not activation. Historical active claims must receive the planned 72-hour transition at separately authorised activation. Do not invoke activation as a read-only check. Confirm fresh signup creates its profile through the installed trigger. Apply only confirmed missing migrations after separate authorisation, stop on error, and resolve schema-cache errors by checking actual definitions/project before rerunning SQL. Only the GET metadata/history-exposure checks above were run against the hosted project.

### Auth URLs and mail

Let **H** be the actual stable Production domain assigned in Vercel (for example the project domain shown in Settings → Domains, not a guessed preview deployment). In Supabase → Authentication → URL Configuration:

- Initial **Site URL**: `https://H`.
- Allow `https://H/auth/callback`, the narrowly scoped query variant `https://H/auth/callback?next=**` for existing internal return journeys, and `https://H/reset-password`.
- Keep `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback?next=**`, `http://localhost:3000/reset-password` only while local development still needs this project.
- Later, once the domain is actually connected: Site URL `https://playtested.co.uk`; allow `https://playtested.co.uk/auth/callback`, `https://playtested.co.uk/auth/callback?next=**`, `https://playtested.co.uk/reset-password`. Add corresponding `https://www.playtested.co.uk` entries only if that origin serves the app, or redirect www to the canonical origin. Keep H allowlisted only if still used.
- Do not allow all `*.vercel.app` origins. These paths handle confirmation-code exchange and recovery respectively; `/forgot-password` sends the request, `/login` displays signup/signin, `/account` handles signed-in changes. Safe-next validation remains server/client enforced.
- Auth → Email Templates: retain supported `{{ .ConfirmationURL }}` confirmation/recovery links; no localhost hardcoding and no token-hash template switch. Auth → Custom SMTP: configure verified sender/provider privately and verify delivery to a non-team test inbox; built-in delivery is not suitable for public beta. Review rate limits/security settings without disabling protections. Same-browser PKCE recovery remains required.

Official setup references checked 29 October: [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), and the existing [Auth checklist](PRE-BETA-AUTH-ALLOWANCE.md).

### Fixtures, localhost and workers

No hard-coded localhost production navigation was found in runtime app/lib. The build/package has no install/build/start demo seeding hook. `maintenance:seed-demos` is explicit only; do not run it during deployment. Seed source confirms these synthetic records (live presence was not queried):

| Game | Submission ID | Campaign ID |
| --- | --- | --- |
| Neon Courier | `d3100000-0000-4000-8000-000000000001` | `d3100000-0000-4000-8000-000000000101` |
| Mosslight Grove | `d3100000-0000-4000-8000-000000000002` | `d3100000-0000-4000-8000-000000000102` |
| Orbit Foundry | `d3100000-0000-4000-8000-000000000003` | `d3100000-0000-4000-8000-000000000103` |

Smallest safe proposal: after confirming these exact IDs, pause only their campaigns using existing controls, preserving claims/history; exclude only those IDs from authoritative public catalogue/detail/recruitment/discovery outputs, retaining developer/admin access and counts consistent with pagination. There is no confirmed existing cross-source public-hide flag for approved fixture listings, so prepare that small explicit suppression separately rather than bulk rejecting/deleting games or title-matching all “Test”/“Demo” names. Other historic test titles are **unconfirmed**, not safe deletion/hide targets. Public `/demo-games/*` static mini-games should be gated off in production in that same narrow fixture change; existing `public/demo-assets` artwork is also publicly reachable. The reporting sample toggle is already development-only; it does not run on Vercel Production or Preview builds.

`scripts/workers/pulse-job-runner-v9.mjs` and versioned technical workers are long-lived/native jobs, not Vercel Functions. The actual `/api/pulse/preflight` execution route downloads/unpacks builds, writes temp files and invokes ClamAV/technical subprocesses; it needs an isolated separately hosted execution environment. Do not route its worker to Vercel and expect a finished assessment. Steam queue/backfill pollers likewise run separately; ordinary catalogue reads do not require them to keep running. Queue worker supports `PLAYTESTED_PROCESS_URL`; content backfill currently hardcodes localhost and needs a separate targeted configuration change before remote operation. Vercel can serve the API endpoints, but admin import/backfill batches must fit the selected function plan's time/resource limits; completion was not verified on Vercel. Existing local sandbox loopback URLs in technical workers are intentional, not public destinations.

`next.config.ts` uses Cache Components/partial prefetching and the configured Tailwind Turbopack loader; the local optimized build supports these settings. No static export/custom daemon is configured. Use Next.js detection, not a static-site preset; successful local build is not proof that native PULSE execution works on Vercel.

### Vercel import (future manual steps, not performed)

1. The isolated build-fix/checklist commit and explicit push to existing v11 are now authorised. Verify its success/commit from the task result before import. Do not move/recreate the existing tag.
2. Vercel → Add New → Project → import `rumplesplintshins-commits/playtested`. Root `./`, Framework **Next.js**, install `npm ci`, build `npm run build`, default Next output (do not override to a static folder). Select a supported Node version satisfying the installed Next engine (`>=20.9.0`; Node 22 is an appropriate target). Leave maintenance/seeding commands out of install/build.
3. Before the public Production deployment, Project → Settings → Environments → Production → Branch Tracking: **v11**, Save. Verify the deployment's source branch and commit. If import initially selects main, do not treat that build as the beta; change tracking and explicitly create the deployment from v11. See [Vercel production branch](https://vercel.com/docs/git).
4. Settings → Environment Variables: enter required names privately for **Production**, set feature-specific names only for supported features, then create a new deployment after changes. Do not import the whole `.env.local` indiscriminately. [Vercel environments](https://vercel.com/docs/environment-variables).
5. Obtain stable H, configure Supabase as above, reconcile schema and hide confirmed fixtures before opening access. Do not connect playtested.co.uk/DNS until separately authorised. If a deployment is created before checks finish, keep it protected and out of public beta.
6. Check build logs, deployment commit, public pages and browser console without copying tokens/secrets. A failed Auth/RPC check is a stop condition; do not bypass grants/eligibility or insert sample traffic. Redeploy the last known working deployment if needed; do not reverse schema or delete data blindly.

### Hosted smoke tests (controlled accounts; not automated real emails)

1. Signup from H with a fresh controlled tester account: actual confirmation email, same-browser callback, automatic profile and intended roles. Check signin/logout and safe internal return URL; unrelated external `next` must not redirect off-site.
2. Forgot password: generic message for existing/unknown addresses; real external inbox receives the link. Same-browser reset succeeds, old password fails, used/expired link offers another request. Ordinary signed-in visit to reset must not change an unrelated account; Account change requires current-password/reauth as configured.
3. Approved developer: existing listing loads, real Free/Pro allowance shows actual history; prepare a draft and verify launch restrictions fail closed. Publish only an intentionally authorised beta campaign; confirm places/build/access and no duplicate launch on refresh.
4. Tester: interests/eligibility, successful claim reserves one place, deadline displayed, actual game-access link, draft reload, feedback submission. Report consumes its place; community feedback must not consume a Hub place.
5. Admin: unrelated user denied; review the submitted report with eligibility gates and partial quality score, verify actual XP delta once and tester-visible reason, no duplicate award on retry. Existing data/campaigns remain.
6. Community tracking: owner creates Discord and Reddit links for the same published community campaign. Separate non-owner browser follows one link, joins, clicks access and successfully submits within 30 minutes. Real reporting shows that source's access/community submission, no Hub claim/XP, zero-event link remains zero. Repeat request must not double-count. Closing/changing build makes old invitation unavailable. Sample preview must be absent in Production.

Targeted checks this task: optimized build passed after two local fixes; generated browser-assets secret comparison and environment-name/client-import checks passed. Existing successful workflow evidence reused; hosted mail, schema, workers and journeys remain unverified. No live data/settings were touched.

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

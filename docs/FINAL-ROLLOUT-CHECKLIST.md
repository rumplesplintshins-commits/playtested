# Playtested rollout preparation

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

**Single next database action:** in the Supabase Dashboard SQL Editor for project **qtcmzckdhgahuqqilmzj**, run this read-only existence query:

```sql
begin read only;
select to_regclass('supabase_migrations.schema_migrations') as migration_history;
commit;
```

If non-null, run the following in the same project's SQL Editor and share only version/name rows (no credentials):

```sql
begin read only;
select version, name
from supabase_migrations.schema_migrations
where version between '202610280006' and '202610290018'
order by version;
commit;
```

If history is null, empty or partial, do not infer missing SQL: manual Dashboard execution may not register history. The next targeted read-only comparison is `pg_get_functiondef`/column/constraint/trigger/grant inspection for only unrecorded feature groups, against their files. Stop for that evidence rather than applying or repairing history. No new audit script is required.

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

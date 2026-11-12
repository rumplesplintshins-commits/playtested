# Issue 52 — Supabase security hardening

## Continuation and scope

Continues Cline's original a79e538, with its pending filename/grant corrections
checkpointed before replay onto current v11 ec246f3. Both original and checkpoint
remain in local Git/reflog history; the two existing scratch scripts are untouched.
The three obsolete 202611030038–0040 files were unpublished additions to this
issue branch, not existing v11 migrations. No migration already in v11 is removed.
PR #53 and its security-header branch are not modified or included.

No production schema/data/Auth/Render changes were made. Production evidence is
the read-only issue #52 baseline; no second broad production audit was performed.
Named baseline function definitions were obtained from the existing **local**
fixture database for reproducible tests, with no user rows, credentials or tokens.

## Corrected migrations (apply once, in this exact order after current v11)

1. `202611120041_security_search_path.sql`: resolves the three audited signatures
   using to_regprocedure, including normalize_game_identity(value text). Comparing
   pg_get_function_identity_arguments to just 'text' skipped named arguments.
   Empty search paths preserve the audited builtins/trigger NEW references.
2. `202611120042_security_execute_grants.sql`: removes inherited PUBLIC and direct
   anon EXECUTE for the two audited admin RPCs. Retains authenticated/service_role
   execution; ordinary users still fail the existing auth.uid()/profiles.role admin
   checks. Unexpected overloads/missing signatures fail closed for manual review.
   The real award_developer_xp body also has an OUT parameter developer_xp, making
   its unqualified balance expression ambiguous with the default PL/pgSQL setting.
   A guarded, exact replacement qualifies only that column with profiles.
   Signature, owner, other body text, admin checks and duplicate ledger stay intact.
   No XP award is executed or backfilled by this migration.
3. `20261112201921_security_catalogue_read_models.sql`: security_invoker wrappers
   for approved_games and published_game_verifications. security_barrier alone
   controls predicate ordering and **does not resolve** a definer-view warning.
   Two parameterless SECURITY DEFINER read helpers in playtested_catalogue_read
   capture the existing reviewed query, with fully qualified names/empty search_path.
   Explicit column allowlists and visibility-dependency guards reject schema drift.
   They preserve current columns/order/types, approved/published/hidden predicates,
   derived verification_status and dynamic subsequent moderation changes.
   No raw table grant or RLS policy changes. Existing view ACLs and OIDs are kept.

Both public views now have security_invoker=true (and barrier=true as defence in
depth). The intentionally privileged, scoped helpers remain callable by public
readers through those views. Do **not** add playtested_catalogue_read to PostgREST
exposed schemas or grant CREATE there. Helper invocations expose only the exact
public view row types, have no caller-supplied IDs/SQL, and cannot fetch raw PII.
This is an explicit authorised read boundary, not a claim that no definer code exists.
Repeated execution is tested: wrappers are not recaptured recursively, grants and
paths stay correct, and no XP/data changes occur. Normal rollout still uses migration
history to apply once. All three filenames sort after the latest v11 migration.

## Privileged-family access matrix

The original 37 anon / 108 authenticated counts are advisory reachability, not
proof of 145 exploits. No blanket revokes or broad policy additions are proposed.

| Function/family | Intended caller / grants | Validation and data boundary | Action / regression |
|---|---|---|---|
| award_developer_xp(uuid,integer,text,text,uuid,text) | authenticated admin; service-role execution retained | Existing auth.uid + profile admin, positive amount, target profile; unique award source; modifies XP/ledger | PUBLIC+anon removed; non-admin/foreign/signed-out calls denied; real admin award and retry once on PostgreSQL/PGlite |
| get_admin_community_test_reviews() | authenticated admin; service-role execution retained | Existing profile admin gate; sensitive tester identity/written feedback only after gate | PUBLIC+anon removed; real admin sees submitted review; others denied |
| Three audited path helpers | Existing duplicate-discovery/trigger callers | normalize builtin text functions; NEW.updated_at builtins | Empty path set; hostile caller search_path and real trigger execution tested |
| Catalogue read helpers (new private schema) | anon/authenticated/service_role, no PUBLIC function grant | Exact existing approved/public/published projection, beta-hidden filter and approved-game join; no private columns | Invoker public views; exact before/after equality for visitor/developer/tester/other-owner/admin/service roles; raw tables denied |
| Public feedback/rank/listing RPCs | Existing anon/authenticated grants per migrations 101/108/124/126 and feedback read-model migration | Accepted/publishable feedback, listing visibility, bounded batches, attribution masking; no tester UUID output | Unchanged; feedback RLS and tester identity suites |
| Owner feedback/genres and review reward RPCs | Existing authenticated grants | auth.uid campaign owner, accepted/nonreplaced report; +10 developer once, +5 tester Useful once | Unchanged; reward, RLS/read-model and approval regressions |
| Moderation/privacy RPCs | Existing authenticated admin endpoints | profiles.role admin; audit state/case references; private rank helper stays non-client executable | Unchanged; privacy-controls and quality-review suites |
| Claims/campaign/build transitions | Existing authenticated role/ownership endpoints | Relationship owner, submission/admin decision, launch/capacity/locked-build guards | Unchanged; developer-claims, campaign-completion, graded-quality suites |
| Notification helpers / bell RPCs | _create_notification remains internal; self-reader/update RPCs authenticated | Server event/delivery dedupe; recipient filtering | Unchanged; notification routing and feedback approval suites |
| Internal/private helpers | Existing owner/server-only grants | Not generic browser APIs; no newly granted raw-profile reads | No mass grant changes; existing identity/privacy regression suites |

The 37 RLS-enabled/zero-policy tables are not automatically insecure. Browser roles
without BYPASSRLS are denied rows absent an applicable policy even where a table
ACL exists; owner/service-role/definer access is a separate boundary. We add no
policies and disable no RLS. Existing per-table baseline reachability must be kept
with the operator's audit; this PR does not pretend to enumerate unprovided table
names or prove that every privileged RPC in the project is risk-free. The read-only
query below supports a targeted before/after review without reading user rows.

## Isolated validation

`node tests/test-supabase-security.mjs` executes the corrected migrations against
metadata-faithful fixtures with production-equivalent private RLS. Unlike the
original test, it uses SET LOCAL ROLE and actual effective privilege checks, not
proacl logging/superuser calls or caught-and-skipped view failures.

`node tests/test-supabase-security.mjs --native` repeats it on cached Supabase
PostgreSQL 17.11.0.006 in a fresh network-none container, with no host ports or
existing mounts. It destroys only its labelled test container. No .env or database
URL is loaded by either mode. This is a real PostgreSQL role/RLS rehearsal, not a
hosted Supabase/PostgREST or production Security Advisor run.

The suite checks migration order/replay; unchanged table/view ACLs and policies;
PUBLIC inheritance; anon/signed-out/ordinary/foreign-owner denial; authenticated
admin XP and review access; XP idempotency; path injection/trigger functionality;
all view fields including platform; private notes/identities; hidden/unapproved/
unpublished rows and later publication/status updates. The PGlite mode is added
to the existing v11 privacy PR workflow. See PR checks for final build/TypeScript
and existing auth, feedback, rank, notification, developer and tester regressions.

## Operator gates / read-only before-and-after checklist

- Verify usable production database backup **and a successful isolated restore**,
  target project qtcmzckdhgahuqqilmzj (not development ktifgybnkdaotdxrvjgq), owner
  signoff and staged dev rehearsal. This document grants no production permission.
- Confirm migration history contains none of the unpublished draft filenames or
  unexpected new objects/overloads; compare current view definitions/public fields
  and function bodies to the issue baseline. Stop on drift rather than replaying
  old migrations. Install as the existing view owner (the migration checks this); keep the helper schema
  outside exposed schemas. Apply the three migrations before any dependent code.
- Before and after, run metadata-only checks below and Security Advisor; expect
  the two invoker-view errors and the three named mutable-path warnings resolved,
  plus no anon execution for the two admin functions. Other intentionally public
  definer routines may still be flagged; do not claim a zero-advisor result.
- Through the staged/hosted gateway, verify logged-out catalogue/verification,
  hidden/unpublished denial, normal-user admin-RPC denial, authenticated admin
  review/XP success, duplicate awards, developer feedback and notification bell.
  Recheck login/signup/recovery. No hosted checks or deployments are performed here.

```sql
select c.relname,c.reloptions,pg_get_viewdef(c.oid,true)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('approved_games','published_game_verifications');
select p.oid::regprocedure,p.prosecdef,p.proconfig,p.proacl,
  has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('award_developer_xp','get_admin_community_test_reviews',
  'normalize_game_identity','set_technical_test_run_updated_at','set_game_build_updated_at');
select n.nspname,c.relname,c.relacl,
  has_table_privilege('anon',c.oid,'SELECT') anon_select,
  has_table_privilege('authenticated',c.oid,'SELECT') authenticated_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relrowsecurity and not exists(
  select 1 from pg_policy pol where pol.polrelid=c.oid);
```

Rollback: application rollback can leave this compatible hardening installed.
If a schema restoration is necessary, stop review writes and have the operator
prepare a separate reviewed forward repair from the backed-up view/function/ACL
metadata. Reinstating old owner views reintroduces the warning; never grant raw
public-table SELECT, disable RLS, or restore PUBLIC EXECUTE as a quick workaround.
No destructive down migration or production restore is executed by this PR.

## Outstanding operator setting

Leaked-password protection remains disabled; this PR cannot safely change it.
After separate owner approval, open Supabase Dashboard, confirm the target project,
then Authentication -> Sign In / Providers -> Email (Auth settings), locate the
password-security setting "Prevent use of leaked passwords" / leaked-password
protection, enable and save. The official settings link is
https://supabase.com/dashboard/project/_/auth/providers?provider=Email
(replace the project selector with the confirmed target). Confirm Pro-or-higher
availability first. Record
before/after setting and validate staged signup/password-change behavior before
production approval. Do not change OAuth redirects, JWT secrets or RLS settings.
Official reference: https://supabase.com/docs/guides/auth/password-security

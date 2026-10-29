# Playtested rollout preparation

## 022 applied - public QA exclusion verified 29 October 2026

Owner reports successful 022 application with no error. Subsequent **read-only** API verification at **17:35:58 UTC** against `qtcmzckdhgahuqqilmzj.supabase.co` confirms the intended deployed results. This supersedes earlier 022 prepared/not-applied and HOLD statuses below. Do not rerun 019-022.

- Anonymous catalogue searches exclude the four approved synthetic listing IDs. Rail Estate remains visible (one matching genuine result). The separate numeric-Steam Neon Dodge/Tiny Kingdoms records still exist with unchanged captured metadata; they are catalogue-ineligible, metadata-pending imports missing required fields, not newly excluded by 022. They were deliberately not published or repaired as part of this cleanup.
- Rail Estate public intents: **0 recommendation answers, 0 continue-playing answers, empty public build list**. No public reception rows remain for the scoped QA listings/Rail Estate; no invented rating is substituted. Recruitment returns Rail Estate `false` and no hidden-fixture rows.
- The three controlled imported fixtures are `catalogue_eligible=false`, `catalogue_review_status=excluded`. The Neon QA submission remains stored but is absent from the anonymous approved view.
- Exact-ID comparisons against the pre-cleanup capture confirm **all 29 independent reports and their recorded XP awards unchanged**, the older Rail Estate community-feedback row unchanged, **all ten campaign records unchanged** (including statuses/links/genres), and three genuine Steam records' captured metadata unchanged. No profile/XP update exists in 022; account totals were not separately captured/re-read live. Isolated tests verified profile/history preservation. Signed-in history UI remains a manual smoke check.
- No existing tracked links matched these newly approved QA sources/campaigns, so there was no live historical tracked-link URL to exercise. Exact-ID share/invitation guards are covered by the deployed definitions and isolated checks; no live link click is claimed.

Verification details are stored privately in ignored `.backup-tools/approved-qa-cleanup-verification.json`, not staged. Only authenticated and anonymous reads were performed by this agent after the owner's SQL application; no synthetic live claims or extra writes. Existing production build/isolated tests are reused because source did not change afterward. Four pre-existing page lint errors remain unchanged.

The authorised v11 commit/push includes the relevant SQL source, public detail-page filtering, tests and this checklist. Include the tested 020 security-option correction and view-only 021 source, but do not execute/replay them. Exclude the user's `app/layout.tsx` title edit, unrelated recovery work, credentials and private captures. No deployment/DNS/Auth changes.

Manual verification after refreshing the updated local app / later authorised deployment:
1. Search Rail Estate: genuine listing remains, with no QA rating/recommendation/build-history/recruitment. Search the four synthetic entries: none appears. Numeric Steam Neon/Tiny remain unpublished pending existing metadata requirements; do not confuse them with the excluded QA entries.
2. Open a known excluded detail/invitation URL: no live public recruitment or QA feedback is presented. Genuine game detail and campaign eligibility continue to work.
3. Sign in as an existing QA tester: past reports/reviews and recorded XP remain; check developer/admin private history as appropriate. Do not create synthetic production records.
4. Confirm real analytics are the default and production has no sample-data toggle. Remaining beta setup is still Auth/SMTP, legal operator details and PULSE hosting/explicit exclusion; this cleanup does not deploy the app.

## Approved additional QA cleanup ? migration 022 prepared, not applied

Owner approved the exact-ID preview, including **both** Rail Estate QA rounds and the older independent/community feedback. The former HOLD is now confirmed QA, not genuine community testing. Genuine Rail Estate and the separate numeric-Steam Neon Dodge/Tiny Kingdoms records must remain.

**Exact proposed SQL:** [202610290022_exclude_approved_qa_activity.sql](../supabase/migrations/202610290022_exclude_approved_qa_activity.sql). This new transaction is presented for review **before live application**; it has NOT run on Supabase. Do not replay 019?021. Required current state: the inspected original six-ID helper and reviewed public function predicates; 021's corrected view remains unchanged. Unexpected helper/provenance/function definitions abort the entire transaction.

022 expands the existing exact-ID helper with the four approved synthetic listing IDs and all ten approved QA campaign IDs. It sets only the three explicit PLAYTESTED_TEST imported rows to catalogue_eligible=false / catalogue_review_status=excluded, and filters QA campaign inputs from public build history, feedback, intent counts and recruitment. Existing reception, invitation, discovery, eligibility and sharing gates reuse the helper. **No campaign row/status is updated:** scoped preflight read found null genres on the old campaigns; an ordinary pause would populate them through an existing trigger. Keeping statuses unchanged avoids that unrelated mutation while exact-ID gates still prevent recruitment/new participation. No deletion, report rejection, relationship change or XP adjustment.

Confirmed pre-change flags on those three imported fixture rows: catalogue_eligible=true and catalogue_review_status=eligible. To reverse later, explicitly restore only those flags and replace the helper with its former six-ID body; do not rerun 020 or revert public function definitions blindly. Campaign statuses/genres need no reversal because they are untouched. View owner/grants/options are not changed by 022; helper owner/grants/security attributes are retained.

Local app change: imported detail URLs now respect existing catalogue eligibility, and public build/history/report queries use only the campaign IDs returned by the existing authoritative public intent RPC. Thus an authorised owner visiting the public Rail Estate page does not accidentally reintroduce private QA campaigns into public results. Reporting failures get an explicit unavailable message; no sample/zero-data fallback was introduced. Private My Games/tester-history workflows are unchanged.

**Passed:** production build (including TypeScript); `node tests/test-submission-corrections.mjs --visibility --qa-cleanup`; working diff whitespace checks. The isolated database uses the approved exact listing/campaign/report IDs but synthetic local accounts. Verifies four QA listings excluded before catalogue counting, numeric-Steam Neon/Tiny plus genuine Rail retained, Rail public recommendation/continue counts zero and build list empty, no Rail reception rating or recruiting badge, all **29 independent reports plus one community-feedback record** preserved with private history and recorded XP, complete campaign rows/relationships preserved, and unchanged view/helper security metadata. Existing 020/021 visibility, claim lifecycle and view-option checks pass in that isolated harness; they were not replayed live. Targeted page lint has the same **four pre-existing errors** as HEAD and no new findings. Browser/hosted QA cleanup checks are still pending; no live 022 verification is claimed.

**Next action:** review the exact 022 file and, if accepted, run only that transaction in SQL Editor for project qtcmzckdhgahuqqilmzj (this session still has no authenticated arbitrary-SQL connection). Return the success/sanitised error. After successful application, read-only verify the affected public outputs and preserved flags/data, then commit/push the relevant migration/app/tests/checklist changes to v11 as requested. **Commit/push remains pending until successful cleanup verification.** The user's app/layout.tsx title edit and unrelated recovery files remain untouched/un-staged.

Manual checks after application and coordinated app update:
1. Catalogue/search: Starfall Circuit, Ashen Hollow, synthetic Tiny Kingdoms and QA Neon submission disappear. Steam Neon 3666410, Tiny 3008910 and Rail Estate 3762240 remain; pagination totals reflect the exclusions.
2. Open Rail Estate: no QA build history, feedback/rating/recommendation totals or recruiting badge; show no community testing yet where no genuine activity remains. QA invitation links must be unavailable. No data/error state should be mistaken for fabricated zero traffic.
3. Signed-in testers can still see their own past QA tests/reviews and unchanged XP; developer/admin private records remain. Do not create synthetic live claims to test this.
4. Existing real campaigns retain normal eligibility/capacity and recruitment; real analytics remain the default. Production QA mini-game routes remain unavailable, and no deployment command seeds data.

## Five-listing synthetic-content preview ? awaiting explicit approval

Read-only inspection scoped to the five named titles, then exact IDs, captured 2026-10-29T16:55:44.838Z. No additional hiding, pausing, SQL application, XP or record changes performed. Titles were used to locate candidates only; classification below uses explicit fixture notes, build provenance and cross-game destination mismatch. One shared account is not classification evidence. A private raw preview is kept only under ignored .backup-tools, not committed. Approval must identify the rows to exclude; the HOLD row is outside the proposed cleanup.

### Exact-ID approval preview

| Listing / round | Exact listing ID | Exact campaign ID / status | Exact independent report IDs / community feedback IDs | Evidence | Proposed cleanup (not applied) | Tester history / XP effect |
| --- | --- | --- | --- | --- | --- | --- |
| Neon Dodge ? Fault Build 0.1 | `3dc1adfe-8e19-4c37-aef7-b9c16ad5433f` | `41e47b6d-8f1c-4c06-b929-72169c7f0e6b` (closed) | `0f5bbdcf-617c-496d-8f98-3474adb16a7e`<br>`568dbcad-9667-4719-9cd3-5b92319b95af`<br>`4a0a5c94-5a02-42be-ac28-67fe17b5073e` | Submission explicitly describes QA workflow; build URL is the repository neon-dodge-test-0.1 faulty-build release, matching tracked worker benchmark fixtures. | Hide only this synthetic submission and its public reception/history; pause the open round. Preserve separate Steam Neon Dodge. | Private history/records retained; **0 recorded base XP unchanged**. |
| Neon Dodge ? Redemption Build 0.2 | `3dc1adfe-8e19-4c37-aef7-b9c16ad5433f` | `5218a866-f597-4fc1-bfae-84e1dc172dfe` (open) | `e74501d2-5876-47eb-88e2-bdecb53c8c8e`<br>`3d477355-2dfc-44c0-b618-8f85aa50058f`<br>`deda0e6b-0adf-40d7-8f04-19355c735ce1`<br>`957caceb-408a-4aad-ba4a-a1c22d14970e`<br>`7748d1cd-781f-4b8c-8ab4-66d50b4b3a00` | Submission explicitly describes QA workflow; build URL is the repository neon-dodge-test-0.1 faulty-build release, matching tracked worker benchmark fixtures. | Hide only this synthetic submission and its public reception/history; pause the open round. Preserve separate Steam Neon Dodge. | Private history/records retained; **0 recorded base XP unchanged**. |
| Starfall Circuit ? Demo 0.9 - Reception Test | `b307eac5-4b9e-46fc-b673-178014c3fd9a` | `7e69d169-c79c-40e8-83e5-545f85736f31` (closed) | `c34faacc-5877-4ec6-93b4-b0ff67b62e80`<br>`193a01b6-7781-4698-ae93-a8fb9742c6d8`<br>`78692812-ff9a-4499-b59f-2c7f7e6f4b93` | catalogue_review_reason explicitly says Playtested V10 controlled catalogue test game; non-Steam PLAYTESTED_TEST marker; campaign uses example.com/playtested-test-build. | Hide this synthetic imported row (existing eligibility/moderation flags), both test rounds and reception; pause the open round. Preserve numeric-Steam duplicates. | Private history/records retained; **0 recorded base XP unchanged**. |
| Starfall Circuit ? Demo 0.8 | `b307eac5-4b9e-46fc-b673-178014c3fd9a` | `abc3ae2e-aea3-4293-af66-3130fbd6292a` (open) | `b4ec4994-a67e-4e5d-9b6a-fac3d692f6f3`<br>`b157a13c-d60a-4517-8d75-a16be538d2ee`<br>`d2ad9079-9e11-45b7-aaad-b6b1a7c325d1` (rejected) | catalogue_review_reason explicitly says Playtested V10 controlled catalogue test game; non-Steam PLAYTESTED_TEST marker; campaign uses example.com/playtested-test-build. | Hide this synthetic imported row (existing eligibility/moderation flags), both test rounds and reception; pause the open round. Preserve numeric-Steam duplicates. | Private history/records retained; **100 recorded base XP unchanged**. |
| Tiny Kingdoms ? Demo 0.7 - Reception Test | `052165b0-15b4-4b2e-a1cb-c3be363df97f` | `04771f87-5f59-4cf8-9f35-07c80c77537f` (closed) | `a8d40708-9621-4062-ab51-c7740ed68aa2`<br>`54e94ff9-41e3-4325-9b0f-15d4f61a1c9b`<br>`cd5327db-fada-4e24-b4d8-8a5d3d97908d` | catalogue_review_reason explicitly says Playtested V10 controlled catalogue test game; non-Steam PLAYTESTED_TEST marker; campaign uses example.com/playtested-test-build. | Hide this synthetic imported row (existing eligibility/moderation flags), both test rounds and reception; pause the open round. Preserve numeric-Steam duplicates. | Private history/records retained; **0 recorded base XP unchanged**. |
| Tiny Kingdoms ? Demo 0.6 | `052165b0-15b4-4b2e-a1cb-c3be363df97f` | `5b5a9d16-adf6-4cab-b67f-db393d00483f` (open) | `82f43a02-04bf-44c6-aa59-69e947c3d0cd`<br>`16e76543-7781-4699-abac-f905ec310b2b`<br>`2444d895-882b-469b-b627-1335e5acf3f0` | catalogue_review_reason explicitly says Playtested V10 controlled catalogue test game; non-Steam PLAYTESTED_TEST marker; campaign uses example.com/playtested-test-build. | Hide this synthetic imported row (existing eligibility/moderation flags), both test rounds and reception; pause the open round. Preserve numeric-Steam duplicates. | Private history/records retained; **0 recorded base XP unchanged**. |
| Ashen Hollow ? Alpha 0.5 - Reception Test | `f7f9808b-2d97-45ea-9bd5-428c42e4f018` | `b8754c76-2f38-42b8-9348-240ef5aaed7f` (closed) | `8297c6b4-233e-427e-96d4-eaf28016e2aa`<br>`cf92325c-2378-4c41-a0fc-8f09794b0806`<br>`088476a9-0609-41cb-aee4-a7496324e402` | catalogue_review_reason explicitly says Playtested V10 controlled catalogue test game; non-Steam PLAYTESTED_TEST marker; campaign uses example.com/playtested-test-build. | Hide this synthetic imported row (existing eligibility/moderation flags), both test rounds and reception; pause the open round. Preserve numeric-Steam duplicates. | Private history/records retained; **0 recorded base XP unchanged**. |
| Ashen Hollow ? Alpha 0.4 | `f7f9808b-2d97-45ea-9bd5-428c42e4f018` | `2092dc5a-6404-42d1-a5db-544858565808` (open) | `675c8857-0dab-4e3b-9289-2678d3523954`<br>`4ba7daeb-f7d3-4073-8d8a-34fc94dcc35e`<br>`4868be47-920e-4255-a64f-7947f62add01` | catalogue_review_reason explicitly says Playtested V10 controlled catalogue test game; non-Steam PLAYTESTED_TEST marker; campaign uses example.com/playtested-test-build. | Hide this synthetic imported row (existing eligibility/moderation flags), both test rounds and reception; pause the open round. Preserve numeric-Steam duplicates. | Private history/records retained; **0 recorded base XP unchanged**. |
| Rail Estate ? 1 | `00004d38-7672-473c-9628-b554c579d9e9` | `3d09699f-f0b0-4d4e-bb06-1da7f1180778` (closed) | `adffbf46-e4ec-485c-aa97-0742cd3ba8e4`<br>Community: `867fe05f-4ddc-472a-bf1d-7b1f12c4a229` | Real Rail Estate Steam destination; placeholder instructions alone do not prove synthetic provenance. Manual-looking review and community feedback are not proof either. | HOLD: preserve campaign and all feedback; ask owner whether this was QA or genuine. No exclusion proposed without confirmation. | Private history/records retained; **100 recorded base XP unchanged**. |
| Rail Estate ? Demo 0.3 | `00004d38-7672-473c-9628-b554c579d9e9` | `a2fe9b0b-f556-4517-86c5-9687c33c8f40` (open) | `9addefaf-24f0-4b31-a0ef-9eab8e290654`<br>`d75d813f-056d-4522-bc34-64769daace13` | Explicitly says Testing with Celestial Golf and links Steam app 3965730, not Rail Estate app 3762240: confirmed cross-game test/misattribution. Whether feedback was generated or manually entered is unverified. | Keep Rail Estate; exclude this campaign/reports from its public reception/counts/history/recruitment and pause it. | Private history/records retained; **200 recorded base XP unchanged**. |

**Preserve separate Steam records:** Neon Dodge `d11243eb-54fe-4d25-ab51-e48a9bba611f` (Steam 3666410), Tiny Kingdoms `aaa80937-4949-4d34-8826-93daa8e995a5` (Steam 3008910), and Rail Estate `00004d38-7672-473c-9628-b554c579d9e9` (Steam 3762240). No fixture evidence was established for those imported catalogue identities; do not hide them because they share names with QA data. No campaigns/reports were found tied to the separate numeric-Steam Neon/Tiny IDs in this scoped read.

The proposed scope covers four wholly synthetic listing IDs, eight QA rounds plus the one confirmed cross-game Rail Estate round, and **28 independent report records** (including one rejected report). Their overall scores/recommendations are report fields, not a separate rating system. The older Rail Estate round has one independent report and one community-feedback row: both remain unclassified/HOLD. No other rating records or synthetic accounts were established. Manual/generated origin of individual submissions is not proven merely by similar language or timestamps; they must nevertheless not count as reception for placeholder QA builds or for the wrong real game.

After approval, use reversible exact-ID suppression and existing imported visibility controls, not deletions, report rejection/XP reversal or title heuristics. Extend public aggregation/history/recruitment predicates for excluded **campaigns** so Rail Estate remains listed with only retained genuine reception. Do not merely extend the game-ID helper: public build-history/intent calculations must filter the campaign inputs, and imported detail/catalogue visibility must be consistent. Current 019?021 definitions must not be replayed. Prepare the targeted SQL/code only for approved IDs and test public counts plus unchanged private history/XP before application. Preserve unknown feedback by default; if only the approved Rail Estate round is excluded, any surviving older reception must not be asserted genuine until the HOLD question is resolved.

**Blocking decisions bundled:** approve exclusion of the confirmed synthetic/cross-game rows above, and confirm whether Rail Estate campaign `3d09699f-f0b0-4d4e-bb06-1da7f1180778` (including report `adffbf46-e4ec-485c-aa97-0742cd3ba8e4` and community feedback `867fe05f-4ddc-472a-bf1d-7b1f12c4a229`) was also a test. Nothing in that HOLD row will be modified without that evidence/approval.

## 019–021 deployed definitions verified; view correction complete

**Latest verified status:** after reporting successful application of **021**, the owner supplied the read-only view result: direct `FROM game_submissions WHERE status='Approved' AND NOT beta_fixture_hidden(id)`; `is_updatable=YES`; `check_option=NONE`; `reloptions=NULL`; owner `postgres`; identical owner/service-role full ACL and anon/authenticated SELECT ACL. The view correction is complete and its current definition/options/owner/grants match the intended result. Earlier 019 policy and 020 helper/ten-predicate outputs are also verified as recorded below. **Do not rerun 019, 020 or 021. No further corrective SQL or history reconstruction is needed for these findings.** Earlier pending/application instructions below are historical and superseded. Public UI/hosted smoke checks remain distinct from this definition verification; historical pre-020 reloptions remain unknown and were not guessed.

Owner-supplied read-only state captured **2026-10-29 16:37:26 UTC** confirms the exact six-ID helper body, IMMUTABLE/invoker attributes, empty search_path, postgres owner and intended anon/authenticated/service-role execute grants. **All ten intended predicates are applied once. Do not rerun 020 or recreate/replace its helper/functions.** This supersedes the unknown-state diagnostic notes below.

`approved_games` contains the intended fixture filter but uses the earlier subquery wrapper. Current owner: postgres; SELECT grants: anon/authenticated; service-role and owner full grants; `reloptions=NULL`. Captured pre-change evidence establishes the original simple Approved-submission view definition, but **does not include its reloptions**. Null now is not proof that options were lost or originally null. No guessed security_invoker/security_barrier setting will be enabled/disabled.

Prepared **`supabase/migrations/202610290021_restore_approved_view_shape.sql`**, view-only, **NOT applied live**. It replaces only the exact inspected wrapper (definition MD5 `c91107d52bca5a0def3921da3049f552`) with the captured original explicit-column/simple WHERE form plus the existing fixture filter. This restores known original automatic updatability while preserving current security options, owner and ACL; it asserts those metadata remain unchanged and aborts otherwise. No helper/predicate changes, row updates, deletion or history repair. A different current definition aborts; do not weaken the guard to force it through. This does not claim to reconstruct unknown historical security settings.

Extended existing `node tests/test-submission-corrections.mjs --visibility`: actual captured wrapper reproduced; 021 passes; `is_updatable` changes NO→YES; fixture remains excluded and real listing visible; owner/ACL/current null options unchanged; all public function bodies and underlying game/campaign/report/profile/XP/link records unchanged. Repeated the view correction from a wrapper explicitly configured with security_invoker=true/security_barrier=true: options/ACL preserved and anonymous underlying-table denial still enforced. Existing visibility/history/start/submit/release checks pass. These are isolated PostgreSQL checks, not live application.

Next steps:
1. Review and, if approved, run **only 021** in SQL Editor for project **qtcmzckdhgahuqqilmzj**. Do not run 020 again. No live SQL was applied by this task.
2. Run the read-only view check below; compare current null options, owner/ACL and the direct filtered definition with the captured result. Confirm `is_updatable=YES`.
3. Verify a genuine listing remains visible, each confirmed fixture remains hidden, and an existing tester can still see their own history. Do not create synthetic live claims or change records to test visibility.

```sql
begin read only;
select pg_get_viewdef(c.oid,true) as definition,c.reloptions,
       pg_get_userbyid(c.relowner) as owner,c.relacl,
       v.is_updatable,v.check_option
from pg_class c join pg_namespace n on n.oid=c.relnamespace
join information_schema.views v on v.table_schema=n.nspname and v.table_name=c.relname
where n.nspname='public' and c.relname='approved_games';
commit;
```

## 020 duplicate-helper failure: inspection required before correction

The owner reports SQLSTATE **42723** at `CREATE FUNCTION beta_fixture_hidden`. This confirms that signature already existed at the time of the attempt, **not** that all of 020 applied. The latest transaction fails before its view/function edits; any earlier successful/partial execution is still unknown. Do not change CREATE to CREATE OR REPLACE, drop the helper, or rerun 020. Supersedes earlier instructions to run the full corrected file.

Existing service-role REST access does not expose function/view definitions or reloptions; no authenticated SQL connection is available. Reuse prior project verification and run this **one read-only query** in Dashboard SQL Editor for **qtcmzckdhgahuqqilmzj**. It does not call the helper/application RPCs, select user records, or alter objects. It returns one JSON row with the helper body/attributes/grants, current view definition/options/owner/ACL and each of the ten intended function modifications, including duplicate/partial indicators. Predicate classifications are diagnostic; complete definitions must still be reviewed before choosing correction.

```sql
begin read only;
set local statement_timeout='15s';
with expected(signature,needle,replacement) as (values
('get_game_community_reception()','from public.community_playtests cp','from public.community_playtests cp where not public.beta_fixture_hidden(cp.id) and not public.beta_fixture_hidden(cp.submission_id) and not public.beta_fixture_hidden(cp.approved_game_id)'),
 ('get_public_submission_playtest_history(uuid)','where cp.submission_id = p_submission_id','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id)'),
 ('get_public_submission_playtest_feedback(uuid)','where cp.submission_id = p_submission_id','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id)'),
 ('get_public_community_playtest(uuid)','where cp.share_token = p_share_token','where cp.share_token = p_share_token and not public.beta_fixture_hidden(cp.id) and not public.beta_fixture_hidden(cp.submission_id) and not public.beta_fixture_hidden(cp.approved_game_id)'),
 ('_share_link_context(uuid)','if not found then return null;end if;','if not found or public.beta_fixture_hidden(l.source_id) or public.beta_fixture_hidden(l.campaign_id) then return null;end if;'),
 ('get_public_listing_updates(jsonb)','if not visible then continue;end if;','if not visible or public.beta_fixture_hidden((r->>''id'')::uuid) then continue;end if;'),
 ('get_public_intent_counts(jsonb)','if not visible then continue;end if;','if not visible or public.beta_fixture_hidden((g->>''id'')::uuid) then continue;end if;'),
 ('get_public_recruitment(jsonb)','where r.source_type=''approved''','where not public.beta_fixture_hidden(r.game_id) and r.source_type=''approved'''),
 ('get_discoverable_community_test_games()','where c.status=''open''','where not public.beta_fixture_hidden(c.id) and not public.beta_fixture_hidden(c.submission_id) and not public.beta_fixture_hidden(c.approved_game_id) and c.status=''open'''),
 ('campaign_eligible(uuid,uuid)','where c.id=p_id','where not public.beta_fixture_hidden(c.id) and not public.beta_fixture_hidden(c.submission_id) and not public.beta_fixture_hidden(c.approved_game_id) and c.id=p_id')
), inspected as (
 select e.*,p.oid,p.prosecdef,p.provolatile,p.proconfig,p.proacl,
 case when p.oid is not null then pg_get_functiondef(p.oid) end definition
 from expected e left join pg_proc p on p.oid=to_regprocedure('public.'||e.signature)
), helper as (
 select p.* from pg_proc p where p.oid=to_regprocedure('public.beta_fixture_hidden(uuid)')
), view_state as (
 select c.* from pg_class c where c.oid=to_regclass('public.approved_games')
)
select jsonb_build_object(
 'captured_at',current_timestamp,
 'transaction_read_only',current_setting('transaction_read_only'),
 'helper',coalesce((select jsonb_build_object(
  'state',case when regexp_replace(p.prosrc,'[[:space:]]','','g')=regexp_replace('
 select coalesce(p_id=any(array[
 ''d3100000-0000-4000-8000-000000000001'',''d3100000-0000-4000-8000-000000000002'',''d3100000-0000-4000-8000-000000000003'',
 ''d3100000-0000-4000-8000-000000000101'',''d3100000-0000-4000-8000-000000000102'',''d3100000-0000-4000-8000-000000000103''
 ]::uuid[]),false);
','[[:space:]]','','g') then '020 body matches; inspect attributes/grants' else 'present but body differs; review required' end,
  'definition',pg_get_functiondef(p.oid),'volatility',p.provolatile,
  'security_definer',p.prosecdef,'settings',p.proconfig,
  'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,
  'anon_execute',has_function_privilege('anon',p.oid,'execute'),
  'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),
  'service_execute',has_function_privilege('service_role',p.oid,'execute')) from helper p),jsonb_build_object('state','absent')),
 'approved_games',coalesce((select jsonb_build_object(
  'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,
  'options',c.reloptions,
  'definition',case when c.relkind='v' then pg_get_viewdef(c.oid,true) end,
  'state',case when c.relkind<>'v' then 'unexpected relation type'
    when pg_get_viewdef(c.oid,true) ilike '%beta_fixture_hidden%' and pg_get_viewdef(c.oid,true) ilike '%existing_listing%' then 'fixture filter present; earlier wrapper form; review security/updatability'
    when pg_get_viewdef(c.oid,true) ilike '%beta_fixture_hidden%' then 'fixture filter present; review definition/options'
    else 'fixture filter absent' end,
  'privileges',(select jsonb_agg(jsonb_build_object('role',role_name,
    'select',has_table_privilege(role_name,c.oid,'select'),
    'insert',has_table_privilege(role_name,c.oid,'insert'),
    'update',has_table_privilege(role_name,c.oid,'update'),
    'delete',has_table_privilege(role_name,c.oid,'delete')))
    from unnest(array['anon','authenticated','service_role']) role_name)) from view_state c),jsonb_build_object('state','absent')),
 'function_modifications',(select jsonb_agg(jsonb_build_object(
  'signature',i.signature,
  'state',case when i.oid is null then 'function absent'
    when (length(i.definition)-length(replace(i.definition,i.replacement,'')))/length(i.replacement)=1
      and (length(i.definition)-length(replace(i.definition,'beta_fixture_hidden','')))/length('beta_fixture_hidden')=
          (length(i.replacement)-length(replace(i.replacement,'beta_fixture_hidden','')))/length('beta_fixture_hidden')
      then 'intended predicate applied once'
    when position('beta_fixture_hidden' in i.definition)>0 then 'partial, duplicate or different modification; review required'
    when (length(i.definition)-length(replace(i.definition,i.needle,'')))/length(i.needle)=1 then '020 predicate absent; original anchor present'
    else 'definition differs; review required' end,
  'definition',i.definition,'settings',i.proconfig,'security_definer',i.prosecdef,'acl',i.proacl,
  'anon_execute',case when i.oid is not null then has_function_privilege('anon',i.oid,'execute') end,
  'authenticated_execute',case when i.oid is not null then has_function_privilege('authenticated',i.oid,'execute') end,
  'service_execute',case when i.oid is not null then has_function_privilege('service_role',i.oid,'execute') end
 ) order by i.signature) from inspected i)
) as fixture_020_state;
commit;
```

Current view options can be established from this result, but missing options cannot by themselves prove that earlier configured options were cleared: the earlier public-view inspection omitted reloptions. Do not invent or silently enable/disable security_invoker. If an earlier wrapper form is present, inspect its current options and updatability before preparing a direct-form replacement.

**Verified now:** only the duplicate-helper error reported by the owner. **Unverified:** helper semantics/grants, view filter/options, and all ten predicate edits. The diagnostic query passed isolated PostgreSQL checks with absent objects and with an existing matching helper/filtered invoker-secured view; no live inspection result is claimed. No correction is prepared until this result establishes the actual differences; migration 020 is unchanged by this diagnostic task. Keep records, history, paused fixture statuses and layout title unchanged. Next: run the query, confirm `transaction_read_only=on`, export/share the complete one-row result, then prepare only the missing or incorrect fragments. No migration-history repair, writes, deployment, commit or push performed.

## Latest verification / prepared visibility change — 29 October 2026

**020 corrected before application:** the earlier view wrapper was NOT safe for configured view options: isolated PostgreSQL showed bare CREATE OR REPLACE clearing `reloptions`, including `security_invoker`. The corrected file explicitly retains every existing option via a safely quoted WITH clause and extends the inspected Approved WHERE predicate directly. It also rejects an unexpected view definition. This retains automatic updatability/`check_option`; the old subquery wrapper could not retain an existing WITH CHECK OPTION. Do not run an earlier copied version of 020; use the current corrected file. Existing owner/ACL preservation was also verified.

Focused caller review: `campaign_eligible` gates fresh claims/reclaims and open discovery, while owned unexpired claims use separate owner/status/deadline checks in `_lock_test_reservation` and private start/submit helpers. Available-game/details and share-access paths contain explicit own-claim alternatives; `get_my_test_reservations` retains owned history independently. The hidden-fixture predicate therefore blocks fresh/reclaimed fixture participation, not existing unexpired reservation completion/release. Existing expiry rules remain: expired reservations cannot start, submit or release via those RPCs, and hidden fixtures cannot be reclaimed; drafts/history are not erased. Do not describe expired claims as completable without reclaiming.

Additional actual-RPC tests passed under authenticated roles on paused hidden fixture campaigns: own history/reservation list and game/details access; start then structured feedback submission; release; completion through the legacy submission overload with a null legacy deadline; expired-history retention plus unchanged start/submit/release rejection. A separate isolated view with `security_invoker=true`, `security_barrier=true`, `check_option=local` retained identical options/owner/ACL after the corrected view replacement, and anonymous access still failed on missing underlying-table permission (invoker enforcement was not weakened). `node tests/test-submission-corrections.mjs --visibility` passes all these and the existing exclusion/data-preservation checks. No live SQL or browser journey was run for this focused verification.

**019 confirmed applied from owner-supplied policy output:** the deployed INSERT WITH CHECK now requires own `claimant_id`, `Pending`, null reviewer/note/timestamp fields and unset verification outcome. The UPDATE policy still requires an admin profile in both USING and WITH CHECK. This supersedes the earlier “019 application blocked” status below. No live synthetic claims were created; normal hosted claim/admin journey remains a smoke test.

The subsequent public-definition inspection confirms `approved_games` is a view of Approved submissions and `get_public_catalogue` reads it **before** search/count/pagination. Supplied public feedback/reception definitions are now preserved in a definition-only isolated test fixture, not user records. No migration-history reconstruction is needed.

**Prepared, NOT applied:** `supabase/migrations/202610290020_hide_confirmed_beta_fixtures.sql`. This new migration needs explicit review before application. It adds one immutable exact-ID visibility helper for the documented three listing IDs and three campaign IDs; filters the existing approved view; and adds narrow predicates to public reception/history/feedback, community invitation, summary/recruitment, discovery/eligibility and share-context functions. Existing view privileges, function signatures/grants and all underlying data remain. No extra visibility table, status rewrite, title heuristic, deletion or XP adjustment. The already-paused fixture campaigns remain paused independently.

The view filter removes fixture cards and totals at their authoritative source, rather than discarding cards after pagination. Direct public detail lookup uses that same view. Public intent/listing updates and share contexts also reject explicit hidden IDs; fixture-only eligibility is denied, while legitimate rank/genre/capacity rules remain. Active tester history remains accessible through the existing private claim path; no global filtering of owned history was added. Reversibility is a separately reviewed replacement of `beta_fixture_hidden(uuid)` returning false, without touching records or automatically reopening campaigns.

Safety: migration 020 expects the inspected view and exact function predicate anchors. Missing functions, changed/duplicate anchors or a non-view approved relation abort the transaction; do not remove those guards or replay earlier migrations to bypass a conflict. It updates definitions only and does not apply migration 019 again. Do not apply 020 without reviewing this explanation and the SQL. The current live listing/count suppression is still incomplete until it is applied.

**Passed:** `node tests/test-submission-corrections.mjs --visibility` uses embedded PostgreSQL, the supplied actual public catalogue/reception/feedback definitions, and existing migration/test infrastructure. Confirms fixture exclusion before pagination with correct totals; anonymous direct-detail source denial; genuine Steam and a legitimate Test-named listing retained; genuine eligibility unchanged; public fixture feedback/intents/recruitment/share suppressed; authenticated tester history retained; original rows/profiles/XP/link data identical; and reversal restores visibility. Source grants absent from the reduced baseline are explicitly reproduced in the test. Existing `--claims` checks also pass. These are isolated tests, not hosted application evidence. No production build repeated: this continuation changes SQL/tests/docs only.

**User work preserved:** `app/layout.tsx` title is now `Playtested | Find Your Next Good Game`; that user edit was neither overwritten nor included in the visibility change's staging/commit.

**Next action:** review migration **020** and authorise its targeted transaction in project `qtcmzckdhgahuqqilmzj`. Authenticated arbitrary SQL access is still unavailable from this session, so the exact file may need to be run in Dashboard SQL Editor after approval. After successful application, use an anonymous catalogue/search request and a known genuine listing to verify totals/visibility, check fixture direct details/share destinations unavailable, and confirm own tester history still visible. Keep normal Pending claim/admin approval as the hosted smoke check for 019. No fixture records or historical feedback should be deleted. SMTP/Auth, legal operator details and PULSE hosting remain unresolved.

## Beta fixture/claim execution status — 29 October 2026

Historical execution notes below are superseded by the latest status above where indicated.

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

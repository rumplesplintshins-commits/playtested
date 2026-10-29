# Developer plans and account-wide allowances

Implemented locally on 28 October 2026. Migration **014 is prepared, not applied live**. No billing, deployment, push or backup/recovery work.

## Policy and ownership

| Plan | First Tester Hub publications per rolling 720 hours | Minimum elapsed spacing | Advanced targeting |
| --- | --- | --- | --- |
| Free | 1 | None | Bronze/all ranks; any genre interests |
| Pro | 15 | 48 hours | Higher minimum rank and required genre-interest matching |

`developer_plan_policy` is the private authoritative source for limits and feature flags. Developers default to Free when no explicit protected entitlement exists. No existing subscription/entitlement source was found to import. Tester XP, developer level, roles and JWT/profile plan metadata do not confer Pro. Manual Pro assignments persist until revoked; this is not a billing/payment status.

The ownership model is a **developer account**, not a team/workspace. Actual campaign `developer_id` owns the launch permanently. The original per-game history is retained; migration 007 already introduced account-wide Free accounting, and 014 preserves that scope while adding plan-specific policy. Neither upgrade nor downgrade resets history.

Only the first Tester Hub publication counts. Mixed audiences count; drafts/community-only campaigns do not. Later conversion from community-only to Hub counts on that first Hub publication. Changing audience, pausing, resuming or closing never clears or repeats the timestamp. Existing excess campaigns, claims and feedback are not rewritten or automatically closed.

The next eligible time is the later restriction. For historical over-quota usage, the rolling deadline is when **enough** earlier launches leave the window, not necessarily the earliest or latest launch. For example, 16 recent Pro launches require the two oldest to expire before another launch. Exact 48-hour and 720-hour boundaries use server time and elapsed-hour intervals, including across daylight-saving changes.

Publication and admin entitlement changes serialize on the same developer-account advisory lock. Ownership/source IDs and existing one-active-round-per-game constraints remain intact. Existing tester-place capacity, reservation rules, build locks, review/XP policy, free tester preferences/discovery filters and feedback access are unchanged.

### Co-ownership boundary

Multiple approved developers can have relationships with the same game, but cannot choose a different billed/quota owner in the campaign RPC or transfer a campaign's owner. Each real developer account retains its own quota; this does not create a shared studio allowance. A new round launched by another legitimate account uses that account's history. If shared studio limits are desired, that is a separate ownership decision, not inferred here.

Existing per-game lifecycle indexes identify source records (imported/approved/submission UUIDs). Cross-source aliases and historically separate developer relationships are not silently merged or transferred by this migration. Any physical-game/studio-level consolidation needs explicit review; it must not be presented as an account quota reset.

## Targeting and grandfathering

Free can always edit the testing genre using the existing taxonomy. New campaigns/unpublished drafts must use Bronze and any genre interests unless current entitlements allow advanced targeting. Invalid requests are rejected, never silently clamped to other saved settings.

Already published rounds keep their current targeting, including after downgrade. Free can retain or lower the existing rank and remove a genre restriction. Once saved weaker, Free cannot restore a stronger restriction. Changing a required-match genre is not assumed to weaken targeting: remove the restriction first or obtain Pro. Closing remains possible. Existing audience availability, lifecycle and accepted-evidence build-lock checks still apply; they are not new subscription restrictions.

Grandfathering uses the existing published round's saved settings; no campaign data is backfilled. It applies to already published community-only rounds too, but their first Hub publication still must satisfy account launch allowance/spacing. New Free community-only rounds cannot stash new Pro restrictions.

## Interface and admin assignment

My Games shows the developer plan separately from tester rank/developer level, account-wide usage, the exact local next-launch date and separate rolling/spacing restriction dates. All game allowance panels share the same plan context. Advanced targeting options are marked Pro with accessible explanations. Requested/saved values are retained across plan changes; the developer explicitly corrects an unpublished draft if necessary. Capacity is recruitment permission, not guaranteed participation. There is no payment/upgrade button.

Only a signed-in admin (`profiles.role = 'admin'`) sees **My Games → Developer plan → Admin: assign developer plan**:

1. Enter the intended developer account UUID (`profiles.id`/Auth user ID).
2. Choose Free or Pro and enter an audit reason.
3. Select **Save plan assignment**. The server verifies admin authority and the target developer role, then records old/new plan, actor, reason and timestamp. Repeating an unchanged assignment makes no additional change.
4. The developer uses **Refresh plan and allowance** or reloads My Games. A successful campaign save also refreshes the shared account allowance.

The minimal authenticated API is `admin_assign_developer_plan(p_developer_id uuid, p_plan text, p_reason text)`. Ordinary users cannot self-upgrade through it or write entitlement/policy rows directly. Audit rows are visible only to admins through the existing SQL/API access rules. A normal SQL Editor session does not supply an authenticated admin `auth.uid()`; use the signed-in admin UI, not a made-up auth identity or a service key pasted into the browser.

## Verification

Extended existing tests/harnesses; no dependencies or standalone test scripts:

```powershell
npm run test:developer-plans
npm run test:developer-plans:concurrency
npm run test:developer-plans:browser
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Passed isolated SQL: Free default, admin assignment/audit, private writes/helper permissions, JWT/profile-level self-upgrade resistance, exact Free/Pro boundaries, excess-history deadlines, account-wide usage, upgrade/downgrade without resets, draft/publish targeting, grandfathered edits/claims, one active game round, mixed/community lifecycle, immutable history, capacity and feedback access.

Passed real independent PostgreSQL connection tests: competing Pro launch-15 publications across different games, Free publication rollback, and downgrade racing publication. The existing harness creates/removes a disposable no-network container with synthetic data, no published ports/host volumes/source credentials and no recovery-container access. Embedded checks are separately labelled simulations.

Passed mocked browser checks for assignment/revocation, shared usage/spacing, disabled Pro options, retained requested values, grandfathered controls, error/retry and desktop/mobile layout. TypeScript and new component/test lint passed. Existing unrelated StartPlaytest effect-state lint errors/image/dependency warnings remain unchanged. Live source integration was not run.

## Exact remaining application steps — require authorisation

1. Establish which baseline migrations are already applied. This change expects the existing 001–009 testing/ownership/genre/account-wide/discovery baseline; do not reapply successful files or assume that the missing reservation activation function means migration 012 succeeded.
2. Apply **only** `supabase/migrations/202610280014_developer_entitlements.sql` once to the intended authorised database, after that baseline, using the existing SQL workflow. It owns its transaction and reloads the schema cache. Stop on error. Do not bulk-push unrelated pending migrations: 010–013 are independent of this feature. Migration 014 does not apply/activate reservations or change either plan's tester-place capacity.
3. Run the matching application changes. Without the plan RPC, the UI explains that plan/targeting information is unavailable rather than inventing a Pro entitlement.
4. Confirm an unassigned developer shows Free; another game shares the same launch usage. Grant Pro through the admin control above; confirm the same history, 15-launch limit, 48-hour spacing and enabled targeting. Revoke to Free; confirm published rounds/feedback remain accessible and only new launch/stronger-targeting attempts are blocked.
5. Use the isolated tests for boundary/race/history simulations. Do not edit live timestamps or delete campaigns to reset quotas. No billing setup, secret, worker, deployment or separate activation call is required for this migration.

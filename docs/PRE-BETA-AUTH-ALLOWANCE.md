# Passwords and launch allowance — 29 October 2026

Implemented locally. No live Auth settings, credentials, migrations, deployment or email delivery were changed. Automated Auth requests are mocked.

## Supabase dashboard settings to review manually

1. Open the intended project → **Authentication → URL Configuration**. While the app is local-only, retain the appropriate local Site URL. Before public beta, change Site URL to the actual HTTPS deployment origin (for example `https://playtested.co.uk` only once it is hosted there).
2. Add **Redirect URLs**: `http://localhost:3000/reset-password` and the eventual hosted `https://playtested.co.uk/reset-password`. Add a www origin only if it really serves the app. Retain existing signup `/auth/callback` entries and query patterns; do not remove working confirmation redirects. Use exact production recovery URLs, not unrestricted wildcards. Recovery requests derive the URL from the current origin, never a hard-coded localhost URL.
3. **Authentication → Email Templates → Reset Password**: use the supported Supabase link, e.g. `<a href="{{ .ConfirmationURL }}">Reset password</a>`. Do not replace it with a hard-coded localhost destination or the signup callback. This implementation uses the default confirmation link + PKCE exchange on `/reset-password`; an unrelated token-hash template requires different handling. Recovery links must be opened in the browser that requested them. Expired, used, missing-verifier and ordinary sign-in sessions show a new-email option. Reloading after the one-time exchange also requires a new recovery link; the page deliberately does not treat any signed-in account as a recovery session.
4. **Authentication → Sign In / Providers → Email**: retain email confirmation and existing security settings. Review password strength requirements, recovery expiry, **Secure password change**, and **Require current password when changing password** if available. Signed-in changes supply `current_password`; when Supabase requests reauthentication the UI uses `reauthenticate()` and submits its nonce. Do not disable verification to bypass a failure. CAPTCHA-enforced recovery would need its existing project CAPTCHA integration before beta; this change does not disable server CAPTCHA.
5. **Authentication → Custom SMTP** (linked from Auth settings): configure a real sender/provider using its host, port, username and password privately. Confirm sender/domain verification and SPF/DKIM/DMARC with that provider. Do not invent a support mailbox or put SMTP secrets in Git. Keep provider link-click rewriting/tracking disabled for authentication links where it breaks one-time URLs. The built-in Supabase sender is restricted and is not suitable for a public beta; verify actual delivery to an external test mailbox after configuration.
6. **Authentication → Rate Limits**: review email/recovery limits for the beta and provider. The UI waits at least 60 seconds between requests within that mounted screen; it is not a replacement for Supabase's server limits. Requests receive the same account-neutral confirmation for known/unknown addresses. Transport outages and throttling have separate retry guidance. No changes were saved to these settings by this task.

Use existing isolated local Supabase/Mailpit if manually testing without external delivery: obtain its URL from `supabase status` for that already configured local stack, and point the test app to that isolated backend. Do not run a hosted-project email test as an automated test.

Official guidance checked 29 October 2026: [password flows/current-password verification](https://supabase.com/docs/guides/auth/passwords), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls), [custom SMTP restrictions/settings](https://supabase.com/docs/guides/auth/auth-smtp).

## Launch allowance diagnosis and conditional database action

Requests: `get_my_developer_plan()` in DeveloperPlanProvider and `get_playtest_eligibility(uuid,uuid,uuid)` in StartPlaytest. The former returns a JSON object; the latter returns a table/array. The old client collapsed plan failures into “enable migration 014” and eligibility failures into a generic Reload message. It neither established that 014 was missing nor exposed which request failed. The actual hosted response has not been supplied/confirmed; no live cause is claimed.

The prepared policy in `202610280014_developer_entitlements.sql` is Free **1 per 720 hours**, Pro **15 per 720 hours with a 48-hour gap**. Display validation fails closed on malformed/mismatched policy and preserves all non-negative historical usage, including totals above the limit. It does not alter SQL policy, capacities or history. Panel Retry refreshes account plan and per-game eligibility; failed launch checks do not invalidate an existing campaign or remove feedback access.

Run this **read-only** check if the new in-page diagnostic reports missing setup:

```sql
SELECT
  to_regprocedure('public.get_my_developer_plan()') AS plan_rpc,
  to_regprocedure('public.get_playtest_eligibility(uuid,uuid,uuid)') AS eligibility_rpc,
  to_regclass('public.developer_plan_policy') AS plan_policy;
```

- If `plan_rpc`/`plan_policy` is NULL: check the applied 001–009 baseline described in [DEVELOPER-PLANS.md](DEVELOPER-PLANS.md), then apply **only** `supabase/migrations/202610280014_developer_entitlements.sql` once after explicit authorisation. Do not bulk-push or rerun earlier migrations. 010–013 are independent; 014 does not change tester-place capacity. Stop on SQL error.
- If the functions exist but the API reports `PGRST202`: confirm the app points at that same project and the correct signature, then refresh the schema cache (`NOTIFY pgrst, 'reload schema';`) only as an explicitly authorised live action. Do not rerun the migration on that evidence alone.
- For `42501`/Auth errors: confirm a valid session, developer role/relationship and deployed grants. Do not grant anonymous access or remove ownership checks. Migration 014 grants the protected plan RPC to authenticated users.
- For an unexpected response or policy discrepancy: inspect the deployed function/policy against the versioned source. Do not invent counts, clamp legacy history, or silently fall back to an assumed Free plan.

## Targeted checks and manual tests

Existing tests extended: `node tests/test-auth-handoff.mjs --passwords`, normal auth handoff test, and `node tests/test-developer-workspace.mjs --plans-browser`. These mock Auth/RPC calls and exercise real UI; they do not establish hosted SMTP delivery or the live migration state. No unrelated database suites need repeating.

1. Login → Forgot password → request with a controlled account; check generic confirmation and disabled immediate retry. Open the actual email in the same browser after configuring URLs/SMTP.
2. Reset with matching new passwords, sign in with the new password, then retry the used/expired link and confirm it offers another email. A normal sign-in plus a direct visit to `/reset-password` must not expose a recovery form.
3. Account → Change password: try a wrong current password, then the correct one; complete an emailed code if Supabase requests one. Confirm normal account/role editing remains available.
4. My Games: check the account plan, true usage and next eligible local date. On a failure, record the **RPC name and error code only**, then use Retry allowance. Check existing campaign management and feedback remain accessible. Do not publish a campaign solely as a test of this display.

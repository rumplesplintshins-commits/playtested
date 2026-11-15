# Notification contracts (campaign milestone)

Coordinate with Agent 3 before changing notification kinds, dedupe keys or hrefs. All writes go through `public._create_notification` (kind allow-list, per-(recipient, dedupe_key) delivery via `notification_delivery_keys`). The bell panel keys rows by `dedupe_key + id`, so unstable dedupe keys would show duplicate rows.

## Kinds introduced by this milestone

- `campaign_completed`
  - Recipient: the campaign's developer.
  - Trigger: `process_campaign_completion()` flips a campaign (`status in ('open','paused')`) to `closed` when accepted reports (reviewed + accepted + replacement-aware) reach `target_testers`. Fires exactly once per campaign.
  - Dedupe key: `campaign:completed:<campaign_id>`.
  - Href: `_campaign_my_games_href(p_campaign_id)` → `/my-submissions?tab=games&game=<developer_link_id|submission_id>&campaign=<campaign_id>`; falls back to `/my-submissions?tab=games` only if no game can be resolved.
  - Notes: also works while the campaign is `paused`. Claims, pending and rejected reports can never trigger it. Idempotent under repeated row touches, after target reached, and no historical backfill (older campaigns never complete retroactively).

- `admin_feedback_moderation`
  - Recipient: every `profiles.role='admin'`.
  - Dedupe keys: `feedback:moderation:<test_id>:admin:<admin_id>` (report became `submitted`; deduped on resubmission) and `feedback:moderation:<test_id>:recon:<event_id>:admin:<admin_id>` (one request per admin on each new reconsideration request; a duplicate pending request is refused elsewhere).
  - Href: `/admin/submissions`.
  - entity: `playtest` only when the report is campaign-linked (playtest_id not null), `NULL` for bare submission feedback.
  - Pending feedback on already-completed (closed) campaigns still alerts admins; completion never suppresses moderation.

## Untouched guarantees (v11 behaviour preserved)

- `admin_new_submission` stays per-admin deduped (`submission:new:<submission_id>:admin:<admin_id>`), href `/admin/submissions?submission=<id>`; fresh submissions with 'Pending Review' alert once per admin.
- `submission_needs_info` / `submission_approved` / `submission_rejected` and the developer-feedback flow keep their prior vocabulary keys and hrefs.
- `get_campaign_testing_details` is additive: legacy keys stay byte-compatible; only `accepted` and `completed_at` are added.
- Notification RLS, `get_my_notifications`, read/dismiss/write rules unchanged.

## Verification

- `tests/test-campaign-completion.mjs` (pglite fixture + migrations `202611010029_notifications.sql` ≤ `202611050121_merge26_new_campaign_capacity.sql` ≤ `202611080100_campaign_completion_notifications.sql`) asserts each contract above; registered as `npm run test:campaign-completion`.
- `tests/test-notification-routing.mjs` continues to pass unchanged.

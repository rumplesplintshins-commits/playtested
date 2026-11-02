# GDPR account erasure design

Status: design gate before destructive database implementation.

## Objective

Fulfil an approved account-erasure request without deleting legitimate game, campaign or completed playtest history.

## Handling rules

- Delete account-only data: authentication identity/email, profile/preferences, notifications and unfinished tester claims.
- De-identify completed tester reports: preserve the report and scores for the developer, but remove the former tester's account identity.
- Remove current developer relationships: an erased account must no longer own/manage games.
- Preserve non-personal product history where it remains useful: game/listing data, campaign history, PULSE results and aggregate/reception information, provided it no longer identifies the erased person.
- Retain limited moderation/deletion audit information only for the documented retention period and without unnecessary account identity.

## Confirmed schema constraints

1. `community_game_tests.tester_id` is protected by the submitted-report integrity trigger. Submitted/reviewed reports cannot currently be deleted or reassigned by ordinary operations.
2. `test_review_events.actor_id`, `community_game_tests.replacement_by` and `submission_review_events.actor_id` can identify moderators/reviewers and need a de-identification rule.
3. `notifications.recipient_id` is account-only data and should disappear with the account.
4. `game_developer_links.developer_id` represents a current developer relationship and should be removed during erasure.
5. Historical campaigns/submissions contain developer identity relationships and must be de-identified safely rather than cascade-deleted.
6. The existing `account_deletion_requests` workflow remains the request/audit entry point.

## Implementation gates

Before enabling destructive processing in production:

1. Take a fresh production recovery point.
2. Verify every user-ID foreign key in the live schema against this design.
3. Add an internal/service-role-only erasure processor; never expose destructive erasure directly to `anon` or `authenticated`.
4. Make processing idempotent so an interrupted request can be retried safely.
5. Separate application-data erasure from the final Supabase Auth deletion so failures cannot leave an untraceable half-completed request.
6. Test with dedicated tester-only, developer-only and dual-role accounts before production rollout.
7. Confirm the Privacy Notice retention/de-identification wording matches the implemented behaviour.

## Intended state machine

`pending` -> `processing` -> application data removed/de-identified -> Auth identity deleted -> `completed`

A failed stage must remain auditable and retryable; it must not be reported as completed.

## Production rule

Do not run account erasure against live users until the migration has passed the test cases above and a current recovery point exists.

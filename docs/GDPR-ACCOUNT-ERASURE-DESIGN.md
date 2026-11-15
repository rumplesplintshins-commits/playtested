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

1. `community_game_tests.tester_id` is protected by the submitted-report integrity trigger. Submitted/reviewed reports cannot currently be deleted or reassigned by ordinary operations. Reservation logic also treats `tester_id` as immutable while a participation exists. Active claimed/in-progress reservations can be released and deleted; completed reports therefore need a deliberate de-identification mechanism rather than ordinary deletion.
2. `test_review_events.actor_id`, `community_game_tests.replacement_by` and `submission_review_events.actor_id` can identify moderators/reviewers and need a de-identification rule.
3. `notifications.recipient_id` is account-only data and should disappear with the account. Notification creation is asynchronous service data and does not need to survive as user history after erasure.
4. `game_developer_links.developer_id` represents a current developer relationship and should be removed during erasure.
5. Historical campaigns/submissions contain developer identity relationships and must be de-identified safely rather than cascade-deleted.
6. `developer_entitlements.developer_id` is current account configuration and should be removed. `developer_entitlement_events.developer_id`, `actor_id` and `assigned_by` are audit identities and require the same retained-audit/de-identification policy as moderation history rather than indefinite personal attribution.
7. `listing_revisions.editor`, `reviewer` and `reassessed_by` identify editors/reviewers. The listing state and approved public changes can remain useful, but historical account identifiers require de-identification or time-limited justified retention.
8. PULSE worker heartbeat/job availability infrastructure is operational product data. PULSE jobs are tied to submissions/developers elsewhere in the schema; technical results may be preserved only after any account identity is disconnected. Worker IDs are service identifiers, not user profile identity.
9. Tester reservation history uses `community_game_tests.tester_id`; one-active-test and reclaim rules reinforce that active claims are account-specific while completed testing evidence is product history. Erasure processing must distinguish those states.
10. The existing `account_deletion_requests` workflow remains the request/audit entry point.

## Data handling matrix

| Data | Erasure treatment |
| --- | --- |
| Supabase Auth identity/email | Delete at final successful stage |
| Profile, preferences, notifications | Delete |
| Active tester claim/reservation and unfinished account-only draft state | Delete/release |
| Completed tester report and scores | Preserve report; replace/sever tester identity using the approved anonymisation design |
| Current game developer links | Delete |
| Developer entitlement/current plan assignment | Delete |
| Historical moderation, entitlement and review audit events | De-identify where possible; retain identifiable data only while a documented security/legal need remains |
| Public game/listing data and approved listing state | Preserve where no longer personal data |
| Listing revision history | Preserve useful change history but de-identify editor/reviewer identities according to the audit-retention rule |
| Campaign/PULSE technical history and aggregate reception | Preserve only after user identity is disconnected |
| Deletion request record | Keep minimal audit evidence for the adopted retention period; do not use it as indefinite identity storage |

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

# Current policy: admission, maintenance and response counts — 29 October 2026

**Migration 017 supersedes the historical 016 maintenance-review policy below. Nothing has been applied live.** Apply `202610290017_admission_maintenance_intents.sql` only after authorisation, after 016 and its 010/011/baseline dependencies. Do not bulk-apply migrations or guess which ones are installed.

- Initial submissions still require applicable information and admin approval. Complete submissions/resubmissions enter Pending Review; missing requirements enter Needs More Information. Supporting evidence is optional everywhere; supplied URLs are validated. AI explanation remains conditional.
- After real admission, approved developers use **Save changes**. Valid changes publish immediately and retain Approved status, including AI corrections in either direction. No new pending revision is created. Invalid saves preserve current content/status. Only changed requirements and affected dependencies are checked; unchanged legacy omissions do not block unrelated edits. Titles must remain nonblank.
- Admission is established by Approved submission state/history or the approved imported-game ownership-claim route, not catalogue presence. A private admission ledger records proven admission on maintenance. Imported claims must still be current. Protected ownership/moderation/reviewer/assessment fields remain uneditable.
- Canonical overlays and Published audit revisions preserve game IDs, campaigns, build URLs/labels, accepted-feedback locks, feedback, ratings and XP. Material edits flag independent reassessment without delaying publication. Fresh reassessment confirmation is bound to the material save timestamp and current version; an old verification cannot certify the new disclosure.
- New Hub publication, draft publication and first Hub conversion require admission and current moderation clearance. Draft preparation and existing campaign management are preserved. Normal account allowances, rank/genre and capacity checks still apply. Failed publication rolls back without consuming a launch. Already admitted legacy omissions and absent evidence are not new blockers.
- Public intent displays use actual definite/probable/valid-answer counts per published build or lifetime, for accepted independent reports. Neutral and negative answers count in the relevant denominator; unanswered/invalid answers and unaccepted/replaced reports do not. No counts are reconstructed from percentages. Existing reception-band calculations remain unchanged. Missing reporting shows Responses unavailable; real zero answers show No answers yet.
- Public count RPC access is aggregate-only, bounded to 12 displayed games. It returns no tester identifiers, private draft IDs or report text. Raw tables and internal helpers remain private.

## Reviewed repair only

`preview_listing_admission_repairs()` is an admin-only, read-only preview of currently Needs More Information records with actual Approved → Needs More Information history. Review each decision; `repair_listing_admissions(p_records, p_reason)` accepts only the selected IDs/exact preview revisions and a reason, in an authenticated admin context. It preserves human notes and records the repair. It refuses stale previews and does not rewrite current Rejected decisions. No repair was run. Records without trustworthy history require individual investigation, not automatic approval.

Current missing-field counts/messages are recomputed without optional evidence. Viewing pages does not change moderation status. Existing initial-submission completeness preview/batch routing remains explicit.

## Current verification and manual checks

Existing tests extended: `test-submission-corrections.mjs --maintenance`, the normal correction test, `test-submission-correction-browser.mjs` and `--listings`, catalogue browser checks and intent checks in `test-playtime.mjs`. SQL uses disposable PGlite; browser Auth/RPC calls are mocked. No live data, emails, deployment or push.

1. Submit AI-assisted information with an explanation and blank evidence: expect Pending Review. Omit the explanation: expect exact correction guidance. Save partial edits, then explicitly resubmit.
2. My Games → Edit listing → Save changes. Confirm immediate updates and Approved status. Test an invalid supplied URL, clearing evidence, and an unrelated edit on a legacy incomplete listing.
3. For material edits, confirm the old assessment is marked for reassessment while current disclosure is developer-declared. Confirm campaign build identity and feedback remain unchanged.
4. Check counts, No answers yet, small-sample context and build switching on public details/history; compare a single valid answer with several reports containing unanswered questions.
5. Confirm an unapproved submission cannot publish to Hub; an admitted legacy listing can publish subject to normal launch/capacity/eligibility rules. Do not launch a real campaign solely as a display test.

## Historical 016 design (superseded by 017)

Prepared locally. **Migration 016 has not been applied live.** No source listings, campaigns, users, feedback or assessments were rewritten.

## Apply only after authorisation

Run `supabase/migrations/202610290016_listing_revisions.sql` once after the existing 001–009 baseline, **010 completeness** and **011 canonical game/approved relationship helpers**. Stop on error; do not bulk-apply other pending migrations. The migration checks its helpers and reloads the API schema cache. It does not require or activate reservations, change entitlements, or change quotas/capacities.

The two new tables hold private listing state and revision history, with RLS and no direct anon/authenticated privileges. Authorised RPCs enforce existing approved `game_developer_links` membership and canonical `_share_owned_key`; a pending/rejected claim alone grants nothing. Admin review/reassessment RPCs check the admin role themselves. The bounded public RPC returns only current public presentation fields and status flags, never proposed evidence, revision history or internal notes.

## Field policy and identity

- Reuse `/submit?edit=ID&listing=imported|approved|submission` and the existing correction form. My Games provides Edit listing on approved relationships; non-approved original submissions retain their existing correction workflow.
- Complete description, artwork and genre changes may publish directly. All remaining managed fields, including identity labels, AI category/areas/explanation/evidence, public destinations and release information require an explicit proposal/review. Incomplete changes remain private under existing conditional completeness rules; AI corrections in either direction are allowed.
- Current approved presentation is stored as a canonical overlay, so import refreshes cannot silently overwrite developer edits. It does not update source IDs, ownership, campaign build URLs/labels, assessment records, feedback, ratings or XP. Steam aliases use the existing canonical app-key helper; the actual Steam app identity cannot be reassigned through an edited link.
- A new save supersedes the prior pending proposal and increments its optimistic version. Submit again to return material changes to review. Duplicate saves are idempotent. Admin decisions require that exact pending version and the captured source fingerprint; newer edits/changed source records stop stale approval.
- Public catalogue and detail pages apply current approved fields. A disputed disclosure shows pending-review/needs-review wording and suppresses old assessment proof. Material approval requires reassessment; the old assessment remains in the existing source/history and its available published snapshot is retained privately with the revision.

## Admin workflow

Admin Review → **Listing changes and reassessments** shows field-level before/after values and developer-visible reasons. Approval applies only that proposal. Rejection requires a reason and preserves current public content; a disputed disclosure is not silently recertified on rejection.

To restore assessment presentation after a material approval, perform the existing independent assessment and publish it. Then use **Confirm current listing reassessed**, recording what was reviewed. The server requires a newer published assessment with AI claims checked, the current listing version and no unresolved disclosure dispute. It snapshots that assessment/reviewer/reason separately. The listing approval button itself never verifies a disclosure. Imported games without a published independent assessment remain unverified.

## Verification/manual checks

Targeted existing tests: `node tests/test-submission-corrections.mjs --listings`, `node tests/test-submission-correction-browser.mjs --listings`, and the catalogue browser test. SQL runs in disposable PGlite; browser Auth/RPC calls are mocked. These are not live migrations or production data tests.

1. My Games → Edit listing. Confirm existing values, change description, save, and inspect the same public game. Check failed saves/unsaved navigation retain edits.
2. Change AI disclosure; omit conditional explanation/evidence to see required fields. Complete them, flag inaccurate current disclosure if appropriate, and submit. Confirm pending fields are shown and old public content remains with the appropriate warning.
3. Admin Review → compare before/after. Reject with a reason or approve the current version. Reopen an older review after another save and confirm it is refused.
4. Check catalogue and public details, including mobile. Confirm material approval shows reassessment needed and privately supplied evidence/notes are not exposed through public history.
5. Confirm campaigns, accepted-feedback build locks, tester claims, reports and XP remain unchanged. A different developer or pending claimant must not load/save this listing.

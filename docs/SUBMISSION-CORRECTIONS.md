# Submission completeness and corrections

Implemented locally on 28 October 2026. **Migration 010 is prepared, not applied to the connected project.** No email, external notification, deployment or push was added.

## Rules

`submission_completeness(jsonb)` is the authoritative SQL validator. `lib/submission-completeness.ts` supplies matching client guidance, with SQL/JS parity tests. Requirements are title, developer/studio, genre, description, release status and AI classification. Released games need a release date; existing released/upcoming date rules are enforced. Build/store links and thumbnails remain optional as in the existing form, but provided URLs must have valid HTTP(S) syntax. Steam links must identify an app. There is no network fetch in validation; the existing optional thumbnail preview is no longer an acceptance gate.

The previous admin missing-information list required an AI explanation and evidence unconditionally, while the form treated them as optional. The resolved conditional policy requires both for AI-generated/AI-assisted disclosures, and neither for No AI disclosed. Optional AI-area selections are shared with the original form and preserved/editable. No proof of the absence of AI is required. Reviewer launch, gameplay, evidence-inspection, performance, notes and public-summary tasks are internal assessment work and never enter developer completeness reasons.

## Workflow

- Initial submissions use existing duplicate checks and the same submission table. An owned incomplete record saves as Needs More Information with stable field IDs, reasons and a deterministic message; a complete record saves as Pending Review. Neither path auto-approves or awards XP. A stable request ID supports uncertain-save retries for the incomplete path.
- Game submissions retains its Needs More Information filter, now with its status count. Each affected row shows its own missing-detail count and Complete information action. Human requests remain separately visible even when the automatic check finds no missing fields.
- `/submit?edit=<id>` is correction mode on the existing submit route. It loads only the signed-in authorised developer's record, prefills fields/AI areas, highlights issues with field anchors and inline guidance, and preserves current input on failure. Session return URLs keep the record ID. Unsaved navigation warns before leaving.
- Save edits retains the existing review state; correcting all fields does not itself return a Needs More Information record to the queue. Explicit Resubmit for review sends complete records to Pending Review and incomplete records to Needs More Information, preserving ID, claims, relationships, campaigns and feedback. Back to submissions requests refreshed workspace data/counters.
- Admin preview is a read-only, button-triggered list of up to 100 incomplete Pending Review records. The admin explicitly selects records and confirms the batch. Current values and revisions are checked again transactionally; stale previews stop rather than overwrite changes. Already-routed records are skipped on retry. Approved and Rejected records are never automatically routed.
- Existing human notes are not overwritten by developer corrections or batch routing. New audit events retain previous/new states, notes, actor and completeness reasons. Existing current notes remain; no missing historical decisions are invented. Page views and identical retries do not append repeated events.
- Server triggers revalidate approval, including explicit reaffirmation of Approved. The existing review RPC is preserved: its links/XP effects roll back if the final status update is rejected. Reviewer assessment incompleteness is not a listing-approval prerequisite. Approved listings cannot be edited through the developer correction RPC; separate deliberate review remains required.

## Permissions and deployment

Migration: `supabase/migrations/202610280010_submission_corrections.sql`. Adds completeness/revision fields, owner/admin-readable audit history, owner-only correction RPCs, admin-only preview/batch RPCs and approval/write guards. It does not mass-update existing statuses. A narrowly scoped permissive insert policy allows owned Needs More Information inserts alongside the existing Pending Review policy. The restored local schema/RPC definitions were inspected read-only to verify this compatibility; no live database was queried or mutated for this feature.

Preview only:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\maintenance\apply-authorized-testing-update.ps1 -SubmissionCorrectionsUpdate
```

When separately authorised, add `-Execute` and enter the existing Session pooler URI privately. This flag pins/applies only 010, checks the expected uninstalled state, records application hashes and stops on failure; it does not apply 007–009. Do not rerun a successful migration. Legacy pending records remain pending until the explicit admin preview/batch action is used.

## Verification and limits

- `node tests/test-submission-corrections.mjs`: isolated PGlite SQL/JS parity; Unicode/ASCII whitespace, URL formats/ports, conditional and inapplicable fields, release dates, reviewer-task exclusion, complete/incomplete routing, partial corrections, save vs resubmit, idempotency/conflicts, owner/reviewer-field protection, private history, read-only preview/explicit batch, approval revalidation/statement rollback, and preserved existing records/notes/relationships/campaigns/feedback.
- `node tests/test-submission-correction-browser.mjs`: actual initial form and edit route with mocked backend; retained duplicate checks, exact reasons, failed-save input preservation, save/resubmit states, separate human notes, admin preview/no automatic page-view mutation, batch/counter refresh. Also uses the real results component at narrow workspace widths to check the revised metric grid: Not reported no longer splits mid-word. Temporary fixture files are removed.
- `node tests/test-developer-workspace.mjs --server-only`: existing owner-scoping, deduplication, claim distinction and active source/history checks reused after the new guidance import.
- Targeted submission/admin/workspace TypeScript passed. New helpers/components/test scripts lint clean. Existing admin/submit files still have the same nine lint errors as HEAD (effect-state, old anchor and apostrophe rules); no unrelated lint cleanup or full-suite rerun was performed.

Only the prepared migration enables the database workflow. Browser interactions were mocked, not performed with real developer/admin writes. Counters refresh on the current batch action or return to the workspace; already-open sessions on another device use their existing Refresh control. No new realtime/polling system was introduced. Existing browser drafts and campaign/rank/genre/capacity rules are unchanged.

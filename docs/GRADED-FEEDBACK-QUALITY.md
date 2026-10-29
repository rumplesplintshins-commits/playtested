# Graded feedback quality

Implemented locally, 28 October 2026. Migration **013 is prepared, not applied live**. No deployment, push, backup or recovery operation.

## Assessment

The administrator explicitly assesses credible originality/non-spam and relevance to the game/build/testing experience. Neither gate earns points; either failure forces rejection and 0 XP, regardless of selected criteria. This is a human usefulness assessment, not automated originality verification or proof that subjective opinions are correct.

For eligible reports, rubric version 2 scores five equally weighted criteria: specific build observations, supporting examples, explanation of impact, task/focus coverage and a useful takeaway. Awards are 0, 20, 40, 60, 80 or 100 base XP. Praise, criticism, no bugs and unpolished English receive equal treatment. An eligible 0/5 report can be accepted with 0 XP. Rejection always awards 0 XP.

The rubric and maximum are stored in private `feedback_quality_rubrics`; the server validates the version, exact boolean criteria and eligibility, then calculates score/award itself. Client percentages/XP are not trusted. Client guidance is checked against the stored rubric in tests.

## Review and audit

- No criteria or eligibility decisions are preselected. Any scored subset can be saved once eligibility and a tester-visible reason are recorded.
- Live preview shows criterion count, feedback quality percentage and base XP. Editable, deterministic reason suggestions describe unmet requirements; no AI-generated opinions are used.
- Saving finalises the assessment. “Load recorded assessment for editing” is an explicit action, not an automatic check-all default. Rejection/reversal, acceptance/restoration, audit history and the separate moderator replacement exception remain available.
- Existing audit events store eligibility/criterion decisions, rubric version, quality score, actual total award, XP difference, reviewer, timestamp and reason. The report stores its latest assessment and actual base XP.
- Edits change only the difference: 100→60 is −40; 60→80 is +20. Repeats are no-ops unless closing a reconsideration or changing the recorded assessment/reason. Same-score criterion edits are audited with zero XP difference.
- Completed-test accounting changes only when crossing between zero and positive award, not on each positive adjustment. Concurrent review updates retain the existing campaign→participation→profile locking order.
- Reconsideration covers rejected reports and graded partial/zero accepted awards. Duplicate pending requests are refused; reaffirming an unchanged assessment closes the request with a zero-XP audit event.

Historical reports/awards/audit events are not rewritten or retrospectively scored. Their known XP remains visible with “quality score not recorded”. An explicit later re-review uses the new rubric and adjusts from the actual existing award. Unknown historical amounts are labelled unknown, never inferred as 100.

Tester activity shows actual awards, reasons and XP/review history. Developer feedback cards show the recorded feedback quality/XP separately from game ratings and developer follow-up statuses. Developer preferences/signals cannot award XP.

## Rank and capacity policy

Rank thresholds and qualification SQL are unchanged. Partial positive-XP acceptance counts once toward the existing XP-awarded accepted-test requirement. Accepted 0-XP reports count in acceptance-rate history but not that XP-awarded-test requirement. Smaller awards can require more reports to reach the unchanged XP threshold. Feedback quality percentage is distinct from acceptance rate.

Submission still consumes a campaign place permanently, regardless of rejection, partial XP, zero XP or later expiry. Only the existing audited moderator replacement exception restores a submitted place. Accepted reports continue to lock build evidence, including accepted zero-XP reports. No reservation or launch rule was changed.

## Checks

Extended existing policy/admin/tester/developer/rank tests; no new dependencies or standalone test scripts:

```powershell
npm run test:feedback-quality
npm run test:feedback-quality:concurrency
npm run test:feedback-quality:browser
npm run test:tester-browser
node tests/test-feedback-actions.mjs
node tests/test-rank-summary.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Passed isolated SQL: all six scores, eligibility overrides, actual positive/negative feedback neutrality, partial/zero acceptance, award edits, duplicates, reversals/restoration, historical preservation/explicit re-review, permissions, client tampering, reconsideration, failed-reversal atomicity, unchanged capacity and rank accounting. Real PostgreSQL 17 independent-connection tests passed concurrent 100→60 edits, duplicates, reversal/restoration, rollback and single-report counting. That harness used only a disposable, network-isolated Docker container with synthetic data; no source/recovery database was contacted.

Passed mocked browser checks: unselected defaults, eligibility, partial preview/acceptance, editable reasons, manual assessment reload/edit, actual reversal, counters/history, tester score/XP history and reconsideration controls, desktop/mobile layouts. Developer-card and rank rendering checks passed. TypeScript and changed module/test lint passed; pre-existing effect-state lint errors in tester draft loading remain unchanged. Source integration remains unverified.

## Remaining application steps — separately authorised

1. Apply `supabase/migrations/202610280013_graded_feedback_quality.sql` once to the intended authorised database using the existing SQL workflow. It owns its transaction and reloads the schema cache. It requires the existing testing-policy/audit/read-model baseline (001–005); independent pending 010–012 do not need to be applied for graded XP. Do not bulk-apply unrelated pending migrations or rerun successful files blindly.
2. Run the matching application changes together with that schema. There is no activation/backfill call for this rubric. Until the rubric RPC is available, the admin form blocks new grading rather than posting the old checklist.
3. With dedicated test accounts: explicitly pass eligibility, select three criteria and save a reason → accepted, feedback quality 60%, actual 60 XP. Explicitly load/edit to four → +20 XP; repeat → no extra XP. Reject → −80 XP; restore three → +60 XP. Confirm tester reason/history, developer quality label and unchanged submitted capacity. Keep this smoke data intentional; use the isolated tests for destructive/failure/race cases.

Do not reset historical XP, alter rank thresholds or apply a destructive down migration. Any later correction should be an authorised, audited review or forward repair using actual awards.

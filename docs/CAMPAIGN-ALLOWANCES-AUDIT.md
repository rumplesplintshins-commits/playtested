# Campaign allowance audit

This milestone documents existing allowance behaviour; it implements no new allowance policy.

## Verified existing behaviour

- `fix_free_target` trigger (migration `202610280012_tester_reservations.sql`, originally `202610280002_workflow_integration.sql`):
  - On INSERT of `community_playtests`, `target_testers` is overwritten with the current `testing_policy.places`.
  - On UPDATE, `new.target_testers := old.target_testers` — the developer can never raise or lower an existing campaign's target.
  - A campaign launched during a smaller-capacity window keeps its smaller target after policy later widens, and vice versa. Verified in `tests/test-campaign-completion.mjs` (fresh insert takes policy places; a saved target survives updates and later policy changes).
- `testing_policy.places` history in the migration chain: `2` (base) → `4` (`202610280012`) → relaxed defaults (`202611020037_free_places_and_build_label.sql`) → check `places between 1 and 50` with default `3` (`202611050121_merge26_new_campaign_capacity.sql`).
- Free-plan launch allowance: `_playtested_launch_window` (migration `202610280007_developer_launch_allowance.sql`) counts launches on the same game entity within a 720h (30-day) window; `_playtested_guard_launch` (migration `202610280014_developer_entitlements.sql`) enforces it for `open`/`paused` transitions via `insert_community_playtest` / status updates.

## Ambiguity that remains open — deliberately not implemented

- A "first N campaigns free / later campaigns charged against the monthly allowance" rule (first six qualifying campaigns, seventh onward counted) appears in task notes but has no traceable implementation in migrations, RPCs or table state surfaced by this audit. Without a decision on where eligibility data lives, implementing it would be invention. Pending a product decision:
  - no schema, trigger or migration was added for it;
  - any future implementation must state which historical campaigns qualify retroactively, if any.

## Safe consumer rule for other agents

- Treat `testing_policy.places` as the future-facing default for NEW launches only.
- Treat each surviving `community_playtests.target_testers` as that campaign's frozen truth for completion and display purposes (`get_campaign_testing_details` `capacity` key already reports it).

## Audit trail

- Target-preservation and completion-count concurrency are covered by `tests/test-campaign-completion.mjs` (exactly-once completion, stable `completed_at`).

# Developer Teams migration manifest

Application baseline `v11` at `53b05b3`. Migration source `feature/developer-teams` at `2c1833d`. Checksums cover the Git blob bytes with LF line endings.

The read-only production registry had 54 entries ending at `20261119121656`. The `v11` tree contains 108 migration files. 25 versions match exactly, 83 are repo-only and 29 are registry-only. The differing version IDs do not establish SQL equivalence. Apply only the files below after the recovery gate is cleared. Keep the existing registry intact.

| Order | File | SHA-256 |
| --- | --- | --- |
| 1 | [20261120000652_developer_studios.sql](../supabase/migrations/20261120000652_developer_studios.sql) | `51abcecd923e887e9f8cdb7511bc33f424b7103808c758aed8631fa5816052e6` |
| 2 | [20261120001100_studio_shared_workspace.sql](../supabase/migrations/20261120001100_studio_shared_workspace.sql) | `6cb226945e47a1b0dc0f966a7b8232037dc40f7be26404fa781d792b14de1b40` |
| 3 | [20261120001426_studio_delegated_controls.sql](../supabase/migrations/20261120001426_studio_delegated_controls.sql) | `a5224ca4421358ae68bac0e84e48877c50c7cb9dabf88e2b7b272dea7ec8e438` |
| 4 | [20261120001822_studio_permission_edges.sql](../supabase/migrations/20261120001822_studio_permission_edges.sql) | `09ac94d97666c6f65070662d4de7e714b35b01ccb4e13d43162f89a080c82cd5` |
| 5 | [20261120080409_studio_name_validation.sql](../supabase/migrations/20261120080409_studio_name_validation.sql) | `a5486144545f76e386b689e99d9bea2f36a7975eebbc7f74ce64a57aeba106a0` |
| 6 | [20261120081742_studio_allowance_and_export.sql](../supabase/migrations/20261120081742_studio_allowance_and_export.sql) | `81470f5dc5b900ff55bf61b30c6ac1729a3c93b91ecaa7072e912fc9eaad412e` |
| 7 | [20261120082046_canonical_game_allowance_guards.sql](../supabase/migrations/20261120082046_canonical_game_allowance_guards.sql) | `ed0222b9b417c54778bce8e8faed58a95aca93ef60f0cd9acd227cc233b97aa9` |
| 8 | [20261120082627_workspace_scope_and_identity_review.sql](../supabase/migrations/20261120082627_workspace_scope_and_identity_review.sql) | `47211631e5ee9344b12e76821a3ac1ad45d0db71af91ec25a55ef843f609cdb2` |
| 9 | [20261120091000_studio_membership_limit.sql](../supabase/migrations/20261120091000_studio_membership_limit.sql) | `91f3c2d11c093f13072d07e68104f6b48f2157329b75d106f1a6274e3e141039` |

Each file owns its transaction. Stop on the first failure and inspect the applied registry before resuming. Pause campaign publishing and Steam import writes briefly. Apply the database files in order, then check that all 28 live historical launches are present exactly once, that catalogue writers still work, and that studio grants and legacy campaign management pass. Release the application only after those checks and the recovery gate pass. The manifest authorises no production actions.

# Demo feedback flow

Created 28 October 2026 at the user's request in the configured Supabase project. These are real, clearly labelled QA records used by the localhost app. Existing games and profiles were preserved; no claims/reports were seeded. Creation left owner XP and completed-test counts unchanged. Accepting your manual demo feedback follows normal XP rules.

| Demo | Genre | Interest required | Game page |
| --- | --- | --- | --- |
| Neon Courier | Action | Action | http://localhost:3000/submissions/d3100000-0000-4000-8000-000000000001 |
| Mosslight Grove | Adventure | No | http://localhost:3000/submissions/d3100000-0000-4000-8000-000000000002 |
| Orbit Foundry | Strategy | Strategy | http://localhost:3000/submissions/d3100000-0000-4000-8000-000000000003 |

Each has a thumbnail, public game page, short browser-playable prototype, open Bronze campaign and two tester places. They belong to the existing admin/tester/developer account and also appear in My Games. Build and thumbnail URLs are localhost-only.

1. In Account, note your current preferences, select **Action only**, save and reload. Confirm it persists.
2. In Tester Hub, **My preferred genres** should include Neon Courier. **All genres** should also include Mosslight Grove. Orbit Foundry stays unavailable because its mandatory Strategy interest still applies. Other existing eligible games may also appear.
3. Add **Strategy** in Account and save. Refresh the Hub: Orbit Foundry should now be available.
4. Claim one demo, start testing, open its browser build, play it and return to submit specific feedback. Test one claim at a time. Check that the submission appears in Testing activity.
5. In **Admin Review → Playtest reviews**, check that the pending counter increases. Review the report using the quality rubric and accept it. Confirm the counter decreases, the decision appears in history and tester XP increases by 100 only once.
6. In My Games, open that demo and check that its accepted feedback appears against **Demo build 0.1**.

Optional single negative check: release an unsubmitted claim and confirm its tester place returns. Restore your preferred genres afterwards if desired.

Verified automatically: all three gameplay objectives; blocked movement; restart and turn limits; mobile width; thumbnail/game-page HTTP responses; targeted TypeScript and changed-file lint. The authenticated manual claim → submit → admin acceptance flow is intentionally left for the user.

Fixture manifest: ignored `.backup-tools/demo-playtests-manifest.json`. `node scripts/maintenance/seed-demo-playtests.mjs` previews; `--execute` creates missing fixture records only and refuses mismatched IDs. It does not reset campaigns, reports or XP. No automatic deletion is provided because submitted-report preservation rules apply. No migration, deployment or push was performed for these demos.

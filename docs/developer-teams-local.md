# Developer Teams on localhost

Use the Developer Teams feature checkout and a running local Supabase stack on API port 54341. The four studio migrations require the existing Playtested schema and campaign plan functions. Apply them to your local stack only.

From that checkout, run the repeatable Windows fixture setup:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/seed-local-developer-teams.ps1
npm.cmd run dev -- --hostname 127.0.0.1 --port 3118
```

The seed uses the local Auth admin API to confirm six test accounts without email. It refuses to take over an existing account unless that account is marked as a local studio fixture. It stores generated passwords in the ignored and Windows-user-restricted `.backup-tools/developer-teams/credentials.json`. Open the file locally and use its passwords at the normal login page.

1. Sign in as `studio-owner@playtested.local` and open [My Games](http://127.0.0.1:3118/my-submissions) → **Manage Team**.
2. Create or select your studio. Assign **Ashen Hollow (local fixture)** and keep **Personal game (local fixture)** personal.
3. Invite `devtest1@playtested.local` and `devtest2@playtested.local` as Editors. Invite `devtest3@playtested.local`, `devtest4@playtested.local`, and `devtest5@playtested.local` as Viewers.
4. Sign into each account and accept through the notification bell or [Manage Team](http://127.0.0.1:3118/my-team). Open the studio in My Games. The fixture has two builds, Alpha 0.4 and Alpha 0.5, with different accepted feedback.
5. Remove a colleague from Manage Team, then reload the colleague’s workspace to verify access is gone.

The browser test signs into all six accounts and removes its memberships when finished. Use it in the fixture workspace before starting a manual invitation session. This fixture must stay local.

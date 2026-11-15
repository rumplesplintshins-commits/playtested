# Local Preview — Multi-Platform Submissions

Run entirely against an **isolated development Supabase database**. Do not write
to production Supabase. The app is served on **http://localhost:3002**.

## 1. Prepare the environment

```powershell
cp .env.local.example .env.local
# Edit .env.local and fill in your local Supabase URL + keys (anon + service_role).
# Do NOT use production values.
```

## 2. Start a local Supabase (isolated dev DB)

If you have the Supabase CLI:

```powershell
supabase start
# Notes the local URL/keys it prints; paste them into .env.local
```

Otherwise point `.env.local` at any isolated dev Supabase instance you run
yourself (e.g. via Docker). Production Supabase must not be used.

## 3. Apply the forward-only migrations (local DB only)

From this branch's `supabase/migrations`, apply in order to your local DB:

```powershell
psql "$LOCAL_DB_URL" -f supabase/migrations/202611080001_platform_submissions.sql
psql "$LOCAL_DB_URL" -f supabase/migrations/202611080002_platform_rpcs.sql
psql "$LOCAL_DB_URL" -f supabase/migrations/202611080003_platform_catalogue.sql
```

These add a nullable `platform` column and helpers; existing rows keep `NULL`
(legacy Steam). They are forward-only and must not be applied to production.

## 4. Seed sample games

Create a local developer profile and note its id, then:

```powershell
$env:PREVIEW_DEVELOPER_ID="<local-developer-profile-uuid>"
node scripts/preview/seed-platform-games.mjs
```

This inserts seven `game_submissions`:
- Steam (legacy, `platform` NULL) — already Approved
- PC / Other, Browser, Roblox, Android, iPhone / iPad — Pending Review

## 5. Launch the preview

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="<from .env.local>"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<from .env.local>"
$env:SUPABASE_SERVICE_ROLE_KEY="<from .env.local>"
npx next dev -p 3002
```

Or, with `.env.local` present:

```powershell
next dev -p 3002
```

Open **http://localhost:3002/submit** to test Submit Game, and
**/my-submissions?tab=submissions** (Edit Listing) from a signed-in developer
session. Catalogue badges appear on **/** (homepage catalogue).

## 6. What to verify manually

- Submit Game: all six platform tiles, keyboard/arrow navigation, selected state,
  responsive layout; the link field swaps per platform; Steam IDs not required
  for non-Steam platforms.
- Edit Listing: change platform + URL without losing unrelated details.
- Screenshots: add / replace / remove / reorder; preserved when editing other fields.
- Gameplay footage: optional URL update/removal (no live player changes).
- Catalogue: Web / Roblox / Mobile badges render; Steam/PC show no badge.

# Playtested Platform Data Contract

This document describes the multi-platform data contract introduced on the
`feature/multiplatform-submissions` branch (base: v11). Agent 3 should consume
the values and helpers below rather than inventing its own platform model.

## Canonical platform values

```ts
export type Platform =
  | "steam"   // Steam
  | "pc"      // PC / Other
  | "browser" // Browser
  | "roblox"  // Roblox
  | "android" // Android
  | "ios";    // iPhone / iPad
```

All six are stored in `public.game_submissions.platform`, and also exposed on
`public.imported_games.platform` and `public.approved_games.platform` via the
forward-only migrations on this branch. Existing (legacy) rows keep `NULL`, and
the shared helpers treat `NULL` as `"steam"`.

## Shared helpers (`lib/platforms.tsx`)

| Helper | Purpose |
|--------|---------|
| `PLATFORMS` | `readonly Platform[]` in catalogue order: steam, pc, browser, roblox, android, ios |
| `PLATFORM_INFO[platform]` | `{ value, label, linkLabel, linkPlaceholder, linkGuidance, icon }` |
| `platformOf(value)` | Narrows an unknown value to `Platform \| null` |
| `legacyPlatform(value)` | `platformOf(value) ?? "steam"` — legacy-safe default |
| `platformBadge(platform)` | `"Web" \| "Roblox" \| "Mobile" \| null` — catalogue/Tester Hub badge |
| `platformLinkError(platform, value)` | Platform-specific link validation message or `null` |
| `platformLinkValue(platform, formData)` | Splits a form into `{ steamUrl, gameLink }` by platform |

## Platform → badge mapping

| Platform | Catalogue / Tester Hub badge |
|----------|------------------------------|
| steam | none |
| pc | none |
| browser | **Web** |
| roblox | **Roblox** |
| android | **Mobile** |
| ios | **Mobile** |

Android and iOS remain **distinct internal values** (`"android"` vs `"ios"`)
for tester eligibility; both surface as the single `Mobile` badge publicly.

## Database

New nullable column `platform text` with a `CHECK (platform IS NULL OR platform IN ('steam','pc','browser','roblox','android','ios'))` on:
- `public.game_submissions`
- `public.imported_games`
- `public.approved_games`

SQL helpers (installed by migration):
- `public.normalize_platform(text) -> text` — NULL/unknown → `'steam'`
- `public.platform_badge(text) -> text` — badge label or NULL

The catalogue RPC `public.get_public_catalogue` now returns a `platform`
column (normalized) alongside each row; `lib/public-catalogue-types.ts`
`PublicCatalogueRow.platform` is `string | null`.

## Link fields by platform

- Steam → `steam_url` (Steam store URL, required)
- PC / Other → `game_link` (external download/page, required)
- Browser → `game_link` (HTTPS playable URL, required)
- Roblox → `game_link` (roblox.com experience URL, required)
- Android → `game_link` (play.google.com / Android URL, required)
- iOS → `game_link` (apps.apple.com / iOS URL, required)

"Do not require Steam IDs for other platforms": `steam_app_id` is only derived
from `steam_url` when platform is Steam; other platforms store `steam_url = NULL`.

## Compatibility

- Existing Steam submissions/games keep working (legacy `platform = NULL` → Steam, no badge).
- No production data is bulk-rewritten by the migrations.
- Migrations are forward-only and must NOT be applied to production without a separate review.
- PULSE remains disabled; campaign completion, notification lifecycle and tester XP rules are untouched.

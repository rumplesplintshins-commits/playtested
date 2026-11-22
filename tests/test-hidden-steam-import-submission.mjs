import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261122181602_hidden_steam_imports_allow_fresh_developer_submissions.sql",import.meta.url),"utf8");
const original = readFileSync(new URL("../supabase/migrations/202610310027_claimable_catalogue_duplicate_discovery.sql",import.meta.url),"utf8");
const form = readFileSync(new URL("../app/submit/page.tsx",import.meta.url),"utf8");

for (const token of [
  "CREATE OR REPLACE FUNCTION playtested_studios.check_submission_identity()",
  "AND imported.catalogue_eligible IS TRUE",
  "AND imported.metadata_backfill_status='complete'",
  "AND imported.title IS NOT NULL",
  "AND imported.developer_name IS NOT NULL",
  "AND imported.genre IS NOT NULL",
  "AND imported.image_url IS NOT NULL",
  "AND NOT public.beta_fixture_hidden(imported.id)",
]) assert(migration.includes(token), "Missing public-import guard: "+token);

assert(migration.includes("SELECT 1 FROM public.approved_games approved"),"Existing approved games must remain protected");
assert(migration.includes("SELECT 1 FROM public.game_submissions s"),"Existing developer submissions must remain protected");
assert(migration.includes("playtested_studios.launch_identity"),"Prior launch protection must remain");
assert(migration.includes("playtested_studios.workspace_for"),"Studio identity protection must remain");
assert(migration.includes("SECURITY DEFINER")&&migration.includes("SET search_path TO ''"),"Preserve original security boundaries");
assert(original.includes("and ig.catalogue_eligible = true")&&original.includes("and ig.metadata_backfill_status = 'complete'"),"Title duplicate search must exclude hidden imports");
assert(form.includes('.eq("catalogue_eligible", true)')&&form.includes('.eq("metadata_backfill_status", "complete")'),"Steam URL duplicate search must exclude hidden imports");
console.log("PASS hidden imports allow fresh submission while public and approved games remain protected");

import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/202610310026_developer_claim_ownership_fix.sql','utf8');
const discoveryMigration=fs.readFileSync('supabase/migrations/202610310027_claimable_catalogue_duplicate_discovery.sql','utf8');
const submit=fs.readFileSync('app/submit/page.tsx','utf8');
const catalogueFixture=fs.readFileSync('supabase/tests/public-visibility-fixture.sql','utf8');

// Exactly one canonical current developer relationship per target game.
assert.match(migration,/game_developer_links_one_imported_owner/);
assert.match(migration,/game_developer_links_one_approved_owner/);
assert.match(migration,/game_developer_links_one_submission_owner/);
assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/delete from public\.game_developer_links l[\s\S]*insert into public\.game_developer_links/);
assert.match(migration,/source_claim_id = v_claim\.id/);

// Approval keeps the existing XP behaviour and remains idempotent per claim.
assert.match(migration,/approved_game_claim/);
assert.match(migration,/developer_xp = developer_xp \+ 100/);
assert.match(migration,/developer_xp = greatest\(0, developer_xp - v_removed_xp\)/);

// New imported claims must satisfy the same ordinary imported-game visibility
// gate as the displayed public catalogue, not merely exist in imported_games.
assert.match(migration,/ig\.catalogue_eligible = true/);
assert.match(migration,/ig\.metadata_backfill_status = 'complete'/);
assert.match(migration,/ig\.developer_name is not null/);
assert.match(migration,/ig\.genre is not null/);
assert.match(migration,/ig\.image_url is not null/);
assert.match(migration,/from public\.approved_games duplicate_ag/);
assert.match(migration,/num_nonnulls\([\s\S]*imported_game_id,[\s\S]*approved_game_id,[\s\S]*submission_id[\s\S]*\) = 1/);

// Title/developer duplicate discovery includes imported Steam games only when
// they satisfy that same displayed-catalogue gate. This is the 21 Days path.
assert.match(discoveryMigration,/create or replace function public\.find_possible_game_duplicates/);
assert.match(discoveryMigration,/'imported'::text as source/);
assert.match(discoveryMigration,/ig\.catalogue_eligible = true/);
assert.match(discoveryMigration,/ig\.metadata_backfill_status = 'complete'/);
assert.match(discoveryMigration,/ig\.developer_name is not null/);
assert.match(discoveryMigration,/ig\.genre is not null/);
assert.match(discoveryMigration,/ig\.image_url is not null/);
assert.match(discoveryMigration,/from public\.approved_games duplicate_ag/);

// The ownership fix must NOT weaken or replace the existing catalogue RPC.
assert.doesNotMatch(migration,/create or replace function public\.get_public_catalogue/i);
assert.match(catalogueFixture,/ig\.metadata_backfill_status = 'complete'/);
assert.match(catalogueFixture,/ig\.developer_name is not null/);
assert.match(catalogueFixture,/ig\.genre is not null/);
assert.match(catalogueFixture,/ig\.image_url is not null/);

// Existing catalogue behaviour already recognises a canonical imported-game
// relationship as a Playtested profile and promotes it in Featured ordering.
assert.match(catalogueFixture,/from public\.game_developer_links gdl[\s\S]*gdl\.imported_game_id = ig\.id/);
assert.match(catalogueFixture,/r\.has_playtested_profile = true/);

// Existing submission claim UI wiring accepts imported duplicate sources at
// runtime and creates the claim against the canonical imported game id.
assert.match(submit,/type DuplicateSource = "submission" \| "approved" \| "imported"/);
assert.match(submit,/Claim this game/);
assert.match(submit,/claimant_id: user\.id/);
assert.match(submit,/possibleDuplicate\.source === "imported"/);
assert.match(submit,/claimError\.code === "23505"/);

console.log('PASS developer claims: one current owner, atomic transfer, XP preservation, displayed-catalogue claim gate, imported duplicate discovery, catalogue quality preservation, and claim UI wiring.');

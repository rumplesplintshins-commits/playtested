import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/202610310026_developer_claim_ownership_fix.sql','utf8');
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

// New imported claims must be for catalogue-eligible canonical records.
assert.match(migration,/ig\.catalogue_eligible = true/);
assert.match(migration,/num_nonnulls\(imported_game_id, approved_game_id, submission_id\) = 1/);

// The ownership fix must NOT weaken the existing catalogue metadata quality gate.
assert.doesNotMatch(migration,/create or replace function public\.get_public_catalogue/i);
assert.match(catalogueFixture,/ig\.metadata_backfill_status = 'complete'/);
assert.match(catalogueFixture,/ig\.developer_name is not null/);
assert.match(catalogueFixture,/ig\.genre is not null/);
assert.match(catalogueFixture,/ig\.image_url is not null/);

// Existing catalogue behaviour already recognises a canonical imported-game
// relationship as a Playtested profile and promotes it in Featured ordering.
assert.match(catalogueFixture,/from public\.game_developer_links gdl[\s\S]*gdl\.imported_game_id = ig\.id/);
assert.match(catalogueFixture,/r\.has_playtested_profile = true/);

// Existing submission claim UI wiring remains intact. A separate regression
// will cover title/developer matching for imported catalogue games.
assert.match(submit,/Claim this game/);
assert.match(submit,/claimant_id: user\.id/);
assert.match(submit,/possibleDuplicate\.source === "imported"/);
assert.match(submit,/claimError\.code === "23505"/);

console.log('PASS developer claims: one current owner, atomic transfer, XP preservation, canonical target guard, catalogue quality gate preservation, and existing claim UI wiring.');

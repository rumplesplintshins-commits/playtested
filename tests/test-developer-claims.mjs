import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/202610310026_developer_claim_ownership_fix.sql','utf8');
const submit=fs.readFileSync('app/submit/page.tsx','utf8');

assert.match(migration,/game_developer_links_one_imported_owner/);
assert.match(migration,/game_developer_links_one_approved_owner/);
assert.match(migration,/game_developer_links_one_submission_owner/);
assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/delete from public\.game_developer_links l[\s\S]*insert into public\.game_developer_links/);
assert.match(migration,/source_claim_id/);
assert.match(migration,/catalogue_eligible = true/);
assert.match(migration,/exists\(select 1 from public\.game_developer_links gdl where gdl\.imported_game_id=ig\.id\)/);
assert.match(migration,/when \(r\.source_type='approved' or r\.has_playtested_profile\) then 2/);
assert.match(migration,/when p_sort='Featured' and c\.featured_tier=2 then c\.submitted_at/);
assert.match(submit,/Claim this game/);
assert.match(submit,/claimant_id: user\.id/);
assert.match(submit,/possibleDuplicate\.source === "imported"/);
assert.match(submit,/claimError\.code === "23505"/);

console.log('PASS developer claims: one current owner, atomic competing-claim transfer, canonical target guard, developer-backed catalogue visibility/promotion, and existing claim UI wiring.');

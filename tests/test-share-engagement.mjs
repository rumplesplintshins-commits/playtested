import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/202610300025_disable_share_attribution.sql', 'utf8');
const route = fs.readFileSync('app/api/engagement/route.ts', 'utf8');
const journey = fs.readFileSync('app/components/ShareJourney.tsx', 'utf8');

assert.match(migration, /create or replace function public\.claim_with_share_attribution\(p_submission_id uuid,p_visit text\)/i);
assert.match(migration, /return public\.claim_community_game_test\(p_submission_id\)/i, 'Legacy claim wrapper must delegate without recording attribution');
assert.match(migration, /create or replace function public\.submit_community_feedback_with_attribution/i);
assert.match(migration, /perform public\.submit_community_playtest_feedback/i, 'Legacy feedback wrapper must delegate to ordinary feedback');
assert.doesNotMatch(migration, /insert\s+into\s+public\.engagement_(events|claims|visits)/i, 'Disable migration must not create attribution records');
assert.match(migration, /revoke execute on function public\.record_share_visit\(uuid,text,uuid\) from service_role/i);
assert.match(migration, /revoke execute on function public\.share_journey_context\(text,text\) from service_role/i);
assert.match(migration, /revoke execute on function public\.record_share_access\(text,text,uuid,text,uuid\) from service_role/i);

assert.match(route, /status:\s*410/);
assert.match(route, /\{disabled:true\}/);
assert.doesNotMatch(route, /record_share_visit|record_share_access|share_journey_context|shareService|createClient/, 'Disabled endpoint must not call attribution/auth services');

assert.doesNotMatch(journey, /\/api\/engagement|currentJourney\(|carryJourney\(|taggedPath\(/, 'Share journey UI must not start, read or propagate attribution');
assert.match(journey, /href=\{context\.path\}/, 'Ordinary share destination must remain available');
assert.match(journey, /without journey attribution/i);

console.log('PASS share privacy contract: legacy claim/feedback wrappers delegate without attribution, service-role event writers are revoked, the engagement endpoint is inert, and share navigation no longer starts or propagates a journey.');

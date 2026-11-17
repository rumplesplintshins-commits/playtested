import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {freeEvidenceSuite} from './free-playtest-evidence-sql.mjs';
const db=new PGlite();
try {
 await db.exec(fs.readFileSync('supabase/tests/v10-fixture.sql','utf8'));
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f<'202610280014_').sort())await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/20261116184500_private_playtest_evidence.sql','utf8'));
 await db.exec('grant usage on schema public,auth to authenticated,anon;grant select on public.community_game_tests to authenticated;');
 await db.exec(freeEvidenceSuite());
 console.log('PASS free playtesting at all four authoritative ranks: no supporting links required via evidence RPC or either legacy overload; optional URL validation, atomic rollback, anonymous denial, moderation/XP and private access');
} catch(error) { console.error('FAIL',error.message,error.where||''); process.exitCode=1; } finally {await db.close();}

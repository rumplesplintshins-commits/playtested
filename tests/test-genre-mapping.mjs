import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';

const js={};
const compiled=ts.transpileModule(await readFile('lib/genres.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports',compiled)(js);
const cases=[
 [null,[]],['',[]],[' Action ',['Action']],
 ['Action, Adventure, Casual, Free To Play, Indie, Early Access',['Action','Adventure','Casual']],
 ['Action / Adventure | RPG; Racing & Sports',['Action','Adventure','RPG','Racing','Sports']],
 ['action-adventure',['Action','Adventure']],['action adventure',['Action','Adventure']],
 ['Action-RPG',['Action RPG']],['actionrpg',['Action RPG']],['Action RPG',['Action RPG']],
 ['role-playing',['RPG']],['Role Playing',['RPG']],['roleplaying',['RPG']],
 ['platformers',['Platformer']],['Platform',['Platformer']],
 ['Indie, Free to Play, Early Access',['Other']],['unlisted genre',['Other']],
 ['Action, Other, Unknown',['Action']],['Other',['Other']],
];
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const db=new PGlite();
const query=async(s,args=[])=>(await db.query(s,args)).rows;
const one=async s=>(await query(s))[0];
try {
 await db.exec(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 for(const file of (await readdir('supabase/migrations')).filter(f=>/^20261028000[1-5]_/.test(f)).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into profiles(id,roles,preferred_genres) values('${id(1)}',array['tester'],array['action']),('${id(2)}',array['tester'],array['Simulation']),('${id(3)}',array['developer'],array['Action']);
 insert into game_submissions(id,title,status,genre,developer_id,developer_name,description,game_link,ai_type) values('${id(10)}','Genre test','Approved','Action, Adventure, Indie','${id(3)}','Developer','Synthetic','https://example.test','Unknown');
 insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,testing_genre,genre_restricted) values('${id(20)}','${id(3)}','${id(10)}','Mapping test','https://example.test','Synthetic instructions','open','both','Action, Adventure, Indie',true);`);
 const before=(await one(`select jsonb_agg(to_jsonb(p) order by id) rows from profiles p;`)).rows;
 await db.exec(await readFile('supabase/migrations/202610280006_canonical_testing_genres.sql','utf8'));
 assert.deepEqual((await one(`select jsonb_agg(to_jsonb(p) order by id) rows from profiles p;`)).rows,before,'migration must not rewrite stored profiles');
 assert.equal((await one(`select genre from game_submissions where id='${id(10)}'`)).genre,'Action, Adventure, Indie');
 assert.deepEqual((await query('select public.get_testing_genres() genre')).map(r=>r.genre),js.GAME_GENRES);
 for(const [raw,expected]of cases){assert.deepEqual(js.gameGenres(raw),expected);assert.deepEqual((await query('select public.game_genres($1) genres',[raw]))[0].genres,expected,`SQL/JS parity: ${raw}`);}
 assert.deepEqual(js.normalizeGenrePreferences(['Action, Adventure, Indie','action','Role Playing']),['Action','Adventure','RPG']);
 assert.equal(js.matchesGenrePreferences('Action, Adventure, Indie',['Adventure']),true);
 assert.equal(js.matchesGenrePreferences('Action, Indie',['Simulation']),false);
 assert.equal(js.matchesGenrePreferences('Indie',['Action']),false);
 assert.equal((await one(`select public.campaign_eligible('${id(20)}','${id(1)}') ok`)).ok,true,'single canonical preference matches legacy compound');
 assert.equal((await one(`select public.campaign_eligible('${id(20)}','${id(2)}') ok`)).ok,false,'nonmatching preference stays denied');
 assert.equal((await one(`select public.campaign_eligible('${id(20)}','${id(3)}') ok`)).ok,false,'developer without Tester role stays denied');
 await db.exec(`update profiles set preferred_genres=array['Action, Adventure, Indie'] where id='${id(1)}';update community_playtests set testing_genre='Adventure' where id='${id(20)}';`);
 assert.equal((await one(`select public.campaign_eligible('${id(20)}','${id(1)}') ok`)).ok,true,'legacy saved compound maps to developer single genre');
 await db.exec(`update community_playtests set minimum_rank=1 where id='${id(20)}';`);
 assert.equal((await one(`select public.campaign_eligible('${id(20)}','${id(1)}') ok`)).ok,false,'rank requirement is preserved');
 await db.exec(`update community_playtests set minimum_rank=0,testing_genre='Unknown' where id='${id(20)}';update profiles set preferred_genres=array['Other'] where id='${id(1)}';`);
 assert.equal((await one(`select public.campaign_eligible('${id(20)}','${id(1)}') ok`)).ok,false,'Other never bypasses an unspecified strict genre');
 await db.exec(`set test.uid='${id(1)}';select update_my_testing_genres(array['Action, Adventure, Indie','action','Role Playing']);`);
 assert.deepEqual((await one(`select preferred_genres from profiles where id='${id(1)}'`)).preferred_genres,['Action','Adventure','RPG']);
 assert.equal((await one(`select has_function_privilege('authenticated','public.game_genres(text)','EXECUTE') allowed`)).allowed,false,'private helper ACL');
 await db.exec(await readFile('supabase/migrations/202610280008_testing_discovery.sql','utf8'));
 await db.exec(`update community_playtests set testing_genre='Strategy' where id='${id(20)}'`);
 let discovery=(await one('select get_discoverable_community_test_games() games')).games;
 assert.equal(discovery.length,1);
 assert.equal(discovery[0].can_claim,false);
 assert.equal(discovery[0].restriction_reason,'Requires Strategy interest');
 assert.equal(discovery[0].game_link,null,'restricted discovery must not expose build access');
 await assert.rejects(db.exec(`select claim_community_game_test('${id(20)}')`),/rank or required genre/);
 await db.exec(`select update_my_testing_genres(array['Strategy'])`);
 discovery=(await one('select get_discoverable_community_test_games() games')).games;
 assert.equal(discovery.length,1,'eligible campaign must not be duplicated');
 assert.equal(discovery[0].can_claim,true);
 assert.equal(discovery[0].game_link,'https://example.test');
 await db.exec(`select claim_community_game_test('${id(20)}');update community_playtests set minimum_rank=3 where id='${id(20)}'`);
 discovery=(await one('select get_discoverable_community_test_games() games')).games;
 assert.equal(discovery.length,1,'existing active claim survives changed requirements');
 await db.exec(`set test.uid='${id(2)}'`);
 assert.equal((await one('select get_discoverable_community_test_games() games')).games[0].restriction_reason,'Requires Platinum tester rank');
 await db.exec(`set test.uid='${id(3)}'`);
 await assert.rejects(db.exec('select get_discoverable_community_test_games()'),/Tester access/);
 assert.equal((await one(`select has_function_privilege('anon','public.get_discoverable_community_test_games()','execute') allowed`)).allowed,false);
 await db.exec(`set test.uid='${id(2)}';update community_playtests set status='paused' where id='${id(20)}'`);
 assert.equal((await one('select get_discoverable_community_test_games() games')).games.length,0,'non-open campaigns are not discoverable');
 console.log(`PASS: genre mapping and discovery; restricted cards without build URLs, strict claim rejection, eligible deduplication, active-claim preservation, rank reason, tester-only/anon permissions and hidden paused campaigns. No live connection.`);
}finally{await db.close();}

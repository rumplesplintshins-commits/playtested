import assert from 'node:assert/strict';import fs from 'node:fs';import {feedbackRlsFixture,id} from './helpers/feedback-rls-fixture.mjs';
const f=await feedbackRlsFixture();try{
 const genres=await f.rpc('get_developer_feedback_genres',{p_playtest_id:id(20)},'authenticated',id(1));
 assert.deepEqual(genres.rows.find(r=>r.test_id===id(30)).preferred_genres,['RPG','Adventure','Action']);
 for(const n of[31,32,33])assert.deepEqual(genres.rows.find(r=>r.test_id===id(n)).preferred_genres,[]);
 assert(!genres.rows.some(r=>[id(34),id(35),id(36),id(37)].includes(r.test_id)));
 assert(genres.rows.every(r=>Object.keys(r).sort().join(',')==='preferred_genres,test_id'));
 assert.equal((await f.rpc('get_developer_feedback_genres',{p_playtest_id:id(20)},'authenticated',id(2))).rows.length,0);
 assert.equal((await f.rpc('get_developer_feedback_genres',{p_playtest_id:id(20)},'authenticated',null)).rows.length,0);
 await assert.rejects(f.rpc('get_developer_feedback_genres',{p_playtest_id:id(20)}),/permission denied/);
 assert.equal((await f.asRole('authenticated',id(1),'select id,preferred_genres from profiles')).rows.length,1);
 assert.equal((await f.asRole('authenticated',id(1),'select id from community_game_tests')).rows.length,0);
 await assert.rejects(f.asRole('anon',null,'select tester_id from community_game_tests'),/permission denied/);
 await assert.rejects(f.asRole('anon',null,'select id from profiles'),/permission denied/);
 await assert.rejects(f.asRole('anon',null,'select * from tester_privacy_restrictions'),/permission denied/);
 await assert.rejects(f.asRole('anon',null,'select * from _m26_unrestricted_feedback_identities($1)',[[id(30)]]),/permission denied/);
 const pub=(await f.rpc('get_public_imported_playtest_feedback',{p_imported_game_id:id(10)})).rows;
 assert(pub.some(r=>r.id===id(30)&&r.current_rank===0));
 assert(pub.some(r=>r.playtest_id===id(25)),'Closed published builds remain visible');
 for(const n of[34,35,36,37,62,63,64,67,68,69])assert(!pub.some(r=>r.id===id(n)),'No unpublished, hidden, wrong-game, replaced or unreviewed report '+n);
 for(const n of[32,33])assert.equal(pub.find(r=>r.id===id(n)).current_rank,null);
 assert.deepEqual([...new Set(pub.map(r=>r.current_rank).filter(r=>r!==null))].sort(),[0,1,2,3]);
 assert(pub.every(r=>!Object.keys(r).some(k=>['tester_id','preferred_genres','email','display_name','tester_xp'].includes(k))));
 assert(pub.every(r=>r.overall_score===8&&r.gameplay_score===9&&r.performance_score===7&&Number(r.hours_played)===1.5&&r.feedback==='Other notes'));
 for(const n of[12,13,14,999])assert.equal((await f.rpc('get_public_imported_playtest_feedback',{p_imported_game_id:id(n)})).rows.length,0);
 assert.equal((await f.rpc('get_public_imported_playtest_feedback',{p_imported_game_id:id(11)})).rows[0].id,id(34));
 // Exercise the legacy resolver's 500-ID boundary through the new read model.
 for(let n=3000;n<3501;n++)await f.add(n,3);
 const large=(await f.rpc('get_public_imported_playtest_feedback',{p_imported_game_id:id(10)})).rows;
 assert(large.length>500);assert(large.filter(r=>r.current_rank===null).every(r=>[id(32),id(33)].includes(r.id)));
 const tableRls=(await f.db.query("select relname,relrowsecurity from pg_class where oid in ('profiles'::regclass,'community_game_tests'::regclass)")).rows;assert(tableRls.every(r=>r.relrowsecurity));
 const source=fs.readFileSync('app/components/StartPlaytest.tsx','utf8');assert(!source.includes('.select("id, tester_id")'));assert(!source.includes('.select("id, preferred_genres")'));
 assert(!fs.readFileSync('app/games/[slug]/page.tsx','utf8').includes('.from("community_game_tests")'));
 console.log('PASS SQL/RLS: owner-only batched genres; foreign/signed-out/anon denial; empty/missing/restricted preferences; publishable correct-game/build feedback only; private tables/identities inaccessible; scores/content preserved; canonical Bronze/Silver/Gold/Platinum and restricted ranks; >500 rank batching. Isolated in-memory database only.');
}catch(e){console.error(e.stack);process.exitCode=1;}finally{await f.close();}

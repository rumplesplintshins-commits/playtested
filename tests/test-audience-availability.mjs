import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();const id=n=>`a9100000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const run=s=>db.exec(s);const one=async s=>(await db.query(s)).rows[0];
const campaign=(n,status='draft',audience='both',rank=3)=>`insert into community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience,minimum_rank,testing_genre,genre_restricted) values('${id(n)}','${id(1)}','${id(n+100)}','Fixture','https://example.test','Test movement','${status}','${audience}',${rank},'Strategy',true)`;
try{
 await run(await readFile('supabase/tests/v10-fixture.sql','utf8'));
 for(const f of (await readdir('supabase/migrations')).filter(f=>/^20261028000[1-6]_/.test(f)).sort())await run(await readFile('supabase/migrations/'+f,'utf8'));
 await run(`insert into profiles(id,roles,preferred_genres,tester_xp) values('${id(1)}',array['developer'],array[]::text[],0),('${id(2)}',array['tester'],array['Action'],5000)`);
 for(const n of [10,11,12,13])await run(`insert into game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${id(n+100)}','${id(1)}','Fixture','Dev','Strategy','Fixture','https://example.test','Unknown','Approved')`);
 await run(campaign(10,'open')); // Existing unmatched campaign must survive the migration.
 const before=await one('select jsonb_agg(to_jsonb(c)) rows from community_playtests c');
 await run(await readFile('supabase/migrations/202610280009_testing_audience_availability.sql','utf8'));
 assert.deepEqual(await one('select jsonb_agg(to_jsonb(c)) rows from community_playtests c'),before);
 await run(`set test.uid='${id(1)}'`);
 assert.equal((await one("select get_testing_audience_availability(3,'Action',true) ok")).ok,false,'XP alone does not establish Platinum');
 assert.equal((await one("select get_testing_audience_availability(0,'Action',true) ok")).ok,true);
 assert.equal((await one("select get_testing_audience_availability(0,'Strategy',true) ok")).ok,false);
 assert.equal((await one("select get_testing_audience_availability(0,'Strategy',false) ok")).ok,true);
 await run(campaign(11));
 await assert.rejects(run(`update community_playtests set status='open' where id='${id(11)}'`),/No registered testers/);
 await assert.rejects(run(campaign(12,'open')),/No registered testers/);
 await run(`update community_playtests set instructions='Updated task' where id='${id(10)}'`);
 await run(`update community_playtests set status='paused' where id='${id(10)}'`);
 await assert.rejects(run(`update community_playtests set status='open' where id='${id(10)}'`),/No registered testers/);
 await run(`update community_playtests set status='closed' where id='${id(10)}'`);
 await run(campaign(13,'open','own_community'));
 await assert.rejects(run(`update community_playtests set audience='both' where id='${id(13)}'`),/No registered testers/);
 await run(`update community_playtests set minimum_rank=0,genre_restricted=false,status='open' where id='${id(11)}'`);
 await assert.rejects(run(`update community_playtests set minimum_rank=3 where id='${id(11)}'`),/No registered testers/);
 await run(`set test.uid='${id(2)}'`);
 await assert.rejects(run("select get_testing_audience_availability(0,'Action',false)"),/Developer access/);
 assert.equal((await one("select has_function_privilege('anon','public.get_testing_audience_availability(integer,text,boolean)','execute') ok")).ok,false);
 assert.equal((await one("select has_function_privilege('authenticated','public._testing_audience_exists(integer,text,boolean)','execute') ok")).ok,false);
 console.log('PASS: real rank policy, combined genres, zero-pool publish/resume/target-change rejection, drafts, pause/close, existing-data preservation, community exemption and aggregate-only permissions. Isolated fixture only.');
}finally{await db.close();}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const model={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/gameplay-video.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(model);
const require=createRequire(import.meta.url),component={};
new Function('exports','require',ts.transpileModule(fs.readFileSync('app/components/GameplayFootage.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(component,name=>name==='@/lib/gameplay-video'?model:require(name));
for(const url of ['https://youtu.be/abcdefghijk','https://vimeo.com/123456','https://drive.google.com/file/d/abcdefghijk/view']){
 const video=model.gameplayVideo(url),markup=renderToStaticMarkup(createElement(component.default,{url}));
 assert(markup.includes(`Play ${video.provider} gameplay video`));assert(markup.includes('Open video in new tab'));
 assert(!/<iframe|<img|<link/i.test(markup),'Server-rendered placeholder must not contact a third party');
 assert(markup.includes('rel="noopener noreferrer"'));assert(!markup.includes('autoplay=1'));
}
const unavailable=renderToStaticMarkup(createElement(component.default,{url:'javascript:alert(1)'}));
assert(unavailable.includes('Video unavailable'));assert(!/<iframe|<a /i.test(unavailable));assert(!unavailable.includes('javascript:'));
for(const url of ['https://youtu.be/abcdefghijk?si=private','https://www.youtube.com/watch?v=abcdefghijk&tracking=private','https://youtube.com/shorts/abcdefghijk'])assert.equal(model.gameplayVideo(url).url,'https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(model.gameplayVideo('https://vimeo.com/123456').embed,'https://player.vimeo.com/video/123456?dnt=1');
assert.equal(model.gameplayVideo('https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/view?usp=sharing').embed,'https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/preview');
for(const url of ['javascript:alert(1)','http://youtube.com/watch?v=abcdefghijk','https://youtube.com.evil.test/watch?v=abcdefghijk','https://user@youtube.com/watch?v=abcdefghijk','https://youtube.com:444/watch?v=abcdefghijk','https://youtube.com/watch?v=<script>','https://drive.google.com/open?id=private','https://vimeo.com/123/private','https://youtu.be/abcdefghijk/extra','https://drive.google.com.evil.test/file/d/abcdefghijk/view','https://drive.google.com/file/d/short/view','https://drive.google.com/file/d/abcdefghijk/view/extra','https://drive.google.com/file/d/abcdefghijk%2Fother/view','https://evil.test/embed/abcdefghijk','https://player.vimeo.com/video/123456'])assert.equal(model.gameplayVideo(url),null,url);
for(const url of ['https://youtube.com/embed/abcdefghijk?autoplay=1','https://vimeo.com/123456?autoplay=1','https://drive.google.com/file/d/abcdefghijk/preview?autoplay=1&evil=https://evil.test']){
 const video=model.gameplayVideo(url);assert(video);assert(!video.embed.includes('autoplay'));assert(!video.embed.includes('evil'));assert.equal(new URL(video.embed).protocol,'https:');
}
const db=new PGlite();const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',pending='20000000-0000-4000-8000-000000000001',approved='20000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table game_submissions(id uuid primary key,developer_id uuid,status text);create view approved_games as select id from game_submissions where status='Approved';create table profiles(id uuid,role text);grant select on game_submissions,approved_games,profiles to anon,authenticated;
 insert into game_submissions values('${pending}','${owner}','Pending Review'),('${approved}','${owner}','Approved');`);
 await db.exec(fs.readFileSync('supabase/migrations/202611040004_gameplay_footage.sql','utf8'));
 await db.exec(`set role authenticated;set test.uid='${owner}'`);
 for(const id of [pending,approved])await db.query(`insert into gameplay_footage(submission_id,video_url)values($1,'https://www.youtube.com/watch?v=abcdefghijk')`,[id]);
 for(const url of ['https://youtu.be/abcdefghijk','https://vimeo.com/123456','https://drive.google.com/file/d/abcdefghijk/view'])await db.query('update gameplay_footage set video_url=$1',[model.gameplayVideo(url).url]);
 await assert.rejects(db.query(`update gameplay_footage set video_url='https://evil.test/video'`),/check constraint/);
 await db.exec(`set test.uid='${other}'`);
 assert.equal((await db.query('select * from gameplay_footage')).rows.length,1);
 assert.equal((await db.query('delete from gameplay_footage returning *')).rows.length,0);
 await db.exec('reset role;set role anon');
 assert.deepEqual((await db.query('select submission_id from gameplay_footage')).rows,[{submission_id:approved}]);
 console.log('PASS: video canonicalisation, unsafe URL rejection, owner writes, pending visibility and approved public reads.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}

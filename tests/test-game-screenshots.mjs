import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import sharp from 'sharp';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path,resolve=require){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText)(exports,resolve);return exports;}
const common=load('lib/game-screenshots.ts',name=>name==='./thumbnail'?load('lib/thumbnail.ts'):require(name));
const processing=load('lib/screenshot-processing.ts',name=>name==='./game-screenshots'?common:require(name));
const poster=load('app/components/VideoPoster.tsx');
const posterModel=load('lib/gameplay-poster.ts',name=>name==='./gameplay-video'?load('lib/gameplay-video.ts'):name==='./game-screenshots'?common:require(name));
const footage=load('app/components/GameplayFootage.tsx',name=>name==='@/lib/gameplay-video'?load('lib/gameplay-video.ts'):name==='./VideoPoster'?poster:require(name));
const gallery=load('app/components/GameMediaGallery.tsx',name=>name==='@/lib/game-screenshots'?common:name==='./GameplayFootage'?footage:name==='./VideoPoster'?poster:name==='@/lib/gameplay-poster'?posterModel:require(name));
for(const [videoUrl,screenshots] of [[null,[]],['https://youtu.be/abcdefghijk',[]],[null,[{slot:1,revision:'revision'}]],['https://youtu.be/abcdefghijk',[{slot:1,revision:'revision'}]]]){
 const markup=renderToStaticMarkup(createElement(gallery.default,{id:'synthetic',videoUrl,screenshots}));
 assert(markup.includes('Game Media'));assert(!markup.includes('<iframe'));assert(!markup.includes('Gameplay footage (optional)'));
 if(videoUrl)assert(markup.includes('Gameplay Footage'));
 else if(screenshots.length)assert(markup.includes('Screenshot 1 of 1'));
 else assert(markup.includes('No gameplay footage or screenshots'));
}
for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
 const bytes=await sharp({create:{width:72,height:120,channels:3,background:'#224466'}})[format]().toBuffer();
 const result=await processing.processScreenshot(new File([bytes],'screenshot.'+format,{type:mime}));
 const meta=await sharp(result.image).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,72);assert.equal(meta.height,120);assert.equal(meta.exif,undefined);
 const thumb=await sharp(result.thumbnail).metadata();assert(thumb.width<=320&&thumb.height<=180);assert.equal(thumb.width/thumb.height,72/120);
}
const oriented=await sharp({create:{width:20,height:40,channels:3,background:'red'}}).jpeg().withMetadata({orientation:6}).toBuffer();
const rotated=await processing.processScreenshot(new File([oriented],'orientation.jpg',{type:'image/jpeg'}));
assert.equal((await sharp(rotated.image).metadata()).width,40);assert.equal((await sharp(rotated.image).metadata()).height,20);
const png=await sharp({create:{width:40,height:20,channels:3,background:'green'}}).png().toBuffer();
for(const [body,type] of [[Buffer.from('<svg/>'),'image/png'],[png,'image/jpeg'],[png.slice(0,24),'image/png'],[png,'image/svg+xml'],[new Uint8Array(5242881),'image/png'],[new Uint8Array(),'image/png']])await assert.rejects(processing.processScreenshot(new File([body],'forged.png',{type})),/screenshot|Screenshot|JPG/);
const wide=await sharp({create:{width:8193,height:1,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(processing.processScreenshot(new File([wide],'wide.png',{type:'image/png'})),/Screenshot/);
console.log('PASS screenshot decoding: real JPG/PNG/WebP pixels, orientation, metadata removal, uncropped proportions, small thumbnails, spoofed/truncated/oversized/empty/dimension-invalid rejection.');

const db=new PGlite(),id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),other=id(2),admin=id(3),pending=id(10),approved=id(11);
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;
 create table game_submissions(id uuid primary key,developer_id uuid,status text);create view approved_games as select id from game_submissions where status='Approved';create table profiles(id uuid,role text);grant select on game_submissions,approved_games,profiles to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to anon,authenticated,service_role;create policy fixture_broad_storage on storage.objects for all using(true) with check(true);
 insert into profiles values('${owner}','user'),('${other}','user'),('${admin}','admin');insert into game_submissions values('${pending}','${owner}','Pending Review'),('${approved}','${owner}','Approved');`);
 await db.exec(fs.readFileSync('supabase/migrations/202611040011_game_screenshots.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/202611040012_screenshot_delete_cleanup.sql','utf8'));
 const path=(submission,n)=>`${owner}/${submission}/${id(n)}.webp`;
 for(let slot=1;slot<=5;slot++)await db.query('select set_game_screenshot($1,$2::smallint,$3)',[pending,slot,path(pending,100+slot)]);
 await db.query('select set_game_screenshot($1,1::smallint,$2)',[approved,path(approved,200)]);
 await assert.rejects(db.query('select set_game_screenshot($1,6::smallint,$2)',[pending,path(pending,106)]),/1 to 5/);
 await assert.rejects(db.query('select set_game_screenshot($1,1::smallint,$2)',[pending,`${other}/${pending}/${id(300)}.webp`]),/Invalid screenshot path/);
 const revision=(await db.query('select revision from game_screenshots where submission_id=$1 and slot=1',[pending])).rows[0].revision;
 await db.query('select set_game_screenshot($1,1::smallint,$2)',[pending,path(pending,301)]);
 assert.notEqual((await db.query('select revision from game_screenshots where submission_id=$1 and slot=1',[pending])).rows[0].revision,revision);
 assert.equal((await db.query('select count(*)::int n from game_screenshot_cleanup')).rows[0].n,1,'Replacement queues one cleanup task');
 await db.exec(`insert into storage.objects(bucket_id,name)values('game-screenshots','private'),('game-thumbnails','existing');set role authenticated;set test.uid='${owner}'`);
 assert.equal((await db.query('select slot,revision from game_screenshots')).rows.length,6);
 await assert.rejects(db.query('select object_path from game_screenshots'),/permission denied/);
 await assert.rejects(db.query('select set_game_screenshot($1,1::smallint,null)',[pending]),/permission denied/);
 await assert.rejects(db.query('delete from game_screenshots'),/permission denied/);
 assert.equal((await db.query('select * from storage.objects')).rows.length,1,'Restrictive screenshot policy survives an unrelated broad permissive policy');
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name)values('game-screenshots','bypass')"),/row-level security/);
 await db.exec(`set test.uid='${other}'`);assert.equal((await db.query('select slot from game_screenshots')).rows.length,1,'Only approved metadata for unrelated/anonymous readers');
 await db.exec(`set test.uid='${admin}'`);assert.equal((await db.query('select slot from game_screenshots')).rows.length,6);
 await db.exec("reset role;set test.uid='';set role anon");assert.equal((await db.query('select slot from game_screenshots')).rows.length,1);await assert.rejects(db.query('select * from game_screenshot_cleanup'),/permission denied/);
 await db.exec(`reset role;update game_submissions set status='Pending Review' where id='${approved}';set role anon`);assert.equal((await db.query('select slot from game_screenshots')).rows.length,0,'Approval withdrawal removes public metadata');
 await db.exec('reset role');await db.query('select set_game_screenshot($1,2::smallint,null)',[pending]);assert.equal((await db.query('select count(*)::int n from game_screenshots where submission_id=$1',[pending])).rows[0].n,4);
 await db.query('delete from game_submissions where id=$1',[pending]);assert.equal((await db.query('select count(*)::int n from game_screenshots where submission_id=$1',[pending])).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from game_screenshot_cleanup')).rows[0].n,6,'Cascade removal also queues every file for cleanup');
 console.log('PASS screenshot migration: max five slots, locked replacement/revision/cleanup, owner paths, owner/admin/approved visibility, approval withdrawal, privileged-only metadata mutations, private object paths and restrictive storage policy.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}

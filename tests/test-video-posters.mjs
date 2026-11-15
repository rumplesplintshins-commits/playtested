import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import sharp from 'sharp';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,resolve=require){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(exports,resolve);return exports;}
const common=load('lib/game-screenshots.ts',name=>name==='./thumbnail'?load('lib/thumbnail.ts'):require(name));
const video=load('lib/gameplay-video.ts');
const poster=load('lib/gameplay-poster.ts',name=>name==='./gameplay-video'?video:name==='./game-screenshots'?common:require(name));
const id='80000000-0000-4000-8000-000000000001',shot={slot:1,revision:'revision'};
const youtube='https://youtu.be/abcdefghijk',drive='https://drive.google.com/file/d/abcdefghijk/view';
assert.deepEqual(poster.videoPosterSources(id,youtube,[shot],'https://example.test/cover.jpg'),[`/api/game-media/${id}/video-poster`,common.screenshotUrl(id,shot),'https://example.test/cover.jpg']);
for(const url of [drive,'https://vimeo.com/123456'])assert.deepEqual(poster.videoPosterSources(id,url,[shot],'https://example.test/cover.jpg'),[common.screenshotUrl(id,shot),'https://example.test/cover.jpg']);
assert.deepEqual(poster.videoPosterSources(id,drive,[],'/cover.jpg'),['/cover.jpg']);assert.deepEqual(poster.videoPosterSources(id,drive,[],null),[]);
for(const url of ['javascript:alert(1)','data:image/svg+xml,unsafe','//evil.test/image','/\\evil.test/image','https://user:secret@example.test/image'])assert.equal(poster.safePosterSource(url),null);
const jpg=await sharp({create:{width:480,height:360,channels:3,background:'#446655'}}).jpeg().toBuffer();
let visible=true,url=youtube,networkCalls=0,mode='ok',requested;
const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:visible?{video_url:url}:null,error:null})})})})};
const route=load('app/api/game-media/[id]/video-poster/route.ts',name=>name==='@/lib/supabase-server'?{createClient:async()=>client}:name==='@/lib/gameplay-video'?video:require(name));
const original=globalThis.fetch;
globalThis.fetch=async(target,options)=>{
 networkCalls++;requested=target;assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.next.revalidate,3600);
 if(mode==='missing')return new Response(null,{status:404});
 if(mode==='svg')return new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}});
 if(mode==='huge')return new Response(new Uint8Array(2097153),{headers:{'Content-Type':'image/jpeg'}});
 return new Response(jpg,{headers:{'Content-Type':'image/jpeg'}});
};
try{
 const get=(value=id)=>route.GET(new Request(`http://localhost/api/game-media/${value}/video-poster?url=https://evil.test/private`),{params:Promise.resolve({id:value})});
 visible=false;assert.equal((await get()).status,404);assert.equal(networkCalls,0,'No upstream fetch for invisible pending/unknown media');
 visible=true;url=drive;assert.equal((await get()).status,404);assert.equal(networkCalls,0,'No Drive thumbnail API lookup');
 url=youtube;let response=await get();assert.equal(response.status,200);assert.equal(requested,'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');assert.match(response.headers.get('Cache-Control'),/private, no-store/);assert.equal((await sharp(new Uint8Array(await response.arrayBuffer())).metadata()).format,'webp');
 for(mode of ['missing','svg','huge'])assert.equal((await get()).status,404,'Unsafe/unavailable poster falls back without arbitrary proxying');
 const calls=networkCalls;assert.equal((await get('invalid')).status,404);assert.equal(networkCalls,calls);
 console.log('PASS posters: provider-specific fallback priority, safe sources, visibility before fetch, fixed YouTube host/ID, ignored arbitrary URLs, server cache/privacy options, decoded images and unavailable/unsafe fallback.');
}finally{globalThis.fetch=original;}

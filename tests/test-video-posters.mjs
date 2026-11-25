import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,resolve=require){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(exports,resolve);return exports;}
const common=load('lib/game-screenshots.ts',name=>name==='./thumbnail'?load('lib/thumbnail.ts'):require(name));
const poster=load('lib/gameplay-poster.ts',name=>name==='./game-screenshots'?common:require(name));
const id='80000000-0000-4000-8000-000000000001',shot={slot:1,revision:'revision'};
const youtube='https://youtu.be/abcdefghijk',drive='https://drive.google.com/file/d/abcdefghijk/view';
const screenshot=common.screenshotUrl(id,shot);
assert.deepEqual(poster.videoPosterSources(id,youtube,[shot],'https://example.test/cover.jpg'),[screenshot,'https://example.test/cover.jpg']);
for(const url of [drive,'https://vimeo.com/123456'])assert.deepEqual(poster.videoPosterSources(id,url,[shot],'https://example.test/cover.jpg'),[screenshot,'https://example.test/cover.jpg']);
assert.deepEqual(poster.videoPosterSources(id,drive,[],'/cover.jpg'),['/cover.jpg']);assert.deepEqual(poster.videoPosterSources(id,drive,[],null),[]);
assert.deepEqual(poster.videoPosterSources(id,youtube,[],'https://example.test/cover.jpg'),['https://example.test/cover.jpg']);
for(const url of ['javascript:alert(1)','data:image/svg+xml,unsafe','//evil.test/image','/\\\\evil.test/image','https://user:secret@example.test/image'])assert.equal(poster.safePosterSource(url),null);
console.log('PASS posters: screenshot-first fallback, no third-party video-thumbnail proxy requests, catalogue fallback, empty fallback and safe source validation.');

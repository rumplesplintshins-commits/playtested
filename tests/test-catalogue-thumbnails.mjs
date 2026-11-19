import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import ts from 'typescript';
import {chromium} from 'playwright';
import {prepareThumbnails,assertPublicSources} from '../scripts/prepare-catalogue-thumbnails.mjs';
const manifest=JSON.parse(await fs.readFile('lib/catalogue-thumbnails.json','utf8'));
for(const variants of Object.values(manifest))for(const variant of variants){
 const file=path.join('public',variant.url),bytes=await fs.readFile(file),meta=await sharp(bytes).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,variant.width);assert.equal(meta.exif,undefined);assert.equal(bytes.length,variant.bytes);
}
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'playtested-thumbnails-'));
try{
 const original=await sharp({create:{width:1400,height:800,channels:3,background:'green'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const file=path.join(temporary,'source.jpg');await fs.writeFile(file,original);
 const sources=[{url:'https://example.test/storage/v1/object/public/game-thumbnails/original.jpg',file}];
 const publication={schemaVersion:1,scope:'anonymous-public-catalogue',games:[{kind:'approved',visibility:'public',image_url:sources[0].url}]};
 assert.throws(()=>assertPublicSources(sources),/publication inventory/);
 for(const visibility of ['hidden','private','unpublished'])assert.throws(()=>assertPublicSources(sources,{...publication,games:[{...publication.games[0],visibility}]}),/not a verified/);
 assert.throws(()=>assertPublicSources([{...sources[0],url:'https://example.test/storage/v1/object/authenticated/game-thumbnails/private.jpg'}],publication),/not a verified/);
 await prepareThumbnails(sources,temporary,publication);assert.deepEqual(await fs.readFile(file),original,'Original untouched');
 const orphan=path.join(temporary,'public/catalogue-thumbnails','0'.repeat(64)+'-640.webp');await fs.writeFile(orphan,'excluded fixture');
 const first=await fs.readFile(path.join(temporary,'lib/catalogue-thumbnails.json'),'utf8');
 await prepareThumbnails(sources,temporary,publication);assert.equal(await fs.readFile(path.join(temporary,'lib/catalogue-thumbnails.json'),'utf8'),first,'Deterministic versioned variants');
 await assert.rejects(fs.access(orphan),'Excluded static files are pruned, not just unlinked from the manifest');
 const fixture=JSON.parse(first)[sources[0].url];assert.equal(fixture[2].width,800,'Orientation precedes resizing; never upscale');
 await fs.writeFile(file,'<svg/>');await assert.rejects(prepareThumbnails(sources,temporary,publication));
}finally{await fs.rm(temporary,{recursive:true,force:true});}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const input=await sharp({create:{width:1920,height:1080,channels:3,background:'#bada55'}}).png().toBuffer();
 const code=ts.transpileModule(await fs.readFile('lib/thumbnail-upload.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const extensionCode=ts.transpileModule(await fs.readFile('lib/thumbnail.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const result=await page.evaluate(async({code,extensionCode,input})=>{
  const ext={};new Function('exports',extensionCode)(ext);const exports={};new Function('exports','require',code)(exports,()=>ext);
  const file=new File([Uint8Array.from(input)],'source.png',{type:'image/png'});
  const webp=await exports.thumbnailWebp(file),bitmap=await createImageBitmap(webp);const dimensions=[bitmap.width,bitmap.height];bitmap.close();
  let failVariant=false,failOriginal=false;const writes=[],removed=[];
  const bucket={upload:async(path,body,options)=>{writes.push({path,original:body===file,options});return {error:failOriginal||failVariant&&path.endsWith('-card-v1.webp')?new Error('fixture'):null};},remove:async(paths)=>{removed.push(...paths);return {error:null}},getPublicUrl:path=>({data:{publicUrl:path}})};
  // Browser sandbox may not expose randomUUID on about:blank.
  if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString().slice(2)});
  const client={storage:{from:()=>bucket}};
  const success=await exports.uploadGameThumbnail(client,'owner',file);
  failVariant=true;let variantRejected=false;try{await exports.uploadGameThumbnail(client,'owner',file);}catch(error){variantRejected=/Could not optimise/.test(String(error));}
  failOriginal=true;let rejected=false;try{await exports.uploadGameThumbnail(client,'owner',file);}catch{rejected=true;}
  return {dimensions,type:webp.type,writes,success,variantRejected,removed,rejected};
 },{code,extensionCode,input:[...input]});
 assert.deepEqual(result.dimensions,[960,540]);assert.equal(result.type,'image/webp');assert(result.success.endsWith('-card-v1.webp'));assert(result.variantRejected,'Failed WebP variant must reject rather than publish the full-size original');assert.equal(result.removed.length,1);assert(result.removed[0].endsWith('.png'));assert(result.rejected);assert.equal(result.writes.length,5);
 assert(result.writes.every(w=>w.options.upsert===false&&w.options.cacheControl==='31536000'));assert(result.writes[0].original);assert(!result.writes[1].original);
}finally{await browser.close();}
console.log(`PASS ${Object.keys(manifest).length} source mappings and all decoded variants; deterministic versions, orientation, metadata stripping, invalid input, real browser WebP upload, original preservation and fail-closed variant upload`);

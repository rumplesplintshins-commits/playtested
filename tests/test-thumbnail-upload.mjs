import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Exercise the actual upload module with a stubbed browser encoder and Storage API.
const source=fs.readFileSync('lib/thumbnail-upload.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
new Function('exports','require',compiled)(exports,(name)=>{
 if(name==='./thumbnail')return {thumbnailExtension:async()=> 'png'};
 throw new Error('Unexpected import '+name);
});
const originalCreateImageBitmap=globalThis.createImageBitmap;
const originalDocument=globalThis.document;
globalThis.createImageBitmap=async()=>({width:1280,height:720,close(){}});
globalThis.document={createElement:()=>({
 width:0,height:0,getContext:()=>({drawImage(){}}),
 toBlob:(callback)=>callback(new Blob(['webp'],{type:'image/webp'}))
})};
try{
 const image=new File([new Uint8Array([137,80,78,71])],'game.png',{type:'image/png'});
 const makeClient=(failVariant)=>{
  const uploaded=[],removed=[];
  const bucket={
   upload:async(path)=>{uploaded.push(path);return {error:failVariant&&path.endsWith('-card-v1.webp')?new Error('storage unavailable'):null}},
   remove:async(paths)=>{removed.push(...paths);return {error:null}},
   getPublicUrl:(path)=>({data:{publicUrl:'https://images.example/'+path}})
  };
  return {client:{storage:{from:(name)=>{assert.equal(name,'game-thumbnails');return bucket}}},uploaded,removed};
 };
 const good=makeClient(false);
 const url=await exports.uploadGameThumbnail(good.client,'developer',image);
 assert.match(url,/-card-v1\.webp$/);
 assert.equal(good.uploaded.length,2);
 assert.deepEqual(good.removed,[]);
 const bad=makeClient(true);
 await assert.rejects(exports.uploadGameThumbnail(bad.client,'developer',image),/Could not optimise/);
 assert.equal(bad.uploaded.length,2);
 assert.equal(bad.removed.length,1,'Failed variant cleans up original instead of publishing full-size fallback');
 assert.match(bad.removed[0],/\.png$/);
 console.log('PASS thumbnail upload uses WebP; failed variant never returns an oversized original');
} finally {
 globalThis.createImageBitmap=originalCreateImageBitmap;
 globalThis.document=originalDocument;
}

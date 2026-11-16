// Offline only: input is [{url: originalPublicUrl, file: localExportPath}].
// Originals are read, never modified. No Storage writes or credentials required.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
export function assertPublicSources(sources,publication){
 if(publication?.schemaVersion!==1||publication.scope!=='anonymous-public-catalogue'||!Array.isArray(publication.games))throw new Error('A reviewed anonymous public-catalogue publication inventory is required');
 const allowed=new Set(publication.games.filter(g=>g.visibility==='public'&&['approved','imported'].includes(g.kind)).map(g=>g.image_url));
 const seen=new Set();
 for(const source of sources){
  const url=new URL(source.url);
  if(!allowed.has(source.url)||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith('/storage/v1/object/public/game-thumbnails/'))throw new Error('Source is not a verified anonymous public catalogue thumbnail');
  if(seen.has(source.url))throw new Error('Duplicate source URL');seen.add(source.url);
 }
}
export async function prepareThumbnails(sources,root='.',publication){
 assertPublicSources(sources,publication);
 const manifest={},measurements=[];
 const output=path.join(root,'public/catalogue-thumbnails');await fs.mkdir(output,{recursive:true});
 for(const source of sources){
  const bytes=await fs.readFile(source.file);
  const image=sharp(bytes,{limitInputPixels:25_000_000,failOn:'warning',animated:true});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)!==1)throw new Error('Only static JPG/PNG/WebP sources are supported');
  const hash=createHash('sha256').update(bytes).update('catalogue-webp-v1').digest('hex');
  const variants=[];
  for(const width of [320,640,960]){
   const {data,info}=await image.clone().rotate().resize({width,withoutEnlargement:true}).webp({quality:75,effort:5}).toBuffer({resolveWithObject:true});
   const url=`/catalogue-thumbnails/${hash}-${width}.webp`;
   await fs.writeFile(path.join(root,'public',url),data);
   variants.push({url,width:info.width,bytes:data.length});
  }
  manifest[source.url]=variants;
  measurements.push({source_bytes:bytes.length,variants:variants.map(({width,bytes})=>({width,bytes}))});
 }
 // Remove stale generated assets too: trimming only the manifest leaves the
 // corresponding public files directly downloadable. Originals are elsewhere.
 const keep=new Set(Object.values(manifest).flat().map(v=>path.basename(v.url)));
 for(const file of await fs.readdir(output)){
  if(!/^[0-9a-f]{64}-(320|640|960)\.webp$/.test(file))throw new Error('Unexpected file in generated thumbnail directory');
  if(!keep.has(file))await fs.unlink(path.join(output,file));
 }
 await fs.mkdir(path.join(root,'lib'),{recursive:true});
 await fs.writeFile(path.join(root,'lib/catalogue-thumbnails.json'),JSON.stringify(manifest,null,2)+'\n');
 const report={sources:sources.length,source_bytes:measurements.reduce((n,x)=>n+x.source_bytes,0),webp_640_bytes:measurements.reduce((n,x)=>n+x.variants[1].bytes,0),measurements};
 await fs.mkdir(path.join(root,'docs/performance'),{recursive:true});await fs.writeFile(path.join(root,'docs/performance/issue-60-thumbnails.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 if(!process.argv[2]||!process.argv[3])throw new Error('Pass local sources JSON and reviewed publication JSON');
 console.log(JSON.stringify(await prepareThumbnails(JSON.parse(await fs.readFile(process.argv[2],'utf8')),'.',JSON.parse(await fs.readFile(process.argv[3],'utf8')))));
}

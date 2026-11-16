// Offline only: input is [{url: originalPublicUrl, file: localExportPath}].
// Originals are read, never modified. No Storage writes or credentials required.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
export async function prepareThumbnails(sources,root='.'){
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
 await fs.mkdir(path.join(root,'lib'),{recursive:true});
 await fs.writeFile(path.join(root,'lib/catalogue-thumbnails.json'),JSON.stringify(manifest,null,2)+'\n');
 const report={sources:sources.length,source_bytes:measurements.reduce((n,x)=>n+x.source_bytes,0),webp_640_bytes:measurements.reduce((n,x)=>n+x.variants[1].bytes,0),measurements};
 await fs.mkdir(path.join(root,'docs/performance'),{recursive:true});await fs.writeFile(path.join(root,'docs/performance/issue-60-thumbnails.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 if(!process.argv[2])throw new Error('Pass a JSON inventory of locally exported originals');
 console.log(JSON.stringify(await prepareThumbnails(JSON.parse(await fs.readFile(process.argv[2],'utf8')))));
}

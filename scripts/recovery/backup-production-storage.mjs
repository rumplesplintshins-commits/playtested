// Downloads only. No upload/delete, database password or signed URL is emitted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),cli=process.env.SUPABASE_CLI||'supabase';
const ref='qtcmzckdhgahuqqilmzj',root=path.resolve(process.argv[2]||'.');
const repo=process.cwd();
if(!process.argv[2]||root.toLowerCase()===repo.toLowerCase()||root.toLowerCase().startsWith(repo.toLowerCase()+path.sep)||fs.existsSync(root))throw Error('Use a new private directory outside the repository.');
const query=`select jsonb_build_object('buckets',(select coalesce(jsonb_agg(to_jsonb(b) order by b.id),'[]'::jsonb) from storage.buckets b),'objects',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'bucket_id',o.bucket_id,'name',o.name,'updated_at',o.updated_at,'version',to_jsonb(o)->>'version','size',o.metadata->>'size') order by o.bucket_id,o.name),'[]'::jsonb) from storage.objects o)) inventory;`;
async function inventory(){const {stdout}=await exec(cli,['db','query','--remote='+ref,'--read-only',query],{maxBuffer:16*1024*1024,timeout:60000});return JSON.parse(stdout.slice(stdout.indexOf('{'))).rows[0].inventory;}
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const started_at=new Date().toISOString(),before=await inventory();
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(path.join(root,'objects'));fs.writeFileSync(path.join(root,'inventory-before.json'),JSON.stringify(before,null,2));
const files=[];
try{
 for(let index=0;index<before.objects.length;index++){
  const object=before.objects[index];
  if(object.name.split('/').some(s=>s==='..'||s==='.'))throw Error('Unsafe object key requires separate reviewed download.');
  const relative='objects/'+String(index).padStart(6,'0')+'.bin',file=path.join(root,relative);
  const source='ss:///'+encodeURIComponent(object.bucket_id)+'/'+object.name.split('/').map(encodeURIComponent).join('/');
  // Relative destination avoids interpreting a Windows drive letter as a URI scheme.
  await exec(cli,['storage','cp','--experimental','--yes','--remote='+ref,source,relative],{cwd:root,timeout:120000,maxBuffer:1024*1024});
  const bytes=fs.statSync(file).size;
  if(object.size!==null&&Number(object.size)!==bytes)throw Error('Downloaded size does not match inventory.');
  files.push({...object,file:relative,bytes,sha256:hash(file)});
 }
 const after=await inventory();fs.writeFileSync(path.join(root,'inventory-after.json'),JSON.stringify(after,null,2));
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Source changed during capture; recovery coverage is not verified.');
 for(const file of files)if(hash(path.join(root,file.file))!==file.sha256)throw Error('Independent local rehash failed.');
 const manifest={project:ref,started_at,verified_at:new Date().toISOString(),coverage:'All inventoried buckets and objects, stable metadata before/after',database_backup_included:false,restore_rehearsal:'Not Run',files,buckets:before.buckets};
 const manifestPath=path.join(root,'manifest.json');fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
 const summary={project:ref,objects:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),manifest_sha256:hash(manifestPath),verified_at:manifest.verified_at,database_backup_included:false};
 fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}catch(error){
 const detail=(String(error?.stderr||'')+String(error?.stdout||''))||String(error?.message||'');
 const category=/use.*--experimental|experimental.*required/i.test(detail)?'CLI requires experimental flag':/permission|forbidden|unauthori[sz]ed|access denied|secret_read/i.test(detail)?'Storage read/key-access permission unavailable':/not found|does not exist|no such/i.test(detail)?'Source or CLI path unavailable':/invalid.*(key|token)|jwt|api.key/i.test(detail)?'Storage authentication rejected':/size/i.test(detail)?'Object size mismatch':/changed during/i.test(detail)?'Source changed during copy':'Download/verification failed';
 console.error('Storage recovery copy incomplete: '+category+'. Private partial files retained; no source writes.');process.exitCode=1;
}

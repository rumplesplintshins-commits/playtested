// Offline reads only: no keys, hosted calls, restores or backup-directory writes.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [dump,storageRoot,inventoryFile,tocFile,pgRestore]=process.argv.slice(2);
if(!tocFile)throw Error('Usage: node verify-m261-existing-recovery.mjs DUMP STORAGE_ROOT PRIVATE_INVENTORY PRIVATE_TOC [PG_RESTORE_EXECUTABLE]');
const read=file=>{const b=fs.readFileSync(file);return(b[0]===255&&b[1]===254?b.toString('utf16le'):b.toString('utf8')).replace(/^\uFEFF/,'');};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifestPath=path.join(storageRoot,'manifest.json'),manifest=JSON.parse(read(manifestPath));
if(manifest.project!=='qtcmzckdhgahuqqilmzj')throw Error('Unexpected manifest project');
const inventory=JSON.parse(read(inventoryFile)).rows[0].inventory;
let verified=0,bytes=0;const archived=new Map();
for(const f of manifest.files){
 const file=path.resolve(storageRoot,f.file),root=path.resolve(storageRoot);
 if(!file.startsWith(root+path.sep))throw Error('Manifest path escapes archive');
 if(fs.statSync(file).size!==f.bytes||hash(file)!==f.sha256)throw Error('Archived object failed independent integrity verification');
 verified++;bytes+=f.bytes;archived.set(f.bucket_id+'\0'+f.name,f);
}
const missing=inventory.objects.filter(f=>!archived.has(f.bucket_id+'\0'+f.name));
const changed=inventory.objects.filter(f=>{const old=archived.get(f.bucket_id+'\0'+f.name);return old&&(old.id!==f.id||old.version!==f.version||old.updated_at!==f.updated_at||String(old.size)!==String(f.size));});
let toc=read(tocFile),decoded=false;
if(pgRestore){
 toc=execFileSync(pgRestore,['--list',dump],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:60000,maxBuffer:8*1024*1024});
 execFileSync(pgRestore,['--file',process.platform==='win32'?'NUL':'/dev/null',dump],{stdio:['ignore','ignore','ignore'],timeout:120000});decoded=true;
}
if(!toc.includes('TOC Entries'))throw Error('Expected pg_restore table of contents');
const required=['auth.users','auth.identities','storage.buckets','storage.objects','public.profiles','public.game_submissions','public.imported_games','public.community_game_tests','public.community_playtests','public.listing_controls','public.listing_revisions'];
const coverage=Object.fromEntries(required.map(name=>{const [schema,table]=name.split('.');return[name,new RegExp('TABLE DATA '+schema+' '+table+'(?: |\\r|\\n)').test(toc)];}));
const report={verified_at:new Date().toISOString(),project:manifest.project,production_writes:0,
 database:{bytes:fs.statSync(dump).size,created_or_modified_at:fs.statSync(dump).mtime.toISOString(),sha256:hash(dump),toc_readable:!!pgRestore,required_table_data_entries:coverage,full_decode:decoded?'Passed: pg_restore decoded all blocks to the null device; no database connection':'Not Run: provide compatible pg_restore executable to verify compressed blocks',fresh_current_recovery_point:false,restore_rehearsal:'Not Run'},
 storage:{archived_objects:verified,archived_bytes:bytes,manifest_sha256:hash(manifestPath),all_archived_bytes_rehashed:true,current_objects:inventory.objects.length,missing_current_objects:missing.length,changed_current_objects:changed.length,current_coverage_complete:missing.length===0&&changed.length===0,bucket_configuration_unchanged:JSON.stringify(manifest.buckets)===JSON.stringify(inventory.buckets)},
 owner_and_access:'Current operator can read protected local files; named recovery operator, off-site copy and encryption/access verification still require confirmation',
 status:'BLOCKED: a current database recovery point remains unverified; Storage coverage is assessed separately'};
fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/MERGE-26-1-RECOVERY-STATUS.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));

import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'m261-recovery-test-')),script=path.resolve('scripts/recovery/verify-m261-existing-recovery.mjs');
const write=(file,data)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof data==='string'?data:JSON.stringify(data));};
const bytes='synthetic-object',digest=crypto.createHash('sha256').update(bytes).digest('hex');
const object={id:'synthetic-id',bucket_id:'fixture',name:'fixture.png',version:'1',updated_at:'2026-01-01T00:00:00Z',size:String(bytes.length)};
const manifest={project:'qtcmzckdhgahuqqilmzj',buckets:[],files:[{...object,file:'objects/000.bin',bytes:bytes.length,sha256:digest}]};
const run=()=>spawnSync(process.execPath,[script,path.join(root,'fixture.dump'),path.join(root,'storage'),path.join(root,'inventory.json'),path.join(root,'toc.txt')],{cwd:root,encoding:'utf8'});
try{
 write('fixture.dump','synthetic, not a PostgreSQL archive');write('storage/objects/000.bin',bytes);write('storage/manifest.json',manifest);write('toc.txt','; TOC Entries: 1\n1; 0 0 TABLE DATA public profiles postgres');
 write('inventory.json',{rows:[{inventory:{buckets:[],objects:[object,{...object,id:'other',name:'missing.png'}]}}]});
 let result=run();assert.equal(result.status,0,result.stderr);let report=JSON.parse(result.stdout);assert.equal(report.storage.current_coverage_complete,false);assert.equal(report.storage.missing_current_objects,1);assert.equal(report.database.toc_readable,false);assert.match(report.database.full_decode,/Not Run/);assert.equal(report.database.fresh_current_recovery_point,false);
 write('inventory.json',{rows:[{inventory:{buckets:[],objects:[{...object,version:'2'}]}}]});result=run();assert.equal(result.status,0);report=JSON.parse(result.stdout);assert.equal(report.storage.changed_current_objects,1);assert.equal(report.storage.current_coverage_complete,false);
 write('storage/objects/000.bin','corrupt');result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/integrity verification/);
 console.log('PASS recovery verifier: missing/changed objects stay incomplete, corrupt bytes fail, supplied TOC alone never claims archive decoding or current recoverability.');
}finally{assert(root.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});}

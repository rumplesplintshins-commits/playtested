// Metadata-only and enforced read-only for BOTH projects. Never applies migrations.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const cli=process.env.SUPABASE_AUDIT_CLI||'C:/Users/OWNER/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const refs={development:'ktifgybnkdaotdxrvjgq',production:'qtcmzckdhgahuqqilmzj'};
const snapshots={};fs.mkdirSync('technical-test-results',{recursive:true});
for(const [target,ref] of Object.entries(refs)){
 const raw=execFileSync(cli,['db','query',`--remote=${ref}`,'--read-only','--file','supabase/inspection/merge24-release-audit.sql'],{encoding:'utf8',maxBuffer:30*1024*1024});
 const result=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));const snapshot=result.rows[0].snapshot;assert.equal(snapshot.read_only,'on');
 snapshots[target]=snapshot;fs.writeFileSync(`technical-test-results/m24-${target}-release-audit.json`,JSON.stringify(snapshot,null,2));
 console.log(`${target}: read-only metadata snapshot captured; ${snapshot.tables.length} relations, ${snapshot.functions.length} functions; migration history ${snapshot.migration_history?'present':'absent'}.`);
}
const keys={tables:o=>o.name,columns:o=>`${o.table}.${o.name}`,constraints:o=>`${o.table}.${o.name}`,functions:o=>o.key,policies:o=>`${o.schemaname}.${o.tablename}.${o.policyname}`,triggers:o=>`${o.table}.${o.name}`,indexes:o=>`${o.tablename}.${o.indexname}`};
const difference={};
for(const [kind,key] of Object.entries(keys)){
 const prod=new Map(snapshots.production[kind].map(o=>[key(o),o])),dev=new Map(snapshots.development[kind].map(o=>[key(o),o]));
 difference[kind]={development_only:[...dev.keys()].filter(k=>!prod.has(k)),production_only:[...prod.keys()].filter(k=>!dev.has(k)),changed:[...dev.keys()].filter(k=>prod.has(k)&&JSON.stringify(dev.get(k))!==JSON.stringify(prod.get(k)))};
}
fs.writeFileSync('technical-test-results/m24-release-differences.json',JSON.stringify(difference,null,2));
for(const [kind,changes] of Object.entries(difference))console.log(`${kind}: ${changes.development_only.length} development-only, ${changes.production_only.length} production-only, ${changes.changed.length} changed (including grants).`);
console.log('No DDL, application RPC, user-data query, migration or production write executed.');

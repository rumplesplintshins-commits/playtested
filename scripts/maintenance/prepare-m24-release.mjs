// Offline preparation only. No database connection or deployment capability.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('docs/merge24-migration-manifest.json','utf8'));
assert.equal(manifest.length,16);
const reviewed=manifest.map((entry,i)=>{
 assert(entry.file.startsWith(`supabase/migrations/20261104${String(i+1).padStart(4,'0')}_`));
 const sql=fs.readFileSync(entry.file,'utf8').replace(/\r\n/g,'\n');
 assert.equal(createHash('sha256').update(sql).digest('hex'),entry.sha256_lf,`Reviewed migration changed: ${entry.file}`);
 return `-- Reviewed step ${i+1}: ${entry.file}\n-- SHA256 (UTF-8 LF): ${entry.sha256_lf}\n${sql}\n`;
});
fs.mkdirSync('technical-test-results',{recursive:true});
fs.writeFileSync('technical-test-results/m24-reviewed-migrations.sql',reviewed.join('\n'));
console.log('PASS: all 16 reviewed migration hashes match; offline bundle prepared in ignored technical-test-results.');
console.log('This script does not apply SQL. Use the release plan, preflight, backup and explicit production approval before any execution.');

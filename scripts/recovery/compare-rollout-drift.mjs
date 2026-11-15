import fs from 'node:fs';import path from 'node:path';
const root='C:/PrivateBackups/Playtested';const latest=fs.readdirSync(root).filter(n=>/^rollout-drift-\d{8}-\d{6}$/.test(n)).sort().at(-1);
if(!latest)throw Error('No current read-only source drift audit; do not claim production unchanged');
const audit=JSON.parse(fs.readFileSync(path.join(root,latest,'rollout-drift-audit.json')));if(audit.transaction_read_only!=='on')throw Error('Expected a READ ONLY audit');
const baseline=JSON.parse(fs.readFileSync('.backup-tools/rehearsal/rollout-drift-baseline.json'));const current=new Map(audit.tables.map(t=>[t.table,t]));
const changed=baseline.filter(b=>!current.has(b.table)||b.rows_sha256!==current.get(b.table).rows_sha256||b.rows!==current.get(b.table).rows).map(b=>({table:b.table,backup_rows:b.rows,current_rows:current.get(b.table)?.rows??null,original_column_values_changed:true}));
const report={source_captured_at_utc:audit.captured_at_utc,read_only:true,tables_checked:baseline.length,changed_tables:changed,limits:'Compares all original exported columns, not added columns, new tables, DDL or external service settings. Full schema drift review still precedes rollout.'};
fs.writeFileSync('docs/rollout-production-drift.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

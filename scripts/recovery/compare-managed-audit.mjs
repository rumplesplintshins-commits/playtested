import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='C:/PrivateBackups/Playtested';
const name=fs.readdirSync(root).filter(n=>/^source-inspection-\d{8}-\d{6}$/.test(n)).sort().at(-1);
if(!name)throw Error('Read-only source inspection is required');
const sourcePath=path.join(root,name,'managed-schema-audit.json');
const source=JSON.parse(fs.readFileSync(sourcePath));
assert.equal(source.transaction_read_only,'on');
const local=JSON.parse(fs.readFileSync('.backup-tools/rehearsal/local-managed-schema-audit.json'));
const docker=process.env.REHEARSAL_DOCKER||'C:/Users/OWNER/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const qi=s=>`"${s.replaceAll('"','""')}"`;
const sha=s=>createHash('sha256').update(s).digest('hex');
const key=(kind,o)=>kind==='functions'?`${o.schema}.${o.name}(${o.arguments})`:`${o.schema}.${o.table}.${o.name}`;
const difference={};
for(const kind of ['triggers','functions','policies']) {
 const lm=new Map(local[kind].map(o=>[key(kind,o),o]));const sm=new Map(source[kind].map(o=>[key(kind,o),o]));
 const definition=o=>kind==='policies'?JSON.stringify([o.permissive,o.command,[...o.roles].sort(),o.using,o.with_check]):o.definition;
 difference[kind]={source_only:source[kind].filter(o=>!lm.has(key(kind,o))).map(o=>key(kind,o)),local_only:local[kind].filter(o=>!sm.has(key(kind,o))).map(o=>key(kind,o)),different:source[kind].filter(o=>lm.has(key(kind,o))&&definition(o)!==definition(lm.get(key(kind,o)))).map(o=>key(kind,o))};
}
const functionSource=source.functions.find(f=>f.schema==='public'&&f.name==='handle_new_user'&&f.arguments==='');assert.ok(functionSource);
const r=spawnSync(docker,['exec','-i','playtested-rehearsal-db','psql','-X','-qAt','-U','supabase_admin','-d','postgres','--set=ON_ERROR_STOP=1'],{input:"select to_json(pg_get_functiondef('public.handle_new_user()'::regprocedure));",encoding:'utf8'});
assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout),functionSource.definition,'Existing backed-up signup function must match source exactly');
const triggers=source.triggers.filter(t=>difference.triggers.source_only.includes(key('triggers',t)));
assert.equal(triggers.length,1);assert.equal(triggers[0].schema,'auth');assert.equal(triggers[0].table,'users');assert.equal(triggers[0].function_name,'handle_new_user');assert.equal(triggers[0].enabled,'O');
const policies=source.policies.filter(p=>difference.policies.source_only.includes(key('policies',p)));
assert.equal(policies.length,3);for(const p of policies){assert.equal(p.schema,'storage');assert.equal(p.table,'objects');}
// Preserve exact definitions privately. No production application is performed.
let sql='-- Recovery supplement from a source READ ONLY catalogue inspection.\n-- Apply only to a reviewed isolated restore, never blindly to production.\nbegin;\n';
for(const t of triggers)sql+=t.definition+';\n';
const commands={r:'select',a:'insert',w:'update',d:'delete','*':'all'};
for(const p of policies)sql+=`create policy ${qi(p.name)} on ${qi(p.schema)}.${qi(p.table)} as ${p.permissive?'permissive':'restrictive'} for ${commands[p.command]} to ${p.roles.map(qi).join(', ')}${p.using?` using (${p.using})`:''}${p.with_check?` with check (${p.with_check})`:''};\n`;
sql+='commit;\n';
const supplement=path.join(root,name,'managed-customizations.sql');
if(fs.existsSync(supplement)&&fs.readFileSync(supplement,'utf8')!==sql)throw Error('Refusing to overwrite differing recovery supplement');
fs.writeFileSync(supplement,sql);
const summary={source_captured_at_utc:source.captured_at_utc,source_server_version:source.server_version,local_server_version:local.server_version,source_reconciliation_table_counts:source.reconciliation_table_counts,source_inspection_sha256:sha(fs.readFileSync(sourcePath)),supplement_sha256:sha(sql),signup_function_exact_match:true,differences:difference,supplement_contains:{triggers:triggers.map(t=>key('triggers',t)),policies:policies.map(p=>key('policies',p))},notes:['public.handle_new_user was already present in schema.sql with an exact matching definition; its trigger on the managed Auth table was omitted.','Local-only Storage versioning function/trigger comes from the local Storage image and is not a missing source customization. Definition differences must be reviewed separately, not automatically overwritten.']};
fs.writeFileSync('docs/managed-schema-recovery-audit.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
console.log(`Private supplement prepared: ${supplement}`);
if(process.argv[2]==='verify-local') {
 const recovered=JSON.parse(fs.readFileSync('.backup-tools/rehearsal/post-recovery-managed-schema-audit.json'));
 for(const kind of ['triggers','functions','policies']) {
  const map=new Map(recovered[kind].map(o=>[key(kind,o),o]));
  for(const object of source[kind]) {
   const actual=map.get(key(kind,object));assert.ok(actual,`Missing recovered ${kind} object`);
   if(kind==='policies') {for(const field of ['permissive','command','roles','using','with_check'])assert.deepEqual(actual[field],object[field]);}
   else assert.equal(actual.definition,object.definition);
  }
 }
 console.log('Verified: all inspected source Auth/Storage triggers, functions and policies are represented by exact definitions in the isolated restore.');
}
if(process.argv[2]==='apply-local') {
 const inspect=JSON.parse(spawnSync(docker,['inspect','playtested-rehearsal-db'],{encoding:'utf8'}).stdout)[0];
 assert.deepEqual(inspect.HostConfig.PortBindings||{},{});assert.deepEqual(Object.keys(inspect.NetworkSettings.Networks),['playtested-recovery-isolated']);
 assert.equal(JSON.parse(spawnSync(docker,['network','inspect','playtested-recovery-isolated'],{encoding:'utf8'}).stdout)[0].Internal,true);
 const applied=spawnSync(docker,['exec','-i','playtested-rehearsal-db','psql','-X','-qAt','-U','supabase_admin','-d','postgres','--set=ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'});
 if(applied.status!==0){fs.writeFileSync('.backup-tools/rehearsal/supplement-failure-private.log',applied.stderr);throw Error('Local supplement failed; transaction rolled back');}
 console.log('Recovered missing Auth trigger and Storage policies ONLY into isolated local database.');
}

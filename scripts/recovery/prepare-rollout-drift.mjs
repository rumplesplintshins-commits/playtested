// Read-only baseline comparison preparation; no .env or source credentials loaded.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const columns=JSON.parse(fs.readFileSync('.backup-tools/rehearsal/original-columns.json'));
const exported=JSON.parse(fs.readFileSync('.backup-tools/rehearsal/row-count-verification.json')).tables.map(t=>t.table);
const qi=s=>'"'+s.replaceAll('"','""')+'"';
const tables=columns.filter(t=>exported.includes(`${qi(t.s)}.${qi(t.t)}`));
if(tables.length!==59)throw Error('Expected the 59 exported tables');
const fingerprint=(t,baseline)=>{
 const name=`${t.s}.${t.t}`;
 const relation=baseline?`rehearsal_baseline.${qi(t.s+'__'+t.t)}`:`${qi(t.s)}.${qi(t.t)}`;
 const rowHash="encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex')";
 return `select jsonb_build_object('table','${name}','rows',count(*),'rows_sha256',encode(sha256(convert_to(coalesce(string_agg(${rowHash},'' order by ${rowHash}),''),'UTF8')),'hex')) as item from (select ${t.cols.map(qi).join(',')} from ${relation}) r`;
};
const query=baseline=>`select jsonb_agg(item order by item->>'table') from (${tables.map(t=>fingerprint(t,baseline)).join(' union all ')}) rows;`;
const sql=`-- SELECT-only source data comparison; hashes, not row contents.\nbegin transaction isolation level repeatable read read only;\nset local statement_timeout='60s';\nset local timezone='UTC';\nselect jsonb_build_object('captured_at_utc',clock_timestamp(),'server_version',current_setting('server_version'),'transaction_read_only',current_setting('transaction_read_only'),'tables',(${query(false).replace(/;$/,'')}));\ncommit;\n`;
fs.writeFileSync('supabase/inspection/rollout-drift-audit.sql',sql);
const docker=process.env.REHEARSAL_DOCKER||'C:/Users/OWNER/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const inspect=spawnSync(docker,['inspect','playtested-rehearsal-db'],{encoding:'utf8'});
if(inspect.status!==0)throw Error('Cannot read local baseline container');
const container=JSON.parse(inspect.stdout)[0];
if(Object.keys(container.HostConfig.PortBindings||{}).length||Object.keys(container.NetworkSettings.Networks).join()!=='playtested-recovery-isolated')throw Error('Local isolation guard failed');
const r=spawnSync(docker,['exec','-i','playtested-rehearsal-db','psql','-X','-qAt','-U','supabase_admin','-d','postgres','--set=ON_ERROR_STOP=1'],{input:`begin read only;set local timezone='UTC';${query(true)}commit;`,encoding:'utf8',maxBuffer:1024*1024});
if(r.status!==0)throw Error('Read-only local baseline fingerprint failed');
const rows=JSON.parse(r.stdout);fs.writeFileSync('.backup-tools/rehearsal/rollout-drift-baseline.json',JSON.stringify(rows,null,2));
console.log('Prepared read-only production drift SQL and saved 59 backup-baseline table fingerprints privately.');

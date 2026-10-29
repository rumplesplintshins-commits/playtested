// Real PostgreSQL rehearsal. Never loads .env or accepts a connection URL.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const docker = process.env.REHEARSAL_DOCKER || 'C:/Users/OWNER/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const container = 'playtested-rehearsal-db';
const dir = path.resolve('.backup-tools/rehearsal');
fs.mkdirSync(dir, { recursive: true });
const reportFile = path.join(dir, 'database-checks.json');
const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile)) : { checks: [], migrations: [] };
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const qi = value => `"${value.replaceAll('"', '""')}"`;
function run(args, input) {
  const r = spawnSync(docker, args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return { ...r, text: r.stdout.trim(), error: r.stderr.trim() };
}
function sql(source, { allowFailure = false } = {}) {
  const r = run(['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'supabase_admin', '-d', 'postgres', '--set=ON_ERROR_STOP=1'], `SET timezone='UTC';\n${source}`);
  // SET is deliberately quieted by psql -q below in subsequent calls.
  r.text = r.text.replace(/^SET\r?\n/, '');
  if (r.status && !allowFailure) { fs.writeFileSync(path.join(dir, 'failure-private.log'), r.error); throw Error('SQL failed; diagnostics saved privately.'); }
  return r;
}
function json(source) { return JSON.parse(sql(source).text); }
function check(name, fn) { fn(); report.checks.push({ name, passed: true }); console.log(`PASS: ${name}`); }
function save() { report.updated_at_utc = new Date().toISOString(); fs.writeFileSync(reportFile, JSON.stringify(report, null, 2)); }
function guard() {
  const i = JSON.parse(run(['inspect', container]).text)[0];
  assert.equal(i.Config.Labels?.['com.supabase.cli.project'], undefined); // custom isolated container
  assert.equal(i.HostConfig.RestartPolicy.Name, 'no');
  assert.deepEqual(i.HostConfig.PortBindings || {}, {});
  const nets = Object.keys(i.NetworkSettings.Networks);
  assert.deepEqual(nets, ['playtested-recovery-isolated']);
  assert.equal(JSON.parse(run(['network', 'inspect', nets[0]]).text)[0].Internal, true);
}
const tables = () => json(`select coalesce(json_agg(x),'[]') from (select table_schema s,table_name t,array_agg(column_name::text order by ordinal_position) cols from information_schema.columns where table_schema in ('public','auth','storage') and (table_schema,table_name) in (select schemaname,tablename from pg_tables) group by 1,2 order by 1,2) x;`);
const full = t => `${qi(t.s)}.${qi(t.t)}`;
const base = t => `rehearsal_baseline.${qi(t.s + '__' + t.t)}`;
const columns = t => t.cols.map(qi).join(',');
function captureBaseline() {
  assert.equal(json(`select count(*) from pg_namespace where nspname='rehearsal_baseline';`), 0, 'baseline must be created once');
  const original = tables();
  fs.writeFileSync(path.join(dir, 'original-columns.json'), JSON.stringify(original, null, 2));
  sql(`begin; create schema rehearsal_baseline; revoke all on schema rehearsal_baseline from public,anon,authenticated; ${original.map(t => `create table ${base(t)} as select * from ${full(t)};`).join('\n')} commit;`);
  report.baseline_tables = original.length;
  check('Baseline snapshot captured before any migrations or synthetic writes', () => assert.ok(original.length >= 59));
}
function preservation(label) {
  const original = JSON.parse(fs.readFileSync(path.join(dir, 'original-columns.json')));
  const result = json(`select json_agg(x) from (${original.map(t => `select ${quote(full(t))} as name, (select count(*) from (select to_jsonb(r) from (select ${columns(t)} from ${base(t)}) r except all select to_jsonb(r) from (select ${columns(t)} from ${full(t)}) r) missing) as changed_or_missing`).join(' union all ')}) x;`);
  fs.writeFileSync(path.join(dir, `preservation-${label}.json`), JSON.stringify(result, null, 2));
  check(`${label}: every original row retains all original column values`, () => assert.deepEqual(result.filter(t => t.changed_or_missing !== 0), []));
}
function baselinePermissions() {
  check('Anon cannot read profiles', () => {
    const r = sql('begin; set local role anon; select * from public.profiles; rollback;', { allowFailure: true });
    assert.ok(r.status !== 0 || !r.text.includes('|'), 'anon must not return profile rows');
  });
  check('Anonymous private Storage listing returns no rows', () => assert.equal(sql(`begin; set local role anon; select count(*) from storage.objects; rollback;`).text.split(/\r?\n/).filter(x => /^\d+$/.test(x))[0], '0'));
  check('No restored Vault secrets requiring a key-copy restore', () => assert.equal(json('select count(*) from vault.secrets;'), 0));
  check('Normal trigger mode restored', () => assert.equal(sql('show session_replication_role;').text, 'origin'));
  check('No restored Storage objects or multipart uploads', () => assert.equal(json('select (select count(*) from storage.objects)+(select count(*) from storage.s3_multipart_uploads);'), 0));
}
function migrate() {
  const files = fs.readdirSync('supabase/migrations').filter(f => /^20261028000[1-5]_.*\.sql$/.test(f)).sort();
  assert.equal(files.length, 5);
  for (const file of files) {
    if (report.migrations.some(m => m.name === file)) throw Error('Refusing to rerun previously recorded migration');
    const source = fs.readFileSync(path.join('supabase/migrations', file), 'utf8');
    sql(source);
    report.migrations.push({ name: file, sha256: createHash('sha256').update(source).digest('hex'), applied_at_utc: new Date().toISOString() }); save();
    console.log(`Applied ONLY to isolated database: ${file}`);
  }
}

const id = n => `f1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const identity = n => `set local role authenticated; set local request.jwt.claim.sub=${quote(id(n))}; set local request.jwt.claims=${quote(JSON.stringify({ sub: id(n), role: 'authenticated' }))};`;
const auth = (n, source, opts) => sql(`begin isolation level read committed; ${identity(n)} ${source} commit;`, opts);
const authValue = (n, source) => JSON.parse(auth(n, source).text);
const claim = campaign => `select public.claim_community_game_test('${id(campaign)}');`;
const release = campaign => `select public.release_community_game_test('${id(campaign)}');`;
const submit = reportId => `select public.submit_community_game_test('${reportId}',8,8,'No bugs','',0,8,'probably','probably','Movement','None','Tutorial','{}');`;
const criteria = `'{"specific":true,"examples":true,"useful":true,"relevant":true,"original":true}'::jsonb`;
const review = (reportId, outcome) => `select public.review_test_quality('${reportId}','${outcome}','Concrete local rehearsal observations',${criteria});`;
const reportId = (campaign, user) => json(`select to_json(id) from public.community_game_tests where playtest_id='${id(campaign)}' and tester_id='${id(user)}';`);
function denied(name, user, source, pattern = /permission denied|not allowed|row-level security|admin|Moderator/i) {
  check(name, () => { const r = auth(user, source, { allowFailure: true }); assert.notEqual(r.status, 0); assert.match(r.error, pattern); });
}
function fixtures() {
  const accounts = Array.from({ length: 96 }, (_, i) => i + 1);
  sql(`begin; ${accounts.map(n => `insert into auth.users(id,email,aud,role) values('${id(n)}','rehearsal-${n}@example.test','authenticated','authenticated'); insert into public.profiles(id,display_name,role,roles,preferred_genres) values('${id(n)}','Rehearsal ${n}','${n === 90 ? 'admin' : 'user'}',array['tester','developer'],array['Action']);`).join('\n')} commit;`);
  report.synthetic_prefix = 'f1000000-0000-4000-8000-'; save();
}
function campaign(n, overrides = '') {
  sql(`begin; insert into public.game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${id(n+1000)}','${id(91)}','Rehearsal ${n}','Rehearsal developer','Action','Synthetic isolated test','https://example.test/build','Unknown','Approved'); insert into public.community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(n)}','${id(91)}','${id(n+1000)}','Rehearsal ${n}','https://example.test/build','Test movement and report observations','open','both'); ${overrides} commit;`);
}
function permissions() {
  if (!json(`select count(*) from public.community_playtests where id='${id(301)}';`)) campaign(301);
  for (const [name, query] of [
    ['Private policy table denied', 'select * from public.testing_policy;'],
    ['Private capacity helper denied', `select * from public.campaign_places('${id(301)}');`],
    ['Private eligibility helper denied', `select public.campaign_eligible('${id(301)}','${id(1)}');`],
    ['Direct report insert denied', `insert into public.community_game_tests(playtest_id,tester_id) values('${id(301)}','${id(1)}');`],
    ['Direct review ledger write denied', `insert into public.test_review_events(test_id,actor_id,kind,reason) values('${id(999)}','${id(1)}','accepted','Forged');`],
  ]) denied(name, 1, query);
  check('RLS prevents direct self XP changes',()=> { auth(1,`update public.profiles set tester_xp=99999 where id='${id(1)}';`); assert.equal(json(`select tester_xp from public.profiles where id='${id(1)}';`),0); });
  check('RLS prevents direct self admin escalation',()=> { auth(1,`update public.profiles set role='admin' where id='${id(1)}';`); assert.equal(json(`select to_json(role) from public.profiles where id='${id(1)}';`),'user'); });
  denied('Developer cannot review quality', 91, review(id(999), 'accepted'));
  denied('Developer cannot replace submitted places', 91, `select public.replace_unusable_test('${id(999)}','Synthetic reason');`);
  denied('Tester cannot read admin queue', 1, 'select public.get_quality_review_queue();');
  const anon = sql('begin;set local role anon;select public.get_my_testing_progress();commit;', { allowFailure: true });
  check('Anonymous progress RPC denied', () => assert.match(anon.error, /permission denied/i));
  sql(`update public.community_playtests set minimum_rank=3,genre_restricted=true,testing_genre='Adventure' where id='${id(301)}';`);
  check('Bronze cannot see restricted campaign or its build', () => assert.equal(authValue(1, `select count(*) from public.get_available_community_test_games() where submission_id='${id(301)}';`), 0));
  denied('Bronze cannot claim restricted campaign', 1, claim(301), /rank or required genre/i);
  // Establish Platinum from explicit synthetic legacy accepted history only.
  sql(`begin; update public.profiles set tester_xp=5000 where id='${id(89)}'; ${Array.from({length:50},(_,i)=>`insert into public.game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${id(5000+i)}','${id(91)}','Synthetic rank history','Rehearsal','Action','Synthetic','https://example.test','Unknown','Approved'); insert into public.community_game_tests(submission_id,tester_id,status,review_outcome,xp_awarded,base_xp_amount) values('${id(5000+i)}','${id(89)}','reviewed','accepted',true,100);`).join('\n')} commit;`);
  check('Synthetic high-rank account is Platinum', () => assert.equal(json(`select public.tester_rank('${id(89)}');`), 3));
  denied('Platinum cannot bypass required genre', 89, claim(301), /rank or required genre/i);
  auth(89, "select public.update_my_testing_genres(array['Adventure']);");
  auth(89, claim(301));
  check('Required genre match permits Platinum claim', () => assert.ok(reportId(301,89)));
  auth(89, "select public.update_my_testing_genres(array['Action']);");
  check('Existing claim remains visible after genre eligibility changes', () => assert.equal(authValue(89, `select count(*) from public.get_available_community_test_games() where submission_id='${id(301)}';`), 1));
  auth(89, submit(reportId(301,89)));
  check('Existing claim remains submittable after eligibility changes', () => assert.equal(json(`select to_json(status) from public.community_game_tests where id='${reportId(301,89)}';`), 'submitted'));
}

function session(name, user) {
  const child = spawn(docker, ['exec','-i',container,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','--set=ON_ERROR_STOP=1'], { stdio: ['pipe','pipe','pipe'] });
  let out = '', err = '', closed = false;
  child.stdout.on('data', b => { out += b; }); child.stderr.on('data', b => { err += b; });
  child.stdin.on('error', () => {});
  const done = new Promise((resolve, reject) => { child.on('error',reject); child.on('close',code=>{closed=true;resolve({code,out,err});}); });
  child.stdin.write(`set application_name='${name}'; begin isolation level read committed; set local statement_timeout='12s'; ${identity(user)}\n`);
  return { child, done, send: text => child.stdin.write(text+'\n'), end: text => child.stdin.end(text+'\n'), ready: async marker => {
    const deadline=Date.now()+10000;
    while(!out.includes(marker)) { if(closed) throw Error(`Session ${name} failed before ready: ${err}`); if(Date.now()>deadline) throw Error('Timed out preparing race'); await new Promise(r=>setTimeout(r,50)); }
  } };
}
async function race(name, { aUser,bUser,aSql,bSql,rollback=false,error }) {
  const a=session(`rehearsal-${name}-a`,aUser), bName=`rehearsal-${name}-b`;
  let b;
  try {
    a.send(aSql+'\n\\echo A_READY'); await a.ready('A_READY');
    b=session(bName,bUser); b.end(bSql+'\ncommit;');
    let locked=false; const deadline=Date.now()+6000;
    while(Date.now()<deadline) {
      locked=json(`select to_json(exists(select 1 from pg_stat_activity b join pg_stat_activity a on a.application_name='rehearsal-${name}-a' where b.application_name='${bName}' and b.wait_event_type='Lock' and a.pid=any(pg_blocking_pids(b.pid))));`);
      if(locked)break; await new Promise(r=>setTimeout(r,50));
    }
    assert.equal(locked,true,`${name}: B must demonstrably wait on A`);
    a.end(rollback?'rollback;':'commit;');
    const ar=await a.done, br=await b.done;
    assert.equal(ar.code,0,`${name}: A transaction must finish`);
    if(error) { assert.notEqual(br.code,0,`${name}: B should fail`);assert.match(br.err,error); }
    else assert.equal(br.code,0,`${name}: B should succeed: ${br.err}`);
    report.checks.push({name:`Concurrency ${name}`,passed:true,blocking_verified:true,a_rolled_back:rollback,b_outcome:error?'expected error':'success'}); save();
    console.log(`PASS: concurrency ${name} (independent sessions; blocking verified)`);
  } finally { if(!a.child.stdin.destroyed&&!a.child.stdin.writableEnded)a.child.stdin.end('rollback;\n'); if(b&&!b.child.stdin.destroyed&&!b.child.stdin.writableEnded)b.child.stdin.end('rollback;\n'); }
}
async function concurrency() {
  if (!json(`select count(*) from public.community_playtests where id='${id(310)}';`)) { campaign(310);auth(1,claim(310));auth(1,submit(reportId(310,1))); }
  // Retry setup removes only unsubmitted synthetic reservations from this case.
  sql(`delete from public.community_game_tests where playtest_id='${id(310)}' and tester_id in ('${id(2)}','${id(3)}') and status='claimed';`);
  await race('final-place-commit',{aUser:2,bUser:3,aSql:claim(310),bSql:claim(310),error:/campaign is full/i});
  check('Final place has exactly two reservations',()=>assert.equal(json(`select count(*) from public.community_game_tests where playtest_id='${id(310)}' and replacement_at is null;`),2));
  campaign(311);auth(4,claim(311));auth(4,submit(reportId(311,4)));
  await race('final-place-rollback',{aUser:5,bUser:6,aSql:claim(311),bSql:claim(311),rollback:true});
  check('Rollback permits exactly one replacement reservation',()=>assert.equal(json(`select count(*) from public.community_game_tests where playtest_id='${id(311)}' and replacement_at is null;`),2));
  campaign(312);campaign(313);
  await race('same-tester-two-campaigns',{aUser:7,bUser:7,aSql:claim(312),bSql:claim(313),error:/One test at a time/i});
  campaign(314);
  await race('same-tester-same-campaign',{aUser:8,bUser:8,aSql:claim(314),bSql:claim(314),error:/already tested or claimed/i});
  campaign(315);campaign(316);
  await race('same-tester-rollback',{aUser:9,bUser:9,aSql:claim(315),bSql:claim(316),rollback:true});
  campaign(317);auth(10,claim(317));const reviewed=reportId(317,10);auth(10,submit(reviewed));
  for(const outcome of ['accepted','rejected','accepted']) await race(`review-${outcome}-${report.checks.length}`,{aUser:90,bUser:90,aSql:review(reviewed,outcome),bSql:review(reviewed,outcome)});
  check('Concurrent reviews award/reverse/restore once each',()=>assert.deepEqual(json(`select json_build_object('xp',(select tester_xp from public.profiles where id='${id(10)}'),'deltas',(select json_agg(xp_delta order by id) from public.test_review_events where test_id='${reviewed}'));`),{xp:100,deltas:[100,-100,100]}));
  campaign(318);auth(11,claim(318));const r1=reportId(318,11);
  await race('submit-before-release',{aUser:11,bUser:11,aSql:submit(r1),bSql:release(318),error:/No active claim/i});
  check('Submitted report survives concurrent release',()=>assert.equal(json(`select to_json(status) from public.community_game_tests where id='${r1}';`),'submitted'));
  campaign(319);auth(12,claim(319));const r2=reportId(319,12);
  await race('release-before-submit',{aUser:12,bUser:12,aSql:release(319),bSql:submit(r2),error:/not found|do not own/i});
  check('Released claim leaves no phantom report',()=>assert.equal(json(`select count(*) from public.community_game_tests where id='${r2}';`),0));
  campaign(320);auth(13,claim(320));const r3=reportId(320,13);
  await race('submit-rollback-release',{aUser:13,bUser:13,aSql:submit(r3),bSql:release(320),rollback:true});
  check('Rolled-back submission permits clean release',()=>assert.equal(json(`select count(*) from public.community_game_tests where id='${r3}';`),0));
  campaign(321);auth(14,claim(321));const r4=reportId(321,14);
  await race('release-rollback-submit',{aUser:14,bUser:14,aSql:release(321),bSql:submit(r4),rollback:true});
  check('Rolled-back release preserves claim for submission',()=>assert.equal(json(`select to_json(status) from public.community_game_tests where id='${r4}';`),'submitted'));
}

function extended() {
  const fks=json(`select json_agg(x) from (select c.conname name,n.nspname s,t.relname t,rn.nspname rs,rt.relname rt,array(select a.attname::text from unnest(c.conkey) with ordinality k(num,pos) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num order by k.pos) cols,array(select a.attname::text from unnest(c.confkey) with ordinality k(num,pos) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num order by k.pos) rcols from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_class rt on rt.oid=c.confrelid join pg_namespace rn on rn.oid=rt.relnamespace where c.contype='f' and n.nspname in ('public','auth','storage')) x;`);
  const results=json(`select json_agg(x) from (${fks.map(f=>`select ${quote(f.name)} name,count(*) orphans from ${qi(f.s)}.${qi(f.t)} c where ${f.cols.map(c=>`c.${qi(c)} is not null`).join(' and ')} and not exists(select 1 from ${qi(f.rs)}.${qi(f.rt)} p where ${f.cols.map((c,i)=>`c.${qi(c)}=p.${qi(f.rcols[i])}`).join(' and ')})`).join(' union all ')}) x;`);
  fs.writeFileSync(path.join(dir,'foreign-key-checks.json'),JSON.stringify(results,null,2));
  check('All real foreign-key relationships have zero orphan rows',()=>assert.deepEqual(results.filter(r=>r.orphans!==0),[]));
  campaign(330);
  check('Rolling launch window: before boundary consumes quota, exact boundary releases it',()=>assert.deepEqual(json(`select json_build_array((select rounds_used from public._playtested_launch_window_at(null,null,'${id(1330)}',(select tester_hub_started_at+interval '720 hours'-interval '1 microsecond' from public.community_playtests where id='${id(330)}'))),(select rounds_used from public._playtested_launch_window_at(null,null,'${id(1330)}',(select tester_hub_started_at+interval '720 hours' from public.community_playtests where id='${id(330)}'))));`),[1,0]));
  const launched=json(`select to_json(tester_hub_started_at) from public.community_playtests where id='${id(330)}';`);
  sql(`update public.community_playtests set status='paused' where id='${id(330)}';update public.community_playtests set status='open' where id='${id(330)}';`);
  check('Pause/resume preserves original launch timestamp',()=>assert.equal(json(`select to_json(tester_hub_started_at) from public.community_playtests where id='${id(330)}';`),launched));
  sql(`update public.community_playtests set status='closed' where id='${id(330)}';`);
  check('Second Hub launch inside window rejected',()=>assert.match(sql(`insert into public.community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(331)}','${id(91)}','${id(1330)}','Retry','https://example.test','Synthetic instructions','open','both');`,{allowFailure:true}).error,/One Tester Hub launch/i));
  campaign(332);const token=json(`select to_json(share_token) from public.community_playtests where id='${id(332)}';`);
  auth(20,`select public.join_community_playtest('${token}');`);
  check('Community-token participation is labelled community and uses no independent place',()=>assert.deepEqual(json(`select json_build_object('source',(select source from public.community_playtest_participants where playtest_id='${id(332)}' and tester_id='${id(20)}'),'available',(select available from public.campaign_places('${id(332)}')));`),{source:'community',available:2}));
  const reviewed=reportId(317,10);auth(90,review(reviewed,'rejected'));
  check('Accepted-build lock survives later quality reversal',()=>assert.equal(json(`select count(*) from public.campaign_build_locks where playtest_id='${id(317)}';`),1));
  check('Submitted report deletion rejected even for database administrator',()=>assert.match(sql(`delete from public.community_game_tests where id='${reviewed}';`,{allowFailure:true}).error,/Submitted reports cannot be released or deleted/i));
  check('Private baseline data inaccessible to API roles',()=>assert.match(auth(1,'select * from rehearsal_baseline.public__profiles;',{allowFailure:true}).error,/permission denied/i));
}
function browserFixtures() {
  const users=JSON.parse(fs.readFileSync(path.join(dir,'browser-users-private.json')));
  sql(`begin; ${Object.entries(users).map(([role,u])=>`insert into public.profiles(id,display_name,role,roles,preferred_genres) values(${quote(u.id)},${quote('Browser '+role)},'${role==='admin'?'admin':'user'}',array[${quote(role==='admin'?'tester':role)}],array['Action']);`).join('\n')}
  insert into public.game_submissions(id,developer_id,title,developer_name,genre,description,game_link,ai_type,status) values('${id(1340)}',${quote(users.developer.id)},'Browser rehearsal game','Browser developer','Action','Isolated browser rehearsal','https://example.test/build','Unknown','Approved');
  insert into public.community_playtests(id,developer_id,submission_id,title,access_link,instructions,status,audience) values('${id(340)}',${quote(users.developer.id)},'${id(1340)}','Browser rehearsal campaign','https://example.test/build','Test movement and report observations','open','both'); commit;`);
  check('Synthetic Auth users explicitly provisioned with local app profiles',()=>assert.equal(json(`select count(*) from public.profiles where id in (${Object.values(users).map(u=>quote(u.id)).join(',')});`),3));
}
function recoveredStoragePermissions() {
  const ownName=`${id(1)}/recovery-check.zip`;
  const setup=`insert into storage.objects(bucket_id,name) values('game-builds',${quote(ownName)});`;
  check('Recovered Storage policy allows own-folder metadata insert/read',()=>{
    const r=sql(`begin; ${identity(1)} ${setup} select count(*) from storage.objects where name=${quote(ownName)}; rollback;`);assert.equal(r.text,'1');
  });
  check('Recovered Storage policy hides another user folder',()=>{
    const r=sql(`begin; ${identity(1)} ${setup} ${identity(2)} select count(*) from storage.objects where name=${quote(ownName)}; rollback;`);assert.equal(r.text,'0');
  });
  denied('Recovered Storage policy rejects cross-user upload metadata',2,setup,/row-level security/i);
  check('Recovered Storage policy allows owner deletion in Storage API query mode',()=>{
    const r=sql(`begin; set local storage.allow_delete_query='true'; ${identity(1)} ${setup} with deleted as (delete from storage.objects where name=${quote(ownName)} returning id) select count(*) from deleted; rollback;`);assert.equal(r.text,'1');
  });
  check('Recovered Storage policy prevents cross-user deletion in Storage API query mode',()=>{
    const r=sql(`begin; set local storage.allow_delete_query='true'; ${identity(1)} ${setup} ${identity(2)} with deleted as (delete from storage.objects where name=${quote(ownName)} returning id) select count(*) from deleted; rollback;`);assert.equal(r.text,'0');
  });
  check('Rollback leaves the originally empty object inventory empty',()=>assert.equal(json('select count(*) from storage.objects;'),0));
}

try {
  guard();
  const phase = process.argv[2];
  if (phase === 'baseline') { captureBaseline(); baselinePermissions(); preservation('baseline'); }
  else if (phase === 'baseline-verify') { baselinePermissions(); preservation('baseline'); }
  else if (phase === 'migrate') { migrate(); preservation('post-migration'); }
  else if (phase === 'preservation') preservation('post-tests');
  else if (phase === 'permissions') { fixtures(); permissions(); }
  else if (phase === 'permissions-resume') permissions();
  else if (phase === 'concurrency') await concurrency();
  else if (phase === 'extended') extended();
  else if (phase === 'browser-fixtures') browserFixtures();
  else if (phase === 'storage-recovery') recoveredStoragePermissions();
  else throw Error('Expected baseline, migrate, or preservation phase');
  if(report.failure) { (report.resolved_harness_failures ||= []).push(report.failure); delete report.failure; }
  save();
} catch (error) { report.failure = { at_utc: new Date().toISOString(), message: error.message }; save(); console.error(error.message); process.exitCode = 1; }

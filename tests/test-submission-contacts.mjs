import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

const disposable={},emailModel={};
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const policy=JSON.parse(fs.readFileSync('lib/contact-email-policy.json','utf8'));
new Function('exports','require',compile('lib/disposable-email.ts'))(disposable,()=>({default:policy}));
new Function('exports','require',compile('lib/contact-email.ts'))(emailModel,name=>name.includes('policy')?{default:policy}:disposable);

const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const submission = '20000000-0000-4000-8000-000000000001';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create table auth.users(id uuid primary key);
    create table public.game_submissions(id uuid primary key, developer_id uuid);
    grant select on public.game_submissions to authenticated;
    insert into auth.users values('${owner}'),('${other}');
    insert into game_submissions values('${submission}','${owner}');`);
  await db.exec(fs.readFileSync('supabase/migrations/202611040001_private_submission_contacts.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/202611040002_contact_email_validation.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/202611040009_contact_email_syntax.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/202611040015_contact_email_policy.sql','utf8'));
  const storedPolicy=(await db.query('select allowed_suffixes,blocked_providers from contact_email_policy')).rows[0];
  assert.deepEqual(storedPolicy.allowed_suffixes,policy.allowedSuffixes);assert.deepEqual(storedPolicy.blocked_providers,policy.blockedProviders);
  const accepted=[null,'','  \t','test@indie.games','test@studio.studio','test@team.gg','test@example.co.uk','test@example.uk','test@example.io','test@example.dev','test@example.org','test@example.net','test@example.de','test@example.co.jp','a@xn--bcher-kva.de','a@example.xn--p1ai',"o'brien@example.com",'a+b@sub.example.com',
    `${'a'.repeat(64)}@example.com`,`a@${'b'.repeat(63)}.com`,`${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`,' \tMixed.Case@Example.Com\r\n'];
  const rejected=['a@example.cock','a@yopmail.com','a@sub.yopmail.com','a@mailinator.com','a@example.coma','a@example.unfamiliartld','a@example.test','missing-at','a@@example.com','@example.com','a@','a@example','a@.com','a@example.','a@example..com','a@-example.com','a@example-.com','a@exam_ple.com','.a@example.com','a.@example.com','a..b@example.com','a b@example.com','a\n@example.com','a@foo\n.com','a@ex ample.com','a@example.com/path','a@example.com:443','a@??.com','a\u00a0@example.com',`${'a'.repeat(65)}@example.com`,`a@${'b'.repeat(64)}.com`,`${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`];
  for(const [values,valid] of [[accepted,true],[rejected,false]])for(const value of values){
    assert.equal(emailModel.contactEmailError(value)===null,valid,`Client syntax: ${JSON.stringify(value)}`);
    const normalized=emailModel.normalizeContactEmail(value);
    assert.equal((await db.query('select public.valid_contact_email($1) valid',[normalized])).rows[0].valid,valid,`Database/client parity: ${JSON.stringify(value)}`);
  }
  await db.exec(`set role authenticated; set test.uid='${owner}';`);
  await db.query(`insert into game_submission_contacts(submission_id,developer_id,contact_email,contact_discord,contact_reddit,contact_allowed) values($1,$2,'dev@example.com','dev_discord','u/dev',true)`, [submission, owner]);
  let row = (await db.query('select * from game_submission_contacts')).rows[0];
  assert.equal(row.contact_email,'dev@example.com'); assert.equal(row.contact_discord,'dev_discord'); assert.equal(row.contact_reddit,'u/dev'); assert.equal(row.contact_allowed,true);
  for(const value of accepted){await db.query('update game_submission_contacts set contact_email=$1',[value]);assert.equal((await db.query('select contact_email from game_submission_contacts')).rows[0].contact_email,emailModel.normalizeContactEmail(value));}
  for(const value of rejected)await assert.rejects(db.query('update game_submission_contacts set contact_email=$1',[value]),/check constraint/);
  await db.exec('update game_submission_contacts set contact_allowed=false,contact_discord=null');
  row = (await db.query('select * from game_submission_contacts')).rows[0];
  assert.equal(row.contact_allowed,false); assert.equal(row.contact_discord,null);
  await assert.rejects(db.exec("update game_submission_contacts set contact_email='bad email'"),/check constraint/);
  await assert.rejects(db.exec(`update game_submission_contacts set developer_id='${other}'`),/row-level security/);
  await db.exec(`set test.uid='${other}'`);
  assert.equal((await db.query('select * from game_submission_contacts')).rows.length,0);
  assert.equal((await db.query('update game_submission_contacts set contact_allowed=true returning *')).rows.length,0);
  await assert.rejects(db.exec(`insert into game_submission_contacts(submission_id,developer_id) values('${submission}','${other}')`),/row-level security/);
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from game_submission_contacts'),/permission denied/);
  await db.exec('reset role');
  assert.equal((await db.query('select * from game_submission_contacts')).rows.length,1,'Server privileged reader can inspect contact record');
  console.log('PASS: frontend/database email parity, malformed addresses, unfamiliar domains, length boundaries, optional normalization, public suffix/disposable product policy, contacts, withdrawal and RLS.');
} catch(error) { console.error(error.message); process.exitCode=1; } finally { await db.close(); }

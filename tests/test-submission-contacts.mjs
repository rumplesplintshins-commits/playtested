import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const submission = '20000000-0000-4000-8000-000000000001';
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create table auth.users(id uuid primary key);
    create table public.game_submissions(id uuid primary key, developer_id uuid);
    grant select on public.game_submissions to authenticated;
    insert into auth.users values('${owner}'),('${other}');
    insert into game_submissions values('${submission}','${owner}');`);
  await db.exec(fs.readFileSync('supabase/migrations/202611040001_private_submission_contacts.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/202611040002_contact_email_validation.sql','utf8'));
  await db.exec(`set role authenticated; set test.uid='${owner}';`);
  await db.query(`insert into game_submission_contacts(submission_id,developer_id,contact_email,contact_discord,contact_reddit,contact_allowed) values($1,$2,'dev@example.test','dev_discord','u/dev',true)`, [submission, owner]);
  let row = (await db.query('select * from game_submission_contacts')).rows[0];
  assert.equal(row.contact_email,'dev@example.test'); assert.equal(row.contact_discord,'dev_discord'); assert.equal(row.contact_reddit,'u/dev'); assert.equal(row.contact_allowed,true);
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
  console.log('PASS: contact values, withdrawal, email validation, owner isolation, spoof prevention and anonymous denial.');
} finally { await db.close(); }

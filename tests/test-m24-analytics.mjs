import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const model = {};
new Function('exports', ts.transpileModule(fs.readFileSync('lib/acquisition.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(model);
assert.equal(model.campaignLabel('Reddit_Outreach'),'reddit_outreach');
for (const value of ['private@email.test','https://example.test/private','a/b','x'.repeat(65),null]) assert.equal(model.campaignLabel(value),null);
assert.deepEqual(model.acquisitionContext('https://example.test/?utm_source=reddit&utm_campaign=ringfall','https://www.reddit.com/r/indiegames/private?secret=1'),{source:'reddit',medium:null,campaign:'ringfall',referral:'reddit'});
assert.equal(model.acquisitionContext('https://example.test/','https://www.google.co.uk/search?q=private').referral,'search');
assert.equal(model.acquisitionContext('https://example.test/','https://example.test/account').referral,null);
const db = new PGlite();
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',submission='20000000-0000-4000-8000-000000000001';
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
  create table public.game_submissions(id uuid primary key,developer_id uuid,status text,submitted_at timestamptz default now());
  insert into game_submissions(id,developer_id,status) values('${submission}','${owner}','Approved');`);
  await db.exec(fs.readFileSync('supabase/migrations/202611040003_acquisition_analytics.sql','utf8'));
  await db.exec(`set role authenticated;set test.uid='${other}'`);
  await assert.rejects(db.query('select record_submission_acquisition($1)',[submission]),/owner required/);
  await db.exec(`set test.uid='${owner}'`);
  await db.query(`select record_submission_acquisition($1,'reddit','social','launch','reddit','Reddit outreach')`,[submission]);
  await db.query(`select record_submission_acquisition($1,'other')`,[submission]);
  await assert.rejects(db.query('select * from m24_submission_acquisition'),/permission denied/);
  await assert.rejects(db.query('select m24_analytics_summary()'),/permission denied/);
  await assert.rejects(db.query('select * from m24_page_views'),/permission denied/);
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select record_submission_acquisition($1)',[submission]),/permission denied/);
  await assert.rejects(db.query('select m24_analytics_summary()'),/permission denied/);
  await db.exec('reset role');
  for (const [event,visitor,when] of [[1,1,'1 hour'],[2,1,'2 hours'],[3,2,'2 days'],[4,3,'20 days'],[5,4,'100 days']]) {
    await db.query(`insert into m24_page_views(event_id,visitor_id,page,source,occurred_at) values($1,$2,'/','reddit',now()-$3::interval)`,[`30000000-0000-4000-8000-${String(event).padStart(12,'0')}`,`40000000-0000-4000-8000-${String(visitor).padStart(12,'0')}`,when]);
  }
  const summary=(await db.query('select m24_analytics_summary() data')).rows[0].data;
  assert.deepEqual(summary.windows,[{days:1,views:2,visitors:1},{days:7,views:3,visitors:2},{days:30,views:4,visitors:3}]);
  assert.equal(summary.trend.length,30); assert.equal(summary.sources[0].views,4);
  assert.equal(summary.submissions[0].source,'reddit'); assert.equal(summary.submissions[0].approved,1);
  await db.exec('select m24_analytics_retention()');
  assert.equal((await db.query('select count(*)::int n from m24_page_views')).rows[0].n,4);
  console.log('PASS: campaign sanitisation, referral minimisation, acquisition ownership, private analytics grants, rolling windows, deduplication and retention.');
} catch(e) { console.error(e.message); process.exitCode=1; } finally { await db.close(); }

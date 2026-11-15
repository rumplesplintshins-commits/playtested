// Run inside the isolated rehearsal app container only. Never load repository .env.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, expect as baseExpect } from 'playwright/test';
import { createClient } from '@supabase/supabase-js';
const expect=baseExpect.configure({timeout:45000});
process.on('uncaughtException',error=>{fs.writeFileSync('/tmp/browser-failure-private.log',error.stack||error.message);console.error('Browser rehearsal failed; diagnostics retained privately in /tmp/browser-failure-private.log.');process.exit(1);});
const backend=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(backend,'http://127.0.0.1:54321');
assert.ok(!fs.existsSync('/app/.env.local'));
assert.ok(!fs.existsSync('/app/.env'));
const routes=fs.readFileSync('/proc/net/route','utf8').split('\n').slice(1).filter(Boolean);
assert.ok(routes.every(r=>r.trim().split(/\s+/)[1]!=='00000000'),'Container must have no default route');
const usersPath='/tmp/rehearsal-users.json';
const checks=[];
const pass=name=>{checks.push(name);console.log(`PASS: ${name}`);};
const adminClient=createClient(backend,process.env.REHEARSAL_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
if(process.argv[2]==='provision') {
 const users={};
 for(const role of ['tester','developer','admin']) {
  const {data,error}=await adminClient.auth.admin.createUser({email:`browser-${role}@example.test`,password:process.env.REHEARSAL_PASSWORD,email_confirm:true,role:'authenticated'});
  if(error)throw Error(`Local Auth account provision failed (${error.status}): ${error.code}`);
  users[role]={id:data.user.id,email:data.user.email};
 }
 fs.writeFileSync(usersPath,JSON.stringify(users,null,2));
 console.log('Provisioned three confirmed synthetic accounts through local Auth; no email sent.');
} else {
 const users=JSON.parse(fs.readFileSync(usersPath));
 const clients={};
 for(const role of Object.keys(users)) {
  const client=createClient(backend,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.signInWithPassword({email:users[role].email,password:process.env.REHEARSAL_PASSWORD});
  assert.equal(error,null,`Local ${role} login must succeed`);assert.equal(data.user.id,users[role].id);clients[role]=client;
 }
 pass('Real local Auth password login succeeds for tester, developer and admin');
 for(const role of ['tester','developer']) {
  const {error}=await clients[role].rpc('get_quality_review_queue');assert.ok(error,`${role} must not access admin queue`);assert.match(error.message,/Admin access required/i);
 }
 pass('Real JWT/PostgREST denies tester/developer admin queue access');
 const {data:queue,error:queueError}=await clients.admin.rpc('get_quality_review_queue');assert.equal(queueError,null);assert.ok(Array.isArray(queue));
 pass('Real admin JWT/PostgREST can read quality queue');
 if(process.argv[2]==='signals') {
  const own=await clients.tester.from('community_game_tests').select('id').eq('tester_id',users.tester.id);assert.equal(own.error,null);assert.equal(own.data.length,1);
  for(const signal of ['helpful','concern']) {
   const {error}=await clients.developer.rpc('signal_test_feedback',{p_test_id:own.data[0].id,p_signal:signal,p_reason:'Synthetic advisory developer observation'});assert.equal(error,null);
  }
  const afterSignals=await clients.tester.rpc('get_my_testing_progress');assert.equal(afterSignals.error,null);assert.equal(afterSignals.data.xp,100);
  pass('Real developer Helpful/concern signals leave tester XP unchanged');
  fs.writeFileSync('/tmp/api-signal-checks.json',JSON.stringify({at_utc:new Date().toISOString(),checks},null,2));process.exit(0);
 }
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort();});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  await page.goto('http://127.0.0.1:3000/login?next=/tester',{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByLabel('Email address',{exact:true}).fill(users.tester.email);
  await page.getByLabel('Password',{exact:true}).fill(process.env.REHEARSAL_PASSWORD);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Bronze tester'})).toBeVisible();
  pass('Actual login page opens Tester Hub with restored-database Bronze progress');
  await page.getByLabel('Testing genre',{exact:false}).selectOption('all');
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Browser rehearsal campaign',exact:true})});
  await expect(card).toBeVisible();
  await card.getByRole('button',{name:'Test game',exact:true}).click();
  await page.getByRole('button',{name:'Start testing',exact:true}).click();
  await page.getByRole('button',{name:'Finish feedback',exact:true}).click();
  const form=page.locator('form');const selects=form.locator('select');
  assert.equal(await selects.count(),5);
  for(let i=0;i<5;i++)assert.equal(await selects.nth(i).inputValue(),'');
  for(const [i,value]of ['8','probably','probably','8','8'].entries())await selects.nth(i).selectOption(value);
  await form.locator('input[type="number"]').fill('0');
  const texts=form.locator('textarea');
  await texts.nth(0).fill('Movement felt responsive in the synthetic local build.');
  await texts.nth(1).fill('No frustrations found during this local rehearsal.');
  await texts.nth(3).fill('Add a short tutorial for the first movement mechanic.');
  await form.getByRole('button',{name:'Submit review',exact:true}).click();
  await expect(page.getByText('Your feedback has been submitted and is awaiting admin review.',{exact:true}).first()).toBeVisible();
  pass('Actual browser claims and submits feedback through real JWT/PostgREST and restored schema');
  const {data:own,error:ownError}=await clients.tester.from('community_game_tests').select('id,status,playtest_id').eq('tester_id',users.tester.id);
  assert.equal(ownError,null);assert.equal(own.length,1);assert.equal(own[0].status,'submitted');
  const {error:developerReviewError}=await clients.developer.rpc('review_test_quality',{p_test_id:own[0].id,p_outcome:'accepted',p_reason:'Synthetic developer should be denied',p_criteria:{specific:true,examples:true,useful:true,relevant:true,original:true}});
  assert.ok(developerReviewError);
  const {error:reviewError}=await clients.admin.rpc('review_test_quality',{p_test_id:own[0].id,p_outcome:'accepted',p_reason:'Specific observations and a concrete improvement',p_criteria:{specific:true,examples:true,useful:true,relevant:true,original:true}});
  assert.equal(reviewError,null);
  await page.reload();await expect(page.getByText('Your test was accepted and earned 100 XP.',{exact:true})).toBeVisible();
  const {data:progress,error:progressError}=await clients.tester.rpc('get_my_testing_progress');assert.equal(progressError,null);assert.equal(progress.xp,100);
  pass('Developer review denied; admin acceptance gives exactly 100 XP and browser displays accepted state');
 } finally {await browser.close();fs.writeFileSync('/tmp/browser-checks.json',JSON.stringify({at_utc:new Date().toISOString(),checks},null,2));}
}

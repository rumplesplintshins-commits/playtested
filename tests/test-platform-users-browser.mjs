// Real development counts/auth; empty/error states are mocked without changing data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from 'playwright/test';

const ref='ktifgybnkdaotdxrvjgq',origin='http://localhost:3000';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,`${ref}.supabase.co`);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const fixtures=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
const must=(result,label)=>{assert(!result.error,`${label} failed (${result.error?.code||result.error?.status||'unknown'})`);return result.data;};
const metrics=[['registered_users','Total registered users'],['developers','Developers'],['testers','Testers'],['players','Players'],['new_7_days','New registrations · 7 days'],['new_30_days','New registrations · 30 days']];
const zero=Object.fromEntries(metrics.map(([key])=>[key,0]));
let browser;
try{
 const users=[];
 for(let page=1;;page++){
  const batch=must(await service.auth.admin.listUsers({page,perPage:1000}),'Independent development account count').users;
  users.push(...batch.filter(user=>!user.is_anonymous&&!user.deleted_at));
  if(batch.length<1000)break;
 }
 const rolesById=new Map();
 for(let offset=0;offset<users.length;offset+=500){
  const rows=must(await service.from('profiles').select('id,roles').in('id',users.slice(offset,offset+500).map(user=>user.id)),'Independent profile-role counts');
  for(const row of rows)rolesById.set(row.id,row.roles||[]);
 }
 const now=Date.now();
 const expected={registered_users:new Set(users.map(user=>user.id)).size,developers:users.filter(u=>rolesById.get(u.id)?.includes('developer')).length,testers:users.filter(u=>rolesById.get(u.id)?.includes('tester')).length,players:users.filter(u=>rolesById.get(u.id)?.includes('player')).length,new_7_days:users.filter(u=>Date.parse(u.created_at)>=now-7*86400000&&Date.parse(u.created_at)<=now).length,new_30_days:users.filter(u=>Date.parse(u.created_at)>=now-30*86400000&&Date.parse(u.created_at)<=now).length};
 const visitorBefore=must(await service.rpc('m24_analytics_summary'),'Existing visitor reporting');
 browser=await chromium.launch({headless:true});
 async function contextFor(role){
  const context=await browser.newContext();
  if(role){
   const {user}=must(await service.auth.admin.getUserById(fixtures.users[role]),'Load existing synthetic account');
   assert(user.email.startsWith(`m24-${role}-`),'Only reuse the known synthetic test identities');
   const generated=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Generate test sign-in without sending mail');
   const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   const {session}=must(await client.auth.verifyOtp({token_hash:generated.properties.hashed_token,type:'magiclink'}),'Sign in synthetic account');
   const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),chunks=value.match(/.{1,3000}/g),name=`sb-${ref}-auth-token`;
   await context.addCookies(chunks.map((chunk,i)=>({name:chunks.length===1?name:`${name}.${i}`,value:chunk,url:origin,sameSite:'Lax'})));
  }
  return context;
 }
 for(const [role,status] of [[null,401],['other',403],['admin',200]]){
  const context=await contextFor(role);
  const response=await context.request.get(origin+'/api/admin/analytics/platform-users');
  assert.equal(response.status(),status);assert.match(response.headers()['cache-control'],/private, no-store/);
  const body=await response.json();
  if(status===200)assert.deepEqual(body,expected,'Live aggregate equals independently counted Auth accounts/profile roles');
  else assert(!('registered_users' in body),'Denied responses contain no metrics');
  await context.close();
 }
 console.log('PASS live platform API: real development counts match independent account/profile data; anonymous 401, ordinary user 403 and admin 200 with private no-store responses.');

 const context=await contextFor('admin'),page=await context.newPage();
 page.setDefaultTimeout(15000);
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const endpoint=origin+'/api/admin/analytics/platform-users';
 await page.route(endpoint,async route=>{await pending;await route.continue();});
 await page.goto(origin+'/admin/analytics');
 const section=page.getByRole('region',{name:'Platform users',exact:true});
 await expect(section.getByRole('status')).toHaveText('Loading platform users…');
 await expect(page.getByRole('heading',{name:'Daily trend · 30 days'})).toBeVisible();
 await expect(section.locator('dd')).toHaveText(metrics.map(()=>'—'));
 release();
 for(const [key,label] of metrics)await expect(section.locator('dt').filter({hasText:label}).locator('..').locator('dd')).toHaveText(expected[key].toLocaleString());
 await expect(page.locator('h2').first()).toHaveText('Platform users');
 for(const width of [320,390,853,1280]){
  await page.setViewportSize({width,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Analytics reflow at ${width}px`);
  for(const card of await section.locator('dl > div').all())assert(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Metric card text fits');
 }
 await page.evaluate(()=>document.documentElement.style.zoom='1.5');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Analytics reflow with simulated 150% zoom');
 for(const card of await section.locator('dl > div').all())assert(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'150% metric-card reflow');
 fs.mkdirSync('technical-test-results',{recursive:true});await section.screenshot({path:'technical-test-results/platform-users-150-percent.png'});
 await page.evaluate(()=>document.documentElement.style.zoom='');
 await page.unroute(endpoint);
 let fail=true;
 await page.route(endpoint,route=>fail?route.fulfill({status:503,json:{error:'Platform user metrics could not be loaded. Please retry.'}}):route.continue());
 await page.reload();await expect(section.getByRole('alert')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Submission conversions · last 30 days'})).toBeVisible();
 fail=false;await section.getByRole('button',{name:'Retry platform users'}).click();
 await expect(section.locator('dt').filter({hasText:'Total registered users'}).locator('..').locator('dd')).toHaveText(expected.registered_users.toLocaleString());
 await page.unroute(endpoint);
 await page.route(endpoint,route=>route.fulfill({json:zero}));
 await page.reload();await expect(section.getByText('No registered users yet.',{exact:true})).toBeVisible();
 await expect(section.locator('dd')).toHaveText(metrics.map(()=>'0'));
 await expect(page.getByRole('heading',{name:'Daily trend · 30 days'})).toBeVisible();
 await context.close();
 assert.deepEqual(must(await service.rpc('m24_analytics_summary'),'Verify visitor report preservation'),visitorBefore,'Account metrics must not change existing visitor/referral/submission reporting');
 console.log('PASS platform browser: live cards first, independent loading, mobile/desktop/150% CSS zoom reflow, isolated failure/retry and empty-state fixtures; existing visitor/attribution summary unchanged.');
}catch(error){console.error('FAIL platform acceptance:',String(error.message||'Unknown failure').slice(0,450));process.exitCode=1;}
finally{if(browser)await browser.close();}

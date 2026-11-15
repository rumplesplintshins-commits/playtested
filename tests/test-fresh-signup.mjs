// Local Auth + Mailpit only. Never inserts or upserts a profile.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect as baseExpect } from 'playwright/test';
const expect=baseExpect.configure({timeout:45000});
process.on('uncaughtException',e=>{fs.writeFileSync('/tmp/signup-failure-private.log',e.stack||e.message);console.error('Fresh signup test failed; private diagnostics retained.');process.exit(1);});
const backend=process.env.NEXT_PUBLIC_SUPABASE_URL;assert.equal(backend,'http://127.0.0.1:54321');
assert.ok(!fs.existsSync('/app/.env.local'));
assert.ok(fs.readFileSync('/proc/net/route','utf8').split('\n').slice(1).filter(Boolean).every(r=>r.trim().split(/\s+/)[1]!=='00000000'));
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client=()=>createClient(backend,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(backend,process.env.REHEARSAL_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checks=[];const pass=name=>{checks.push(name);console.log(`PASS: ${name}`);};
const settings=await(await fetch(`${backend}/auth/v1/settings`,{headers:{apikey:key}})).json();
assert.equal(settings.disable_signup,false);assert.equal(settings.mailer_autoconfirm,false);
const password=randomBytes(24).toString('base64url');
const email=`fresh-${Date.now()}@example.test`;
async function confirmationFor(address) {
 const deadline=Date.now()+15000;let message;
 while(Date.now()<deadline&&!message) {const list=await(await fetch('http://playtested-rehearsal-mail:8025/api/v1/messages')).json();message=list.messages?.find(m=>m.To?.some(t=>t.Address===address));if(!message)await new Promise(r=>setTimeout(r,100));}
 assert.ok(message,'Confirmation must be captured by isolated Mailpit');
 const mail=await(await fetch(`http://playtested-rehearsal-mail:8025/api/v1/message/${message.ID}`)).json();
 const url=[...(mail.HTML||'').matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&')).find(h=>h.includes('/auth/v1/verify'));
 assert.ok(url);assert.equal(new URL(url).origin,backend);return url;
}
if(process.argv[2]==='diagnose') {
 const c=client();const {data,error}=await c.auth.signUp({email,password,options:{data:{signup_roles:['tester']}}});assert.equal(error,null);assert.ok(data.user);assert.equal(data.session,null);
 const profile=await admin.from('profiles').select('id').eq('id',data.user.id);assert.equal(profile.error,null);
 fs.writeFileSync('/tmp/signup-before-supplement.json',JSON.stringify({at_utc:new Date().toISOString(),user_id:data.user.id,profile_count:profile.data.length,session_before_confirmation:!!data.session},null,2));
 if(profile.data.length!==0)throw Error('Unexpected pre-supplement profile; re-evaluate missing-trigger assumption');
 console.log('Confirmed restore gap: real fresh signup succeeds but creates zero profiles before managed-trigger recovery.');
} else {
 const browser=await chromium.launch({headless:true});
 let page;const authResponses=[];
 try {
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/auth/'))authResponses.push({path:u.pathname,status:r.status()});});
  await page.goto('http://localhost:3000/login?mode=signup&role=tester&next=/tester');
  await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/v1/signup'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  const response=await responsePromise;assert.equal(response.status(),200);const created=await response.json();const uid=created.user?.id||created.id;assert.ok(uid);
  await expect(page.getByRole('status')).toContainText('Check your email');
  const premature=await client().auth.signInWithPassword({email,password});assert.ok(premature.error);assert.equal(premature.error.code,'email_not_confirmed');
  pass('Real UI signup requires email confirmation and blocks premature login');
  let message;const deadline=Date.now()+15000;
  while(Date.now()<deadline&&!message) {
   const list=await(await fetch('http://playtested-rehearsal-mail:8025/api/v1/messages')).json();
   message=list.messages?.find(m=>m.To?.some(t=>t.Address===email));if(!message)await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(message,'Confirmation must be captured by isolated Mailpit');
  const mail=await(await fetch(`http://playtested-rehearsal-mail:8025/api/v1/message/${message.ID}`)).json();
  const hrefs=[...(mail.HTML||'').matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&'));
  const confirmation=hrefs.find(h=>h.includes('/auth/v1/verify'));assert.ok(confirmation);assert.equal(new URL(confirmation).origin,backend);
  await page.goto(confirmation,{waitUntil:'domcontentloaded',timeout:120000});
  fs.writeFileSync('/tmp/signup-callback-origin.json',JSON.stringify({actual_origin:new URL(page.url()).origin,expected_origin:'http://localhost:3000'},null,2));
  assert.equal(new URL(page.url()).origin,'http://localhost:3000','Callback origin must match the signup cookie origin');
  const visibility=await page.evaluate(async ({backend,key})=>{const raw=document.cookie.split('; ').find(x=>x.startsWith('sb-127-auth-token='))?.split('=').slice(1).join('=');if(!raw)return{session_cookie_visible:false};try{const value=decodeURIComponent(raw);const session=JSON.parse(atob(value.slice(7).replaceAll('-','+').replaceAll('_','/')));const r=await fetch(backend+'/auth/v1/user',{headers:{apikey:key,authorization:'Bearer '+session.access_token}});return{session_cookie_visible:true,user_status:r.status};}catch{return{session_cookie_visible:true,decode_failed:true};}},{backend,key});
  fs.writeFileSync('/tmp/signup-session-visibility.json',JSON.stringify({visibility,cookies:(await context.cookies()).map(c=>({name:c.name,path:c.path,domain:c.domain,httpOnly:c.httpOnly,secure:c.secure}))},null,2));
  await expect(page.getByRole('heading',{name:'Bronze tester'})).toBeVisible();
  pass('Confirmation captured locally completes PKCE callback and opens Tester Hub');
  const profile=await admin.from('profiles').select('id,role,roles,tester_xp,developer_xp').eq('id',uid).single();assert.equal(profile.error,null);
  assert.deepEqual(profile.data.roles,['tester']);assert.equal(profile.data.role,'user');assert.equal(profile.data.tester_xp,0);assert.equal(profile.data.developer_xp,0);
  const wallet=await admin.from('wallets').select('balance_pence').eq('user_id',uid).single();assert.equal(wallet.error,null);assert.equal(wallet.data.balance_pence,0);
  pass('Signup trigger automatically creates exactly one tester profile and zero-balance wallet');
  const signed=client();const login=await signed.auth.signInWithPassword({email,password});assert.equal(login.error,null);
  const progress=await signed.rpc('get_my_testing_progress');assert.equal(progress.error,null);assert.equal(progress.data.rank,0);
  const forbidden=await signed.rpc('get_quality_review_queue');assert.ok(forbidden.error);assert.match(forbidden.error.message,/Admin access required/i);
  pass('Fresh confirmed tester has own progress access and no admin access');
  for(const [label,roles,expected]of [['developer',['developer'],['developer']],['multiple',['player','tester','developer'],['developer','player','tester']],['invalid-admin',['admin','service_role'],['player']]]) {
   const caseEmail=`fresh-${label}-${Date.now()}@example.test`;
   const c=client();const result=await c.auth.signUp({email:caseEmail,password,options:{data:{signup_roles:roles,role:'admin'}}});assert.equal(result.error,null);assert.ok(result.data.user);
   const p=await admin.from('profiles').select('role,roles').eq('id',result.data.user.id).single();assert.equal(p.error,null);assert.equal(p.data.role,'user');assert.deepEqual([...p.data.roles].sort(),[...expected].sort());
   const pre=await c.rpc('get_my_testing_progress');assert.ok(pre.error);
   pass(`Automatic ${label} onboarding filters metadata and grants no unconfirmed API access`);
   const verified=await fetch(await confirmationFor(caseEmail),{redirect:'manual'});assert.equal(verified.status,303);
   const signedIn=await c.auth.signInWithPassword({email:caseEmail,password});assert.equal(signedIn.error,null);
   const own=await c.from('profiles').select('roles,role').eq('id',result.data.user.id).single();assert.equal(own.error,null);assert.equal(own.data.role,'user');
   const adminDenied=await c.rpc('get_quality_review_queue');assert.ok(adminDenied.error);assert.match(adminDenied.error.message,/Admin access required/i);
   if(label==='developer') {
    const submission=await c.from('game_submissions').insert({developer_id:result.data.user.id,title:'Fresh developer onboarding rehearsal',developer_name:'Fresh local developer',genre:'Action',description:'Synthetic isolated signup access check',game_link:'https://example.test/build',ai_type:'Unknown'}).select('id').single();assert.equal(submission.error,null);
   }
   if(label==='multiple') {const progress=await c.rpc('get_my_testing_progress');assert.equal(progress.error,null);assert.equal(progress.data.rank,0);}
   if(!expected.includes('tester')) {const claim=await c.rpc('claim_community_game_test',{p_submission_id:'f1000000-0000-4000-8000-000000000330'});assert.ok(claim.error);assert.match(claim.error.message,/Tester role/i);}
   pass(`Confirmed ${label} account receives intended role access without admin escalation`);
  }
 }catch(error){if(page){const u=new URL(page.url());const cookies=await page.context().cookies();let sessionShape;try{const raw=cookies.find(c=>c.name==='sb-127-auth-token')?.value;const decoded=JSON.parse(Buffer.from(raw.slice(7),'base64url').toString());sessionShape={keys:Object.keys(decoded),has_access_token:!!decoded.access_token,has_user:!!decoded.user,user_role:decoded.user?.role,expired:decoded.expires_at<Date.now()/1000};}catch{sessionShape={invalid:true};}fs.writeFileSync('/tmp/signup-page-state-private.json',JSON.stringify({path:u.pathname,error:u.searchParams.get('error'),authResponses,cookie_names:cookies.map(c=>c.name),sessionShape},null,2));}throw error;}
 finally {await browser.close();fs.writeFileSync('/tmp/fresh-signup-checks.json',JSON.stringify({at_utc:new Date().toISOString(),checks},null,2));}
}

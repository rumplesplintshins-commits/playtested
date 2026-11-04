import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect as baseExpect} from 'playwright/test';
const expect=baseExpect.configure({timeout:30000});
const ref='ktifgybnkdaotdxrvjgq',origin='http://localhost:3000';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,`${ref}.supabase.co`);
const f=JSON.parse(fs.readFileSync('technical-test-results/m24-final-acceptance.json','utf8'));
const prior=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
const opts={auth:{persistSession:false,autoRefreshToken:false}},clients={};
const must=(r,label)=>{assert(!r.error,`${label}: ${r.error?.message||'unknown'}`);return r.data;};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,opts);
const browser=await chromium.launch({headless:true});let tester;
async function contextFor(role){
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,opts);let session;
 if(f.accounts[role])({session}=must(await client.auth.signInWithPassword(f.accounts[role]),'Synthetic sign-in'));
 else {const {user}=must(await service.auth.admin.getUserById(prior.users[role]),'Synthetic identity');assert(user.email.startsWith(`m24-${role}-`));const link=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Sign-in without email');({session}=must(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'Verify sign-in'));}
 clients[role]=client;const context=await browser.newContext();
 const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),chunks=value.match(/.{1,3000}/g),name=`sb-${ref}-auth-token`;
 await context.addCookies(chunks.map((value,i)=>({name:chunks.length===1?name:`${name}.${i}`,value,url:origin,sameSite:'Lax'})));return context;
}
try{
 for(const role of ['developer1','admin']){
  const context=await contextFor(role),page=await context.newPage();await page.goto(origin+'/my-submissions');
  const plan=page.getByRole('region',{name:'Developer plan'});await expect(plan.getByText('Free plan: 1 launch per rolling 30 days')).toBeVisible();await expect(plan.getByRole('alert')).toHaveCount(0);
  const p=must(await clients[role].rpc('get_my_developer_plan'),'Live allowance');assert.equal(p.launch_limit,1);assert.equal(p.window_hours,720);assert.equal(p.can_assign,role==='admin');await context.close();
 }
 const dev=await contextFor('developer1'),page=await dev.newPage(),game=f.games[0];
 await page.goto(`${origin}/my-submissions?tab=submissions&game=${game.id}`);
 const contact=page.locator('section').filter({has:page.getByRole('heading',{name:'Private developer contact',exact:true})});
 const input=contact.getByRole('textbox',{name:'Email',exact:true});await expect(input).toBeVisible();
 for(const invalid of ['dev@example.cock','dev@yopmail.com','dev@sub.yopmail.com','bad@@example.com']){
  await input.fill(invalid);assert.equal(await input.evaluate(e=>e.checkValidity()),false);await contact.getByRole('button',{name:'Save contact preference'}).click();await expect(contact.getByText('Private contact details and preference saved.')).toHaveCount(0);
  const result=await clients.developer1.from('game_submission_contacts').upsert({submission_id:game.id,developer_id:f.accounts.developer1.id,contact_email:invalid,contact_allowed:false});assert.equal(result.error?.code,'23514');
 }
 for(const valid of ['dev@example.games','dev@example.studio','dev@example.gg','dev@example.co.uk','dev@example.de','']){
  await input.fill(valid);await contact.getByRole('button',{name:'Save contact preference'}).click();await expect(contact.getByText('Private contact details and preference saved.')).toBeVisible();
  const saved=must(await clients.developer1.from('game_submission_contacts').select('contact_email').eq('submission_id',game.id).single(),'Stored contact');assert.equal(saved.contact_email,valid||null);
 }
 await page.goto(origin+'/submit');await expect(page.getByText('Supporting evidence link (optional)',{exact:true})).toHaveCount(0);await expect(page.locator('[name="evidenceLink"]')).toHaveCount(0);
 await page.goto(`${origin}/submit?edit=${game.id}`);await expect(page.locator('[name="evidence_link"]')).toHaveCount(0);await dev.close();
 console.log('PASS live allowance and contacts: normal developer/admin plans, UI errors without success, direct-write policy rejection, legitimate suffixes and optional clearing; evidence absent from submission/edit forms.');

 const tc=await contextFor('automationTester');tester=clients.automationTester;const tp=await tc.newPage();tp.on('dialog',dialog=>dialog.accept());
 await tp.goto(origin+'/tester');await expect(tp.getByRole('heading',{name:'Available to test',exact:true})).toBeVisible();await tp.getByLabel('Testing genre',{exact:false}).selectOption('all');
 const [first,second]=f.games,firstCard=tp.locator('details').filter({has:tp.locator('summary').filter({hasText:first.title})}).first();
 await expect(firstCard).toBeVisible();await firstCard.locator(':scope > summary').click();await expect(firstCard).not.toHaveAttribute('open','');await firstCard.locator(':scope > summary').click();await expect(firstCard).toHaveAttribute('open','');
 await firstCard.scrollIntoViewIfNeeded();const before=await tp.evaluate(()=>scrollY);
 await firstCard.getByRole('link',{name:`View ${first.title} game details`}).click();await tp.waitForURL(/\/submissions\//);await expect(tp.getByRole('heading',{name:first.title,exact:true})).toBeVisible();
 await tp.goBack();await expect(firstCard).toBeVisible();await expect(firstCard).toHaveAttribute('open','');await expect.poll(()=>tp.evaluate(()=>scrollY)).toBeGreaterThanOrEqual(Math.max(0,before-120));
 await firstCard.getByRole('button',{name:'Test game',exact:true}).click();
 await expect(tp.getByRole('button',{name:'Start testing',exact:true})).toBeVisible();
 const denied=await tester.rpc('claim_community_game_test',{p_submission_id:second.campaignId});assert(denied.error&&/one test|current|active/i.test(denied.error.message),'Concurrent claim must fail');
 await tp.getByRole('button',{name:'Release game',exact:true}).click();await expect(firstCard.getByRole('button',{name:'Test game',exact:true})).toBeVisible();
 const secondCard=tp.locator('details').filter({has:tp.locator('summary').filter({hasText:second.title})}).first();
 const previousReport=must(await tester.from('community_game_tests').select('id,status').eq('tester_id',f.accounts.automationTester.id).eq('playtest_id',second.campaignId).in('status',['submitted','reviewed']),'Check retained report');
 if(!previousReport.length){
 await secondCard.getByRole('button',{name:'Test game',exact:true}).click();await tp.getByRole('button',{name:'Start testing',exact:true}).click();
 await tp.getByRole('button',{name:'Finish feedback',exact:true}).click();
 const selects=tp.locator('form select');await expect(selects).toHaveCount(5);
 for(const [i,value] of ['8','probably','probably','8','8'].entries()){const options=await selects.nth(i).locator('option').evaluateAll(items=>items.map(o=>o.value).filter(Boolean));await selects.nth(i).selectOption(options.includes(value)?value:options[0]);}
 await tp.locator('form input[type="number"]').fill('0');
 const texts=tp.locator('form textarea');for(let i=0;i<await texts.count();i++)await texts.nth(i).fill(['Collecting the three lights made the route goal clear.','The central thicket blocked my first route; the arrows remained responsive.','No crashes occurred in this short synthetic QA run.','Show a small blocked-path hint when walking into the thicket.','Synthetic development acceptance feedback; no commercial endorsement.'][i]||'Controls responded consistently during this short synthetic demo.');
 await tp.getByRole('button',{name:'Submit review',exact:true}).click();await expect(tp.getByRole('button',{name:'Submit review',exact:true})).toHaveCount(0);
 const reports=must(await tester.from('community_game_tests').select('status,playtest_id').eq('tester_id',f.accounts.automationTester.id).eq('playtest_id',second.campaignId),'Verify submitted report');assert(reports.some(r=>r.status==='submitted'));
 console.log('PASS new live feedback submission on the second game.');
 }else console.log('PASS retained synthetic report verified; this repeat run preserves submitted feedback rather than recycling participation.');
 await tc.close();console.log('PASS real Tester Hub: discovery, collapse/expand, details/return position, claim, concurrent denial and release. Manual tester remains unused.');
}catch(error){console.error('FAIL final acceptance:',String(error.message).slice(0,1000));process.exitCode=1;for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:'technical-test-results/final-acceptance-failure.png',fullPage:true}).catch(()=>{});}
finally{if(tester)for(const game of f.games)await tester.rpc('release_community_game_test',{p_submission_id:game.campaignId});await browser.close();}

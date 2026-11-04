// Development-only integration/browser checks against retained synthetic QA accounts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect as baseExpect} from 'playwright/test';
const expect=baseExpect.configure({timeout:30000}),ref='ktifgybnkdaotdxrvjgq',origin='http://localhost:3000';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,`${ref}.supabase.co`);
const fixtures=JSON.parse(fs.readFileSync('technical-test-results/m24-final-acceptance.json','utf8'));
const prior=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
const opts={auth:{persistSession:false,autoRefreshToken:false}},clients={},contexts={};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,opts);
const must=(result,label)=>{assert(!result.error,`${label}: ${result.error?.message}`);return result.data;};
const browser=await chromium.launch({headless:true}),game=fixtures.games[0],errors=[];
let disposable,original;
const temporaryEvents=[];
async function contextFor(role){
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,opts);let session;
 if(fixtures.accounts[role])({session}=must(await client.auth.signInWithPassword(fixtures.accounts[role]),'Synthetic login'));
 else{const {user}=must(await service.auth.admin.getUserById(prior.users[role]),'Synthetic identity');assert(user.email.startsWith(`m24-${role}-`));const link=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Local sign-in token');({session}=must(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'Synthetic verification'));}
 clients[role]=client;const context=await browser.newContext({userAgent:'Mozilla/5.0 Merge26DevelopmentAcceptance',viewport:{width:1280,height:850}});
 const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),chunks=value.match(/.{1,3000}/g),name=`sb-${ref}-auth-token`;
 await context.addCookies(chunks.map((value,i)=>({name:chunks.length===1?name:`${name}.${i}`,value,url:origin,sameSite:'Lax'})));contexts[role]=context;return context;
}
const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,opts);
async function listed(){return must(await anon.from('approved_games').select('id').eq('id',game.id),'Anonymous approved view').length===1;}
async function controls(client,action,confirmation=''){return must(await client.rpc('set_listing_control',{p_kind:'submission',p_id:game.id,p_action:action,p_confirmation:confirmation}),'Listing mutation');}
async function noOverflow(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal page overflow');}
try{
 const developer=await contextFor('developer1'),other=await contextFor('developer2'),admin=await contextFor('admin');
 original=must(await clients.admin.rpc('get_listing_controls',{p_kind:'submission',p_id:game.id}),'Original controls');
 assert(!original.archived&&!original.is_admin_test,'QA game must start public; refusing to overwrite existing controls');
 assert(await listed());
 assert.equal((await (await browser.newContext()).request.get(origin+'/api/admin/analytics')).status(),401);
 assert.equal((await other.request.get(origin+'/api/admin/analytics')).status(),403);
 const report=await admin.request.get(origin+'/api/admin/analytics');assert.equal(report.status(),200);const before=await report.json();
 const page=await admin.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${origin}/admin/submissions?submission=${game.id}`);
 await expect(page.getByRole('button',{name:'Analytics & acquisition',exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Analytics & acquisition',exact:false}).click();
 await expect(page.getByText('Tab sessions',{exact:true})).toBeVisible();
 const flag=page.getByRole('checkbox',{name:'Admin Test / Demo'});await expect(flag).toBeVisible();
 await flag.click();await expect.poll(async()=>must(await clients.admin.rpc('get_listing_controls',{p_kind:'submission',p_id:game.id}),'Test designation').is_admin_test).toBe(true);
 assert.equal(await listed(),false);
 const testReport=await (await admin.request.get(origin+'/api/admin/analytics')).json();assert.equal(testReport.submission_totals.submissions,before.submission_totals.submissions-1);
 assert(must(await clients.developer1.from('game_submissions').select('id').eq('id',game.id),'Private owner record').length===1);
 assert.equal(must(await clients.developer1.rpc('_listing_base',{p_kind:'approved',p_id:game.id}),'Private approved alias').title,game.title);
 assert((await clients.developer2.rpc('_listing_base',{p_kind:'approved',p_id:game.id})).error,'Hidden private listing is not available to an unrelated caller');
 assert.equal(must(await clients.developer1.rpc('m26_my_approved_games',{p_ids:[game.id]}),'Private approved details').length,1);
 assert((await clients.developer2.rpc('set_listing_control',{p_kind:'submission',p_id:game.id,p_action:'archive',p_confirmation:game.title})).error);
 assert((await clients.developer1.rpc('set_listing_control',{p_kind:'submission',p_id:game.id,p_action:'clear_test',p_confirmation:''})).error);
 const tester=await contextFor('automationTester');const discovery=must(await clients.automationTester.rpc('get_discoverable_community_test_games'),'Ordinary tester discovery');assert(!discovery.some(r=>r.submission_id===game.campaignId));
 const shots=must(await service.from('game_screenshots').select('slot').eq('submission_id',game.id),'QA media');
 if(shots.length){const publicRequest=await browser.newContext();assert.equal((await publicRequest.request.get(`${origin}/api/game-media/${game.id}/${shots[0].slot}`)).status(),404);await publicRequest.close();}
 await expect(flag).toBeChecked();await flag.click();await expect.poll(listed).toBe(true);
 await page.evaluate(()=>document.body.style.zoom='1.5');await noOverflow(page);await page.evaluate(()=>document.body.style.zoom='1');await page.setViewportSize({width:390,height:844});await noOverflow(page);
 await page.goto(origin+'/admin/analytics');await expect(page.getByRole('heading',{name:'Submission acquisition',exact:false})).toBeVisible();await noOverflow(page);
 await page.evaluate(()=>document.body.style.zoom='1.5');await noOverflow(page);
 const ownerPage=await developer.newPage();ownerPage.on('pageerror',e=>errors.push(e.message));
 await ownerPage.goto(`${origin}/my-submissions?tab=games&game=collapsed-old-relationship&campaign=${game.campaignId}`);
 const results=ownerPage.locator('[data-workspace-item]:visible [data-build-feedback]');await expect(results).toBeVisible();
 await expect(ownerPage.locator('[data-workspace-item]:visible').getByText(game.title,{exact:true}).first()).toBeVisible();
 await ownerPage.goto(`${origin}/my-submissions?tab=submissions&game=${game.id}`);
 const panel=ownerPage.locator(`[data-workspace-item="${game.id}"]`),visibility=panel.getByRole('region',{name:'Listing visibility'});
 await expect(visibility.getByRole('button',{name:'Archive / unpublish'})).toBeVisible();
 await visibility.getByRole('button',{name:'Archive / unpublish'}).click();await visibility.getByRole('textbox').fill(game.title);await visibility.getByRole('button',{name:'Confirm archive'}).click();
 await expect.poll(listed).toBe(false);await expect(visibility.getByRole('button',{name:'Restore listing'})).toBeVisible();
 const archivedReport=await (await admin.request.get(origin+'/api/admin/analytics')).json();assert.deepEqual(archivedReport.submission_totals,before.submission_totals,'Archive preserves genuine historical acquisition');
 const feedback=await clients.developer1.rpc('get_developer_accepted_playtest_feedback',{p_playtest_id:game.campaignId});assert(!feedback.error,'Private historical build feedback remains accessible');
 await visibility.getByRole('button',{name:'Restore listing'}).click();await expect.poll(listed).toBe(true);
 const contact=panel.locator('section').filter({has:ownerPage.getByRole('heading',{name:'Private developer contact',exact:true})});
 const save=contact.getByRole('button',{name:'Save contact preference'});await expect(save).toBeVisible();await save.click();
 await expect(ownerPage.getByRole('status').filter({hasText:'Contact details saved.'})).toBeVisible();await expect.poll(()=>ownerPage.evaluate(()=>scrollY)).toBeLessThan(80);
 await expect(ownerPage.getByRole('status').filter({hasText:'Contact details saved.'})).toHaveCount(0);
 await ownerPage.route('**/rest/v1/game_submission_contacts*',route=>route.request().method()==='POST'?route.fulfill({status:503,json:{message:'Synthetic save failure'}}):route.continue());
 await save.scrollIntoViewIfNeeded();const position=await ownerPage.evaluate(()=>scrollY);await save.click();await expect(contact.getByText('Could not save your contact details.',{exact:false})).toBeVisible();assert(Math.abs(await ownerPage.evaluate(()=>scrollY)-position)<250,'Failed save does not scroll away');await expect(ownerPage.getByRole('status').filter({hasText:'Contact details saved.'})).toHaveCount(0);await ownerPage.unroute('**/rest/v1/game_submission_contacts*');
 await ownerPage.setViewportSize({width:390,height:844});await noOverflow(ownerPage);await ownerPage.emulateMedia({reducedMotion:'reduce'});await save.click();await expect.poll(()=>ownerPage.evaluate(()=>scrollY)).toBe(0);
 // A fresh owner-created unreviewed record is the only hard-delete exercised here.
 const base=must(await clients.developer1.from('game_submissions').select('*').eq('id',game.id).single(),'Synthetic template');
 const payload=Object.fromEntries(['developer_id','developer_name','genre','description','game_link','image_url','price','ai_type','ai_areas','ai_explanation','release_status','release_date'].map(key=>[key,base[key]]));payload.title='[DEV QA] Merge 26 disposable '+Date.now();payload.game_link='https://example.test/merge26';
 disposable=must(await clients.developer1.from('game_submissions').insert(payload).select('id,title,status').single(),'Create isolated disposable submission');
 await ownerPage.goto(`${origin}/my-submissions?tab=submissions&game=${disposable.id}`);
 const deletion=ownerPage.locator(`[data-workspace-item="${disposable.id}"]`).getByRole('region',{name:'Listing visibility'});
 await deletion.getByRole('button',{name:'Delete unapproved submission'}).click();await deletion.getByRole('textbox').fill(disposable.title);await deletion.getByRole('button',{name:'Confirm delete'}).click();
 await expect.poll(async()=>must(await clients.developer1.from('game_submissions').select('id').eq('id',disposable.id),'Deleted state').length).toBe(0);disposable=null;
 // Real consent-to-storage-to-report pipeline, with exact synthetic-event cleanup.
 const consent=await browser.newContext({userAgent:'Mozilla/5.0 Merge26DevelopmentAcceptance'}),visitor=await consent.newPage();let posts=0;
 visitor.on('request',r=>{if(new URL(r.url()).pathname==='/api/analytics'&&r.method()==='POST')posts++;});
 await visitor.goto(origin+'/?utm_source=reddit&utm_medium=outreach&utm_campaign=merge26_pipeline');
 await visitor.getByText('Privacy & optional analytics',{exact:true}).click();await expect(visitor.getByText('Current choice: Off.',{exact:false})).toBeVisible();assert.equal(posts,0);
 const recording=visitor.waitForResponse(r=>new URL(r.url()).pathname==='/api/analytics'&&r.request().method()==='POST');
 await visitor.getByRole('button',{name:'Allow optional analytics'}).click();const recorded=await recording;assert.equal(recorded.status(),204);
 const event=recorded.request().postDataJSON();temporaryEvents.push(event.event_id);
 const stored=must(await service.from('m24_page_views').select('event_id,source,medium,campaign').eq('event_id',event.event_id).single(),'Consenting event storage');assert.equal(stored.campaign,'merge26_pipeline');assert.equal(stored.source,'reddit');
 const measured=await (await admin.request.get(origin+'/api/admin/analytics')).json();assert(measured.sources.some(s=>s.campaign==='merge26_pipeline'&&s.views>=1));
 await visitor.getByRole('button',{name:'Reject optional analytics'}).click();assert.equal(posts,1);await consent.close();
 const adminEvent={consent:true,event_id:crypto.randomUUID(),visitor_id:crypto.randomUUID(),page:'/'};temporaryEvents.push(adminEvent.event_id);
 assert.equal((await admin.request.post(origin+'/api/analytics',{headers:{origin},data:adminEvent})).status(),204);
 assert.equal(must(await service.from('m24_page_views').select('event_id').eq('event_id',adminEvent.event_id),'Internal traffic omission').length,0);
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('PASS Merge 26 development browser/integration: admin/ordinary/anonymous analytics access; explicit demo visibility, acquisition and tester exclusion; owner archive/restore and historical feedback; save toast, failure/no scroll and reduced motion; fresh own submission deletion; mobile and simulated 150% layouts; no browser runtime errors.');
}finally{
 if(original&&clients.admin){await controls(clients.admin,original.is_admin_test?'mark_test':'clear_test');await controls(clients.admin,original.archived?'archive':'restore',game.title);}
 if(disposable&&clients.developer1)await clients.developer1.rpc('set_listing_control',{p_kind:'submission',p_id:disposable.id,p_action:'delete',p_confirmation:disposable.title});
 if(temporaryEvents.length)must(await service.from('m24_page_views').delete().in('event_id',temporaryEvents),'Synthetic analytics cleanup');
 await browser.close();
}

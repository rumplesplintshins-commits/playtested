// Explicit opt-in: creates synthetic users and one submission in DEVELOPMENT only.
// Fixtures are retained for manual acceptance; no existing records are changed/deleted.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from 'playwright/test';

assert(process.argv.includes('--create-fixtures'),'Pass --create-fixtures to authorise development fixtures.');
const ref='ktifgybnkdaotdxrvjgq';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname,`${ref}.supabase.co`,'Development project required.');
const origin='http://localhost:3000';
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const run=Date.now();
const fixtures=process.argv.includes('--reuse-fixtures')?JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8')):{run,users:{},submission:null};
const must=(result,label)=>{assert(!result.error,`${label} failed (${result.error?.code||result.error?.status||'unknown'})`);return result.data;};
const clients={},sessions={};
let browser;
try{
 for(const role of ['owner','other','admin']){
  if(fixtures.users[role]){
   const {user}=must(await service.auth.admin.getUserById(fixtures.users[role]),'Load synthetic fixture');
   const generated=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Generate local test sign-in');
   const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   const {session}=must(await client.auth.verifyOtp({token_hash:generated.properties.hashed_token,type:'magiclink'}),'Verify local test sign-in');
   clients[role]=client;sessions[role]=session;continue;
  }
  const email=`m24-${role}-${run}@example.test`,password=crypto.randomBytes(24).toString('base64url');
  const {user}=must(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{signup_roles:role==='owner'?['developer','player']:['player'],age_18_confirmed:true,age_18_confirmed_at:new Date().toISOString()}}),'Create synthetic account');
  fixtures.users[role]=user.id;
  must(await service.from('profiles').update({role:role==='admin'?'admin':'user',roles:role==='owner'?['developer','player']:['player']}).eq('id',user.id),'Configure synthetic role');
  const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {session}=must(await client.auth.signInWithPassword({email,password}),'Synthetic sign-in');
  clients[role]=client;sessions[role]=session;
 }
 const id=fixtures.submission||crypto.randomUUID();
 if(!fixtures.submission)must(await clients.owner.from('game_submissions').insert({id,developer_id:fixtures.users.owner,title:`Merge 24 QA ${run}`,developer_name:'Synthetic QA Studio',genre:'Other',description:'Synthetic development-only acceptance fixture.',game_link:'https://example.test/game',image_url:'https://example.test/cover.png',release_status:'Not announced',ai_type:'No AI used',status:'Pending Review'}),'Create synthetic submission');
 fixtures.submission=id;
 must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:'Pending Review',p_review_reason:null}),'Reset synthetic review state');
 const contact={submission_id:id,developer_id:fixtures.users.owner,contact_email:'synthetic@example.test',contact_discord:'synthetic_qa',contact_reddit:'u/synthetic_qa',contact_allowed:true};
 must(await clients.owner.from('game_submission_contacts').upsert(contact),'Save all contact methods');
 const stored=must(await clients.owner.from('game_submission_contacts').select('contact_email,contact_discord,contact_reddit,contact_allowed').eq('submission_id',id).single(),'Read owner contact');
 for(const key of Object.keys(stored))assert.equal(stored[key],contact[key]);
 must(await clients.owner.from('game_submission_contacts').update({contact_allowed:false}).eq('submission_id',id),'Withdraw consent');
 assert.equal(must(await clients.other.from('game_submission_contacts').select('*').eq('submission_id',id),'Other-user read').length,0);
 assert.equal(must(await clients.other.from('game_submission_contacts').update({contact_allowed:true}).eq('submission_id',id).select(),'Other-user update').length,0);
 assert((await clients.other.from('game_submission_contacts').upsert({...contact,developer_id:fixtures.users.other})).error,'Owner spoof must fail');
 const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 assert((await anon.from('game_submission_contacts').select('*')).error,'Anonymous contacts must be denied');
 await clients.other.from('profiles').update({role:'admin'}).eq('id',fixtures.users.other);
 assert.equal(must(await service.from('profiles').select('role').eq('id',fixtures.users.other).single(),'Verify profile role protection').role,'user','Ordinary users cannot promote themselves');
 assert((await clients.other.rpc('m24_analytics_summary')).error,'Analytics RPC must deny regular users');
 assert((await anon.from('m24_page_views').select('*')).error,'Anonymous raw analytics must be denied');
 must(await clients.owner.rpc('record_submission_acquisition',{p_id:id,p_source:'reddit',p_campaign:'m24_qa',p_self_reported:'Reddit outreach'}),'Record acquisition');
 assert((await clients.other.rpc('record_submission_acquisition',{p_id:id,p_source:'fake'})).error,'Acquisition owner spoof must fail');
 must(await clients.owner.from('gameplay_footage').upsert({submission_id:id,video_url:'https://www.youtube.com/watch?v=abcdefghijk'}),'Save gameplay');
 assert.equal(must(await anon.from('gameplay_footage').select('*').eq('submission_id',id),'Pending gameplay privacy').length,0);
 const view=must(await anon.from('approved_games').select('*').eq('id',id),'Pending catalogue privacy');assert.equal(view.length,0);
 const config=must(await service.storage.getBucket('game-thumbnails'),'Thumbnail bucket');assert.equal(Number(config.file_size_limit),5242880);assert.deepEqual([...config.allowed_mime_types].sort(),['image/jpeg','image/png','image/webp'].sort());
 assert((await clients.owner.storage.from('game-thumbnails').upload(`${fixtures.users.owner}/${crypto.randomUUID()}.svg`,Buffer.from('<svg/>'),{contentType:'image/svg+xml'})).error,'Server rejects SVG thumbnail uploads');
 assert((await clients.other.storage.from('game-thumbnails').upload(`${fixtures.users.owner}/${crypto.randomUUID()}.png`,Buffer.from('not an image'),{contentType:'image/png'})).error,'Other users cannot upload into the owner folder');
 console.log('PASS development: real owner/other/anonymous contact RLS, all field values, withdrawal, spoof rejection, private analytics, acquisition ownership, pending-video visibility and bucket limits.');

 browser=await chromium.launch({headless:true});
 const cookieName=`sb-${ref}-auth-token`;
 async function contextFor(role){
  const context=await browser.newContext();
  if(role){const value='base64-'+Buffer.from(JSON.stringify(sessions[role])).toString('base64url');const chunks=value.match(/.{1,3000}/g);await context.addCookies(chunks.map((chunk,index)=>({name:chunks.length===1?cookieName:`${cookieName}.${index}`,value:chunk,url:origin,sameSite:'Lax'})));}
  return context;
 }
 for(const [role,status] of [[null,401],['owner',403],['other',403],['admin',200]]){
  const context=await contextFor(role);
  const res=await context.request.get(`${origin}/api/admin/submission-contact?id=${id}`);assert.equal(res.status(),status,`${role||'anon'} admin contact status`);
  if(role==='admin'){const body=await res.json();assert.equal(body.contact.contact_allowed,false);assert.equal(body.contact.contact_email,contact.contact_email);assert.match(res.headers()['cache-control'],/no-store/);}
  const analytics=await context.request.get(`${origin}/api/admin/analytics`);assert.equal(analytics.status(),status,`${role||'anon'} analytics status`);
  await context.close();
 }
 console.log('PASS development HTTP: admin contact and analytics routes return 401/403/200 for anonymous, owner, other user and admin.');
 const httpContext=await contextFor(null),eventId=crypto.randomUUID();
 const event={consent:true,event_id:eventId,visitor_id:crypto.randomUUID(),page:'/',source:'reddit',campaign:'m24_qa'};
 const eventHeaders={origin,'user-agent':'M24 Development Acceptance'};
 for(let i=0;i<2;i++)assert.equal((await httpContext.request.post(origin+'/api/analytics',{headers:eventHeaders,data:event})).status(),204);
 assert.equal(must(await service.from('m24_page_views').select('event_id').eq('event_id',eventId),'Count unique event').length,1,'Retried page view is idempotent');
 assert.equal((await httpContext.request.post(origin+'/api/analytics',{headers:{...eventHeaders,origin:'https://invalid.example.test'},data:event})).status(),403);
 assert.equal((await httpContext.request.post(origin+'/api/analytics',{headers:eventHeaders,data:{...event,page:'/account/private'}})).status(),400);
 assert.equal((await httpContext.request.post(origin+'/api/analytics',{headers:eventHeaders,data:{...event,consent:false}})).status(),400);
 await httpContext.close();console.log('PASS analytics ingestion: live event storage, retry deduplication, cross-origin rejection, private-path rejection and consent requirement.');
 const ownerContext=await contextFor('owner'),page=await ownerContext.newPage();
 await page.goto(`${origin}/my-submissions?tab=submissions&game=${id}`);
 const ownerPanel=page.locator(`[data-workspace-item="${id}"]`);
 await expect(ownerPanel.getByRole('heading',{name:'Private developer contact',exact:true})).toBeVisible({timeout:30000});
 await expect(ownerPanel.getByLabel('Email',{exact:true})).toHaveValue(contact.contact_email,{timeout:30000});
 // Both contact entry points share the same syntax and non-blocking guidance.
 const emailCases=[['a..b@example.test',false],['a@example..test',false],['a@-example.test',false],['test@yopmail.coma',true],['test@yopmail.com',true],['test@newbrand.unfamiliartld',true],['',true]];
 const submissionPage=await ownerContext.newPage();await submissionPage.goto(origin+'/submit');
 for(const input of [ownerPanel.getByLabel('Email',{exact:true}),submissionPage.getByRole('textbox',{name:'Contact email',exact:true})]){
  for(const [value,valid] of emailCases){await input.fill(value);assert.equal(await input.evaluate(el=>el.checkValidity()),valid,'Shared email input validity');}
 }
 await submissionPage.getByRole('textbox',{name:'Contact email',exact:true}).fill('test@yopmail.coma');
 await expect(submissionPage.getByText(/Check the domain spelling:/)).toBeVisible();
 for(const value of ['test@yopmail.coma','test@yopmail.com','test@newbrand.unfamiliartld','']){
  await ownerPanel.getByLabel('Email',{exact:true}).fill(value);
  if(value==='test@yopmail.coma')await expect(ownerPanel.getByText(/Check the domain spelling:/)).toBeVisible();
  if(value==='test@yopmail.com')await expect(ownerPanel.getByText(/This looks like a disposable email provider/)).toBeVisible();
  await ownerPanel.getByRole('button',{name:'Save contact preference'}).click();
  await expect.poll(async()=>must(await clients.owner.from('game_submission_contacts').select('contact_email').eq('submission_id',id).single(),'Verify optional email save').contact_email).toBe(value||null);
 }
 await ownerPanel.getByLabel('Email',{exact:true}).fill(contact.contact_email);
 await ownerPanel.getByRole('button',{name:'Save contact preference'}).click();
 await expect.poll(async()=>must(await clients.owner.from('game_submission_contacts').select('contact_email').eq('submission_id',id).single(),'Restore synthetic email').contact_email).toBe(contact.contact_email);
 await submissionPage.close();
 console.log('PASS email acceptance: submission/editor syntax parity, malformed rejection, typo/disposable warnings without blocking saves, unfamiliar domains and optional blank email.');
 const consent=ownerPanel.getByRole('checkbox',{name:/happy for Playtested to contact/});await expect(consent).not.toBeChecked();
 await ownerPanel.getByLabel('Discord username',{exact:true}).fill('updated_synthetic');await consent.check();await ownerPanel.getByRole('button',{name:'Save contact preference'}).click();await expect(ownerPanel.getByRole('status').filter({hasText:'Private contact details and preference saved.'})).toBeVisible();
 await consent.uncheck();await ownerPanel.getByRole('button',{name:'Save contact preference'}).click();
 await expect.poll(async()=>must(await clients.owner.from('game_submission_contacts').select('contact_allowed').eq('submission_id',id).single(),'Verify UI withdrawal').contact_allowed).toBe(false);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Owner contact reflow ${width}`);}
 await ownerPanel.getByLabel('Email',{exact:true}).focus();await page.keyboard.press('Tab');await expect(ownerPanel.getByLabel('Discord username',{exact:true})).toBeFocused();
 await page.evaluate(()=>document.documentElement.style.zoom='1.5');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Owner contact reflow with 150% CSS zoom');await page.evaluate(()=>document.documentElement.style.zoom='');
 await ownerContext.close();
 console.log('PASS browser: actual owner contact values, editing, consent withdrawal and 320/390/1280px reflow.');

 if(!fixtures.formSubmission){
  const formContext=await contextFor('owner'),formPage=await formContext.newPage();
  await formPage.goto(origin+'/submit');
  const formTitle=`Saffron QA ${fixtures.run}`;
  await formPage.locator('[name="title"]').fill(formTitle);
  await formPage.locator('[name="developer"]').fill(`Saffron Studio ${fixtures.run}`);
  await formPage.locator('[name="genre"]').selectOption('Other');
  await formPage.locator('[name="releaseStatus"]').selectOption('Not announced');
  await formPage.locator('textarea[name="description"]').fill('Synthetic development-only form submission: test movement, exploration and controls.');
  await formPage.locator('[name="aiType"]').selectOption('No AI used');
  await formPage.locator('[name="gameplayVideo"]').fill('https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/view?usp=sharing');
  await formPage.locator('[name="contactEmail"]').fill('form-synthetic@example.test');
  await formPage.locator('[name="contactDiscord"]').fill('form_synthetic');
  await formPage.locator('[name="contactReddit"]').fill('u/form_synthetic');
  await expect(formPage.locator('[name="contactAllowed"]')).not.toBeChecked();
  await formPage.locator('[name="discoverySource"]').selectOption('Reddit outreach');
  await formPage.locator('[name="evidenceLink"]').fill('https://example.test/process');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII=','base64');
  await formPage.locator('input[type=file][accept="image/jpeg,image/png,image/webp"]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
  await expect(formPage.locator('[name="imageUrl"]')).toHaveValue(/game-thumbnails/,{timeout:30000});
  await formPage.getByRole('button',{name:'Submit application',exact:true}).click();
  await expect.poll(async()=>{const result=await service.from('game_submissions').select('id').eq('developer_id',fixtures.users.owner).eq('title',formTitle).maybeSingle();return result.data?.id||null;},{timeout:30000}).not.toBeNull();
  const saved=must(await service.from('game_submissions').select('id,evidence_link,status').eq('developer_id',fixtures.users.owner).eq('title',formTitle).single(),'Verify real form submission');fixtures.formSubmission=saved.id;
  assert.equal(saved.evidence_link,'https://example.test/process');assert.equal(saved.status,'Pending Review');
  await expect.poll(async()=>{const result=await service.from('game_submission_contacts').select('contact_email').eq('submission_id',saved.id).maybeSingle();return result.data?.contact_email;}).toBe('form-synthetic@example.test');
  const savedContact=must(await service.from('game_submission_contacts').select('contact_discord,contact_reddit,contact_allowed').eq('submission_id',saved.id).single(),'Verify form preferences');assert.deepEqual(savedContact,{contact_discord:'form_synthetic',contact_reddit:'u/form_synthetic',contact_allowed:false});
  assert.equal(must(await service.from('gameplay_footage').select('video_url').eq('submission_id',saved.id).single(),'Verify Drive video').video_url,'https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/view');
  assert.equal(must(await service.from('m24_submission_acquisition').select('self_reported,source').eq('submission_id',saved.id).single(),'Verify voluntary acquisition').self_reported,'Reddit outreach');
  await formContext.close();console.log('PASS browser/development: full form submission, direct PNG upload, Drive link canonicalisation, optional evidence, three contact methods, default no consent and self-reported source.');
 }

 const adminContext=await contextFor('admin'),adminPage=await adminContext.newPage();
 await adminPage.goto(origin+'/admin/submissions');
 await adminPage.getByLabel('Search submissions',{exact:true}).fill(`Merge 24 QA ${fixtures.run}`);
 await adminPage.getByRole('button').filter({hasText:`Merge 24 QA ${fixtures.run}`}).first().click();
 await expect(adminPage.getByText('Contact consent not given or withdrawn.',{exact:false})).toBeVisible({timeout:30000});
 await expect(adminPage.getByText('Discord: updated_synthetic',{exact:true})).toBeVisible();
 await expect(adminPage.locator('iframe[src*="youtube"]')).toHaveCount(0);
 await adminPage.route('https://www.youtube-nocookie.com/**',route=>route.abort());
 await adminPage.getByRole('button',{name:'Load YouTube player'}).click();
 await expect(adminPage.locator('iframe[title="YouTube gameplay footage"]')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/abcdefghijk');
 await adminPage.getByRole('button',{name:'Close player'}).click();
 for(const width of [390,1280]){await adminPage.setViewportSize({width,height:900});assert(await adminPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Admin reflow ${width}`);}
 await adminPage.goto(origin+'/admin/analytics');await expect(adminPage.getByRole('heading',{name:'Submission conversions · last 30 days'})).toBeVisible();
 await adminContext.close();
 console.log('PASS browser: live admin contact methods/withdrawal, click-to-load safe player, dashboard and mobile reflow.');

 must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:'Approved',p_review_reason:null}),'Approve synthetic listing');
 const publicListing=must(await anon.from('approved_games').select('*').eq('id',id).single(),'Approved public listing');
 assert(!Object.keys(publicListing).some(key=>key.startsWith('contact_')),'Private contact fields must not be in public listing');
 assert.equal(must(await anon.from('gameplay_footage').select('video_url').eq('submission_id',id).single(),'Approved public video').video_url,'https://www.youtube.com/watch?v=abcdefghijk');
 const publicContext=await contextFor(null),gamePage=await publicContext.newPage();
 await gamePage.goto(`${origin}/submissions/${id}`);
 await expect(gamePage.getByRole('heading',{name:'Gameplay footage (optional)'})).toBeVisible({timeout:30000});
 assert(!(await gamePage.content()).includes(contact.contact_email),'Private contact email must not enter HTML or RSC data');
 await expect(gamePage.locator('iframe')).toHaveCount(0);
 await publicContext.close();
 must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:'Pending Review',p_review_reason:null}),'Restore synthetic pending state');
 console.log('PASS development/public browser: approved footage visible, contact fields absent from public view and rendered HTML/RSC.');

 const context=await contextFor(null),publicPage=await context.newPage();let analyticsRequests=0;
 publicPage.on('request',req=>{if(req.url().endsWith('/api/analytics')&&req.method()==='POST')analyticsRequests++;});
 await publicPage.goto(origin+'/privacy?utm_source=reddit&utm_campaign=m24_qa');
 await publicPage.getByText('Privacy & optional analytics',{exact:true}).click();
 assert.equal(analyticsRequests,0,'Analytics must be off without permission');
 await publicPage.getByRole('button',{name:'Allow optional analytics'}).click();
 await expect.poll(()=>analyticsRequests).toBe(1);
 await publicPage.getByRole('button',{name:'Reject optional analytics'}).click();
 assert.equal(await publicPage.evaluate(()=>sessionStorage.getItem('playtested.analytics.session.v1')),null);
 const count=analyticsRequests;await publicPage.reload();await publicPage.waitForLoadState('networkidle');assert.equal(analyticsRequests,count,'Withdrawal persists');
 for(const width of [320,390,1280]){await publicPage.setViewportSize({width,height:900});assert(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Privacy reflow ${width}`);}
 await context.close();
 console.log('PASS browser: analytics default-off, explicit opt-in, withdrawal, persistence and mobile privacy-page reflow.');
}catch(error){
 fs.mkdirSync('technical-test-results',{recursive:true});
 if(browser)for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:'technical-test-results/m24-browser-failure.png',fullPage:true}).catch(()=>{});
 console.error('FAIL Merge 24 development acceptance:',error instanceof assert.AssertionError?error.message:String(error.message||'Unknown failure').slice(0,300));process.exitCode=1;
}
finally{
 if(browser)await browser.close();
 fs.mkdirSync('technical-test-results',{recursive:true});fs.writeFileSync('technical-test-results/m24-development-fixtures.json',JSON.stringify(fixtures,null,2));
 console.log('Synthetic fixture references retained in ignored technical-test-results; no production access or destructive cleanup performed.');
}

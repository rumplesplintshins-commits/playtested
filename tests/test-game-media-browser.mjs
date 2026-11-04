// Development-only acceptance. Only the dedicated Gallery QA fixture is modified.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from 'playwright/test';
const origin='http://localhost:3000',ref='ktifgybnkdaotdxrvjgq';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,`${ref}.supabase.co`);
const fixturePath='technical-test-results/m24-development-fixtures.json',fixtures=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const must=(result,label)=>{assert(!result.error,`${label} failed (${result.error?.code||result.error?.status||'unknown'})`);return result.data;};
const png=await sharp({create:{width:640,height:360,channels:3,background:'#335577'}}).png().toBuffer();
const jpg=await sharp({create:{width:400,height:800,channels:3,background:'#775533'}}).jpeg().toBuffer();
const webp=await sharp({create:{width:800,height:450,channels:3,background:'#337755'}}).webp().toBuffer();
const file=(buffer=png,mimeType='image/png',name='synthetic.png')=>({buffer:Buffer.from(buffer),mimeType,name});
let browser,id,originalStatus,originalReason,clients={},contexts={};
try{
 browser=await chromium.launch({headless:true});
 for(const role of ['owner','other','admin']){
  const {user}=must(await service.auth.admin.getUserById(fixtures.users[role]),'Read synthetic identity');assert(user.email.startsWith(`m24-${role}-`));
  const generated=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Generate test login without email');
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {session}=must(await client.auth.verifyOtp({token_hash:generated.properties.hashed_token,type:'magiclink'}),'Synthetic login');clients[role]=client;
  const context=await browser.newContext();contexts[role]=context;
  const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),chunks=value.match(/.{1,3000}/g),key=`sb-${ref}-auth-token`;
  await context.addCookies(chunks.map((chunk,i)=>({name:chunks.length===1?key:`${key}.${i}`,value:chunk,url:origin,sameSite:'Lax'})));
 }
 contexts.anon=await browser.newContext();
 const put=(role,slot,payload=file(),target=id)=>contexts[role].request.put(`${origin}/api/game-media/${target}/${slot}`,{headers:{origin},multipart:{file:payload}});
 const remove=slot=>contexts.owner.request.delete(`${origin}/api/game-media/${id}/${slot}`,{headers:{origin}});
 const metadata=()=>clients.owner.from('game_screenshots').select('slot,revision').eq('submission_id',id).order('slot');
 if(!fixtures.galleryFormSubmission){
  const page=await contexts.owner.newPage(),title=`Gallery QA ${Date.now()}`;fixtures.galleryFormTitle=title;
  await page.goto(origin+'/submit');
  await page.locator('[name="title"]').fill(title);await page.locator('[name="developer"]').fill(title+' Studio');await page.locator('[name="genre"]').selectOption('Other');await page.locator('[name="releaseStatus"]').selectOption('Not announced');await page.locator('textarea[name="description"]').fill('Synthetic development gallery acceptance: explore movement and controls.');await page.locator('[name="aiType"]').selectOption('No AI used');
  const picker=page.getByRole('group',{name:'Screenshots (optional)',exact:true});
  await page.getByLabel('Choose screenshots',{exact:true}).setInputFiles(Array.from({length:6},()=>file()));await expect(picker.getByRole('alert')).toHaveText('Choose up to five screenshots per game.');
  await page.getByLabel('Choose screenshots',{exact:true}).setInputFiles(file(Buffer.from('<svg/>')));await expect(picker.getByRole('alert')).toContainText('contents');
  await page.getByLabel('Choose screenshots',{exact:true}).setInputFiles([file(),file(jpg,'image/jpeg','portrait.jpg'),file(webp,'image/webp','wide.webp')]);
  await expect(picker.getByRole('img')).toHaveCount(3);
  await page.getByLabel('Upload game thumbnail',{exact:true}).setInputFiles(file());await expect(page.locator('[name="imageUrl"]')).toHaveValue(/game-thumbnails/,{timeout:30000});
  await page.getByRole('button',{name:'Submit application',exact:true}).click();
  await expect.poll(async()=>{const r=await service.from('game_submissions').select('id').eq('title',title).eq('developer_id',fixtures.users.owner).maybeSingle();return r.data?.id||null;},{timeout:30000}).not.toBeNull();
  id=must(await service.from('game_submissions').select('id').eq('title',title).single(),'Read gallery fixture').id;fixtures.galleryFormSubmission=id;
  fs.writeFileSync(fixturePath,JSON.stringify(fixtures,null,2));
  await expect.poll(async()=>must(await metadata(),'Submission screenshots').length,{timeout:30000}).toBe(3);
  await page.close();console.log('PASS screenshot submission: optional picker, five-file bound, malformed file rejection, three actual uploads and separate catalogue thumbnail.');
 }
 id=fixtures.galleryFormSubmission;
 const row=must(await service.from('game_submissions').select('title,status,review_reason,developer_id').eq('id',id).single(),'Read gallery fixture');assert(row.title.startsWith('Gallery QA '));assert.equal(row.developer_id,fixtures.users.owner);originalStatus=row.status;originalReason=row.review_reason;
 must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:'Pending Review',p_review_reason:null}),'Set synthetic pending state');
 for(const role of ['anon','other','admin'])assert.equal((await put(role,4)).status(),role==='anon'?401:403,'Only owner can upload screenshots');
 assert.equal((await contexts.other.request.delete(`${origin}/api/game-media/${id}/1`,{headers:{origin}})).status(),403);
 assert.equal((await put('owner',6)).status(),400);
 assert.equal((await put('owner',4,file(Buffer.from('<svg/>'),'image/png'))).status(),400);
 assert.equal((await put('owner',4,file(png,'image/jpeg','forged.jpg'))).status(),400);
 assert.equal((await put('owner',4,file(png.slice(0,24)))).status(),400);
 assert.equal((await put('owner',4,file(new Uint8Array(5242880+65537)))).status(),413);
 assert.equal((await contexts.owner.request.delete(`${origin}/api/game-media/${id}/1`,{headers:{origin:'https://invalid.example.test'}})).status(),403);
 assert((await clients.other.rpc('set_game_screenshot',{p_id:id,p_slot:1,p_path:null})).error);
 assert((await clients.owner.from('game_screenshots').delete().eq('submission_id',id)).error,'Direct writes cannot bypass server validation');
 const existing=must(await metadata(),'Pending metadata');assert(existing.length>0);
 const path=must(await service.from('game_screenshots').select('object_path').eq('submission_id',id).eq('slot',existing[0].slot).single(),'Read synthetic private path').object_path;
 assert((await clients.owner.storage.from('game-screenshots').download(path)).error,'Storage cannot bypass the gateway, even as owner');
 assert((await clients.other.storage.from('game-screenshots').upload(`${fixtures.users.other}/${id}/bypass.webp`,webp,{contentType:'image/webp'})).error);
 const raw=await contexts.anon.request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-screenshots/${path}`);assert(!raw.ok(),'Private screenshot bucket cannot be fetched as public storage');
 for(const [role,status] of [['owner',200],['admin',200],['other',404],['anon',404]])assert.equal((await contexts[role].request.get(`${origin}/api/game-media/${id}/${existing[0].slot}`)).status(),status,'Pending screenshot visibility');
 console.log('PASS live screenshot security: owner-only mutation, malformed/oversized rejection, slot bound, CSRF, no direct metadata/storage bypass and pending owner/admin-only reads.');

 const ownerPage=await contexts.owner.newPage();
 const oldThumbnail=must(await service.from('game_submissions').select('image_url').eq('id',id).single(),'Read catalogue thumbnail').image_url;
 await ownerPage.goto(`${origin}/submit?edit=${id}`);
 await expect(ownerPage.locator('input[name="image_url"]')).toHaveValue('');
 await ownerPage.getByRole('button',{name:'Clear thumbnail selection',exact:true}).click();await expect(ownerPage.getByRole('img',{name:'Game thumbnail preview',exact:true})).toHaveCount(0);
 await ownerPage.locator('input[name="image_url"]').fill(oldThumbnail);await expect(ownerPage.getByRole('img',{name:'Game thumbnail preview',exact:true})).toBeVisible();
 await ownerPage.getByRole('button',{name:'Save edits',exact:true}).click();await expect(ownerPage.getByText(/Edits saved. Select Resubmit for review/)).toBeVisible();
 assert.equal(must(await service.from('game_submissions').select('image_url').eq('id',id).single(),'Verify preserved thumbnail').image_url,oldThumbnail,'Hiding a storage URL must not erase the stored thumbnail');
 await ownerPage.goto(`${origin}/my-submissions?tab=submissions&game=${id}`);
 const panel=ownerPage.locator(`[data-workspace-item="${id}"]`),manager=panel.locator('section').filter({has:ownerPage.getByRole('heading',{name:'Screenshots (optional)',exact:true})}).last();
 await expect(manager.getByRole('img')).toHaveCount(existing.length);
 await expect(manager.locator('input[type=url]')).toHaveCount(0);
 for(const slot of [1,2,3])if(!existing.some(s=>s.slot===slot))assert.equal((await put('owner',slot)).status(),200);
 await ownerPage.reload();
 let shots=must(await metadata(),'Current screenshots');const free=[1,2,3,4,5].filter(slot=>!shots.some(s=>s.slot===slot));
 if(free.length)await manager.getByLabel('Add screenshots',{exact:true}).setInputFiles(free.map(()=>file()));
 await expect(manager.getByText('5 / 5 screenshots',{exact:true})).toBeVisible({timeout:30000});await expect(manager.getByLabel('Add screenshots',{exact:true})).toBeDisabled();
 const old=must(await metadata(),'Before replacement').find(s=>s.slot===1);
 await manager.getByLabel('Replace screenshot 1',{exact:true}).setInputFiles(file(jpg,'image/jpeg','portrait.jpg'));
 await expect.poll(async()=>must(await metadata(),'Replacement revision').find(s=>s.slot===1).revision).not.toBe(old.revision);
 let response=await contexts.owner.request.get(`${origin}/api/game-media/${id}/1`);assert.equal(response.status(),200);assert.equal(response.headers()['content-type'],'image/webp');assert.match(response.headers()['cache-control'],/no-store/);let dimensions=await sharp(await response.body()).metadata();assert.equal(dimensions.width,400);assert.equal(dimensions.height,800);
 await manager.getByRole('button',{name:'Remove screenshot 2',exact:true}).click();await expect(manager.getByText('4 / 5 screenshots',{exact:true})).toBeVisible();assert.equal((await contexts.owner.request.get(`${origin}/api/game-media/${id}/2`)).status(),404);
 await manager.getByLabel('Add screenshots',{exact:true}).setInputFiles(file());await expect(manager.getByText('5 / 5 screenshots',{exact:true})).toBeVisible();
 await ownerPage.close();console.log('PASS screenshot editing: five slots, disabled overflow upload, replacement revisions, uncropped portrait dimensions, deletion and reuse without raw storage URL fields.');

 must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:'Approved',p_review_reason:null}),'Approve synthetic gallery');
 const page=await contexts.anon.newPage();await page.goto(`${origin}/submissions/${id}`);
 const gallery=page.getByRole('region',{name:'Game Media',exact:true});await expect(gallery.getByRole('heading',{name:'Screenshot 1 of 5',exact:true})).toBeVisible();await expect(gallery.getByRole('img',{name:'Gameplay screenshot 1',exact:true})).toBeVisible();
 await gallery.getByRole('button',{name:'Next screenshot',exact:true}).click();await expect(gallery.getByRole('heading',{name:'Screenshot 2 of 5'})).toBeVisible();await gallery.getByRole('button',{name:'Previous screenshot',exact:true}).click();await expect(gallery.getByRole('heading',{name:'Screenshot 1 of 5'})).toBeVisible();
 for(const width of [320,390,853,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Gallery reflow ${width}`);if(width===320){const strip=gallery.getByRole('group',{name:'Select game media'});assert(await strip.evaluate(el=>el.scrollWidth>el.clientWidth));await strip.evaluate(el=>el.scrollLeft=200);assert(await strip.evaluate(el=>el.scrollLeft>0));}}
 await page.evaluate(()=>document.documentElement.style.zoom='1.5');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Gallery 150% zoom');fs.mkdirSync('technical-test-results',{recursive:true});await gallery.screenshot({path:'technical-test-results/gallery-screenshots-150-percent.png'});await page.evaluate(()=>document.documentElement.style.zoom='');
 const image=gallery.getByRole('img',{name:'Gameplay screenshot 1',exact:true});await expect.poll(()=>image.evaluate(el=>el.naturalWidth)).toBe(400);assert.equal(await image.evaluate(el=>getComputedStyle(el).objectFit),'contain');
 let videoRequests=0;await page.route('https://drive.google.com/**',route=>{videoRequests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><p>Restricted video fixture</p>'});});
 must(await clients.owner.from('gameplay_footage').upsert({submission_id:id,video_url:'https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/view'}),'Add synthetic Drive item');
 await page.reload();await expect(gallery.getByRole('heading',{name:'Gameplay Footage',exact:true})).toBeVisible();await expect(gallery.locator('iframe')).toHaveCount(0);assert.equal(videoRequests,0);
 await gallery.getByRole('button',{name:'View screenshot 2',exact:true}).click();await expect(gallery.locator('iframe')).toHaveCount(0);assert.equal(videoRequests,0);
 await gallery.getByRole('button',{name:'View Gameplay Footage',exact:true}).click();await gallery.getByRole('button',{name:'Play Google Drive gameplay video'}).click();await expect.poll(()=>videoRequests).toBe(1);
 await gallery.getByRole('button',{name:'View screenshot 1',exact:true}).click();await expect(gallery.locator('iframe')).toHaveCount(0);await gallery.getByRole('button',{name:'View Gameplay Footage',exact:true}).click();await expect(gallery.locator('iframe')).toHaveCount(0);assert.equal(videoRequests,1,'Returning to video requires another explicit Play');
 const adminPage=await contexts.admin.newPage();await adminPage.goto(origin+'/admin/submissions');await adminPage.getByRole('button',{name:'All',exact:true}).click();await adminPage.getByLabel('Search submissions',{exact:true}).fill(row.title);await adminPage.getByRole('button').filter({hasText:row.title}).first().click();
 const preview=adminPage.getByRole('region',{name:'Game Media',exact:true});await expect(preview.getByRole('button',{name:'View screenshot 5',exact:true})).toBeVisible();await expect(preview.getByRole('heading',{name:'Gameplay Footage',exact:true})).toBeVisible();await expect(preview.getByText('Gameplay footage (optional)',{exact:true})).toHaveCount(0);await adminPage.close();
 for(let slot=1;slot<=5;slot++)assert.equal((await remove(slot)).status(),200);
 await page.reload();await expect(gallery.getByRole('heading',{name:'Gameplay Footage',exact:true})).toBeVisible();await expect(gallery.getByRole('group',{name:'Select game media'})).toHaveCount(0);await expect(gallery.locator('iframe')).toHaveCount(0);
 must(await clients.owner.from('gameplay_footage').delete().eq('submission_id',id),'Return synthetic game to no video');await page.reload();await expect(gallery).toHaveCount(0);
 for(const slot of [1,2,3])assert.equal((await put('owner',slot,file(slot===2?jpg:png,slot===2?'image/jpeg':'image/png'))).status(),200);
 await page.reload();await page.route(`**/api/game-media/${id}/*`,route=>route.fulfill({status:503,body:'Unavailable fixture'}));await page.reload();await expect(gallery.getByRole('alert')).toHaveText('Screenshot unavailable.');await page.unroute(`**/api/game-media/${id}/*`);await gallery.getByRole('button',{name:'Retry screenshot'}).click();await expect.poll(()=>gallery.getByRole('img',{name:'Gameplay screenshot 1'}).evaluate(el=>el.naturalWidth)).toBe(640);
 await page.close();
 must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:'Pending Review',p_review_reason:null}),'Withdraw synthetic approval');assert.equal((await contexts.anon.request.get(`${origin}/api/game-media/${id}/1`)).status(),404);
 assert.equal(must(await service.from('game_screenshot_cleanup').select('object_path'),'Cleanup queue').length,0,'Replaced/deleted screenshot files cleaned');
 console.log('PASS public/admin gallery: screenshots-only, video-first mixed media, video-only and empty cases; previous/next; contain/no crop; mobile thumbnail scrolling and 150% CSS zoom; private video loading after selection; unavailable screenshot retry; approval revocation and storage cleanup.');
}catch(error){
 fs.mkdirSync('technical-test-results',{recursive:true});
 if(browser)for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:'technical-test-results/gallery-failure.png',fullPage:true}).catch(()=>{});
 console.error('FAIL game media acceptance:',String(error.message||'Unknown failure').slice(0,500));process.exitCode=1;
}
finally{
 if(id&&originalStatus&&clients.admin)try{must(await clients.admin.rpc('review_game_submission',{p_submission_id:id,p_status:originalStatus,p_review_reason:originalReason}),'Restore gallery fixture status');}catch(e){console.error(e.message);process.exitCode=1;}
 if(browser)await browser.close();
 console.log('Only synthetic development gallery data used; fixture reference retained in ignored test results. Production untouched.');
}

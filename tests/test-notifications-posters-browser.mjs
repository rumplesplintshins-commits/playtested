// Development-only. Retains one labelled notification QA game; restores media fixture.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from 'playwright/test';
const ref='ktifgybnkdaotdxrvjgq',origin='http://localhost:3000';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,`${ref}.supabase.co`);
const fixturePath='technical-test-results/m24-development-fixtures.json',fixtures=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const must=(r,label)=>{assert(!r.error,`${label} failed (${r.error?.code||r.error?.status||'unknown'})`);return r.data;};
const clients={},contexts={};let browser,media,oldVideo,mediaChanged=false,qa;
try{
 browser=await chromium.launch({headless:true});
 for(const role of ['owner','other','admin']){
  const {user}=must(await service.auth.admin.getUserById(fixtures.users[role]),'Read synthetic user');assert(user.email.startsWith(`m24-${role}-`));
  const link=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Generate test sign-in without email');
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {session}=must(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'Verify synthetic user');clients[role]=client;
  const context=await browser.newContext();contexts[role]=context;
  const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),chunks=value.match(/.{1,3000}/g),name=`sb-${ref}-auth-token`;
  await context.addCookies(chunks.map((value,i)=>({name:chunks.length===1?name:`${name}.${i}`,value,url:origin,sameSite:'Lax'})));
 }
 contexts.anon=await browser.newContext();
 qa=fixtures.notificationSubmission||crypto.randomUUID();
 if(!fixtures.notificationSubmission){
  must(await clients.owner.from('game_submissions').insert({id:qa,developer_id:fixtures.users.owner,title:`Notification QA ${Date.now()}`,developer_name:'Synthetic notification studio',genre:'Other',description:'Synthetic development-only notification acceptance.',image_url:'https://example.test/cover.png',game_link:'',evidence_link:'',release_status:'Not announced',ai_type:'No AI used',status:'Pending Review'}),'Create synthetic notification submission');
  fixtures.notificationSubmission=qa;fs.writeFileSync(fixturePath,JSON.stringify(fixtures,null,2));
 }
 const game=must(await service.from('game_submissions').select('title').eq('id',qa).single(),'Read notification fixture');assert(game.title.startsWith('Notification QA '));
 const read=async()=>must(await service.from('notifications').select('id,recipient_id,kind,href,read_at,dedupe_key').eq('entity_id',qa),'Read synthetic event recipients');
 let rows=await read();assert(rows.filter(n=>n.kind==='admin_new_submission').every(n=>n.recipient_id!==fixtures.users.owner&&n.recipient_id!==fixtures.users.other));
 for(const status of ['Approved','Rejected','Needs More Information','Pending Review'])must(await clients.admin.rpc('review_game_submission',{p_submission_id:qa,p_status:status,p_review_reason:['Rejected','Needs More Information'].includes(status)?'Synthetic acceptance request.':null}),'Review synthetic submission');
 rows=await read();
 for(const kind of ['submission_approved','submission_rejected','submission_needs_info']){const list=rows.filter(n=>n.kind===kind);assert(list.length>0);assert(list.every(n=>n.recipient_id===fixtures.users.owner));assert(list.every(n=>n.href===`/my-submissions?tab=submissions&game=${qa}`));}
 const keys=rows.map(n=>`${n.recipient_id}:${n.dedupe_key}`);assert.equal(new Set(keys).size,keys.length,'No duplicate event/recipient');
 const count=rows.length;must(await clients.admin.rpc('review_game_submission',{p_submission_id:qa,p_status:'Pending Review',p_review_reason:null}),'Replay unchanged review');assert.equal((await read()).length,count);
 assert.equal(must(await clients.other.from('notifications').select('id').eq('entity_id',qa),'Ordinary recipient RLS').length,0);
 const ownerItem=rows.find(n=>n.kind==='submission_approved');
 assert.equal(must(await clients.other.rpc('mark_notification_read',{p_id:ownerItem.id}),'Foreign read denial'),false);
 assert.equal(must(await clients.admin.rpc('dismiss_notification',{p_id:ownerItem.id}),'Admin cannot dismiss another recipient alert'),false);
 assert((await clients.owner.from('notifications').update({href:'/admin/submissions'}).eq('id',ownerItem.id)).error,'Cannot rewrite notification destination');
 const adminPage=await contexts.admin.newPage();await adminPage.goto(origin+'/privacy');await adminPage.getByRole('button',{name:/^Notifications/}).click();
 await adminPage.getByRole('button').filter({hasText:`New submission: ${game.title}`}).first().click();
 await adminPage.waitForURL(url=>url.pathname==='/admin/submissions'&&url.searchParams.get('submission')===qa);
 await expect(adminPage.getByRole('heading',{name:game.title,exact:true})).toBeVisible({timeout:30000});
 assert(must(await service.from('notifications').select('read_at').eq('entity_id',qa).eq('recipient_id',fixtures.users.admin),'Admin read state').some(n=>n.read_at));await adminPage.close();
 const ownerPage=await contexts.owner.newPage();await ownerPage.goto(origin+'/privacy');await ownerPage.getByRole('button',{name:/^Notifications/}).click();
 await ownerPage.getByRole('button').filter({hasText:'Game approved'}).filter({hasText:game.title}).first().click();
 await ownerPage.waitForURL(url=>url.pathname==='/my-submissions'&&url.searchParams.get('game')===qa&&url.searchParams.get('tab')==='submissions');
 await expect(ownerPage.locator(`[data-workspace-item="${qa}"]`)).toBeVisible();
 assert(must(await clients.owner.from('notifications').select('read_at').eq('id',ownerItem.id).single(),'Own read state').read_at);await ownerPage.close();
 console.log('PASS live notifications: separate admin/developer/ordinary accounts, owner-only decisions, admin-only review alerts, recipient RLS/column restrictions, replay dedupe, real bell read transitions and exact admin/developer destinations.');

 media=must(await service.from('game_submissions').select('id,title,status,review_reason,image_url').eq('id',fixtures.galleryFormSubmission).single(),'Read synthetic media fixture');assert(media.title.startsWith('Gallery QA '));
 oldVideo=must(await service.from('gameplay_footage').select('video_url').eq('submission_id',media.id).maybeSingle(),'Read prior footage');
 const screenshots=must(await service.from('game_screenshots').select('slot,revision').eq('submission_id',media.id).order('slot'),'Read screenshot fallback');assert(screenshots.length>0);
 mediaChanged=true;must(await clients.admin.rpc('review_game_submission',{p_submission_id:media.id,p_status:'Approved',p_review_reason:null}),'Approve media fixture temporarily');
 const posterImage=await sharp(Buffer.from('<svg width="960" height="540"><rect width="960" height="540" fill="#183542"/><path d="M0 430L260 180L460 370L720 90L960 430V540H0" fill="#4c8466"/><circle cx="800" cy="120" r="45" fill="#e5ce93"/></svg>')).webp().toBuffer();
 for(const [provider,url] of [['YouTube','https://www.youtube.com/watch?v=abcdefghijk'],['Google Drive','https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/view'],['Vimeo','https://vimeo.com/123456']]){
  must(await clients.owner.from('gameplay_footage').upsert({submission_id:media.id,video_url:url}),'Set synthetic provider');
  for(const kind of ['anon','admin']){
   const page=await contexts[kind].newPage();let external=0,players=0,posterUnavailable=false;
   await page.route('**/*',route=>{
    const request=route.request(),uri=new URL(request.url());
    if(['www.youtube-nocookie.com','player.vimeo.com','drive.google.com','i.ytimg.com','img.youtube.com','vimeo.com'].includes(uri.hostname)){
     if(request.resourceType()==='document'){players++;return route.fulfill({contentType:'text/html',body:'<!doctype html><p>Player fixture</p>'});}
     external++;return route.abort();
    }
    if(uri.pathname===`/api/game-media/${media.id}/video-poster`)return posterUnavailable?route.fulfill({status:404}):route.fulfill({contentType:'image/webp',body:posterImage});
    return route.continue();
   });
   if(kind==='anon')await page.goto(`${origin}/submissions/${media.id}`);
   else{await page.goto(`${origin}/admin/submissions?submission=${media.id}`);await expect(page.getByRole('heading',{name:media.title,exact:true})).toBeVisible();}
   const gallery=page.getByRole('region',{name:'Game Media',exact:true}),play=gallery.getByRole('button',{name:`Play ${provider} gameplay video`});
   await expect(play.locator('img')).toHaveCount(1);await expect.poll(()=>play.locator('img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
   const source=await play.locator('img').getAttribute('src');
   if(provider==='YouTube')assert.equal(source,`/api/game-media/${media.id}/video-poster`);else assert(source.startsWith(`/api/game-media/${media.id}/${screenshots[0].slot}?`));
   await expect(gallery.locator('iframe')).toHaveCount(0);assert.equal(external,0);assert.equal(players,0);
   assert.equal(await play.locator('img').evaluate(image=>getComputedStyle(image).objectFit),'contain');
   for(const width of [320,390,853,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   if(kind==='anon'){
    const hero=page.locator('[data-game-hero]');
    const boxes=await hero.evaluate(node=>Array.from(node.children).map(child=>{const r=child.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
    assert(boxes[0].x<boxes[1].x&&Math.abs(boxes[0].y-boxes[1].y)<2,'Desktop media and game details sit alongside');
    assert(boxes[0].width<800,'Desktop viewer stays compact');
    await page.screenshot({path:'technical-test-results/gallery-compact-desktop.png'});
   }
   await page.evaluate(()=>document.documentElement.style.zoom='1.5');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   fs.mkdirSync('technical-test-results',{recursive:true});await play.screenshot({path:`technical-test-results/poster-${provider.replace(' ','-')}-${kind}.png`});await page.evaluate(()=>document.documentElement.style.zoom='');
   if(provider==='YouTube'){posterUnavailable=true;await page.reload();await expect.poll(()=>play.locator('img').getAttribute('src')).toContain(`/api/game-media/${media.id}/${screenshots[0].slot}?`);}
   await play.click();await expect.poll(()=>players).toBe(1);await expect(gallery.locator('iframe')).not.toHaveAttribute('allow',/autoplay/);await expect(gallery.getByRole('link',{name:/Open video in new tab/})).toBeVisible();
   await page.close();
  }
 }
 // Public poster permission is checked before any YouTube thumbnail fetch.
 must(await clients.owner.from('gameplay_footage').upsert({submission_id:media.id,video_url:'https://www.youtube.com/watch?v=abcdefghijk'}),'Set pending poster test');
 must(await clients.admin.rpc('review_game_submission',{p_submission_id:media.id,p_status:'Pending Review',p_review_reason:null}),'Withdraw temporary approval');
 assert.equal((await contexts.anon.request.get(`${origin}/api/game-media/${media.id}/video-poster?url=https://evil.test`)).status(),404);
 console.log('PASS posters browser: YouTube proxy image, Drive/Vimeo first-screenshot fallbacks, unavailable-YouTube fallback, public/admin previews, no browser third-party thumbnails or pre-click players, aspect-preserving mobile/150% CSS zoom and retained fallback link.');
}catch(e){console.error('FAIL notifications/posters acceptance:',String(e.message||'Unknown failure').slice(0,500));process.exitCode=1;}
finally{
 try{
  if(mediaChanged){if(oldVideo)must(await clients.owner.from('gameplay_footage').upsert({submission_id:media.id,...oldVideo}),'Restore video');else must(await clients.owner.from('gameplay_footage').delete().eq('submission_id',media.id),'Restore absent video');must(await clients.admin.rpc('review_game_submission',{p_submission_id:media.id,p_status:media.status,p_review_reason:media.review_reason}),'Restore media status');}
  if(qa&&clients.admin)await clients.admin.rpc('review_game_submission',{p_submission_id:qa,p_status:'Rejected',p_review_reason:'Synthetic notification acceptance fixture; no real submission requires review.'});
 }catch(e){console.error('Synthetic restoration:',e.message);process.exitCode=1;}
 if(browser)await browser.close();
 console.log('Only development synthetic fixtures used; original media restored and QA notification fixture retained. Production untouched.');
}

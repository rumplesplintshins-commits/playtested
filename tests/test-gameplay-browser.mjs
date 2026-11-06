// Development only. Reuses and restores the known synthetic submission fixture.
// Provider responses are intercepted: tests never request actual third-party videos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from 'playwright/test';
const origin='http://localhost:3000',ref='ktifgybnkdaotdxrvjgq';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,`${ref}.supabase.co`);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const fixtures=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
const must=(result,label)=>{assert(!result.error,`${label} failed (${result.error?.code||result.error?.status||'unknown'})`);return result.data;};
const providers=[
 {provider:'YouTube',url:'https://www.youtube.com/watch?v=abcdefghijk',embed:'https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1'},
 {provider:'Vimeo',url:'https://vimeo.com/123456',embed:'https://player.vimeo.com/video/123456?dnt=1'},
 {provider:'Google Drive',url:'https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/view',embed:'https://drive.google.com/file/d/1Rri8jEjXA6cKEM4nqhaGTklLDxJkYlxZ/preview'},
];
const hosts=new Set(['www.youtube-nocookie.com','player.vimeo.com','drive.google.com']);
let browser,admin,original,oldFootage,changed=false;
try{
 original=must(await service.from('game_submissions').select('id,title,status,review_reason').eq('id',fixtures.submission).single(),'Read synthetic submission');
 assert(original.title.startsWith('Merge 24 QA '),'Only the known synthetic fixture may be changed');
 oldFootage=must(await service.from('gameplay_footage').select('video_url,updated_at').eq('submission_id',original.id).single(),'Read original fixture footage');
 const {user}=must(await service.auth.admin.getUserById(fixtures.users.admin),'Read synthetic admin');assert(user.email.startsWith('m24-admin-'));
 const generated=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Generate test sign-in without sending email');
 admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {session}=must(await admin.auth.verifyOtp({token_hash:generated.properties.hashed_token,type:'magiclink'}),'Sign in synthetic admin');
 browser=await chromium.launch({headless:true});
 const contexts={public:await browser.newContext(),admin:await browser.newContext()};
 const cookie='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),chunks=cookie.match(/.{1,3000}/g),name=`sb-${ref}-auth-token`;
 await contexts.admin.addCookies(chunks.map((value,i)=>({name:chunks.length===1?name:`${name}.${i}`,value,url:origin,sameSite:'Lax'})));
 changed=true;
 must(await admin.rpc('review_game_submission',{p_submission_id:original.id,p_status:'Approved',p_review_reason:null}),'Temporarily approve synthetic fixture');
 for(const video of providers){
  must(await service.from('gameplay_footage').upsert({submission_id:original.id,video_url:video.url}),'Set synthetic provider');
  for(const [kind,context] of Object.entries(contexts)){
   const page=await context.newPage();page.setDefaultTimeout(15000);
   let requests=0;
   await page.route('**/*',route=>{
    if(hosts.has(new URL(route.request().url()).hostname)){
     requests++;
     return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Restricted video fixture</title><p>Video unavailable. Ask its owner for access.</p>'});
    }
    return route.continue();
   });
   if(kind==='public')await page.goto(`${origin}/submissions/${original.id}`);
   else{
    await page.goto(origin+'/admin/submissions');
    await page.getByRole('button',{name:'All',exact:true}).click();
    await page.getByLabel('Search submissions',{exact:true}).fill(original.title);
    await page.getByRole('button').filter({hasText:original.title}).first().click();
   }
   const player=page.locator('section').filter({has:page.getByRole('heading',{name:'Gameplay Footage',exact:true})}).last();
   const play=player.getByRole('button',{name:`Play ${video.provider} gameplay video`,exact:true});
   await expect(play).toBeVisible();await expect(player.locator('iframe')).toHaveCount(0);assert.equal(requests,0,'No provider connections before Play');
   const fallback=player.getByRole('link',{name:/Open video in new tab/});await expect(fallback).toHaveAttribute('href',video.url);await expect(fallback).toHaveAttribute('target','_blank');await expect(fallback).toHaveAttribute('rel','noopener noreferrer');
   for(const width of [320,390,853,1280]){
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${kind}/${video.provider} reflow ${width}`);
    assert(await play.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Placeholder content is not cropped');
   }
   await page.evaluate(()=>document.documentElement.style.zoom='1.5');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${kind}/${video.provider} 150% zoom`);
   assert(await play.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Zoomed placeholder text fits');
   if(video.provider==='Google Drive'){
    fs.mkdirSync('technical-test-results',{recursive:true});await player.screenshot({path:`technical-test-results/gameplay-${kind}-150-percent.png`});
   }
   await page.evaluate(()=>document.documentElement.style.zoom='');
   await play.focus();await page.keyboard.press('Enter');
   const frame=player.locator('iframe');await expect(frame).toHaveAttribute('src',video.embed);await expect(frame).not.toHaveAttribute('allow',/autoplay/);
   await expect.poll(()=>requests).toBe(1);assert(!video.embed.includes('autoplay'));
   const box=await frame.boundingBox();assert(Math.abs(box.width/box.height-16/9)<0.03,'Player remains 16:9');
   await expect(page.frameLocator(`iframe[title="${video.provider} gameplay footage"]`).getByText('Video unavailable. Ask its owner for access.')).toBeVisible();
   await expect(player.getByRole('status')).toHaveCount(0);
   await expect(player.getByText(/If the video is unavailable or asks for access/)).toBeVisible();await expect(fallback).toBeVisible();
   // Cross-origin provider errors cannot be inspected by the app. The fallback
   // remains present even when iframe load succeeds with a restriction screen.
   await player.getByRole('button',{name:'Close player'}).click();await expect(player.locator('iframe')).toHaveCount(0);await expect(fallback).toBeVisible();
   await play.click();await expect.poll(()=>requests).toBe(2);
   await player.getByRole('button',{name:'Close player'}).click();await expect(player.locator('iframe')).toHaveCount(0);await expect(play).toBeVisible();assert.equal(requests,2,'Closing does not reload the provider');
   await page.close();
  }
 }
 const slowPage=await contexts.public.newPage();let unblock;
 const stalled=new Promise(resolve=>{unblock=resolve;});
 await slowPage.route('https://drive.google.com/**',async route=>{await stalled;await route.abort();});
 try{
  await slowPage.goto(`${origin}/submissions/${original.id}`);
  await slowPage.clock.install({time:Date.now()});
  await slowPage.getByRole('button',{name:'Play Google Drive gameplay video'}).click();
  await expect(slowPage.getByRole('status').filter({hasText:'Loading video player…'})).toBeVisible();
  await slowPage.clock.fastForward(16000);
  await expect(slowPage.getByRole('status').filter({hasText:'The video is taking longer than expected.'})).toBeVisible();
  await expect(slowPage.getByRole('link',{name:/Open video in new tab/})).toBeVisible();
  await slowPage.getByRole('button',{name:'Close player'}).click();await expect(slowPage.locator('iframe')).toHaveCount(0);
 }finally{unblock();await slowPage.close();}
 console.log('PASS gameplay browser: all three providers on public/admin pages, no pre-click connections or iframe, keyboard Play, safe canonical embeds, no autoplay permission, restricted/unavailable fallbacks, stalled-player guidance, retry/close, 16:9 mobile and simulated 150% zoom layouts.');
}catch(error){console.error('FAIL gameplay browser:',String(error.message||'Unknown failure').slice(0,500));process.exitCode=1;}
finally{
 if(browser)await browser.close();
 if(changed){
  try{
   must(await service.from('gameplay_footage').upsert({submission_id:original.id,...oldFootage}),'Restore synthetic footage');
   must(await admin.rpc('review_game_submission',{p_submission_id:original.id,p_status:original.status,p_review_reason:original.review_reason}),'Restore synthetic review status');
   console.log('Restored synthetic development footage and review status; production untouched.');
  }catch(error){console.error('Synthetic fixture restoration failed:',error.message);process.exitCode=1;}
 }
}

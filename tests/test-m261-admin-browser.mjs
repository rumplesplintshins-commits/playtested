import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,expect} from 'playwright/test';
const origin='http://127.0.0.1:3026',id='26110000-0000-4000-8000-000000000010';
const title='Historical game '+ 'LongUnbrokenTitle'.repeat(15);
const browser=await chromium.launch();
try {
 const context=await browser.newContext();
 await context.addInitScript(()=>{
  const user={id:'26110000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',user_metadata:{}};
  const enc=v=>btoa(JSON.stringify(v)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const token=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.fixture';
  document.cookie='sb-ktifgybnkdaotdxrvjgq-auth-token=base64-'+enc({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})+'; path=/';
 });
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  // Synthetic session is never forwarded to the application server or Supabase.
  if(url.origin===origin)return route.continue({headers:{...req.headers(),cookie:''}});
  if(url.pathname.includes('/auth/v1/'))return route.fulfill({json:{id:'26110000-0000-4000-8000-000000000001',role:'authenticated',aud:'authenticated',user_metadata:{}}});
  if(url.pathname.endsWith('/profiles'))return route.fulfill({json:{role:'admin'}});
  if(url.pathname.endsWith('/game_submissions'))return route.fulfill({json:[{id,title,developer_name:'Developer '+ 'LongName'.repeat(20),status:'Pending Review',submitted_at:'2026-07-01T12:00:00Z',ai_areas:[]}]});
  if(url.pathname.endsWith('/m26_admin_review_activity'))return route.fulfill({json:{}});
  if(url.pathname.includes('/rest/v1/'))return route.fulfill({json:[]});
  return route.abort();
 });
 const page=await context.newPage();await page.goto(origin+'/admin/submissions?submission='+id);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 for(const width of [320,375,400])for(const zoom of ['1','1.5']){
  await page.setViewportSize({width,height:900});await page.evaluate(z=>document.body.style.zoom=z,zoom);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),'Admin overflow '+width+'/'+zoom+' '+JSON.stringify(await page.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth,b:document.body.scrollWidth,h:document.documentElement.getBoundingClientRect().width})))+' '+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(-8).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,40)})))));
  const heading=page.getByRole('heading',{name:title,exact:true});assert(await heading.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
 }
 fs.writeFileSync('docs/performance/MERGE-26-1-ADMIN-BROWSER.json',JSON.stringify({at:new Date().toISOString(),status:'Passed',checks:'Actual admin submissions page, synthetic mocked admin session, 255-character legacy title, long developer, widths 320/375/400, CSS zoom 100/150%; no hosted writes',manual_pending:'Browser-toolbar zoom and screen-reader review'},null,2));
 console.log('PASS full admin review: long titles/developer, 320/375/400px, 100/150% CSS zoom.');
}finally{await browser.close();}

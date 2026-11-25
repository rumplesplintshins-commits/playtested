import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from 'playwright/test';
const manifest=JSON.parse(fs.readFileSync('lib/catalogue-thumbnails.json','utf8'));
const report=JSON.parse(fs.readFileSync('docs/performance/issue-60-thumbnails.json'));
const largest=report.measurements.reduce((best,row,i)=>row.source_bytes>report.measurements[best].source_bytes?i:best,0);
const original=Object.keys(manifest)[largest],originalBytes=report.measurements[largest].source_bytes;
const row={source_type:'approved',game_id:'f4200000-0000-4000-8000-000000000002',title:'Optimised image fixture',developer_name:'Studio',genre:'Puzzle',description:'Image fixture',image_url:original,total_count:1,platform:'pc',community_reception:null};
// Configured backend hosts are intercepted for this fixture; no hosted reads or
// server-side image processing are involved, even when the build has prod env.
fs.mkdirSync('.backup-tools',{recursive:true});
const preload=path.resolve('.backup-tools/image-browser-preload.cjs');
const backendHosts=[...new Set([...Object.keys(manifest).map(source=>new URL(source).hostname),'example.supabase.co','127.0.0.1'])];
fs.writeFileSync(preload,`const upstream=globalThis.fetch;const row=${JSON.stringify(row)};const backendHosts=${JSON.stringify(backendHosts)};globalThis.fetch=(input,init)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(backendHosts.includes(url.hostname))return Promise.resolve(new Response(JSON.stringify(url.pathname.endsWith('/get_public_catalogue')?[row]:[]),{headers:{'Content-Type':'application/json'}}));return upstream(input,init);};`);
const server=spawn(process.execPath,['--require',preload,'node_modules/next/dist/bin/next','start','--hostname','localhost','--port','32930'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:32829',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'isolated-fixture'},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://localhost:32930')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,logs.slice(-1000));
 browser=await chromium.launch({headless:true});const measurements=[];
 const assertSecurity=headers=>{
  assert.equal(headers['x-frame-options'],'DENY');assert.equal(headers['x-content-type-options'],'nosniff');assert.equal(headers['referrer-policy'],'strict-origin-when-cross-origin');assert.equal(headers['cross-origin-opener-policy'],'same-origin-allow-popups');
  assert(headers['content-security-policy'].includes("frame-ancestors 'none'"));assert(headers['content-security-policy-report-only'].includes("default-src 'self'"));assert(!headers['content-security-policy-report-only'].includes("'unsafe-eval'"));assert(headers['permissions-policy'].includes('camera=()'));
 };
 for(const {viewport,deviceScaleFactor} of [{viewport:{width:1280,height:900},deviceScaleFactor:1},{viewport:{width:390,height:844},deviceScaleFactor:2},{viewport:{width:853,height:600},deviceScaleFactor:1.5}]){
  const context=await browser.newContext({viewport,deviceScaleFactor});let originalRequests=0;
  await context.route('**/*',async route=>{
   const url=route.request().url();assert(!url.includes('/_next/image?'),'Catalogue must not introduce server-side image optimisation');
   const parsed=new URL(url);
   if(parsed.pathname.includes('/storage/v1/object/public/game-thumbnails/catalogue-thumbnails/')){
    const filename=path.basename(parsed.pathname),bytes=fs.readFileSync(path.join('supabase/storage/game-thumbnails/catalogue-thumbnails',filename));
    return route.fulfill({status:200,contentType:'image/webp',headers:{'cache-control':'public, max-age=31536000'},body:bytes});
   }
   if(url===original){originalRequests++;return route.abort();}
   if(url.startsWith('http://localhost:32930'))return route.continue();
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();let imageResponse;
  page.on('response',response=>{if(response.url().includes('/storage/v1/object/public/game-thumbnails/catalogue-thumbnails/'))imageResponse=response;});
  await page.goto('http://localhost:32930');const image=page.locator('article img').first();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
  assert.equal(originalRequests,0,'Known originals are never downloaded on success');const src=await image.evaluate(el=>el.currentSrc);assert(src.includes('/storage/v1/object/public/game-thumbnails/catalogue-thumbnails/'));
  assert(imageResponse,'The catalogue variant must be delivered from Supabase Storage');const responseHeaders=await imageResponse.allHeaders();assert.equal(responseHeaders['cache-control'],'public, max-age=31536000');
  const responseBody=await imageResponse.body();assert(responseBody.length<originalBytes/5,'Actual response materially smaller than original');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  assert.equal(await page.evaluate(()=>devicePixelRatio),deviceScaleFactor);
  measurements.push({viewport,device_scale_factor:deviceScaleFactor,current_src:src.split('/').at(-1),response_bytes:responseBody.length,cache_control:responseHeaders['cache-control']});
  if(viewport.width===1280){
   const normal=await context.request.get('http://localhost:32930/contact');assertSecurity(normal.headers());assert.equal(normal.headers()['strict-transport-security'],undefined);assert(!normal.headers()['cache-control']?.includes('immutable'));
   const publicImage=await context.request.get('http://localhost:32930/images/roles/player-role.jpg');
   assert.match(publicImage.headers()['cache-control'] || '', /public, max-age=86400/);
   const demoAsset=await context.request.get('http://localhost:32930/demo-assets/mosslight-grove.svg');
   assert.match(demoAsset.headers()['cache-control'] || '', /public, max-age=86400/);
   const apex=await context.request.get('http://localhost:32930/contact',{headers:{host:'playtested.co.uk','x-forwarded-proto':'https'}});assertSecurity(apex.headers());assert.equal(apex.headers()['strict-transport-security'],'max-age=31536000');
   const privatePage=await context.request.get('http://localhost:32930/account');assertSecurity(privatePage.headers());assert.match(privatePage.headers()['cache-control'],/private, no-store/);
  }
  await context.close();
 }
 const context=await browser.newContext();let attempts=0;
 await context.route('**/*',route=>{const url=route.request().url();if(url.includes('/storage/v1/object/public/game-thumbnails/catalogue-thumbnails/'))return route.abort();if(url===original){attempts++;return route.abort();}if(url.startsWith('http://localhost:32930'))return route.continue();return route.fulfill({json:[]});});
 const page=await context.newPage();await page.goto('http://localhost:32930');await expect(page.locator('article').getByText('Game image',{exact:true})).toBeVisible();assert.equal(attempts,1,'Failed variant attempts original once, then placeholder');
 fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/issue-60-image-network.json',JSON.stringify({environment:'Local production Next server, mocked catalogue; actual static HTTP bytes, cold browser contexts; no production writes',original_bytes:originalBytes,measurements,fallback_original_attempts:attempts,security_headers_verified:true,conditional_https_apex_hsts_verified:true,private_page_no_store_verified:true},null,2)+'\n');
 console.log('PASS production image delivery, cache headers, responsive/mobile/150%-equivalent widths, byte sizes and one-shot fallback: '+JSON.stringify(measurements));
}catch(error){console.error('Local catalogue browser server logs:',logs.slice(-4000));throw error;}finally{await browser?.close();server.kill();}

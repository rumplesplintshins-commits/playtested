import fs from 'node:fs';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {chromium,expect} from 'playwright/test';
const manifest=JSON.parse(fs.readFileSync('lib/catalogue-thumbnails.json','utf8'));
const original=Object.keys(manifest)[0];
const row={source_type:'approved',game_id:'f4200000-0000-4000-8000-000000000002',title:'Optimised image fixture',developer_name:'Studio',genre:'Puzzle',description:'Image fixture',image_url:original,total_count:1,platform:'pc',community_reception:null};
const backend=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.includes('/get_public_catalogue')?[row]:[]));});
await new Promise(resolve=>backend.listen(32829,'127.0.0.1',resolve));
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','32930'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:32829',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'isolated-fixture'},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://localhost:32930')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,logs.slice(-1000));
 browser=await chromium.launch({headless:true});const measurements=[];
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:853,height:600}]){
  const context=await browser.newContext({viewport});let originalRequests=0,derivedBytes=0;
  await context.route('**/*',async route=>{
   const url=route.request().url();if(url===original){originalRequests++;return route.abort();}
   if(url.startsWith('http://localhost:32930'))return route.continue();
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();page.on('response',async res=>{if(res.url().includes('/catalogue-thumbnails/'))derivedBytes+=(await res.body()).length;});
  await page.goto('http://localhost:32930');const image=page.locator('article img').first();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
  assert.equal(originalRequests,0,'Known originals are never downloaded on success');const src=await image.evaluate(el=>el.currentSrc);assert(src.includes('/catalogue-thumbnails/'));
  const response=await context.request.get(src);assert.equal(response.headers()['cache-control'],'public, max-age=31536000, immutable');
  assert((await response.body()).length<2555747/5,'Actual response materially smaller than original');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  measurements.push({viewport,current_src:src.split('/').at(-1),response_bytes:(await response.body()).length,cache_control:response.headers()['cache-control']});
  await context.close();
 }
 const context=await browser.newContext();let attempts=0;
 await context.route('**/*',route=>{const url=route.request().url();if(url.includes('/catalogue-thumbnails/'))return route.abort();if(url===original){attempts++;return route.abort();}if(url.startsWith('http://localhost:32930'))return route.continue();return route.fulfill({json:[]});});
 const page=await context.newPage();await page.goto('http://localhost:32930');await expect(page.locator('article').getByText('Game image',{exact:true})).toBeVisible();assert.equal(attempts,1,'Failed variant attempts original once, then placeholder');
 fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/issue-60-image-network.json',JSON.stringify({environment:'Local production Next server, mocked catalogue; actual static HTTP bytes, cold browser contexts; no production writes',original_bytes:2555747,measurements,fallback_original_attempts:attempts},null,2)+'\n');
 console.log('PASS production image delivery, cache headers, responsive/mobile/150%-equivalent widths, byte sizes and one-shot fallback: '+JSON.stringify(measurements));
}finally{await browser?.close();server.kill();backend.closeAllConnections();await new Promise(resolve=>backend.close(resolve));}

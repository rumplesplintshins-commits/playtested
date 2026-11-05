import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import {spawn} from 'node:child_process';
import ts from 'typescript';
import {chromium} from 'playwright';

const exports={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/organic-search.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const {organicPages,organicOrigin,organicMetadata,organicBreadcrumb,safeStructuredData}=exports;
assert.equal(new Set(organicPages.map(p=>p.path)).size,4);assert.equal(new Set(organicPages.map(p=>p.title)).size,4);
assert.throws(()=>organicMetadata('/unknown'));
assert(!safeStructuredData({text:'</script><script>alert(1)</script>'}).includes('<'));
for(const page of organicPages){const m=organicMetadata(page.path);assert.equal(m.alternates.canonical,organicOrigin+page.path);assert.equal(m.openGraph.url,m.alternates.canonical);assert.equal(m.twitter.card,'summary_large_image');assert(page.description.length>80);const b=organicBreadcrumb(page.path,page.title);assert.equal(b.itemListElement.at(-1).item,m.alternates.canonical);assert.deepEqual(b.itemListElement.map(x=>x.position),b.itemListElement.map((_,i)=>i+1));}

// Refuse an occupied port rather than connecting to or stopping another task's server.
await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(3027,'127.0.0.1',()=>probe.close(resolve));});
const origin='http://127.0.0.1:3027',server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3027'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert(ready,'Isolated server did not start');
 const sitemap=await(await fetch(origin+'/sitemap.xml')).text();const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);assert.equal(urls.length,5);assert(urls.every(u=>u.startsWith(organicOrigin)));assert(!/echoes|hollow|neon|kingdoms|\/account|\/tester|\/admin|\/login/.test(sitemap));
 const robots=await(await fetch(origin+'/robots.txt')).text();assert(robots.includes('Sitemap: '+organicOrigin+'/sitemap.xml'));assert(robots.includes('Disallow: /api/'));assert(!robots.includes('Disallow: /playtesting'));
 const missing=await fetch(origin+'/games/does-not-exist-merge27'),missingHtml=await missing.text();assert([200,404].includes(missing.status));assert(missingHtml.includes('Page not found'));assert(/name="robots" content="noindex/.test(missingHtml),'A streamed missing prototype must never be indexable');
 const demo=await(await fetch(origin+'/games/echoes-of-elsewhere')).text();assert(/name="robots" content="noindex, follow"/.test(demo),'Illustrative demo is not indexable');
 const image=await fetch(origin+'/seo-social.png');assert(image.headers.get('content-type').includes('image/png'));const bytes=Buffer.from(await image.arrayBuffer());assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
 browser=await chromium.launch({headless:true});const context=await browser.newContext(),page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(new URL(r.url()).origin);});
 const results=[];
 for(const item of organicPages){
  const response=await page.goto(origin+item.path);assert.equal(response.status(),200);assert((await page.title()).includes(item.title));assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),organicOrigin+item.path);
  const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();assert.equal(schemas.length,1);assert.equal(JSON.parse(schemas[0])['@type'],'BreadcrumbList');assert(!schemas.join('').includes('AggregateRating'));
  const links=await page.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')).filter(x=>x?.startsWith('/')));for(const href of new Set(links)){const result=await context.request.get(origin+href.split('#')[0]);assert.equal(result.status(),200,'Broken local link '+href);}
  await page.getByRole('link',{name:'Skip to guide'}).focus();assert(await page.getByRole('link',{name:'Skip to guide'}).evaluate(x=>x===document.activeElement));
  for(const width of [1280,390]){await page.setViewportSize({width,height:900});for(const zoom of ['1','1.5']){await page.evaluate(z=>document.body.style.zoom=z,zoom);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),item.path+' overflow at '+width+'/'+zoom);}}
  await page.evaluate(()=>document.body.style.zoom='1');results.push({path:item.path,status:'Passed',checks:'SSR/metadata/canonical/breadcrumb/internal links/keyboard/desktop/mobile/simulated150%'});
 }
 await page.goto(origin);assert.equal(await page.locator('h1').count(),1);for(const link of organicPages.slice(0,3))assert(await page.locator(`a[href="${link.path}"]`).count()>0);
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});for(const zoom of ['1','1.5']){await page.evaluate(z=>document.body.style.zoom=z,zoom);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Homepage overflow at '+width+'/'+zoom);}}
 const noJs=await browser.newContext({javaScriptEnabled:false});for(const item of organicPages){const p=await noJs.newPage();const response=await p.goto(origin+item.path);assert.equal(response.status(),200);assert.equal(await p.locator('h1').count(),1);assert((await p.locator('main').innerText()).length>800,'Substantial guide text must be SSR-visible without JavaScript');await p.close();}await noJs.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[],'Guide navigation must not add third-party requests or tracking');
 fs.mkdirSync('docs/seo',{recursive:true});fs.writeFileSync('docs/seo/MERGE-27-TEST-RESULTS.json',JSON.stringify({executed_at:new Date().toISOString(),base:'main 37809c7',unit_and_integration:'Passed',production_website_mutated:false,no_javascript_pages:4,homepage_reflow:'Passed',missing_prototype_status:missing.status,missing_prototype_noindex:true,browser:results,console_errors:0,third_party_requests:0,manual_pending:['Actual browser-toolbar150% zoom','Screen-reader walkthrough','Combined Merge26 functional regression','Search Console/indexing and field Core Web Vitals'],limitations:'Local production build of old main, not the combined release. CSS zoom is a simulation. Missing prototype routes may stream200 with noindex under Cache Components; preserve the live database route HTTP404 during integration.'},null,2)+'\n');
 console.log('PASS Merge27 SEO: metadata and JSON-LD safety, missing/demo noindex (missing HTTP'+missing.status+'), public-only sitemap/robots, PNG dimensions, all4guides SSR/internal links/keyboard/mobile/simulated150%, no browser errors or third-party requests.');
}catch(error){console.error('FAIL Merge27 SEO: '+error.message);if(!browser)console.error(serverLog.slice(-1000));process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();}

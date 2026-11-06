// Anonymous public reads only; never print/store the public request key or rows.
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch(),context=await browser.newContext();
async function measure(){
try{
 const page=await context.newPage();let key,url;const calls=[];const failures=[];page.on("requestfailed",r=>failures.push({host:new URL(r.url()).host,path:new URL(r.url()).pathname,reason:r.failure()?.errorText}));
 page.on('request',r=>{if(r.url().includes('/rest/v1/rpc/get_public_catalogue')){key=r.headers().apikey;url=r.url();}});
 page.on('response',r=>{if(r.url().includes('/rest/v1/rpc/'))void r.finished().then(()=>calls.push({rpc:r.url().split('/').pop(),status:r.status(),ms:r.request().timing().responseEnd}));});
 const start=Date.now();await page.goto('https://playtested.co.uk');const rendered=await page.locator('[data-catalogue-density]').waitFor({timeout:12000}).then(()=>true).catch(()=>false);if(!key||!url){console.log(JSON.stringify({anonymous_bootstrap_unavailable:true,calls,failures,title:page.url()}));return;} 
 const visible_ms=rendered?Date.now()-start:null;
 if(!key||!url)throw Error('Anonymous catalogue request was not observed');
 const results=[];for(const number of [1,2,7]){
  const t=performance.now(),r=await context.request.post(url,{headers:{apikey:key,authorization:'Bearer '+key},data:{p_page:number,p_page_size:12,p_sort:'Featured'}});
  const rows=await r.json();results.push({page:number,status:r.status(),ms:Math.round(performance.now()-t),rows:Array.isArray(rows)?rows.length:null,total:Array.isArray(rows)?Number(rows[0]?.total_count):null,error_code:Array.isArray(rows)?null:rows.code,error_message:Array.isArray(rows)?null:rows.message});
 }
 // Request a plan only if already enabled; never enable production EXPLAIN/config.
 const plan=await context.request.post(url,{headers:{apikey:key,authorization:'Bearer '+key,accept:'application/vnd.pgrst.plan+json; for="application/json"; options=analyze|buffers'},data:{p_page:1,p_page_size:12}});
 fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/MERGE-26-1-PRODUCTION-BASELINE.json',JSON.stringify({at:new Date().toISOString(),environment:'Anonymous production public catalogue; existing connection, no throttling',visible_ms,catalogue_rendered:rendered,calls,results,postgrest_plan_status:plan.status(),production_writes:0},null,2));
 console.log(JSON.stringify({visible_ms,results,postgrest_plan_status:plan.status()}));
}finally{await browser.close();}

}
await measure();

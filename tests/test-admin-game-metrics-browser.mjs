// Local fixture + mocked admin API only; never signs in or connects to hosted data.
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium,expect} from 'playwright/test';
const fixture='app/analytics-metrics-fixture',origin='http://127.0.0.1:3057';
let child,browser;
assert(!fs.existsSync(fixture),'Refuse to overwrite an existing fixture');
assert(!await fetch(origin).then(()=>true).catch(()=>false),'Refuse to reuse an occupied port');
try{
 fs.mkdirSync(fixture);fs.writeFileSync(fixture+'/page.tsx',`import Metrics from '../components/DeveloperGameMetrics';export default function Page(){return <main className="mx-auto max-w-5xl p-4"><Metrics/></main>}`);
 fs.mkdirSync('.backup-tools',{recursive:true});const log=fs.openSync('.backup-tools/analytics-browser.log','a');
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3057'],{stdio:['ignore',log,log],windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'ci-public-placeholder'}});
 for(let n=0;n<90;n++){if(child.exitCode!==null)throw Error('Fixture server exited');if(await fetch(origin).then(r=>r.ok).catch(()=>false))break;if(n===89)throw Error('Fixture server timeout');await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:375,height:900}});
 let mode='success',loadingGate=true,releaseFirst;const firstGate=new Promise(resolve=>{releaseFirst=resolve;});
 await page.route('**/api/admin/analytics/games',async route=>{if(loadingGate)await firstGate;return mode==='error'?route.fulfill({status:503,json:{error:'Fixture unavailable'}}):route.fulfill({json:mode==='legacy'?{submitted:88,claimed:0,combined:85}:mode==='zero'?{published_games:0,approved_claims:0,historical_submission_records:0}:{published_games:21,approved_claims:0,historical_submission_records:96}});});
 await page.goto(origin+'/analytics-metrics-fixture');await expect(page.getByRole('status')).toBeVisible();loadingGate=false;releaseFirst();
 await expect(page.getByRole('heading',{name:'Currently published developer-associated games'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Approved developer ownership claims'})).toBeVisible();
 const metricCards=page.locator('section > div > div');await expect(metricCards.nth(0).getByText('21',{exact:true})).toBeVisible();await expect(metricCards.nth(1).getByText('0',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Historical submission records'})).not.toBeVisible();
 const disclosure=page.locator('summary').filter({hasText:'Diagnostic information'});await disclosure.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Historical submission records'})).toBeVisible();
 await expect(page.getByText('96',{exact:true})).toBeVisible();
 await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Historical submission records'})).not.toBeVisible();
 for(const [width,zoom] of [[375,1],[375,1.5],[853,1],[1280,1.5]]){await page.setViewportSize({width,height:900});await page.evaluate(z=>{document.body.style.zoom=String(z)},zoom);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');}
 const componentAlert=page.locator('section [role="alert"]');
 mode='error';await page.reload();await expect(componentAlert).toBeVisible();mode='zero';await page.locator('section').getByRole('button',{name:'Retry game metrics'}).click();await expect(componentAlert).toHaveCount(0);await expect(page.getByRole('heading',{name:'Approved developer ownership claims'})).toBeVisible();assert.equal(await page.locator('section > div').getByText('0',{exact:true}).count(),2);
 mode='legacy';await page.reload();await expect(componentAlert).toBeVisible();await expect(page.getByText('88',{exact:true})).not.toBeVisible();
 console.log('PASS activity metrics browser: revised labels/counts, keyboard disclosure, loading/error/retry/zero/invalid-payload states, mobile and 150% CSS zoom. Mocked API only.');
}finally{
 if(browser)await browser.close();
 if(child){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'})}catch{}}else child.kill('SIGTERM');}
 const cleanup=path.resolve(fixture);assert.equal(cleanup,path.join(process.cwd(),'app','analytics-metrics-fixture'));fs.rmSync(cleanup,{recursive:true,force:true});
}

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,expect as baseExpect} from 'playwright/test';
const expect=baseExpect.configure({timeout:30000}),origin='http://localhost:3000',dir=path.resolve('app/merge26-label-fixture'),file=path.join(dir,'page.tsx');
assert(dir.startsWith(path.resolve('app')+path.sep));assert(!fs.existsSync(dir),'Refusing to overwrite an existing fixture');
fs.mkdirSync(dir);fs.writeFileSync(file,`import Label from '../components/AnonymousTesterLabel';import Details from '../components/CompactDetails';export default function Fixture(){return <main className="max-w-3xl p-6 text-white"><h1>Isolated tester label fixture</h1><Label testId="26400000-0000-4000-8000-000000000001"/><Label testId="26400000-0000-4000-8000-000000000002"/><Details title="Fixture feedback"><label>Unsaved note<input className="block border p-3"/></label></Details></main>}`);
const browser=await chromium.launch({headless:true});let calls=0,rank=0,missing=false;
try{
 const context=await browser.newContext();await context.route('**/rest/v1/rpc/get_feedback_tester_identities',route=>{calls++;const ids=route.request().postDataJSON().p_test_ids;return route.fulfill({json:ids.map(test_id=>({test_id,public_number:missing?null:114,current_rank:missing?null:rank}))});});
 const page=await context.newPage();await page.goto(origin+'/merge26-label-fixture');await expect(page.getByText('Bronze Tester #114',{exact:true})).toHaveCount(2);assert.equal(calls,1,'Sibling labels are fetched in one batch');
 rank=1;await page.reload();await expect(page.getByText('Silver Tester #114',{exact:true})).toHaveCount(2);assert.equal(calls,2,'A new view resolves fresh current ranks');
 const summary=page.locator('summary').filter({hasText:'Fixture feedback'});await summary.focus();await page.keyboard.press('Enter');const note=page.getByRole('textbox',{name:'Unsaved note'});await expect(note).toBeVisible();await note.fill('Unsaved fixture note');await summary.click();await summary.click();await expect(note).toHaveValue('Unsaved fixture note');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.body.style.zoom='1.5');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 fs.mkdirSync('technical-test-results/m26-final',{recursive:true});await page.screenshot({path:'technical-test-results/m26-final/identity-150-percent.png',fullPage:true});await page.evaluate(()=>document.body.style.zoom='1');await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 missing=true;await page.reload();await expect(page.getByText('Tester profile unavailable',{exact:true})).toHaveCount(2);
 console.log('PASS label browser: actual components batch sibling requests, display stable rank-aware numbers, refresh current rank without renumbering, handle missing profiles, preserve disclosure form state, support keyboard/reduced motion/mobile/150%. Mock identity responses; no database writes.');
}catch(e){console.error('FAIL label browser: '+e.message.split('\n')[0]);process.exitCode=1;}finally{await browser.close();fs.unlinkSync(file);fs.rmdirSync(dir);}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium, expect} from 'playwright/test';

const dir='app/catalogue-fixture';
if(fs.existsSync(dir))throw Error('Refusing to overwrite existing fixture');
fs.mkdirSync(dir);
fs.writeFileSync(dir+'/page.tsx',`import GameCatalogue from '../components/GameCatalogue';export default function Fixture(){return <main><GameCatalogue/></main>}`);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1000}});
 const calls=[];
 let fail=false, empty=false;
 const rows=Array.from({length:12},(_,i)=>({source_type:'approved',game_id:String(i),title:i===0?'Long title '.repeat(12):'Game '+i,developer_name:'Long studio '.repeat(8),genre:'Action',description:i===1?'':'Full description '.repeat(35),image_url:'',ai_type:['AI-generated','AI-assisted','No AI disclosed',null,'Unexpected'][i%5],verification_status:'Not yet verified',total_count:24}));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='localhost')return route.continue({headers:{...route.request().headers(),cookie:''}});
  if(url.pathname.endsWith('/rpc/get_public_catalogue')){calls.push(route.request().postDataJSON());return route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify(fail?{message:'fixture failure'}:empty?[]:rows)});}
  if(url.pathname.endsWith('/rpc/get_game_community_reception'))return route.fulfill({json:[{submission_id:'0',accepted_test_count:2,rated_test_count:2,average_overall_score:8,recommend_positive_percent:100,reception_status:'Early results'}]});
  return route.abort();
 });
 await page.goto('http://localhost:3000/catalogue-fixture');
 const compact=page.getByRole('button',{name:'Compact',exact:true}),comfortable=page.getByRole('button',{name:'Comfortable',exact:true});
 await expect(page.locator('article')).toHaveCount(12);
 await expect(compact).toHaveAttribute('aria-pressed','true');
 const columns=()=>page.locator('[data-catalogue-density]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 const smallColumns=await columns();
 await comfortable.focus();await page.keyboard.press('Enter');assert(await columns()<smallColumns);
 await expect(page.locator('article').first()).toContainText('Early results');
 await expect(page.locator('article').first()).toContainText('2 ratings');
 for(const label of ['AI-generated','AI-assisted','No AI disclosed','AI use unknown'])assert(await page.locator('article').filter({hasText:label}).count()>0);
 await expect(page.getByText('No description provided.')).toHaveCount(1);
 await page.locator('article').first().locator('summary').click();await expect(page.locator('article').first().locator('details')).toHaveAttribute('open','');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect.poll(()=>calls.at(-1)?.p_page).toBe(2);await expect(comfortable).toHaveAttribute('aria-pressed','true');
 const requests=calls.length;await compact.click();await expect(page.getByRole('button',{name:'2',exact:true})).toHaveAttribute('aria-current','page');assert.equal(calls.length,requests,'Density must not refetch or reset page');
 await page.getByRole('combobox',{name:'Filter by AI use'}).selectOption('AI-assisted');await expect.poll(()=>calls.at(-1)?.p_ai_type).toBe('AI-assisted');await expect(compact).toHaveAttribute('aria-pressed','true');
 for(const width of [390,320,640])for(const mode of [comfortable,compact]){await page.setViewportSize({width,height:900});await mode.click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Reflow overflow at '+width);}
 empty=true;await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();await expect(page.getByRole('heading',{name:'No games found'})).toBeVisible();
 fail=true;await page.getByRole('combobox',{name:'Filter by AI use'}).selectOption('AI-generated');await expect(page.getByText(/The catalogue could not be loaded/)).toBeVisible();await expect(page.getByRole('heading',{name:'No games found'})).toHaveCount(0);
 console.log('PASS catalogue: density, disclosure/missing data, small sample, full description, filter/page preservation, mobile and 640px reflow, empty/error. Backend mocked; no live access.');
}finally{await browser.close();fs.unlinkSync(dir+'/page.tsx');fs.rmdirSync(dir);}

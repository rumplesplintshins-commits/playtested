const origin=process.env.TEST_APP_URL||'http://localhost:3000';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium, expect} from 'playwright/test';

if(process.argv.includes('--information')){
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='localhost')return route.continue({headers:{...route.request().headers(),cookie:''}});
   if(url.pathname.endsWith('/rpc/get_public_catalogue')||url.pathname.endsWith('/rpc/get_game_community_reception'))return route.fulfill({json:[]});
   return route.abort();
  });
  const page=await context.newPage();
  for(const path of ['/','/terms','/privacy','/contact','/login']){
   await page.goto(origin+path);
   await expect(page.getByRole('contentinfo')).toHaveCount(1);
   const nav=page.getByRole('navigation',{name:'Legal and support'});
   for(const [name,href]of [['Terms of Use','/terms'],['Privacy Notice','/privacy'],['Contact/Support','/contact']])await expect(nav.getByRole('link',{name,exact:true})).toHaveAttribute('href',href);
   for(const width of [390,320,1280]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})),{message:'Reflow '+path+' '+width}).toEqual({width,scroll:width});}
   if(path==='/'){
    await expect(page.getByRole('heading',{name:/Let machines handle the repetitive work/})).toBeVisible();
    assert(await page.evaluate(()=>{const about=document.querySelector('#about'),footer=document.querySelector('body > footer');return !!about&&!!footer&&about.parentElement.lastElementChild===about&&about.parentElement.nextElementSibling===footer;}),'Footer immediately follows homepage main / final idea section');
   }
   if(path==='/terms'||path==='/privacy'){
    await expect(page.getByText(/Draft — not final launch terms/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
   }
   if(path==='/contact'){
    await expect(page.getByRole('link',{name:'support.playtested@gmail.com'})).toHaveAttribute('href','mailto:support.playtested@gmail.com');
    const copy=page.getByRole('button',{name:'Copy email address'});await copy.focus();await page.keyboard.press('Enter');await expect(page.getByRole('status').filter({hasText:'Email address copied.'})).toBeVisible();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'support.playtested@gmail.com');
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('fixture denied'))}}));await copy.click();await expect(page.getByRole('status').filter({hasText:'Copy was unavailable'})).toBeVisible();
    await page.getByRole('navigation',{name:'Legal and support'}).getByRole('link',{name:'Terms of Use',exact:true}).click();await expect(page).toHaveURL(/\/terms$/);
   }
  }
  console.log('PASS information pages: routes, one shared footer, homepage placement, links, draft/noindex labels, mailto, keyboard copy and denied fallback, mobile reflow. Backend blocked/mocked; no live writes.');
 }finally{await browser.close();}
 process.exit(0);
}

const dir='app/catalogue-fixture';
if(fs.existsSync(dir))throw Error('Refusing to overwrite existing fixture');
fs.mkdirSync(dir);
fs.writeFileSync(dir+'/page.tsx',`import GameCatalogue from '../components/GameCatalogue';export default function Fixture(){return <main><GameCatalogue/></main>}`);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1000}});
 const calls=[];
 let fail=false, empty=false, recruitmentFailure=false;
 const recruitmentCalls=[];
 const rows=Array.from({length:12},(_,i)=>({source_type:'approved',game_id:String(i),title:i===0?'Long title '.repeat(12):'Game '+i,developer_name:'Long studio '.repeat(8),genre:'Action',description:i===1?'':'Full description '.repeat(35),image_url:'',ai_type:['AI-generated','AI-assisted','No AI disclosed',null,'Unexpected'][i%5],verification_status:'Not yet verified',total_count:24}));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='localhost')return route.continue({headers:{...route.request().headers(),cookie:''}});
  if(url.pathname.endsWith('/rpc/get_public_catalogue')){calls.push(route.request().postDataJSON());return route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify(fail?{message:'fixture failure'}:empty?[]:rows)});}
  if(url.pathname.endsWith('/rpc/get_game_community_reception'))return route.fulfill({json:[{submission_id:'0',accepted_test_count:2,rated_test_count:2,average_overall_score:8,recommend_positive_percent:100,reception_status:'Early results'}]});
  if(url.pathname.endsWith('/rpc/get_public_recruitment')){const body=route.request().postDataJSON();recruitmentCalls.push(body);return route.fulfill({status:recruitmentFailure?503:200,json:recruitmentFailure?{code:'PGRST202'}:body.p_games.map((game,i)=>({...game,recruiting:i===0||i===11}))});}
  if(url.pathname.endsWith('/rpc/get_public_intent_counts'))return route.fulfill({json:[{kind:'approved',id:'0',lifetime:{recommend:{definitely:1,probably:0,answered:1},continue:{definitely:0,probably:0,answered:0}},builds:[]}]});
  if(url.pathname.endsWith('/rpc/get_public_listing_updates'))return route.fulfill({json:[{kind:'approved',id:'0',fields:{},disputed:true,pending:true,reassessment:false}]});
  return route.abort();
 });
 await page.goto(origin+'/catalogue-fixture');
 const compact=page.getByRole('button',{name:'Compact',exact:true}),comfortable=page.getByRole('button',{name:'Comfortable',exact:true});
 await expect(page.locator('article')).toHaveCount(12);
 await expect(compact).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('article').first()).toContainText('Disclosure update pending review');await expect(page.locator('article').first()).not.toContainText('Independent assessment: not completed');
 await expect(page.locator('[aria-label^="Recruiting testers."]')).toHaveCount(2);
 assert.equal(recruitmentCalls.length,1);assert.equal(recruitmentCalls[0].p_games.length,12);
 await page.locator('[aria-label^="Recruiting testers."]').first().focus();await expect(page.locator('[aria-label^="Recruiting testers."]').first()).toBeFocused();await expect(page.locator('[aria-label^="Recruiting testers."]').first()).toHaveAttribute('aria-label',/Eligibility requirements apply/);
 const columns=()=>page.locator('[data-catalogue-density]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 const smallColumns=await columns();
 await comfortable.focus();await page.keyboard.press('Enter');assert(await columns()<smallColumns);
 await expect(page.locator('[aria-label^="Recruiting testers."]')).toHaveCount(2);assert.equal(recruitmentCalls.length,1,'Density must not request availability again');
 await expect(page.locator('article').first()).toContainText('Early results');
 await expect(page.locator('article').first()).toContainText('2 ratings');await expect(page.locator('article').first()).toContainText('1 out of 1 positive');
 for(const label of ['AI-generated','AI-assisted','No AI disclosed','AI Use Unknown'])assert(await page.locator('article').filter({hasText:label}).count()>0);
 await expect(page.getByText('No description provided.')).toHaveCount(1);
 await page.locator('article').first().locator('summary').click();await expect(page.locator('article').first().locator('details')).toHaveAttribute('open','');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect.poll(()=>calls.at(-1)?.p_page).toBe(2);await expect(comfortable).toHaveAttribute('aria-pressed','true');
 const requests=calls.length;await compact.click();await expect(page.getByRole('button',{name:'2',exact:true})).toHaveAttribute('aria-current','page');assert.equal(calls.length,requests,'Density must not refetch or reset page');
 await page.getByRole('combobox',{name:'Filter by AI use'}).selectOption('AI-assisted');await expect.poll(()=>calls.at(-1)?.p_ai_type).toBe('AI-assisted');await expect(compact).toHaveAttribute('aria-pressed','true');
 for(const width of [390,320,640])for(const mode of [comfortable,compact]){await page.setViewportSize({width,height:900});await mode.click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Reflow overflow at '+width);}
 recruitmentFailure=true;await page.getByRole('combobox',{name:'Filter by AI use'}).selectOption('AI-generated');await expect.poll(()=>recruitmentCalls.length).toBe(calls.length);await expect(page.locator('[aria-label^="Recruiting testers."]')).toHaveCount(0);await expect(page.locator('article')).toHaveCount(12);recruitmentFailure=false;
 empty=true;await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();await expect(page.getByRole('heading',{name:'No games found'})).toBeVisible();
 fail=true;await page.getByRole('combobox',{name:'Filter by AI use'}).selectOption('AI-generated');await expect(page.getByText(/The catalogue could not be loaded/)).toBeVisible();await expect(page.getByRole('heading',{name:'No games found'})).toHaveCount(0);
 console.log('PASS catalogue: density, disclosure/missing data, small sample, full description, filter/page preservation, mobile and 640px reflow, empty/error. Backend mocked; no live access.');
}finally{await browser.close();fs.unlinkSync(dir+'/page.tsx');fs.rmdirSync(dir);}

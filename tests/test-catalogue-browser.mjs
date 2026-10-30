const origin=process.env.TEST_APP_URL||'http://localhost:3000';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium, expect} from 'playwright/test';

if(process.argv.includes('--community-feed')){await communityFeedBrowser();process.exit(0);}
if(process.argv.includes('--votes')){await voteBrowser();process.exit(0);}
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

async function voteBrowser(){
 const {default:env}=await import('@next/env');env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
 const browser=await chromium.launch({headless:true});const user={id:'c9000000-0000-4000-8000-000000000001',email:'fixture@example.test',aud:'authenticated',role:'authenticated'};let value=0,writes=0,fail=false,commitThenFail=false,release=null,hold=false;
 try{const context=await browser.newContext();const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const expiry=Math.floor(Date.now()/1000)+3600;const session={access_token:encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:expiry,role:'authenticated'})+'.fixture',refresh_token:'fixture',expires_in:3600,expires_at:expiry,token_type:'bearer',user};await context.addCookies([{name:'sb-'+new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]+'-auth-token',value:'base64-'+encode(session),url:origin}]);await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue({headers:{...req.headers(),cookie:''}});const name=url.pathname.split('/').at(-1),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});let data=[];
 if(name==='user')data=user;else if(name==='community_posts')data=[{id:99,user_id:user.id,community:'general',title:'Isolated vote fixture',body:'Not the retained live post',created_at:'2026-10-29'}];else if(name==='profiles')return route.fulfill({status:403,headers,json:{code:'42501',message:'Fixture profile privacy'}});else if(name==='community_votes'){
  if(req.method()==='GET')data=[{post_id:99,user_id:'other',value:1},...(value?[{post_id:99,user_id:user.id,value}]:[])];else{writes++;if(hold)await new Promise(resolve=>release=resolve);if(!fail||commitThenFail)value=req.method()==='DELETE'?0:req.postDataJSON().value;if(fail){fail=false;commitThenFail=false;return route.fulfill({status:503,headers,json:{message:'fixture failed'}});}data=null;}}
 return route.fulfill({headers,json:data});});const page=await context.newPage();await page.goto(origin+'/community');const article=page.locator('article').filter({hasText:'Isolated vote fixture'}),up=()=>article.getByRole('button',{name:/[Uu]pvote/}),down=()=>article.getByRole('button',{name:/[Dd]ownvote/});const score=()=>article.locator('span').filter({has:page.locator('.sr-only')}).first();
 await expect(up()).toHaveAttribute('aria-pressed','false');
 for(const [direction,expected,pressed]of[[1,2,1],[1,1,0],[-1,0,-1],[-1,1,0],[-1,0,-1],[1,2,1],[-1,0,-1]]){await(direction===1?up():down()).click();await expect(score()).toContainText(String(expected));await expect(up()).toHaveAttribute('aria-pressed',String(pressed===1));await expect(down()).toHaveAttribute('aria-pressed',String(pressed===-1));await expect(direction===1?up():down()).toBeEnabled();}
 await page.reload();await expect(down()).toHaveAttribute('aria-pressed','true');await expect(score()).toContainText('0');
 fail=true;await up().click();await expect(page.getByRole('alert').filter({hasText:'Your vote request failed'})).toBeVisible();await expect(down()).toHaveAttribute('aria-pressed','true');await expect(score()).toContainText('0');
 fail=true;commitThenFail=true;await up().click();await expect(up()).toHaveAttribute('aria-pressed','true');await expect(score()).toContainText('2');
 hold=true;const before=writes;await up().evaluate(button=>{button.click();button.click();});await expect(up()).toBeDisabled();await expect.poll(()=>writes).toBe(before+1);hold=false;release();await expect(up()).toBeEnabled();assert.equal(writes,before+1);await expect(up()).toHaveAttribute('aria-pressed','false');
 await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const out=await browser.newContext();await out.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin===origin)return route.continue({headers:{...req.headers(),cookie:''}});const n=u.pathname.split('/').at(-1);return route.fulfill({status:n==='user'?401:200,json:n==='community_posts'?[{id:99,user_id:null,community:'general',title:'Signed out fixture',body:'Fixture',created_at:'2026-10-29'}]:[]});});const signedOut=await out.newPage();await signedOut.goto(origin+'/community');await signedOut.getByRole('button',{name:'Sign in to upvote Signed out fixture',exact:true}).click();await expect(signedOut).toHaveURL(origin+'/login?next=/community');
 console.log('PASS vote browser: six transitions, selected arrow/removal labels, persistence, failed and ambiguously committed requests, synchronous double-click lock, signed-out sign-in and mobile. All votes mocked on post 99 only.');
 }finally{await browser.close();}
}

async function communityFeedBrowser(){
 const browser=await chromium.launch({headless:true});let failPosts=true,failVotes=false,empty=false,hold=false,release=null,profileReads=0;
 try{const context=await browser.newContext();await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue({headers:{...req.headers(),cookie:''}});const name=url.pathname.split('/').at(-1),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});assert.equal(req.method(),'GET','Feed test must never write');if(name==='user')return route.fulfill({status:401,headers,json:{message:'Not signed in'}});if(name==='profiles'){profileReads++;return route.fulfill({status:401,headers,json:{code:'42501',message:'Fixture private profiles'}});}if(name==='community_posts'){if(failPosts)return route.fulfill({status:400,headers,json:{code:'fixture_network',message:'Fixture unavailable'}});if(hold)await new Promise(resolve=>release=resolve);return route.fulfill({headers,json:empty?[]:[{id:99,user_id:'fixture-author',community:'general',title:'Real public fixture',body:'A real database response, not built-in examples',created_at:'2026-10-30'}]});}if(name==='community_votes')return failVotes?route.fulfill({status:403,headers,json:{code:'42501',message:'Fixture votes unavailable'}}):route.fulfill({headers,json:[{post_id:99,user_id:'fixture-other',value:1}]});return route.fulfill({headers,json:name==='community_comments'?[{post_id:99}]:[]});});
 const page=await context.newPage();await page.goto(origin+'/community');await expect(page.getByRole('alert').filter({hasText:'fixture_network'})).toBeVisible();await expect(page.locator('article')).toHaveCount(0);await expect(page.getByText('Welcome to the Playtested community',{exact:true})).toHaveCount(0);
 failPosts=false;hold=true;await page.getByRole('button',{name:'Refresh feed',exact:true}).click();await expect(page.getByRole('button',{name:'Refreshing feed...',exact:true})).toBeDisabled();await expect.poll(()=>typeof release).toBe('function');hold=false;release();await expect(page.getByText('Real public fixture',{exact:true})).toBeVisible();await expect(page.locator('article')).toHaveCount(1);await expect(page.locator('article')).toContainText('Community member');assert.equal(profileReads,0,'Signed-out feed must not read private profiles');await expect(page.getByRole('alert').filter({hasText:"Couldn't load the community feed"})).toHaveCount(0);
 empty=true;await page.reload();await expect(page.getByText('No posts found',{exact:true})).toBeVisible();await expect(page.locator('article')).toHaveCount(0);
 empty=false;failVotes=true;await page.reload();await expect(page.getByRole('alert').filter({hasText:'42501'})).toBeVisible();await expect(page.locator('article')).toHaveCount(0);failVotes=false;await page.getByRole('button',{name:'Refresh feed',exact:true}).click();await expect(page.getByText('Real public fixture',{exact:true})).toBeVisible();assert.equal(profileReads,0);
 console.log('PASS community feed: no built-in examples on failure/empty, anonymous profile privacy, required-data failures, visible retry/loading and successful recovery. All backend reads mocked; no writes.');
 }finally{await browser.close();}
}

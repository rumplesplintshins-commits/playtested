import { chromium, expect } from 'playwright/test';
import nextEnv from '@next/env';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const origin=process.env.TEST_APP_URL||'http://localhost:3000';
const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const uid='10000000-0000-0000-0000-000000000001';
const campaign='20000000-0000-0000-0000-000000000001';
const test='30000000-0000-0000-0000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture-signature`;
const session={access_token:token,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
let restrictionReason='Requires Strategy interest';
let claim={id:test,submission_id:null,playtest_id:campaign,status:'in_progress',review_outcome:'pending',review_reason:null,xp_awarded:false};
let failSubmit=true,failRelease=true,failReclaim=true,reclaims=0;let reviewEvents=[];
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();
 await context.addCookies([{name:`sb-${backend.hostname.split('.')[0]}-auth-token`,value:`base64-${encode(session)}`,url:origin}]);
 // Browser requests are mocked; remove fixture cookies before any local-server
 // request so the Next proxy cannot make a real Supabase auth request.
 await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===backend.origin){
     const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
     if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
     let data=null,status=200;
     if(url.pathname.endsWith('/auth/v1/user'))data=user;
     else if(url.pathname.endsWith('/profiles'))data={id:uid,role:'user',roles:['tester'],tester_xp:0,developer_xp:0,completed_tests:0};
     else if(url.pathname.endsWith('/community_game_tests'))data=req.headers().accept?.includes('object')?claim:(claim?[claim]:[]);
     else if(url.pathname.endsWith('/get_testing_capacity_policy'))data={places:4,reservation_hours:72,server_now:new Date().toISOString(),activated_at:new Date().toISOString()};
     else if(url.pathname.endsWith('/get_my_test_reservations'))data={server_now:new Date().toISOString(),claims:claim?[claim]:[]};
     else if(url.pathname.endsWith('/claim_community_game_test')){reclaims++;if(failReclaim){failReclaim=false;status=400;data={message:'This campaign is full',code:'P0001'};}else{claim={...claim,status:'in_progress',reservation_expires_at:new Date(Date.now()+72*3600000).toISOString()};data=test;}}
     else if(url.pathname.endsWith('/start_community_game_test')){claim={...claim,status:'in_progress'};data=null;}
     else if(url.pathname.endsWith('/test_review_events'))data=reviewEvents;
     else if(url.pathname.endsWith('/get_my_testing_progress'))data={rank:0,xp:0,accepted:0,reviewed:0,passed:0,genres:['Action']};
     else if(url.pathname.endsWith('/get_discoverable_community_test_games'))data=[{submission_id:campaign,title:'Browser fixture',developer_name:'Fixture developer',genre:'Action',description:'Test movement',game_link:'https://example.test/build.zip',access_type:'download_build',image_url:null,focus_areas:[]},{submission_id:'20000000-0000-0000-0000-000000000002',title:'Adventure fixture',developer_name:'Fixture developer',genre:'Adventure',description:'Explore',game_link:'https://example.test/adventure',access_type:'browser_game',image_url:null,focus_areas:[]},{submission_id:'20000000-0000-0000-0000-000000000003',title:'Strategy restricted fixture',developer_name:'Fixture developer',genre:'Strategy',description:'Plan your station',game_link:null,access_type:'browser_game',image_url:null,focus_areas:[],can_claim:false,restriction_reason:restrictionReason}];
     else if(url.pathname.endsWith('/get_campaign_testing_details'))data={minimum_rank:0,testing_genre:'Action',genre_restricted:false,capacity:4,submitted:0,testing:1,available:3};
     else if(url.pathname.endsWith('/submit_community_game_test')){
       if(failSubmit){status=400;data={message:'Simulated submission failure',code:'P0001'};failSubmit=false;}
       else claim={...claim,status:'submitted'};
     } else if(url.pathname.endsWith('/release_community_game_test')){
       if(failRelease){status=400;data={message:'Simulated release failure',code:'P0001'};failRelease=false;}
       else claim=null;
     } else throw new Error(`Unmocked Supabase path: ${url.pathname}`);
     return route.fulfill({status,headers,json:data});
   }
   if(url.origin===new URL(origin).origin){const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
   return route.abort();
 });
 const page=await context.newPage();
 page.setDefaultTimeout(15000);
 await page.goto(`${origin}/tester`);
 await expect(page.getByRole('heading',{name:'Bronze Tester'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Adventure fixture'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Strategy restricted fixture'})).toHaveCount(0);
 await page.getByLabel('Testing genre',{exact:false}).selectOption('all');
 await expect(page.getByRole('heading',{name:'Adventure fixture'})).toBeVisible();
 const restricted=page.locator('article').filter({has:page.getByRole('heading',{name:'Strategy restricted fixture'})});
 await expect(restricted.getByText('Requires Strategy interest',{exact:false})).toBeVisible();
 await expect(restricted.getByRole('button',{name:'Requirements not met'})).toBeDisabled();
 await expect(page.getByText('1 game you can test',{exact:true})).toBeVisible();
 await expect(page.getByText('1 game with unmet requirements',{exact:true})).toBeVisible();
 await expect(restricted.getByRole('link',{name:'Edit interests'})).toHaveAttribute('href','/account#testing-interests');
 for(const width of [320,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await expect(page.getByText('1 game with unmet requirements',{exact:true})).toBeVisible();}
 await page.setViewportSize({width:1280,height:900});
 await page.getByLabel('Testing genre',{exact:false}).selectOption('Strategy');
 await expect(page.getByText('0 games you can test',{exact:true})).toBeVisible();
 await expect(page.getByText('1 game with unmet requirements',{exact:true})).toBeVisible();
 await page.getByLabel('Testing genre',{exact:false}).selectOption('Adventure');
 await expect(page.getByText('1 game you can test',{exact:true})).toBeVisible();
 await expect(page.getByText('0 games with unmet requirements',{exact:true})).toBeVisible();
 await page.getByLabel('Testing genre',{exact:false}).selectOption('all');
 await page.getByRole('button',{name:'Finish feedback'}).click();
 const selects=page.locator('form select');
 assert.equal(await selects.count(),5);
 for(let i=0;i<5;i++)assert.equal(await selects.nth(i).inputValue(),'');
 await selects.nth(0).selectOption('1');await selects.nth(1).selectOption('definitely_not');await selects.nth(2).selectOption('probably_not');await selects.nth(3).selectOption('2');await selects.nth(4).selectOption('3');
 await page.locator('form input[type="number"]').fill('0');
 const texts=page.locator('form textarea');
 await texts.nth(0).fill('Movement');await texts.nth(1).fill('None');await texts.nth(3).fill('Tutorial');
 const key=`playtested:feedback-draft:v1:${uid}:${test}`;
 await expect(page.getByRole('progressbar',{name:'Feedback form completion'})).toHaveAttribute('aria-valuenow','9');
 await expect.poll(()=>page.evaluate(k=>!!localStorage.getItem(k),key)).toBe(true);
 await page.getByRole('button',{name:'Submit review'}).click();
 await expect(page.getByText('Simulated submission failure',{exact:false})).toBeVisible();
 assert.ok(await page.evaluate(k=>localStorage.getItem(k),key),'failed submission preserves draft');
 await page.reload();await page.getByRole('button',{name:'Finish feedback'}).click();
 await expect(page.locator('form textarea').nth(0)).toHaveValue('Movement');
 await page.getByRole('button',{name:'Submit review'}).click();
 await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),key)).toBe(null);
 claim={id:test,submission_id:null,playtest_id:campaign,status:'in_progress',review_outcome:'pending',review_reason:null,xp_awarded:false};
 await page.reload();await page.getByRole('button',{name:'Finish feedback'}).click();
 await page.locator('form textarea').nth(0).fill('Keep this draft until release succeeds');
 await page.getByRole('button',{name:'Back to your active tests'}).click();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Release game',exact:true}).click();
 await expect(page.getByText('Simulated release failure',{exact:false})).toBeVisible();
 assert.ok(await page.evaluate(k=>localStorage.getItem(k),key),'failed release preserves draft');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Release game',exact:true}).click();
 await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),key)).toBe(null);

 await page.getByLabel('Testing genre',{exact:false}).selectOption('all');
 await expect(page.getByText('2 games you can test',{exact:true})).toBeVisible();
 restrictionReason='Requires Silver tester rank';await page.reload();
 await page.getByLabel('Testing genre',{exact:false}).selectOption('all');
 await expect(restricted.getByText('Requires Silver tester rank',{exact:true})).toBeVisible();
 await expect(restricted.getByRole('link',{name:'Edit interests'})).toHaveCount(0);
 restrictionReason='Requires Strategy interest';

 // Expiry preserves the actual editor draft and requires a successful reclaim.
 claim={id:test,submission_id:null,playtest_id:campaign,status:'in_progress',review_outcome:'pending',review_reason:null,xp_awarded:false,reservation_expires_at:new Date(Date.now()+3600000).toISOString()};await page.reload();await expect(page.getByText(/Final 24 hours/)).toBeVisible();await page.getByRole('button',{name:'Finish feedback'}).click();await page.locator('form textarea').nth(0).fill('Preserve my expired draft');await page.getByRole('button',{name:'Back to your active tests'}).click();
 claim={...claim,reservation_expires_at:new Date(Date.now()-1000).toISOString()};await page.reload();await expect(page.getByText('Reservation expired',{exact:true})).toBeVisible();assert(await page.evaluate(k=>localStorage.getItem(k),key));await page.getByRole('button',{name:'Open saved draft'}).click();await expect(page.locator('form textarea').nth(0)).toHaveValue('Preserve my expired draft');await expect(page.getByRole('button',{name:'Submit review'})).toBeDisabled();
 await page.getByRole('button',{name:'Reclaim place',exact:true}).first().click();await expect(page.getByText(/Could not claim this game: This campaign is full/)).toBeVisible();await expect(page.locator('form textarea').nth(0)).toHaveValue('Preserve my expired draft');
 await page.getByRole('button',{name:'Reclaim place',exact:true}).first().click();await expect(page.getByRole('button',{name:'Submit review'})).toBeEnabled();await expect(page.locator('form textarea').nth(0)).toHaveValue('Preserve my expired draft');assert.equal(claim.id,test);assert.equal(reclaims,2);assert(new Date(claim.reservation_expires_at)>new Date());
 for(const width of[1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}

 // Expiry must not unmount an in-memory editor if browser draft storage is unavailable.
 claim={...claim,reservation_expires_at:new Date(Date.now()+10000).toISOString()};await page.clock.install({time:Date.now()});await page.reload();await page.getByRole('button',{name:'Finish feedback'}).click();await page.evaluate(()=>{window.__draftSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('playtested:feedback-draft:'))throw new Error('Fixture storage unavailable');return window.__draftSet.call(this,key,value)}});await page.locator('form textarea').nth(0).fill('Memory only expired draft');await page.clock.fastForward(11000);await expect(page.getByRole('button',{name:'Submit review'})).toBeDisabled();await expect(page.locator('form textarea').nth(0)).toHaveValue('Memory only expired draft');await expect(page.getByText(/Reservation expired. Your draft is kept/)).toBeVisible();await page.evaluate(()=>{Storage.prototype.setItem=window.__draftSet});

 claim={...claim,status:'reviewed',review_outcome:'accepted',xp_awarded:true,base_xp_amount:60,quality_rubric_version:2,feedback_quality_score:60,review_reason:'Specific observations; please add task focus and a takeaway.'};reviewEvents=[{id:1,test_id:test,kind:'accepted',reason:claim.review_reason,xp_delta:-40,rubric_version:2,quality_score:60,actual_xp_award:60}];await page.reload();await expect(page.getByText(/Feedback quality 60%/).first()).toBeVisible();await expect(page.getByText(/Admin reason: Specific observations/)).toBeVisible();await expect(page.getByRole('button',{name:'Send request'})).toBeVisible();await page.getByText('XP and review history',{exact:true}).click();await expect(page.getByText(/XP change -40/)).toBeVisible();assert(!(await page.locator('body').innerText()).includes('earned 100 XP'));
 console.log('PASS reservation browser: server deadline/final-24h warning, expired activity and freed active slot, disabled expired submission, retained draft after reload/failed reclaim, same-ID successful reclaim and editor continuity; desktop/mobile no overflow. All backend traffic mocked.');
 console.log('PASS: mocked-service browser check — preferred/All genres, blank ratings, drafts after failed submission/reload/release, cleanup after confirmed submission/release. No live Supabase calls.');
}finally{await browser.close();}

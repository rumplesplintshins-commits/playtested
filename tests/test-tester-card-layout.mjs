// Localhost-only geometry and interaction regression. All backend traffic is mocked.
import {chromium,expect} from 'playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
const origin=process.env.TEST_APP_URL||'http://localhost:3001';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Local UI only');
const backend=process.env.NEXT_PUBLIC_SUPABASE_URL||'http://127.0.0.1:54341';
assert(['localhost','127.0.0.1','example.supabase.co'].includes(new URL(backend).hostname),'Local or CI placeholder fixtures only; backend traffic is fully mocked');
const output=path.resolve('.backup-tools/tester-card-layout');fs.mkdirSync(output,{recursive:true});
const uid='10000000-0000-0000-0000-000000000001',claimId='30000000-0000-0000-0000-000000000001';
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#153426"/><text x="35" y="175" fill="#77f29b" font-size="35">Local playtest fixture</text></svg>');
const fullBrief='Full instructions end marker';
const games=Array.from({length:6},(_,i)=>({submission_id:'20000000-0000-0000-0000-'+String(i+1).padStart(12,'0'),title:i===1?'A deliberately long game title that needs two lines and then truncates without changing card height':'Layout fixture '+(i+1),developer_name:i===2?'DeveloperNameWithoutSpaces'.repeat(12):'Fixture developer',genre:'Action',description:["Try the tutorial.",('Explore the town and record bugs.\n'.repeat(70))+fullBrief,'UnbrokenInstructions'.repeat(100),'Check controls and movement. '.repeat(12),'','Test progression and accessibility. '.repeat(80)][i],game_link:'https://example.test/build',access_type:'browser_game',image_url:i%2?null:image,focus_areas:i===1?['Controls','Accessibility','Progression']:[],ai_type:i%2?'AI assisted':null,platform:i%2?'browser':'pc',can_claim:i!==5,restriction_reason:i===5?'Requires Silver tester rank':null}));
let active=false,activeStatus='in_progress',refreshes=0,starts=0,releases=0;const user={id:uid,aud:'authenticated',role:'authenticated',email:'layout@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.fixture';
const session={access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
const extension=path.join(output,'zoom-extension');fs.mkdirSync(extension,{recursive:true});
fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Local card zoom check',version:'1.0',permissions:['tabs'],host_permissions:[origin+'/*'],background:{service_worker:'worker.js'}}));
fs.writeFileSync(path.join(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
const context=await chromium.launchPersistentContext(path.join(output,'profile-'+Date.now()),{channel:'chromium',headless:true,viewport:{width:1440,height:1000},args:['--disable-extensions-except='+extension,'--load-extension='+extension]});
try{
 await context.addCookies([{name:'sb-'+new URL(backend).hostname.split('.')[0]+'-auth-token',value:'base64-'+encode(session),url:origin}]);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===new URL(backend).origin){
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   let data=[];const rpc=url.pathname.split('/').at(-1);const claims=active?[{id:claimId,submission_id:null,playtest_id:games[0].submission_id,status:activeStatus,review_outcome:'pending',review_reason:null,xp_awarded:false}]:[];
   if(rpc==='user')data=user;
   else if(rpc==='profiles')data={id:uid,role:'user',roles:['tester'],tester_xp:0,developer_xp:0,completed_tests:0};
   else if(rpc==='get_discoverable_community_test_games')data=games;
   else if(rpc==='get_testing_capacity_policy')data={places:4,reservation_hours:72,server_now:new Date().toISOString(),activated_at:new Date().toISOString()};
   else if(rpc==='get_my_test_reservations')data={server_now:new Date().toISOString(),claims};
   else if(rpc==='community_game_tests')data=req.headers().accept?.includes('object')?claims[0]:claims;
   else if(rpc==='claim_community_game_test'){active=true;activeStatus='claimed';data=claimId;}
   else if(rpc==='start_community_game_test'){activeStatus='in_progress';starts++;data=null;}
   else if(rpc==='release_community_game_test'){active=false;releases++;data=null;}
   else if(rpc==='get_my_testing_progress')data={rank:0,xp:0,accepted:0,reviewed:0,passed:0,genres:['Action']};
   else if(rpc==='get_my_notifications')data={notifications:[],unread_count:0};
   else if(rpc==='get_campaign_testing_details'){refreshes++;data={minimum_rank:0,testing_genre:'Action',genre_restricted:false,capacity:4,accepted:1,submitted:1,testing:1,available:2};}
   else if(rpc==='get_game_pc_requirements')data=null;
   else if(rpc==='account_pc_specs')data={specs:null};
   return route.fulfill({headers,json:data});
  }
  if(url.origin===new URL(origin).origin){const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
  return route.abort();
 });
 const page=await context.newPage();await page.goto(origin+'/tester');
 const available=page.locator('section[aria-labelledby="available-tests-heading"]');const cards=available.locator('article');await expect(cards).toHaveCount(6);await expect(cards.first().getByText(/1\/4 accepted/)).toBeVisible();
 await expect(page.getByText('How places work',{exact:true})).toHaveCount(1);
 await expect(page.getByText('Reservation deadlines',{exact:true})).toHaveCount(1);
 await expect(cards.getByText('How places work',{exact:true})).toHaveCount(0);
 await page.getByText('How places work',{exact:true}).click();await expect(page.getByText(/A new confirmed claim reserves one place/)).toBeVisible();await page.getByText('How places work',{exact:true}).click();
 await page.getByText('Reservation deadlines',{exact:true}).click();await expect(page.getByText(/Each confirmed reservation keeps its original server-issued deadline/)).toBeVisible();await page.getByText('Reservation deadlines',{exact:true}).click();
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 async function zoom(factor){const actual=await worker.evaluate(async({origin,factor})=>{const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url?.startsWith(origin));await chrome.tabs.setZoom(tab.id,factor);return chrome.tabs.getZoom(tab.id);},{origin,factor});assert.equal(actual,factor);await page.waitForTimeout(150);}
 async function geometry(label,equal){
  const sizes=await cards.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();const buttons=[...node.querySelectorAll('button')];const action=buttons.find(b=>['Test game','Requirements not met'].includes(b.textContent.trim()));const a=action.getBoundingClientRect();return {height:r.height,footerGap:r.bottom-a.bottom,previewLength:node.querySelector('section[aria-label="Test brief"] p.line-clamp-4').textContent.length};}));
  fs.writeFileSync(path.join(output,label+'-geometry.json'),JSON.stringify(sizes,null,2));await available.screenshot({path:path.join(output,label+'.png')});
  if(equal){assert(Math.max(...sizes.map(x=>x.height))-Math.min(...sizes.map(x=>x.height))<2,label+': equal card heights');assert(Math.max(...sizes.map(x=>x.footerGap))-Math.min(...sizes.map(x=>x.footerGap))<2,label+': aligned footer actions');}
  assert(sizes.every(x=>x.previewLength<=201),'Brief preview bounded');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no horizontal overflow');
  await available.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,label+'-viewport.png')});return sizes;
 }
 const originalOrder=await cards.locator('h3').allTextContents();
 await page.getByRole('button',{name:'Minimise Layout fixture 1',exact:true}).click();await expect(cards).toHaveCount(5);const tiles=page.locator('section[aria-labelledby="minimised-available-heading"]');await expect(tiles.getByRole('button',{name:'Expand Layout fixture 1',exact:true})).toBeVisible();assert.deepEqual(await cards.locator('h3').allTextContents(),originalOrder.slice(1));
 await page.getByLabel('Filter test games by platform').selectOption('browser');await expect(tiles).toHaveCount(0);await page.getByLabel('Filter test games by platform').selectOption('all');await expect(tiles).toBeVisible();await tiles.getByRole('button',{name:'Expand Layout fixture 1',exact:true}).click();await expect(cards).toHaveCount(6);assert.deepEqual(await cards.locator('h3').allTextContents(),originalOrder);
 while(await available.locator('button[id^="minimise-available-"]').count())await available.locator('button[id^="minimise-available-"]').first().click();await expect(cards).toHaveCount(0);await expect(tiles.getByRole('button')).toHaveCount(6);await expect(available.getByText(/All matching games are minimised/)).toBeVisible();
 while(await tiles.count())await tiles.getByRole('button').last().click();await expect(cards).toHaveCount(6);assert.deepEqual(await cards.locator('h3').allTextContents(),originalOrder);
 const desktop=await geometry('desktop-100',true);await zoom(1.5);const zoomed=await geometry('desktop-150',true);
 const longCard=cards.nth(1);await longCard.getByRole('button',{name:'Read full instructions'}).click();const dialog=page.getByRole('dialog',{name:'Developer instructions'});await expect(dialog).toBeVisible();await expect(dialog).toContainText(fullBrief);await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(longCard.getByRole('button',{name:'Read full instructions'})).toBeFocused();
 const countBefore=refreshes;await cards.first().getByRole('button',{name:'Refresh places',exact:true}).click();await expect.poll(()=>refreshes).toBeGreaterThan(countBefore);
 await zoom(1);await page.setViewportSize({width:390,height:844});await geometry('mobile-100',false);await zoom(1.5);await geometry('mobile-150',false);
 await cards.nth(1).getByRole('button',{name:'Read full instructions'}).click();await expect(dialog).toBeVisible();assert(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),'Dialog fits zoomed mobile viewport');await dialog.getByRole('button',{name:'Close full test brief'}).click();
 await zoom(1);await page.reload();await cards.first().getByRole('button',{name:'Test game',exact:true}).click();const activeCard=page.locator('article#active-test-'+games[0].submission_id);await expect(activeCard.getByRole('button',{name:'Start testing',exact:true})).toBeVisible();await activeCard.getByRole('button',{name:'Minimise active test',exact:true}).click();await expect(activeCard).toHaveCount(0);const activeTiles=page.locator('section[aria-labelledby="minimised-active-heading"]');await expect(activeTiles.getByText('Place reserved',{exact:true})).toBeVisible();await activeTiles.getByRole('button',{name:'Expand Layout fixture 1 active test',exact:true}).click();await expect(activeCard.getByRole('button',{name:'Start testing',exact:true})).toBeVisible();await expect(activeCard.getByRole('button',{name:'Release game',exact:true})).toBeVisible();await activeCard.getByRole('button',{name:'Start testing',exact:true}).click();await expect.poll(()=>starts).toBe(1);await expect(activeCard.getByRole('button',{name:'Finish feedback'})).toBeVisible();await activeCard.getByRole('button',{name:'Read full instructions'}).click();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await activeCard.getByRole('button',{name:'Finish feedback'}).click();await expect(page.locator('form')).toBeVisible();await expect(page.getByRole('button',{name:'Read full instructions'})).toBeVisible();
 await page.screenshot({path:path.join(output,'active-feedback-mobile.png'),fullPage:false});
 await page.getByRole('button',{name:'Back to your active tests'}).click();page.once('dialog',d=>d.accept());await activeCard.getByRole('button',{name:'Release game',exact:true}).click();await expect.poll(()=>releases).toBe(1);await expect(activeCard).toHaveCount(0);
 console.log(JSON.stringify({status:'PASS',desktop,zoomed,checks:['six equal-height cards','footer alignment','200-character/four-line previews','full modal instructions and Escape/focus return','refresh places','real 150% browser zoom','mobile 100%/150% no overflow','active card and feedback editor'],screenshots:output,backend:'fully mocked'}));
}finally{await context.close();}

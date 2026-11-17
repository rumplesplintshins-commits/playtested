import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import { chromium, expect } from 'playwright/test';
import nextEnv from '@next/env';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const origin=process.env.TEST_APP_URL||'http://localhost:3000';
const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
assert.equal(backend.origin,'http://127.0.0.1:55741','Isolated QA app required');
let genres=[],notification=true;
const uid='10000000-0000-0000-0000-000000000001';
const campaign='20000000-0000-0000-0000-000000000001';
const test='30000000-0000-0000-0000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture-signature`;
const session={access_token:token,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
let evidenceRank=0;
let restrictionReason='Requires Strategy interest';
let claim={id:test,submission_id:null,playtest_id:campaign,status:'in_progress',review_outcome:'pending',review_reason:null,xp_awarded:false};
let failSubmit=true,failRelease=true,failReclaim=true;let reviewEvents=[],submittedPayloads=[];
const depthErrors=[];
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();context.on("page",page=>{page.on("pageerror",error=>{if(/maximum update depth|too many re-renders/i.test(error.message))depthErrors.push(error.message);});page.on("console",message=>{if(/maximum update depth|too many re-renders/i.test(message.text()))depthErrors.push(message.text());});});
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
     else if(url.pathname.endsWith('/mark_notification_read'))data=true;
     else if(url.pathname.endsWith('/get_testing_genres'))data=['Action','Action RPG','Adventure','Casual','Horror','Platformer','RPG','Racing','Simulation','Sports','Strategy','Survival','Other'];
     else if(url.pathname.endsWith('/update_my_testing_genres')){genres=req.postDataJSON().p_genres;data=null;}
     else if(url.pathname.endsWith('/get_my_feedback_usefulness'))data=[];
     else if(url.pathname.endsWith('/get_my_notifications'))data={notifications:notification?[{id:987654,kind:'tester_feedback_accepted',title:'Your playtest feedback was accepted!',message:'Your feedback for Browser fixture has been approved. You earned 60 XP.',href:'/tester#testing-activity-'+test,read_at:null,created_at:new Date().toISOString()}]:[],unread_count:notification?1:0};
     else if(url.pathname.endsWith('/profiles'))data={id:uid,role:'user',roles:['tester'],tester_xp:0,developer_xp:0,completed_tests:0};
     else if(url.pathname.endsWith('/community_game_tests'))data=req.headers().accept?.includes('object')?claim:(claim?[claim]:[]);
     else if(url.pathname.endsWith('/get_testing_capacity_policy'))data={places:4,reservation_hours:72,server_now:new Date().toISOString(),activated_at:new Date().toISOString()};
     else if(url.pathname.endsWith('/get_my_test_reservations'))data={server_now:new Date().toISOString(),claims:claim?[claim]:[]};
     else if(url.pathname.endsWith('/claim_community_game_test')){if(failReclaim){failReclaim=false;status=400;data={message:'This campaign is full',code:'P0001'};}else{claim={...claim,status:'in_progress',reservation_expires_at:new Date(Date.now()+72*3600000).toISOString()};data=test;}}
     else if(url.pathname.endsWith('/start_community_game_test')){claim={...claim,status:'in_progress'};data=null;}
     else if(url.pathname.endsWith('/test_review_events'))data=reviewEvents;
     else if(url.pathname.endsWith('/get_my_testing_progress'))data={rank:evidenceRank,xp:0,accepted:0,reviewed:0,passed:0,genres};
     else if(url.pathname.endsWith('/get_discoverable_community_test_games'))data=[{submission_id:campaign,title:'Browser fixture',developer_name:'Fixture developer',genre:'Action',description:'Test movement',game_link:'https://example.test/build.zip',access_type:'download_build',image_url:null,focus_areas:[]},{submission_id:'20000000-0000-0000-0000-000000000002',title:'Adventure fixture',developer_name:'Fixture developer',genre:'Adventure',description:'Explore',game_link:'https://example.test/adventure',access_type:'browser_game',image_url:null,focus_areas:[]},{submission_id:'20000000-0000-0000-0000-000000000003',title:'Strategy restricted fixture',developer_name:'Fixture developer',genre:'Strategy',description:'Plan your station',game_link:null,access_type:'browser_game',image_url:null,focus_areas:[],can_claim:false,restriction_reason:restrictionReason}];
      else if(url.pathname.endsWith('/get_campaign_testing_details'))data={minimum_rank:0,testing_genre:'Action',genre_restricted:false,capacity:4,submitted:0,testing:1,available:3};
      else if(url.pathname.endsWith('/get_game_pc_requirements'))data=null;
      else if(url.pathname.endsWith('/tester_availability_preferences'))data=[];
      else if(url.pathname.endsWith('/account_pc_specs'))data={specs:null};
      else if(url.pathname.endsWith('/get_my_testing_activity_media'))data=[];
     else if(url.pathname.endsWith('/submit_community_game_test_with_evidence')){
        submittedPayloads.push(req.postDataJSON()||{});
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

 claim={...claim,status:'reviewed',review_outcome:'accepted',xp_awarded:true,submitted_at:new Date().toISOString()};
 for(const values of [[],['RPG'],['Strategy','Action','RPG']]){
  genres=values;
  for(const [width,zoom] of [[1280,1],[390,1],[853,1.5]]){
   await page.setViewportSize({width,height:1000});
   await page.goto(origin+'/tester');
   const card=page.getByRole('region',{name:'Your tester rank'});
   await expect(card.getByText('Your preferred genres')).toBeVisible();
   await page.evaluate(z=>{document.body.style.zoom=String(z);},zoom);
   if(!values.length){await expect(card.getByText('No preferred genres selected.')).toBeVisible();await expect(card.getByRole('link',{name:'Add genres'})).toHaveAttribute('href','/account#testing-interests');}
   else {for(const genre of values)await expect(card.getByText(genre,{exact:true})).toBeVisible();await expect(card.getByRole('link',{name:'Edit',exact:true})).toHaveAttribute('href','/account#testing-interests');}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Rank genres reflow');
  }
 }
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/tester');await page.getByRole('region',{name:'Your tester rank'}).getByRole('link',{name:'Edit',exact:true}).click();await expect(page).toHaveURL(origin+'/account#testing-interests');
 const settings=page.locator('#testing-interests');await expect(settings.getByRole('checkbox',{name:'RPG',exact:true})).toBeChecked();await settings.getByRole('checkbox',{name:'RPG',exact:true}).uncheck();await settings.getByRole('button',{name:'Save testing genres'}).click();await expect(settings.getByRole('status')).toContainText('Preferences saved');await page.goto(origin+'/tester');await expect(page.getByRole('region',{name:'Your tester rank'}).getByText('RPG',{exact:true})).toHaveCount(0);
 await page.goto(origin+'/notifications');
 await expect(page.getByText('Your playtest feedback was accepted!',{exact:true})).toBeVisible();
 await expect(page.getByText('Your feedback for Browser fixture has been approved. You earned 60 XP.',{exact:true})).toBeVisible();
 await page.getByText('Your playtest feedback was accepted!',{exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/tester#testing-activity-'+test));
 await expect(page.locator('#testing-activity-'+test).getByRole('button',{name:'Collapse testing history'})).toBeVisible();
 await page.getByRole('button',{name:/notifications/i}).first().click();
 await expect(page.locator('#notification-bell-panel').getByText('Your playtest feedback was accepted!',{exact:true})).toBeVisible();
 for(let n=0;n<8;n++)await page.evaluate(()=>window.dispatchEvent(new HashChangeEvent('hashchange')));await page.waitForTimeout(250);assert.equal(depthErrors.length,0,'Notification hashes must not trigger a maximum-update-depth loop');
 const evidenceSource=fs.readFileSync('app/components/StartPlaytest.tsx','utf8');
 const start=evidenceSource.indexOf('type PrivateEvidenceLink');const end=evidenceSource.indexOf('\n}',start)+2;
 const component={};const js=ts.transpileModule(evidenceSource.slice(start,end).replace(/(?:export )?function DeveloperEvidenceLinks/,'export function DeveloperEvidenceLinks'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('exports','require',js)(component,createRequire(import.meta.url));
 const markup=renderToStaticMarkup(createElement(component.DeveloperEvidenceLinks,{evidence:{test_id:test,document_url:'https://example.test/report.docx',recording_url:'https://example.test/recording.mp4'}}));
 for(const [width,zoom] of [[1280,1],[390,1],[853,1.5]]){
  await page.setViewportSize({width,height:1000});await page.evaluate(({markup,zoom})=>{document.body.innerHTML='<main style="padding:24px">'+markup+'</main>';document.body.style.zoom=String(zoom);},{markup,zoom});
  await expect(page.getByRole('heading',{name:'Additional evidence private to you'})).toBeVisible();await expect(page.getByText('Additional Playtested feedback form')).toBeVisible();await expect(page.getByText('Gameplay recording',{exact:true})).toBeVisible();await expect(page.getByText(/External file permissions may reveal/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Open feedback document'})).toHaveAttribute('href','https://example.test/report.docx');await expect(page.getByRole('link',{name:'Watch gameplay recording'})).toHaveAttribute('rel','noopener noreferrer');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Evidence reflow');
 }
 console.log('PASS private evidence rendering: actual component, exact heading/labels, unchanged URLs/rel, identity warning and desktop/mobile/150% CSS zoom.');
 console.log('PASS browser: actual tester card with empty/single/multiple preferences, canonical settings ordering, edit/add targets, 1280/390px and 150% CSS zoom reflow; acceptance notification history and bell display, click opens and expands matching report. Backend mocked; no QA writes.');
}finally{await browser.close();}

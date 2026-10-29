import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium, expect as baseExpect } from 'playwright/test';
const expect = baseExpect.configure({ timeout: 20000 });
const helpers = {};
new Function('exports', ts.transpileModule(fs.readFileSync('lib/feedback-review.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(helpers);
const pending = { context: {title:'Counter test',build:'Test build',instructions:'Test movement',focus_areas:[]},report:{id:'20000000-0000-0000-0000-000000000001',tester_id:'30000000-0000-0000-0000-000000000001',status:'submitted',review_outcome:'pending',review_reason:null,xp_awarded:false,replacement_at:null,overall_score:8,gameplay_score:8,performance_score:8,enjoyed_most:'Movement',frustrations:'None',biggest_improvement:'Tutorial',bugs_found:'None',feedback:null},events:[],developer_signals:[] };
const reviewed = structuredClone(pending);reviewed.context.title='Reviewed test';reviewed.report.id='20000000-0000-0000-0000-000000000002';reviewed.report.review_outcome='accepted';reviewed.report.status='reviewed';reviewed.events=[{id:1,kind:'accepted',reason:'Useful feedback',xp_delta:100}];
assert.equal(helpers.needsFeedbackReview(pending),true);assert.equal(helpers.needsFeedbackReview(reviewed),false);
const reconsideration=structuredClone(reviewed);reconsideration.events.push({id:2,kind:'reconsideration',reason:'New evidence',xp_delta:0});assert.equal(helpers.needsFeedbackReview(reconsideration),true);reconsideration.events.push({id:3,kind:'rejected',reason:'Decision upheld',xp_delta:0});assert.equal(helpers.needsFeedbackReview(reconsideration),false);
const endpoint=/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m.exec(fs.readFileSync('.env.local','utf8'))?.[1];assert.ok(endpoint);
const backend=new URL(endpoint.trim());const origin='http://localhost:3000';
const uid='10000000-0000-0000-0000-000000000001';const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const user={id:uid,aud:'authenticated',role:'authenticated',email:'admin@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.fixture-signature';
const session={access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
let approvals=0;
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.addCookies([{name:`sb-${backend.hostname.split('.')[0]}-auth-token`,value:'base64-'+encode(session),url:origin}]);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===backend.origin) {
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*'};
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   let data=[];
   if(url.pathname==='/auth/v1/user')data=user;
   else if(url.pathname.endsWith('/game_submissions'))data=Array.from({length:44},(_,i)=>({id:'scroll-submission-'+i,title:'Scroll fixture '+i,developer_name:'Fixture studio',genre:'Action',description:'A long game description. '.repeat(80),game_link:'https://example.test',ai_type:'No AI',ai_areas:[],submitted_at:'2026-10-28T10:00:00Z',status:'Pending Review'}));
   else if(url.pathname.endsWith('/profiles'))data={id:uid,role:'admin',roles:['tester','developer'],tester_xp:0,developer_xp:0,completed_tests:0};
   else if(url.pathname.endsWith('/rpc/get_quality_review_queue'))data=[pending,reviewed];
   else if(url.pathname.endsWith('/rpc/review_test_quality')) {const body=request.postDataJSON();assert.equal(body.p_test_id,pending.report.id);assert.ok(Object.values(body.p_criteria).every(Boolean));assert.ok(body.p_reason.trim());approvals++;pending.report.review_outcome='accepted';pending.report.status='reviewed';pending.report.xp_awarded=true;pending.events.push({id:4,kind:'accepted',reason:body.p_reason,xp_delta:100});data=null;}
   else if(request.method()!=='GET'&&!url.pathname.includes('/rpc/get_'))throw Error('Unexpected mutation blocked');
   return route.fulfill({status:200,headers,json:data});
  }
  if(url.origin===origin) {if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]});const headers={...request.headers()};delete headers.cookie;return route.continue({headers});}
  return route.abort();
 });
 const page=await context.newPage();
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:800});await page.goto(origin+'/admin/submissions');
  await expect(page.getByRole('heading',{name:'Scroll fixture 0',exact:true})).toBeVisible();
  const right=page.getByText('Submission review',{exact:true}).locator('xpath=ancestor::section[1]');
  assert.equal(await right.evaluate(element=>getComputedStyle(element).position),'static');
  await page.getByRole('heading',{name:'Independent assessment',exact:true}).click();
  const save=page.getByRole('button',{name:'Save verification assessment',exact:true});
  await save.scrollIntoViewIfNeeded();await expect(save).toBeInViewport();
  const fields=right.locator('textarea');const last=fields.last();await last.scrollIntoViewIfNeeded();await last.fill('Scroll verification: this unsaved field is reachable.');await expect(last).toHaveValue('Scroll verification: this unsaved field is reachable.');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await right.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await page.mouse.move(width>1000?width-120:width/2,400);await page.mouse.wheel(0,600);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y);
  const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll("main *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right})));if(overflow.length)console.log(JSON.stringify({width,overflow}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 console.log('PASS: long admin review uses document scrolling; lower assessment controls/textarea reachable and editable at desktop/mobile widths; no horizontal overflow. Backend mocked, no decisions saved.');
}finally{await browser.close();}

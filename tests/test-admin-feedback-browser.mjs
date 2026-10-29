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
   else if(url.pathname.endsWith('/profiles'))data={id:uid,role:'admin',roles:['tester','developer'],tester_xp:0,developer_xp:0,completed_tests:0};
   else if(url.pathname.endsWith('/rpc/get_feedback_quality_rubric'))data={version:2,maximum_xp:100,criteria:helpers.FEEDBACK_QUALITY_CRITERIA,eligibility:{original:'Credible original feedback, not spam or copied filler',relevant:'Relates to the relevant game/build and testing experience'}};
   else if(url.pathname.endsWith('/rpc/get_quality_review_queue'))data=[pending,reviewed];
   else if(url.pathname.endsWith('/rpc/review_test_quality')) {const body=request.postDataJSON();assert.equal(body.p_test_id,pending.report.id);assert.equal(body.p_criteria.rubric_version,2);assert.equal(Object.keys(body.p_criteria.scores).length,5);assert.ok(body.p_reason.trim());approvals++;const eligible=Object.values(body.p_criteria.eligibility).every(Boolean),score=eligible?Object.values(body.p_criteria.scores).filter(Boolean).length*20:0,award=eligible&&body.p_outcome==='accepted'?score:0,previous=pending.report.base_xp_amount||0;Object.assign(pending.report,{review_outcome:eligible?body.p_outcome:'rejected',review_reason:body.p_reason,status:'reviewed',xp_awarded:award>0,base_xp_amount:award,quality_rubric_version:2,feedback_quality_score:score,quality_criteria:body.p_criteria.scores,quality_eligibility:body.p_criteria.eligibility});pending.events.push({id:4+approvals,kind:pending.report.review_outcome,reason:body.p_reason,xp_delta:award-previous,rubric_version:2,quality_score:score,actual_xp_award:award});data=null;}
   else if(request.method()!=='GET'&&!url.pathname.includes('/rpc/get_'))throw Error('Unexpected mutation blocked');
   return route.fulfill({status:200,headers,json:data});
  }
  if(url.origin===origin) {if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]});const headers={...request.headers()};delete headers.cookie;return route.continue({headers});}
  return route.abort();
 });
 const page=await context.newPage();await page.goto(origin+'/admin/submissions');
 await expect(page.getByRole('button',{name:/Playtest reviews.*1/})).toBeVisible();
 await expect(page.getByRole('link',{name:'Review feedback',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/Playtest reviews.*1/}).click();
 const queue=page.getByRole('region',{name:'Playtest feedback reviews'});
 await expect(queue.getByRole('heading',{name:'Counter test',exact:true})).toBeVisible();
 await expect(queue.getByRole('heading',{name:'Reviewed test',exact:true})).toHaveCount(0);
 for(const checkbox of await queue.getByRole('checkbox').all())await expect(checkbox).not.toBeChecked();
 await expect(queue.getByRole('button',{name:'Save accepted assessment / restore XP'})).toBeDisabled();
 await queue.getByLabel('Credible original feedback, not spam or copied filler').selectOption('true');await queue.getByLabel('Relates to the relevant game/build and testing experience').selectOption('true');
 for(let index=0;index<3;index++)await queue.getByRole('checkbox').nth(index).check();
 await expect(queue.getByRole('status').filter({hasText:'3 of 5 criteria'})).toContainText('Quality 60%');await expect(queue.getByRole('status').filter({hasText:'3 of 5 criteria'})).toContainText('Award 60 XP');
 await queue.getByRole('button',{name:'Use editable reason suggestion'}).click();assert((await queue.getByLabel('Reason visible to the tester').inputValue()).includes('takeaway'));
 await queue.getByLabel('Reason visible to the tester').fill('Specific observations and a useful improvement.');
 await queue.getByRole('button',{name:'Save accepted assessment / restore XP'}).click();
 await expect(queue.getByText('No playtest feedback is awaiting review.')).toBeVisible();
 await expect(page.getByRole('button',{name:/Playtest reviews.*1/})).toHaveCount(0);assert.equal(approvals,1);
 await queue.getByRole('button',{name:'Reviewed (2)'}).click();await expect(queue.getByRole('heading',{name:'Counter test',exact:true})).toBeVisible();
 const card=queue.locator('#report-'+pending.report.id);await expect(card.getByText('Feedback quality 60%',{exact:false}).first()).toBeVisible();for(const checkbox of await card.getByRole('checkbox').all())await expect(checkbox).not.toBeChecked();
 await card.getByRole('button',{name:'Load recorded assessment for editing'}).click();await card.getByRole('checkbox').nth(3).check();await expect(card.getByRole('status')).toContainText('Award 80 XP');await card.getByLabel('Reason visible to the tester').fill('Task focus also addressed.');await card.getByRole('button',{name:'Save accepted assessment / restore XP'}).click();await expect(card.getByText('Current award: 80 XP.',{exact:false})).toBeVisible();assert.equal(pending.events.at(-1).xp_delta,20);
 await card.getByRole('button',{name:'Load recorded assessment for editing'}).click();await card.getByLabel('Credible original feedback, not spam or copied filler').selectOption('false');await expect(card.getByRole('button',{name:'Save accepted assessment / restore XP'})).toBeDisabled();await expect(card.getByRole('status')).toContainText('Award 0 XP');await card.getByLabel('Reason visible to the tester').fill('Originality eligibility was not met; observed copied filler.');await card.getByRole('button',{name:'Save rejection / reverse XP'}).click();await expect(card.getByText('Current award: 0 XP.',{exact:false})).toBeVisible();assert.equal(pending.events.at(-1).xp_delta,-80);
 for(const width of[1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Admin review fits viewport');}
 await page.goto(origin+'/admin/submissions/test-reviews');await expect(page).toHaveURL(/\/admin\/submissions\?tab=playtests/);await expect(page.getByRole('region',{name:'Playtest feedback reviews'})).toBeVisible();
 console.log('PASS: outstanding count excludes reviewed reports, reconsiderations count until decided, partial acceptance/edited deltas/eligibility rejection, live preview, editable suggestions, count refresh, history and mobile layout, old review URL redirects. All backend calls mocked; no live writes.');
}finally{await browser.close();}


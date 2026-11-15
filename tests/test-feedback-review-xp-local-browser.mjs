import assert from 'node:assert/strict';
import {chromium,expect} from 'playwright/test';
import {createClient} from '@supabase/supabase-js';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54341','Local-only test');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const test='67459d28-e683-4139-89e3-5d82662c21f3',owner='67244ffe-9c5c-4aac-b633-d0c0b1418d5f',tester='02900000-0000-4000-8000-000000000031';
const negativeTest='e019926d-c09b-425b-91dd-1a1453e5b141',negativeOwner='02900000-0000-4000-8000-000000000011',negativeTester='02900000-0000-4000-8000-000000000032';
async function login(uid){const {data,error}=await service.auth.admin.getUserById(uid);assert.ifError(error);assert(data.user.email.endsWith('@preview.playtested'),'Disposable preview account required');const link=await service.auth.admin.generateLink({type:'magiclink',email:data.user.email});assert.ifError(link.error);const client=createClient(url,key,{auth:{persistSession:false}});const result=await client.auth.verifyOtp({type:'magiclink',token_hash:link.data.properties.hashed_token});assert.ifError(result.error);return{client,session:result.data.session};}
async function profile(uid){const r=await service.from('profiles').select('tester_xp,developer_xp').eq('id',uid).single();assert.ifError(r.error);return r.data;}
async function developerAward(testId){const r=await service.from('developer_xp_awards').select('id').eq('source_id',testId).eq('award_type','feedback_review');assert.ifError(r.error);return r.data.length;}
async function testerAward(testId){const r=await service.from('test_review_events').select('xp_delta').eq('test_id',testId).eq('kind','tester_feedback_useful');assert.ifError(r.error);return r.data;}
const browser=await chromium.launch({headless:true});
try{
 const developer=await login(owner),otherDeveloper=await login(negativeOwner),participant=await login(negativeTester);
 const initial={developer:await profile(owner),otherDeveloper:await profile(negativeOwner),tester:await profile(tester),otherTester:await profile(negativeTester)};
 const existingDev=await developerAward(test),existingOtherDev=await developerAward(negativeTest),existingTester=await testerAward(negativeTest);
 async function contextFor(session){const ctx=await browser.newContext();await ctx.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:'http://localhost:3001'}]);return ctx;}
 const link=(await service.from('game_developer_links').select('id').eq('developer_id',owner).eq('submission_id','dbb3d185-7fd6-4676-a1fe-f342c0046369').limit(1).single()).data.id;
 const ctx=await contextFor(developer.session),p=await ctx.newPage();
 await p.goto('http://localhost:3001/my-submissions?game='+link+'&campaign=d3e57d96-b6d2-47bd-9ccc-71b780d90a30',{waitUntil:'networkidle',timeout:90000});
 await p.getByRole('tab',{name:'Individual responses',exact:true}).click();
 const card=p.locator('details').filter({hasText:'Independent'}).filter({hasText:'Accepted'}).first();await card.locator('summary').click();
 await card.getByText('You earn +10 Developer XP once per accepted feedback review.',{exact:false}).waitFor();
 assert(!(await card.innerText()).includes(tester),'No tester identity in feedback card');
 const useful=card.getByRole('button',{name:'Useful',exact:true}),negative=card.getByRole('button',{name:'Not useful',exact:true});
 for(const button of [negative,negative,useful,negative,useful]){
   const response=p.waitForResponse(r=>r.url().endsWith('/rpc/mark_test_feedback_usefulness')&&r.request().method()==='POST');
   await button.click();const r=await response;assert(r.ok());await expect(button).toHaveAttribute('aria-pressed','true');
 }
 const saved=await profile(owner);assert.equal(saved.developer_xp,initial.developer.developer_xp+(existingDev?0:10));
 assert.equal((await profile(tester)).tester_xp,initial.tester.tester_xp,'preserved Useful award is not repaid');
 await card.screenshot({path:'.next/feedback-review-xp-developer.png'});
 // Not useful earns developer XP, but never tester XP or a new tester alert.
 const notesBefore=(await service.from('notifications').select('id').eq('recipient_id',negativeTester).eq('dedupe_key','feedback:useful-xp:'+negativeTest)).data.length;
 for(let i=0;i<2;i++){const r=await otherDeveloper.client.rpc('mark_test_feedback_usefulness',{p_test_id:negativeTest,p_usefulness:'not_useful'});assert.ifError(r.error);}
 assert.equal((await profile(negativeOwner)).developer_xp,initial.otherDeveloper.developer_xp+(existingOtherDev?0:10));
 assert.equal((await profile(negativeTester)).tester_xp,initial.otherTester.tester_xp);
 assert.equal((await service.from('notifications').select('id').eq('recipient_id',negativeTester).eq('dedupe_key','feedback:useful-xp:'+negativeTest)).data.length,notesBefore);
 // Eight simultaneous owner requests, including the first later Useful rating.
 const results=await Promise.all(Array.from({length:8},(_,i)=>otherDeveloper.client.rpc('mark_test_feedback_usefulness',{p_test_id:negativeTest,p_usefulness:i%2?'useful':'not_useful'})));for(const r of results)assert.ifError(r.error);
 let r=await otherDeveloper.client.rpc('mark_test_feedback_usefulness',{p_test_id:negativeTest,p_usefulness:'not_useful'});assert.ifError(r.error);
 assert.equal((await profile(negativeTester)).tester_xp,initial.otherTester.tester_xp+(existingTester.length?0:5));
 assert.equal((await profile(negativeOwner)).developer_xp,initial.otherDeveloper.developer_xp+(existingOtherDev?0:10));
 assert.equal(await developerAward(test),1);assert.equal(await developerAward(negativeTest),1);assert.equal((await testerAward(negativeTest)).length,1);
 r=await developer.client.rpc('mark_test_feedback_usefulness',{p_test_id:negativeTest,p_usefulness:'useful'});assert(r.error,'Foreign owner denied');
 const history=await developer.client.rpc('get_my_developer_xp_history',{p_limit:20});assert.ifError(history.error);assert(history.data.some(a=>a.xp_amount===10));assert(history.data.every(a=>Object.keys(a).every(k=>['id','xp_amount','description','created_at'].includes(k))));
 await p.goto('http://localhost:3001/account#developer-xp-history',{waitUntil:'networkidle',timeout:90000});
 const dh=p.locator('#developer-xp-history');assert(await dh.evaluate(el=>!el.closest('section')),'History must sit outside the account email/information section');assert(await dh.evaluate(el=>Boolean(document.querySelector('main section')?.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)),'Main account information must precede XP history');await dh.locator('summary').click();await expect(dh.getByText('Reviewed accepted tester feedback: +10 Developer XP.',{exact:true})).toBeVisible();await dh.screenshot({path:'.next/feedback-review-xp-developer-history.png'});
 await p.getByRole('button',{name:/Notifications/}).first().click();await expect(p.getByText('You earned +10 Developer XP',{exact:true}).first()).toBeVisible();await p.locator('#notification-bell-panel').screenshot({path:'.next/feedback-review-xp-developer-bell.png'});
 const tc=await contextFor(participant.session),tp=await tc.newPage();await tp.goto('http://localhost:3001/tester#testing-activity-'+negativeTest,{waitUntil:'networkidle',timeout:90000});
 await tp.getByRole('button',{name:/Notifications/}).first().click();await expect(tp.getByText('You earned +5 Tester XP',{exact:true}).first()).toBeVisible();await tp.locator('#notification-bell-panel').screenshot({path:'.next/feedback-review-xp-bell.png'});await tp.getByRole('button',{name:/Notifications/}).first().click();
 const activity=tp.locator('#testing-activity-'+negativeTest);await activity.waitFor();
 if(!(await activity.locator('summary').count()))await activity.getByRole('button').first().click();
 await activity.locator('summary').filter({hasText:'XP & review history'}).click();
 await expect(activity.getByText('Your feedback was marked Useful. One-time bonus: +5 Tester XP.',{exact:true})).toBeVisible();
 await expect(activity.getByText('Removed the previous +5 XP review bonus: Not useful does not earn tester XP. Base playtest XP is unchanged.',{exact:true})).toBeVisible();
 await activity.screenshot({path:'.next/feedback-review-xp-history.png'});
 const final={developer:await profile(owner),otherDeveloper:await profile(negativeOwner),tester:await profile(tester),otherTester:await profile(negativeTester)};
 console.log('PASS real localhost: both buttons and same-rating saves; +10 developer for Not useful; 0 tester for Not useful; later Useful +5 once; eight concurrent toggles; preserved prior Useful award; owner denial; both history UIs and bells; explicit prior correction visible.');
 console.log('Fixture balances (before browser -> after browser): '+JSON.stringify({initial,final}));
}finally{await browser.close();}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {chromium,expect} from 'playwright/test';
const model={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/submission-completeness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(model);
const endpoint=/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m.exec(fs.readFileSync('.env.local','utf8'))?.[1];const backend=new URL(endpoint.trim()),origin='http://localhost:3000';
const uid='d1000000-0000-4000-8000-000000000001';const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{}};const expiry=Math.floor(Date.now()/1000)+3600;
const session={access_token:encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:expiry,role:'authenticated'})+'.fixture',refresh_token:'fixture',expires_in:3600,expires_at:expiry,token_type:'bearer',user};
let row=null,failSave=true,batches=0;const events=[];
const legacy={id:'d1000000-0000-4000-8000-000000000010',developer_id:uid,title:'Legacy pending fixture',developer_name:'Fixture studio',genre:'Action',description:'Test the game',ai_type:'AI-assisted',ai_explanation:'',evidence_link:'',game_link:'',release_status:'Not announced',submitted_at:'2026-10-28',status:'Pending Review',submission_revision:0};
function validation(record){const issues=model.submissionIssues(record);return {issues,message:model.completenessMessage(issues)};}
function correction(){return {submission:row,validation:validation(row),history:[]};}
const browser=await chromium.launch({headless:true});
const metricsFile='app/components/_submission_metrics_fixture.tsx',fixtureDir='app/submission-metrics-fixture';let fixtureCreated=false;
try{
 const context=await browser.newContext();await context.addCookies([{name:`sb-${backend.hostname.split('.')[0]}-auth-token`,value:'base64-'+encode(session),url:origin}]);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===origin){if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]});const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
  if(url.origin!==backend.origin)return route.abort();
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const path=url.pathname;let data=[],status=200;const body=req.method()==='POST'?req.postDataJSON():null;
  if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/profiles'))data={id:uid,roles:['developer','tester'],role:'admin',tester_xp:0,developer_xp:0};
  else if(path.endsWith('/game_submissions')){if(req.method()==='POST'){events.push('insert');row={...body,status:validation(body).issues.length?'Needs More Information':'Pending Review',submission_revision:0,review_reason:'',submitted_at:'2026-10-28'};Object.assign(row,{completeness_issues:validation(row).issues,completeness_message:validation(row).message});data=row;}else data=[legacy,...(row?[row]:[])];}
  else if(path.endsWith('/rpc/find_possible_game_duplicates')){events.push('duplicates');data=[];}
  else if(path.endsWith('/rpc/submission_completeness'))data=validation(body.p);
  else if(path.endsWith('/rpc/get_my_submission_correction')){assert.equal(body.p_id,row.id);data=correction();}
  else if(path.endsWith('/rpc/save_my_submission_correction')){
   assert.equal(body.p_id,row.id);assert(!('status' in body.p_fields));assert(!('review_reason' in body.p_fields));
   if(failSave){failSave=false;status=400;data={code:'fixture',message:'Simulated save failure; edits remain.'};}
   else{row={...row,...body.p_fields,submission_revision:row.submission_revision+1};const check=validation(row);if(body.p_resubmit)row.status=check.issues.length?'Needs More Information':'Pending Review';row.completeness_issues=check.issues;row.completeness_message=check.message;data=correction();}
  }
  else if(path.endsWith('/rpc/preview_submission_completeness'))data=legacy.status==='Pending Review'?[{id:legacy.id,title:legacy.title,revision:legacy.submission_revision,validation:validation(legacy)}]:[];
  else if(path.endsWith('/rpc/route_incomplete_submissions')){batches++;assert.equal(body.p_records[0].id,legacy.id);legacy.status='Needs More Information';legacy.completeness_message=validation(legacy).message;data=1;}
  else if(path.endsWith('/rpc/get_my_testing_progress'))data={rank:0,xp:0,accepted:0,reviewed:0,passed:0,genres:[]};
  else if(path.endsWith('/rpc/get_campaign_testing_details'))data={available:2,testing:0,submitted:0};
  else if(req.method()!=='GET'&&!path.includes('/rpc/get_'))throw new Error('Unexpected mocked mutation: '+path);
  return route.fulfill({status,headers,json:data});
 });
 const page=await context.newPage();await page.goto(origin+'/submit');
 await page.locator('[name="title"]').fill('Correction fixture');await page.locator('[name="developer"]').fill('Fixture studio');await page.locator('[name="genre"]').selectOption('Action');await page.locator('[name="releaseStatus"]').selectOption('Not announced');await page.locator('textarea[name="description"]').fill('A small game to test');await page.locator('[name="aiType"]').selectOption('AI-assisted');
 await page.getByRole('button',{name:'Submit application',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Complete submission information',exact:true})).toBeVisible();assert.equal(row.status,'Needs More Information');assert(events.indexOf('duplicates')<events.indexOf('insert'),'Existing duplicate checks run before saving');assert.equal(events.filter(event=>event==='insert').length,1);
 await expect(page.getByRole('link',{name:'AI-use explanation: Required'})).toBeVisible();await expect(page.getByRole('link',{name:'Supporting evidence link: Required'})).toBeVisible();
 row.review_reason='Human note: clarify the tools used';await page.reload();await expect(page.getByRole('heading',{name:'Human reviewer notes'})).toBeVisible();
 await page.getByLabel('AI-use explanation',{exact:true}).fill('Generated background art, edited by the developer');await page.getByRole('button',{name:'Save edits',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Simulated save failure'})).toBeVisible();await expect(page.getByLabel('AI-use explanation',{exact:true})).toHaveValue('Generated background art, edited by the developer');
 await page.getByRole('button',{name:'Save edits',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Edits saved.'})).toBeVisible();assert.equal(row.status,'Needs More Information');
 await page.getByLabel('Supporting evidence link',{exact:true}).fill('https://example.test/disclosure');await page.getByRole('button',{name:'Resubmit for review',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Resubmitted for review'})).toBeVisible();assert.equal(row.status,'Pending Review');assert.equal(row.review_reason,'Human note: clarify the tools used');
 await page.goto(origin+'/admin/submissions');await expect(page.getByRole('heading',{name:'Legacy pending fixture',exact:true})).toBeVisible();assert.equal(batches,0);assert.equal(legacy.status,'Pending Review');
 await page.locator('summary').filter({hasText:'Check existing pending submissions'}).click();await page.getByRole('button',{name:'Preview completeness',exact:true}).click();await expect(page.getByText('1 pending submission has missing developer details.')).toBeVisible();assert.equal(batches,0);
 await page.getByRole('checkbox',{name:/Legacy pending fixture/}).check();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Return selected for information (1)'}).click();await expect(page.getByText('1 submission updated. No email was sent.')).toBeVisible();
 await expect(page.getByText('Pending submissions',{exact:true}).locator('..')).toContainText('1');assert.equal(batches,1);
 // Exercise real metric-card layout at the narrow selected-game width.
 if(fs.existsSync(metricsFile)||fs.existsSync(fixtureDir))throw new Error('Fixture paths already exist; refusing overwrite');
 fs.writeFileSync(metricsFile,fs.readFileSync('app/components/StartPlaytest.tsx','utf8')+'\nexport {ResultsDashboard};\n');fs.mkdirSync(fixtureDir);fixtureCreated=true;
 fs.writeFileSync(fixtureDir+'/page.tsx',`import {ResultsDashboard} from '../components/_submission_metrics_fixture';export default function Fixture(){return <main className="min-h-screen bg-[#090b0a] p-4 text-white"><div style={{maxWidth:620,overflowWrap:'anywhere'}}><ResultsDashboard playtest={{id:'fixture',status:'open',shareToken:'fixture',accessLink:'https://example.test',instructions:'Play',focusAreas:[],audience:'both',targetTesters:2,estimatedMinutes:30,releaseLabel:'Build fixture',createdAt:'2026-10-28',publishedAt:'2026-10-28'}} communityResults={null} independentProgress={null} acceptedFeedback={[]}/></div></main>}`);
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});await page.goto(origin+'/submission-metrics-fixture');const values=page.getByText('Not reported',{exact:true});await expect(values).toHaveCount(2);for(const value of await values.all()){assert.equal(await value.evaluate(element=>getComputedStyle(element).overflowWrap),'normal');assert((await value.locator('..').boundingBox()).width>=159);assert(await value.evaluate(element=>element.scrollWidth<=element.clientWidth));}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 console.log('PASS: actual initial form → correction editor, conditional reasons, failed-save preservation, save vs resubmit, retained human notes, admin preview/no view mutation/batch/counter refresh, and narrow metric-card layout. All backend requests mocked; no emails or live writes.');
}finally{await browser.close();if(fixtureCreated){fs.unlinkSync(fixtureDir+'/page.tsx');fs.rmdirSync(fixtureDir);fs.unlinkSync(metricsFile);}}

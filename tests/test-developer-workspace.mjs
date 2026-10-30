import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium,expect} from 'playwright/test';
const require=createRequire(import.meta.url);
// Exercise the real allowance contract without mounting UI or contacting a database.
const allowanceSource=fs.readFileSync('app/components/DeveloperPlan.tsx','utf8');
const allowance={};new Function('exports',ts.transpileModule(allowanceSource.slice(allowanceSource.indexOf('export function allowanceError'),allowanceSource.indexOf('\nconst Context')),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(allowance);
for(const plan of ['free','pro']){
 const response={plan,launch_limit:plan==='pro'?15:1,window_hours:720,gap_hours:plan==='pro'?48:0,rounds_used:19,rank_targeting:plan==='pro',genre_targeting:plan==='pro',server_now:'2026-10-29T12:00:00Z',next_at:'2026-11-01T12:00:00Z',quota_until:null,cooldown_until:null,can_assign:false};
 assert.equal(allowance.parseDeveloperPlan(response).rounds_used,19,'Do not clamp legacy usage');
 for(const invalid of [null,[],{...response,rounds_used:-1},{...response,launch_limit:2},{...response,next_at:'invalid'}])assert.throws(()=>allowance.parseDeveloperPlan(invalid),/Plan unavailable/);
}
assert.match(allowance.allowanceError('get_my_developer_plan',{code:'PGRST202'}),/schema cache/);
assert.match(allowance.allowanceError('get_playtest_eligibility',{code:'42501'}),/Sign in again/);
assert.match(allowance.allowanceError('get_my_developer_plan',{code:'503'}),/connection and retry/);
const completeness={};new Function("exports",ts.transpileModule(fs.readFileSync("lib/submission-completeness.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(completeness);
const owner='workspace-owner',other='other-developer';
const tables={
 profiles:[{id:owner,roles:['developer'],developer_xp:100}],
 game_submissions:[{id:'submission-a',developer_id:owner,title:'Alpha',developer_name:'Studio',genre:'Action',status:'Needs More Information',review_reason:'Add a browser build',submitted_at:'2026-10-28',steam_app_id:'123'}, {id:'foreign',developer_id:other,title:'Private foreign submission',status:'Pending Review'}],
 game_claims:[{id:'claim-a',claimant_id:owner,submission_id:'submission-a',status:'Needs More Information',admin_notes:'Provide ownership evidence',created_at:'2026-10-28',relationship:'Developer'}, {id:'foreign-claim',claimant_id:other,submission_id:'foreign',status:'Pending'}],
 game_developer_links:[{id:'link-a',developer_id:owner,submission_id:'submission-a',relationship:'Original submitter',created_at:'2026-10-28'}, {id:'link-b',developer_id:owner,imported_game_id:'imported-a',relationship:'Developer',created_at:'2026-10-27'}, {id:'duplicate-link',developer_id:owner,submission_id:'submission-a',relationship:'Developer',created_at:'2026-10-26'}, {id:'foreign-link',developer_id:other,submission_id:'foreign'}],
 imported_games:[{id:'imported-a',title:'Alpha',developer_name:'Studio',genre:'Action',steam_app_id:'123'}],approved_games:[],pulse_jobs:[],
 community_playtests:[{id:'build-current',developer_id:owner,imported_game_id:'imported-a',title:'Alpha',status:'open',audience:'both',created_at:'2026-10-28',instructions:'Play',access_link:'http://localhost:3000/demo-games/neon-courier',focus_areas:[]},{id:'build-old',developer_id:owner,submission_id:'submission-a',title:'Alpha',status:'closed',audience:'both',created_at:'2026-10-26',instructions:'Play',access_link:'https://example.test',focus_areas:[]},{id:'foreign-build',developer_id:other,submission_id:'foreign',status:'open'}],
};
let failure='',queries=[];
const client={auth:{getUser:async()=>({data:{user:{id:owner}}})},rpc:async()=>({data:[],error:null}),from(table){const filters=[];const query={select(){return query;},eq(key,value){filters.push(row=>row[key]===value);queries.push({table,key,value});return query;},in(key,values){filters.push(row=>values.includes(row[key]));return query;},order(){return query;},limit(){return query;},single(){query.singleRow=true;return query;},then(resolve){const rows=(tables[table]||[]).filter(row=>filters.every(filter=>filter(row)));return Promise.resolve({data:query.singleRow?rows[0]:rows,error:failure===table?{message:'Fixture unavailable'}:null}).then(resolve);}};return query;}};
const Start=()=>null,Workspace=()=>null,Retry=()=>null;
const exports={};
const code=ts.transpileModule(fs.readFileSync('app/my-submissions/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function('exports','require',code+'\nexports.dashboard=DeveloperDashboard;exports.sidebar=sidebarFeedback;')(exports,name=>name==='next/server'?{connection:async()=>{}}:name==='next/navigation'?{redirect(path){throw new Error('redirect:'+path);}}:name.endsWith('/supabase-server')?{createClient:async()=>client}:name.endsWith('/SiteHeader')?{default:()=>null}:name.endsWith('/listing-updates')?{listingUpdates:async()=>[],listingNotice:()=>''}:name.endsWith('/GameLinksEngagement')?{default:()=>null}:name.endsWith('/StartPlaytest')?{default:Start}:name.endsWith('/DeveloperWorkspace')?{default:Workspace,WorkspaceRetry:Retry}:name.endsWith('/submission-completeness')?completeness:require(name));
const sidebarGame={submissionId:'game-side',latestPlaytest:{id:'current-side',releaseLabel:'Demo 0.8'}};
const sidebarRow={submission_id:'game-side',playtest_id:'current-side',release_label:'Demo 0.8',accepted_test_count:1,created_at:'2026-10-28'};
assert.deepEqual(exports.sidebar(sidebarGame,[sidebarRow],false),{context:'Current build: Demo 0.8',feedback:'1 accepted Tester Hub report'});
assert.deepEqual(exports.sidebar(sidebarGame,[{...sidebarRow,playtest_id:'old-side',release_label:'Alpha 0.5 - Reception Test',accepted_test_count:3}],false),{context:'Current build: Demo 0.8',feedback:'Latest feedback: Alpha 0.5 - Reception Test\n3 accepted Tester Hub reports'});
assert(exports.sidebar(sidebarGame,[{...sidebarRow,playtest_id:'different-id'}],false).feedback.startsWith('Latest feedback:'),'Equal labels do not imply the same campaign');
assert(!exports.sidebar(sidebarGame,[{...sidebarRow,release_label:'Changed label'}],false).feedback.includes('Latest feedback:'),'Campaign ID, not label comparison, scopes counts');
assert.equal(exports.sidebar(sidebarGame,[],false).feedback,'No Tester Hub feedback yet for this build');assert.equal(exports.sidebar(sidebarGame,[{...sidebarRow,accepted_test_count:0}],false).feedback,'No Tester Hub feedback yet for this build');assert.equal(exports.sidebar(sidebarGame,[],true).feedback,'Feedback unavailable');
assert.equal(exports.sidebar({...sidebarGame,latestPlaytest:null},[],false).feedback,'No feedback yet');
let result=await exports.dashboard();
assert.equal(result.type,Workspace);
assert.equal(result.props.games.length,1,'Same-ID and known Steam aliases counted once');
assert.equal(result.props.submissions.length,1);assert.equal(result.props.claims.length,1);
assert.equal(result.props.games[0].status,'Playtest open');
function find(element,type){if(!element||typeof element!=='object')return null;if(element.type===type)return element;const children=element.props?.children;for(const child of Array.isArray(children)?children:[children]){const found=find(child,type);if(found)return found;}return null;}
const start=find(result.props.games[0].content,Start);
assert.equal(start.props.existingPlaytest.id,'build-current');assert.equal(start.props.gameSource.importedGameId,'imported-a');
assert.deepEqual(start.props.playtests.map(build=>build.id),['build-current','build-old']);
tables.pulse_jobs.push({id:'run-a',submission_id:'submission-a',developer_id:owner,status:'FAILED',error_message:'Build could not launch',build_sha256:'a'.repeat(64),created_at:'2026-10-28',report_json:null},{id:'run-b',submission_id:'submission-a',developer_id:owner,status:'COMPLETE',created_at:'2026-10-27',report_json:{summary:'Stored successful run',totalChecks:2,build:{successfulLoads:2}}},{id:'foreign-run',submission_id:'foreign',developer_id:other,status:'COMPLETE',created_at:'2026-10-28'});
result=await exports.dashboard();assert.equal(result.props.diagnostics.length,2,'Diagnostics exclude other developers');
assert.equal(result.props.diagnostics[0].title,'Alpha');assert.equal(result.props.diagnostics[0].status,'FAILED');
const failedReport=renderToStaticMarkup(result.props.diagnostics[0].content);
assert(failedReport.includes('Build could not launch'));assert(failedReport.includes('a'.repeat(64)));assert(!failedReport.includes('No technical issues detected.'));
assert.equal(result.props.extras.props.children.props.open,true,'Developer progression expanded');
tables.pulse_jobs.length=0;
assert(!renderToStaticMarkup(result.props.games[0].content).includes('Developer claim approved'),'Pending claim must not imply approval');
tables.game_claims[0].status='Approved';
tables.game_submissions.push({id:'original-only',developer_id:owner,title:'Original submission only',developer_name:'Studio',genre:'Action',status:'Approved',submitted_at:'2026-10-28'});
tables.game_developer_links.push({id:'original-link',developer_id:owner,submission_id:'original-only',relationship:'Original submitter',created_at:'2026-10-28'});
result=await exports.dashboard();
assert.equal(result.props.claims.length,1,'Claim counter counts actual records only');
assert(renderToStaticMarkup(result.props.games.find(game=>game.title==='Alpha').content).includes('Developer claim approved'));
assert(!renderToStaticMarkup(result.props.games.find(game=>game.title==='Original submission only').content).includes('Developer claim approved'),'An original submission is not a claim');
tables.game_claims[0].submission_id='unrelated-game';
result=await exports.dashboard();
assert(!renderToStaticMarkup(result.props.games.find(game=>game.title==='Alpha').content).includes('Developer claim approved'),'Unrelated approved claim must not leak to another game');
tables.game_claims[0].submission_id='submission-a';tables.game_claims[0].status='Needs More Information';tables.game_submissions.pop();tables.game_developer_links.pop();
for(const table of ['game_submissions','game_developer_links','community_playtests','pulse_jobs'])assert(queries.some(query=>query.table===table&&query.key==='developer_id'&&query.value===owner),table+' owner filter');
assert(queries.some(query=>query.table==='game_claims'&&query.key==='claimant_id'&&query.value===owner));
failure='pulse_jobs';result=await exports.dashboard();assert.equal(result.type,Workspace);assert(result.props.warnings.some(message=>message.includes('PULSE')));
failure='game_claims';result=await exports.dashboard();assert.equal(result.type,Retry);assert(result.props.message.includes('claims'));
failure='profiles';result=await exports.dashboard();assert.equal(result.type,Retry);
console.log('PASS: actual server dashboard owner-scoped queries, unique Steam/record counts, correct active source/build history and core/optional failures. Mocked database only.');
if(process.argv.includes('--server-only'))process.exit(0);
if(process.argv.includes('--plans-browser')){await planBrowser();process.exit(0);}

// Temporary local-only fixture exercises the actual client component through Next.
const testOrigin=process.env.TEST_APP_URL||'http://localhost:3000';
const fixture='app/workspace-review-fixture/page.tsx';
if(fs.existsSync(fixture))throw new Error('Fixture path exists; refusing to overwrite.');
fs.mkdirSync('app/workspace-review-fixture');
fs.writeFileSync(fixture,`import Workspace,{WorkspaceRetry} from '../components/DeveloperWorkspace';
export default async function Fixture({searchParams}:{searchParams:Promise<{scenario?:string}>}){const {scenario}=await searchParams;if(scenario==="empty")return <Workspace games={[]} submissions={[]} claims={[]}/>;if(scenario==="error")return <WorkspaceRetry message="Could not load developer games. Retry."/>;return <main className="min-h-screen bg-[#090b0a] p-4 text-white"><header style={{position:"sticky",top:0,height:70,background:"#090b0a",zIndex:10}}>Fixture sticky header</header><Workspace games={[
{id:'alpha',title:'Alpha',status:'Playtest open',active:true,hasPlaytest:true,hasFeedback:true,feedback:'2 accepted Tester Hub reports',content:<section style={{minHeight:2200}}><h2>Alpha detail</h2><label>Unsaved instructions<input defaultValue="Original task"/></label><div data-build-feedback style={{marginTop:650}}>Alpha build feedback</div></section>},
{id:'beta',title:'Beta',status:'No playtest',content:<section style={{minHeight:2200}}><h2>Beta detail</h2><div data-build-feedback>Beta build feedback</div></section>} ]}
submissions={[{id:'sub',title:'Gamma',status:'Needs More Information',content:<article><h2>Gamma review</h2><p>Add a browser build</p></article>}]}
claims={[{id:'claim',title:'Delta',status:'Pending',content:<article><h2>Delta claim</h2><p>Awaiting admin review</p></article>}]} diagnostics={[{id:'run-alpha',title:'Alpha',status:'FAILED',context:'Build AAA',content:<article><h2>Alpha diagnostics</h2><p>Build AAA could not launch</p></article>},{id:'run-beta',title:'Beta',status:'COMPLETE',context:'Build BBB',content:<article><h2>Beta diagnostics</h2><p>Build BBB completed</p></article>}]}/></main>}`);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());
 await page.goto(testOrigin+'/workspace-review-fixture');
 await expect(page.getByRole('tab',{name:'My games 2'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('heading',{name:'Alpha detail'})).toBeVisible();
 await page.getByLabel('Unsaved instructions').fill('Keep my edited task');
 await page.getByRole('tab',{name:'My games 2'}).focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Game submissions 1'})).toBeFocused();
 await expect(page.getByText('Add a browser build',{exact:true})).toBeVisible();
 await page.getByLabel('Status filter').selectOption('Approved');await expect(page.getByRole('heading',{name:'No matching results'})).toBeVisible();
 await page.getByRole('button',{name:'Clear search and filters'}).click();
 await page.getByRole('tab',{name:'My games 2'}).click();await expect(page.getByLabel('Unsaved instructions')).toHaveValue('Keep my edited task');
 await page.getByLabel('Status filter').selectOption('Active playtest');await expect(page.getByRole('status')).toContainText('1 of 2 shown');
 await page.getByLabel('Status filter').selectOption('All');await page.getByRole('button',{name:/Beta No playtest/}).click();
 await expect(page.getByRole('heading',{name:'Beta detail'})).toBeVisible();assert.equal(new URL(page.url()).searchParams.get('game'),'beta');
 await page.goBack();await expect(page.getByRole('heading',{name:'Alpha detail'})).toBeVisible();
 await page.getByRole('button',{name:'View feedback'}).click();await expect(page.getByText('Alpha build feedback',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Back to list'})).toBeVisible();await page.getByRole('button',{name:'Back to list'}).click();
 await expect(page.getByRole('button',{name:/Beta No playtest/})).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'.backup-tools/developer-workspace-mobile.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.backup-tools/developer-workspace-desktop.png',fullPage:true});
 await page.goto(testOrigin+'/workspace-review-fixture?tab=claims&game=claim');await expect(page.getByRole('heading',{name:'Delta claim'})).toBeVisible();
 await page.getByRole('tab',{name:'Developer claims 1'}).focus();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Diagnostics 2'})).toBeFocused();await expect(page.getByRole('tab',{name:'Game submissions 1'}).locator('span')).toHaveClass(/bg-amber-400/);
 await page.getByLabel('Status filter').selectOption('FAILED');await expect(page.getByRole('status')).toContainText('1 of 2 shown');await expect(page.getByRole('heading',{name:'Alpha diagnostics'})).toBeVisible();await page.getByLabel('Status filter').selectOption('COMPLETE');await expect(page.getByRole('heading',{name:'Beta diagnostics'})).toBeVisible();

 // Selection scrolling: committed content, sticky headers, keyboard and no incidental re-scroll.
 await page.goto(testOrigin+'/workspace-review-fixture');await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{window.__workspaceScrolls=[];const native=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){const list=document.querySelector('[aria-label="My games list"]');const before=list?.scrollTop;const result=native.call(this,options);window.__workspaceScrolls.push({text:this.textContent.slice(0,80),options,listBefore:before,listAfter:list?.scrollTop});return result}});
 await page.getByRole('button',{name:/Beta No playtest/}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Beta detail'})).toBeVisible();
 assert(await page.getByRole('heading',{name:'Beta detail'}).evaluate(node=>node.getBoundingClientRect().top>=85),'Panel clears sticky header');
 assert.equal(await page.evaluate(()=>window.__workspaceScrolls.at(-1).options.behavior),'instant');
 const scrolled=await page.evaluate(()=>window.__workspaceScrolls.length);await page.getByLabel('Search by game name').fill('Beta');await page.getByLabel('Search by game name').fill('');assert.equal(await page.evaluate(()=>window.__workspaceScrolls.length),scrolled,'Search/filter fallback must not scroll');
 await page.getByRole('button',{name:/Alpha Playtest open/}).focus();await page.keyboard.press('Space');await page.getByLabel('Unsaved instructions').fill('Still preserved');
 await page.getByRole('button',{name:'View feedback'}).click();await expect(page.getByText('Alpha build feedback',{exact:true})).toBeVisible();
 assert(await page.getByText('Alpha build feedback',{exact:true}).evaluate(node=>node.getBoundingClientRect().top>=85),'Feedback clears sticky header');assert.equal(await page.getByLabel('Unsaved instructions').inputValue(),'Still preserved');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:/Beta No playtest/}).click();assert.equal(await page.evaluate(()=>window.__workspaceScrolls.at(-1).options.behavior),'smooth');
 assert(await page.evaluate(()=>window.__workspaceScrolls.every(call=>call.listBefore===call.listAfter)),'Panel scrolling does not reset the independent list');
 // A real nested scrollport, with an independent game-list scroll position.
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{const panel=document.querySelector('[role="tabpanel"]').parentElement;panel.style.height='420px';panel.style.overflowY='auto';const list=document.querySelector('[aria-label="My games list"]');list.style.height='130px';list.style.overflowY='auto';});
 await page.getByRole('button',{name:/Alpha Playtest open/}).click();await page.getByRole('button',{name:'View feedback'}).click();
 assert(await page.evaluate(()=>document.querySelector('[role="tabpanel"]').parentElement.scrollTop>100),'Feedback scrolls actual container');
 await page.getByRole('button',{name:/Beta No playtest/}).click();assert.equal(await page.evaluate(()=>document.querySelector('[role="tabpanel"]').parentElement.scrollTop),0,'Different game resets detail scrollport');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Back to list'}).click();await page.getByRole('button',{name:/Alpha Playtest open/}).click();await expect(page.getByRole('heading',{name:'Alpha detail'})).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto(testOrigin+'/workspace-review-fixture?scenario=empty');await expect(page.getByRole('heading',{name:'No my games yet'})).toBeVisible();
 await page.goto(testOrigin+'/workspace-review-fixture?scenario=error');await expect(page.getByRole('button',{name:'Refresh workspace'})).toBeVisible();await expect(page.getByRole('heading',{name:'No my games yet'})).toHaveCount(0);
 console.log('PASS: workspace selection after commit, Enter/Space, reduced motion, sticky headers, nested scrollport reset, independent list, no search scroll, unsaved edits, same-game feedback, URL/Back and desktop/mobile layout. No live requests.');
}finally{await browser.close();fs.unlinkSync(fixture);fs.rmdirSync('app/workspace-review-fixture');}

async function planBrowser(){
 const fixtureDir='app/developer-plan-fixture',componentFile='app/components/_plan_allowance_fixture.tsx';if(fs.existsSync(fixtureDir)||fs.existsSync(componentFile))throw Error('Fixture exists');
 fs.writeFileSync(componentFile,fs.readFileSync('app/components/StartPlaytest.tsx','utf8')+'\nexport {CampaignAllowancePanel};\n');fs.mkdirSync(fixtureDir);fs.writeFileSync(fixtureDir+'/page.tsx',`"use client";import{useState}from'react';import{DeveloperPlanProvider,DeveloperPlanSummary,useDeveloperPlan}from'../components/DeveloperPlan';import{CampaignAudienceFields}from'../components/CampaignAudienceFields';import{CampaignAllowancePanel}from'../components/_plan_allowance_fixture';function Allowance(){const{refresh}=useDeveloperPlan();const[active,setActive]=useState(false);return <><button onClick={()=>setActive(value=>!value)}>Toggle active game round</button><CampaignAllowancePanel eligibility={{has_active_playtest:active,active_playtest_id:null,active_playtest_status:active?'open':null,tester_hub_eligible:true,tester_hub_reason:'Fixture',next_tester_hub_at:null,tester_hub_rounds_last_30_days:999}} loading={false} error="" currentPlaytest={null} onRetry={()=>void refresh()}/></>}export default function Fixture(){const[rank,setRank]=useState(0),[genre,setGenre]=useState('Action'),[restricted,setRestricted]=useState(false),[legacy,setLegacy]=useState(false);return <main className="min-h-screen bg-[#090b0a] p-4 text-white"><div style={{maxWidth:650}}><DeveloperPlanProvider><DeveloperPlanSummary/><Allowance/><button onClick={()=>{setLegacy(true);setRank(1);setRestricted(true);setGenre('Action')}}>Load published targeting</button><CampaignAudienceFields minimumRank={rank} setMinimumRank={setRank} genre={genre} setGenre={setGenre} restricted={restricted} setRestricted={setRestricted} publishedTargeting={legacy?[1,'Action',true]:undefined}/></DeveloperPlanProvider></div></main>}`);
 const endpoint=/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m.exec(fs.readFileSync('.env.local','utf8'))[1],backend=new URL(endpoint.trim()),origin=process.env.TEST_APP_URL||'http://localhost:3000',uid='d1000000-0000-4000-8000-000000000001',encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),expiry=Math.floor(Date.now()/1000)+3600,user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{}};const session={access_token:encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:expiry,role:'authenticated'})+'.fixture',refresh_token:'fixture',expires_in:3600,expires_at:expiry,token_type:'bearer',user};let plan='free',changes=0,failPlan=false,failureCode=null;
 const browser=await chromium.launch({headless:true});try{
  const context=await browser.newContext();await context.addCookies([{name:'sb-'+backend.hostname.split('.')[0]+'-auth-token',value:'base64-'+encode(session),url:origin}]);await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin===origin){const headers={...req.headers()};delete headers.cookie;return route.continue({headers})}if(url.origin!==backend.origin)return route.abort();const name=url.pathname.split('/').at(-1);let data;if(name==='get_my_developer_plan'){if(failPlan)return route.fulfill({status:failureCode?400:503,json:{code:failureCode,message:'Fixture unavailable'}});data={plan,launch_limit:plan==='pro'?15:1,window_hours:720,gap_hours:plan==='pro'?48:0,rank_targeting:plan==='pro',genre_targeting:plan==='pro',rounds_used:13,quota_until:plan==='free'?new Date(Date.now()+696*3600000).toISOString():null,cooldown_until:plan==='pro'?new Date(Date.now()+24*3600000).toISOString():null,next_at:new Date(Date.now()+(plan==='pro'?24:696)*3600000).toISOString(),server_now:new Date().toISOString(),can_assign:true};}else if(name==='admin_assign_developer_plan'){const args=req.postDataJSON();assert.equal(args.p_developer_id,uid);assert(args.p_reason.trim());plan=args.p_plan;changes++;data={plan,changed:true};}else if(name==='get_testing_audience_availability')data=true;else if(name==='user')data=user;else throw Error('Unexpected request '+name);return route.fulfill({json:data})});
  const page=await context.newPage({viewport:{width:1280,height:900}});await page.goto(origin+'/developer-plan-fixture');const summary=page.getByRole('region',{name:'Developer plan'});await expect(summary.getByText(/13 launches recorded/)).toBeVisible();await expect(page.getByText(/13 launches recorded/)).toHaveCount(1);await expect(summary.getByText('Free plan: 1 launch per rolling 30 days',{exact:true})).toBeVisible();await expect(summary.getByText('No launches available',{exact:true})).toBeVisible();const warning=page.getByText("This game's current round must be closed before another round can launch.",{exact:true});await expect(warning).toHaveCount(0);await page.getByRole('button',{name:'Toggle active game round'}).click();await expect(warning).toBeVisible();await page.getByRole('button',{name:'Toggle active game round'}).click();await expect(warning).toHaveCount(0);const rank=page.getByLabel('Minimum tester rank',{exact:false}),audience=page.getByRole('combobox',{name:'Audience',exact:true});await expect(rank.locator('option[value="1"]')).toHaveJSProperty('disabled',true);await expect(audience.locator('option[value="match"]')).toHaveJSProperty('disabled',true);await expect(page.getByRole('combobox',{name:'Testing genre',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:/upgrade|pay/i})).toHaveCount(0);
  await summary.locator('summary').filter({hasText:'Admin: assign developer plan'}).click();await page.getByLabel('Developer account UUID').fill(uid);await page.getByRole('combobox',{name:'Plan',exact:true}).selectOption('pro');await page.getByLabel('Audit reason').fill('Authorised fixture grant');await page.getByRole('button',{name:'Save plan assignment'}).click();await expect(summary.getByText(/13 launches recorded/)).toBeVisible();await summary.getByText('Launch rules',{exact:true}).click();await expect(summary.getByText(/At least 48 elapsed hours/)).toBeVisible();await expect(rank.locator('option[value="1"]')).toHaveJSProperty('disabled',false);await rank.selectOption('1');await audience.selectOption('match');await expect(page.getByText(/13 launches recorded/).last()).toBeVisible();
  await page.getByRole('combobox',{name:'Plan',exact:true}).selectOption('free');await page.getByLabel('Audit reason').fill('Authorised fixture revoke');await page.getByRole('button',{name:'Save plan assignment'}).click();await expect(summary.getByText(/13 launches recorded/)).toBeVisible();await expect(rank).toHaveValue('1');await expect(audience).toHaveValue('match');await expect(rank.locator('option[value="1"]')).toHaveJSProperty('disabled',true);await rank.selectOption('0');await audience.selectOption('any');await page.getByRole('button',{name:'Load published targeting'}).click();await expect(rank.locator('option[value="1"]')).toHaveJSProperty('disabled',false);await expect(rank.locator('option[value="2"]')).toHaveJSProperty('disabled',true);await expect(audience.locator('option[value="match"]')).toHaveJSProperty('disabled',false);assert.equal(changes,2);
  for(const width of[1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No plan/targeting page overflow');}
  failPlan=true;await page.getByRole('button',{name:'Refresh plan and allowance'}).click();await expect(summary.getByRole('alert')).toContainText('Plan unavailable');failPlan=false;await page.getByRole('button',{name:'Refresh plan and allowance'}).click();await expect(summary.getByText(/13 launches recorded/)).toBeVisible();
  for(const [code,text]of [['PGRST202','schema cache'],['42501','Sign in again']]){failureCode=code;failPlan=true;await page.getByRole('button',{name:'Refresh plan and allowance'}).click();await expect(summary.getByRole('alert')).toContainText(text);failPlan=false;await summary.getByRole('button',{name:'Refresh plan and allowance'}).click();await expect(summary.getByText(/13 launches recorded/)).toBeVisible();}
  console.log('PASS browser: Free/Pro account summary/usage/spacing, admin grant/revoke and refresh, Pro-only controls, preserved requested settings, grandfathered targeting, error/retry and desktop/mobile layout; no payment controls. All backend requests mocked.');
 }finally{await browser.close();fs.unlinkSync(fixtureDir+'/page.tsx');fs.rmdirSync(fixtureDir);fs.unlinkSync(componentFile)}
}

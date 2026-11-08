import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from 'playwright/test';
const origin=process.env.TEST_APP_URL||'http://localhost:3000';
const dir='app/start-playtest-fixture',file=dir+'/page.tsx';assert(!fs.existsSync(dir));fs.mkdirSync(dir);
fs.writeFileSync(file,`import StartPlaytest from '../components/StartPlaytest';
const playtest={id:'build-current',status:'open' as const,shareToken:'token-fix',accessLink:'https://example.test/build',instructions:'Run the tutorial loop.',focusAreas:['Overall experience'],audience:'both' as const,targetTesters:3,estimatedMinutes:30,releaseLabel:'v1',createdAt:'2026-10-20T10:00:00.000Z',publishedAt:'2026-10-21T10:00:00.000Z'};
export default function Page(){return <main className="min-h-screen bg-[#090b0a] p-6 text-white"><StartPlaytest gameTitle="Alpha" gameSource={{importedGameId:'imported-a',approvedGameId:null,submissionId:'submission-a'}} existingPlaytest={playtest} playtests={[playtest]}/></main>}`);
const progress={total_testers:3,claimed_count:3,in_progress_count:1,submitted_count:2,accepted_count:1,rejected_count:0};
const community={playtest_id:'build-current',title:'Alpha round',status:'open',audience:'both',summary:{community_testing:0,community_completed:0,community_total:0,average_overall:null,average_gameplay:null,average_controls:null,average_performance:null,recommend_yes:0,recommend_maybe:0,recommend_no:0},responses:[]};
const accepted=[{test_id:'test-a',overall_score:8,gameplay_score:8,performance_score:9,continue_playing:'definitely',recommend_game:'definitely',enjoyed_most:'Tight movement.',frustrations:'Short tutorial.',bugs_found:'None found',biggest_improvement:'Longer tutorial.',feedback:'Solid loop.',hours_played:1.5,focus_responses:{},submitted_at:'2026-10-22T10:00:00.000Z'}];
const backend=new URL(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\r\n"']+)/m.exec(fs.readFileSync('.env.local','utf8'))[1].trim());
const uid='d2000000-0000-4000-8000-000000000002',encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),expiry=Math.floor(Date.now()/1000)+3600;
const session={access_token:encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:expiry,role:'authenticated'})+'.fixture',refresh_token:'fixture',expires_in:3600,expires_at:expiry,token_type:'bearer',user:{id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{}}};
const updates=[];let repeatedResults=0;
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addCookies([{name:'sb-'+backend.hostname.split('.')[0]+'-auth-token',value:'base64-'+encode(session),url:origin}]);
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===origin){const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
  if(url.origin!==backend.origin)return route.abort();
  const name=url.pathname.split('/').at(-1);
  if(url.pathname.startsWith('/rest/v1/rpc/')){
   if(name==='get_my_developer_plan')return route.fulfill({json:{plan:'free',launch_limit:1,window_hours:720,gap_hours:0,rank_targeting:false,genre_targeting:false,rounds_used:13,quota_until:new Date(Date.now()+696*3600000).toISOString(),cooldown_until:null,next_at:new Date(Date.now()+696*3600000).toISOString(),server_now:new Date().toISOString(),can_assign:false}});
   if(name==='get_playtest_eligibility')return route.fulfill({json:[{has_active_playtest:true,active_playtest_id:'build-current',active_playtest_status:'open',tester_hub_eligible:true,tester_hub_reason:'Fixture eligibility',next_tester_hub_at:null,tester_hub_rounds_last_30_days:13}]});
   if(name==='get_campaign_testing_details')return route.fulfill({json:{minimum_rank:0,testing_genre:null,genre_restricted:false,build_locked:false}});
   if(name==='get_testing_capacity_policy')return route.fulfill({json:{places:3}});
   if(name==='get_developer_playtested_test_progress'){repeatedResults++;return route.fulfill({json:[progress]});}
   if(name==='get_developer_community_playtest_results'){repeatedResults++;return route.fulfill({json:community});}
   if(name==='get_developer_accepted_playtest_feedback'){repeatedResults++;return route.fulfill({json:accepted});}
   if(name==='update_community_playtest'){updates.push(req.postDataJSON());const args=req.postDataJSON();return route.fulfill({json:{success:true,message:args.p_status==='paused'?'Playtest paused.':args.p_status==='closed'?'Playtest closed.':'Playtest updated.'}});}
  }else if(url.pathname.startsWith('/rest/v1/community_playtests'))return route.fulfill({json:[]});
  else if(name==='get_testing_audience_availability')return route.fulfill({json:true});
  else if(name==='get_developer_quality_reports')return route.fulfill({json:[]});
  else if(name==='get_test_feedback_usefulness_for_developer')return route.fulfill({json:{average_score:null,signals:{}}});
  throw Error('Unexpected request '+url.pathname);
 });
 const page=await context.newPage();
 await page.goto(origin+'/start-playtest-fixture');
 // Summary card: status pill and manage entry.
 const openPill=page.getByText('Playtest open',{exact:true});await expect(openPill).toBeVisible();
 await expect(page.getByText('Players can test this game')).toBeVisible();
 await expect(page.getByRole('button',{name:'Manage playtest'})).toBeVisible();
 // Manage mode renders the manage header with loaded progress pills.
 await page.getByRole('button',{name:'Manage playtest'}).click();
 const manageHeading=page.locator('h4',{hasText:'Alpha'});await expect(manageHeading).toBeVisible();
 await expect(page.getByText('1 of 3 accepted, target 3')).toBeVisible();
 await expect(page.getByText('Awaiting moderation')).toBeVisible();
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeEnabled();
 // Setup disclosure stays collapsed in manage mode and toggles with the +/- control.
 const setup=page.getByRole('button',{name:/Playtest setup/});
 await expect(setup).toHaveAttribute('aria-expanded','false');
 await setup.click();
 await expect(setup).toHaveAttribute('aria-expanded','true');
 await expect(page.getByText('How will testers access this build?')).toBeVisible();
 // Accepted evidence locks the build details of this round.
 const access=page.getByRole('combobox',{name:'How will testers access this build?'});
 await expect(access).toBeDisabled();
 await expect(page.getByText('Accepted tester evidence has been collected')).toBeVisible();
 // Pause control calls the status update RPC and reports the outcome.
 await page.getByRole('button',{name:'Pause playtest'}).click();
 await expect.poll(()=>updates.length).toBeGreaterThan(0);
 assert.equal(updates[0].p_playtest_id,'build-current');
 assert.equal(updates[0].p_status,'paused');
 await expect(page.getByText('Playtest paused.')).toBeVisible();
 // Closing asks for confirmation first and performs the same status RPC.
 const dialogHandled=page.waitForEvent('dialog').then(async answer=>{assert(answer.message().includes('Close this playtest?'));await answer.accept();});
 await page.getByRole('button',{name:'Close playtest'}).click();
 await dialogHandled;
 await expect.poll(()=>updates.length).toBeGreaterThan(1);
 assert.equal(updates.at(-1).p_status,'closed');
 await expect(page.getByText('Playtest closed.')).toBeVisible();
 assert(repeatedResults>=3,'Results and progress were loaded');
 await expect.poll(()=>repeatedResults).toBeLessThan(6,'Progress loads once per campaign even when manage mode starts');
 console.log('PASS manage playtest controls: summary pills with mocked progress/awaiting-moderation, manage mode disclosure toggle, locked build evidence notice, pause/close RPC status updates with confirmation, single progress load. Mocked RPC responses only.');
}finally{await browser.close();fs.unlinkSync(file);fs.rmdirSync(dir);}

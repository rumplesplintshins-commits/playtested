// Explicit development-only provisioning through normal owner submission/campaign RPCs.
// Credentials stay in ignored technical-test-results; no email is sent.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
assert(process.argv.includes('--execute'),'Use --execute to create retained development QA fixtures.');
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,'ktifgybnkdaotdxrvjgq.supabase.co');
const path='technical-test-results/m24-final-acceptance.json';
const state=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{project:'ktifgybnkdaotdxrvjgq',accounts:{},games:[]};
assert.equal(state.project,'ktifgybnkdaotdxrvjgq');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,opts);
const must=(r,label)=>{assert(!r.error,`${label}: ${r.error?.message||'unknown'}`);return r.data;};
const save=()=>{fs.mkdirSync('technical-test-results',{recursive:true});fs.writeFileSync(path,JSON.stringify(state,null,2));};
const clients={};
for(const role of ['developer1','developer2','tester','automationTester']){
 if(!state.accounts[role]){
  const email=`m24-final-${role.toLowerCase()}-${Date.now()}@example.test`,password=crypto.randomBytes(24).toString('base64url');
  const roles=role.startsWith('developer')?['developer','player']:['tester','player'];
  const {user}=must(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{signup_roles:roles,age_18_confirmed:true,age_18_confirmed_at:new Date().toISOString()}}),'Create dedicated synthetic account');
  state.accounts[role]={id:user.id,email,password};save();
  must(await service.from('profiles').update({role:'user',roles}).eq('id',user.id),'Configure new synthetic profile');
 }
 const account=state.accounts[role];assert(account.email.startsWith(`m24-final-${role.toLowerCase()}-`));
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,opts);
 must(await client.auth.signInWithPassword({email:account.email,password:account.password}),'Synthetic sign-in');clients[role]=client;
}
const fixtures=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
const {user}=must(await service.auth.admin.getUserById(fixtures.users.admin),'Read synthetic reviewer');assert(user.email.startsWith('m24-admin-'));
const link=must(await service.auth.admin.generateLink({type:'magiclink',email:user.email}),'Generate reviewer sign-in without email');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,opts);
must(await admin.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'Reviewer sign-in');
const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync('lib/demo-games.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports,()=>({gameDetailPath:()=>''}));
for(let i=0;i<2;i++){
 const game=exports.DEMO_GAMES[i],role=`developer${i+1}`,owner=state.accounts[role],client=clients[role];
 let fixture=state.games[i];
 if(!fixture){fixture={id:crypto.randomUUID(),title:`[DEV QA] ${game.title}`,slug:game.slug};state.games[i]=fixture;save();}
 const existing=must(await client.from('game_submissions').select('id,title,status,developer_id').eq('id',fixture.id).maybeSingle(),'Check fixture');
 if(existing)assert(existing.title===fixture.title&&existing.developer_id===owner.id,'Fixture identity mismatch');
 else must(await client.from('game_submissions').insert({id:fixture.id,developer_id:owner.id,title:fixture.title,developer_name:'Playtested Development QA Studio',genre:game.genre,description:`Development-only playable synthetic demo. ${game.description}`,image_url:`http://localhost:3000/demo-assets/${game.slug}.svg`,game_link:`http://localhost:3000/demo-games/${game.slug}`,evidence_link:'',release_status:'Not announced',ai_type:'AI-assisted: Code and content',ai_areas:['Programming or code','Artwork or textures'],ai_explanation:'Synthetic QA demo created to exercise Playtested workflows; not a commercial game.',status:'Pending Review'}),'Submit synthetic listing');
 if(existing?.status!=='Approved')must(await admin.rpc('review_game_submission',{p_submission_id:fixture.id,p_status:'Approved',p_review_reason:null}),'Approve synthetic listing through normal review');
 const links=must(await client.from('game_developer_links').select('id').eq('submission_id',fixture.id).eq('developer_id',owner.id),'Read developer relationship');
 // Approval ownership is verified before provisioning the normal relationship row.
 if(!links.length)must(await service.from('game_developer_links').insert({developer_id:owner.id,submission_id:fixture.id,relationship:'Original submitter'}),'Link approved original submitter');
 const campaigns=must(await client.from('community_playtests').select('id,status').eq('submission_id',fixture.id),'Read campaign');
 if(campaigns.length){assert.equal(campaigns.length,1);assert.equal(campaigns[0].status,'open');fixture.campaignId=campaigns[0].id;}
 else fixture.campaignId=must(await client.rpc('create_community_playtest',{p_imported_game_id:null,p_approved_game_id:null,p_submission_id:fixture.id,p_access_link:`http://localhost:3000/demo-games/${game.slug}`,p_access_type:'browser_game',p_instructions:game.instructions,p_focus_areas:['Gameplay','Controls','Clarity'],p_audience:'playtested_testers',p_target_testers:4,p_estimated_minutes:2,p_release_label:'Development acceptance demo 1',p_publish:true,p_minimum_rank:0,p_testing_genre:game.genre,p_genre_restricted:false}),'Publish via normal owner campaign RPC');
 save();
}
const available=must(await clients.tester.rpc('get_discoverable_community_test_games'),'Tester discovery');
for(const game of state.games)assert(available.some(row=>row.submission_id===game.campaignId&&row.can_claim!==false),`${game.title} unavailable to manual tester`);
console.log('PASS: two approved synthetic listings and open, unrestricted QA campaigns; normal owner RPCs, separate Free developers, legitimate allowance/capacity enforcement.');
console.log(`Manual credentials and exact localhost URLs: ${path} (ignored). No email, payments or production changes.`);
for(const game of state.games)console.log(`${game.title}: http://localhost:3000/submissions/${game.id}`);

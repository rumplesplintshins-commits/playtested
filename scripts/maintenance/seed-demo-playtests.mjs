import fs from 'node:fs';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';

// Missing-only fixture creation: never overwrite an existing game, campaign or report.
const exports = {};
new Function('exports', ts.transpileModule(fs.readFileSync('lib/demo-games.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);
const games = exports.DEMO_GAMES;
const execute = process.argv.includes('--execute');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')];}));
if(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'qtcmzckdhgahuqqilmzj.supabase.co') throw new Error('Unexpected project; stopped.');
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function checked(query,label){const result=await query;if(result.error)throw new Error(`${label} failed (code ${result.error.code ?? 'unknown'}); existing records preserved.`);return result.data;}
try {
  const owners=await checked(db.from('profiles').select('id,roles,role,tester_xp,developer_xp,completed_tests').eq('role','admin').contains('roles',['tester','developer']),'Owner lookup');
  if(owners.length!==1)throw new Error(`Expected one admin/tester/developer owner; found ${owners.length}. Stopped.`);
  const owner=owners[0];
  const existingGames=await checked(db.from('game_submissions').select('id,title,developer_id').in('id',games.map(g=>g.id)),'Game lookup');
  const existingCampaigns=await checked(db.from('community_playtests').select('id,title,developer_id,submission_id,status').in('id',games.map(g=>g.campaignId)),'Campaign lookup');
  for(const row of [...existingGames,...existingCampaigns]) {
    const game=games.find(g=>g.id===row.id||g.campaignId===row.id);
    if(row.title!==`[DEMO] ${game.title}`||row.developer_id!==owner.id||('submission_id' in row&&row.submission_id!==game.id))throw new Error('Fixture ID collision; stopped without overwriting.');
  }
  console.log(`${execute?'Execute':'Preview'}: three labelled demo games, missing records only; one existing admin/tester/developer owner.`);
  if(!execute)process.exit(0);
  const missingGames=games.filter(g=>!existingGames.some(row=>row.id===g.id));
  if(missingGames.length)await checked(db.from('game_submissions').insert(missingGames.map(g=>({id:g.id,developer_id:owner.id,title:`[DEMO] ${g.title}`,developer_name:'Playtested Demo Studio',genre:g.genre,description:`Synthetic QA demo, not a commercial release. ${g.description}`,game_link:`http://localhost:3000/demo-games/${g.slug}`,image_url:`http://localhost:3000/demo-assets/${g.slug}.svg`,price:'Free',ai_type:'AI-assisted demo fixture',status:'Approved',release_status:'Upcoming'}))),'Demo game insert');
  const links=await checked(db.from('game_developer_links').select('submission_id').eq('developer_id',owner.id).in('submission_id',games.map(g=>g.id)),'Developer link lookup');
  const missingLinks=games.filter(g=>!links.some(row=>row.submission_id===g.id));
  if(missingLinks.length)await checked(db.from('game_developer_links').insert(missingLinks.map(g=>({developer_id:owner.id,submission_id:g.id,relationship:'Original submitter'}))),'Demo developer link insert');
  const missingCampaigns=games.filter(g=>!existingCampaigns.some(row=>row.id===g.campaignId));
  if(missingCampaigns.length)await checked(db.from('community_playtests').insert(missingCampaigns.map(g=>({id:g.campaignId,developer_id:owner.id,submission_id:g.id,title:`[DEMO] ${g.title}`,access_link:`http://localhost:3000/demo-games/${g.slug}`,instructions:g.instructions,focus_areas:['Gameplay','Controls','Clarity'],audience:'playtested_testers',target_testers:2,estimated_minutes:2,release_label:'Demo build 0.1',status:'open',access_type:'browser_game',minimum_rank:0,testing_genre:g.genre,genre_restricted:g.restricted}))),'Demo campaign insert');
  const verified=await checked(db.from('community_playtests').select('id,submission_id,status,testing_genre,genre_restricted,target_testers').in('id',games.map(g=>g.campaignId)),'Final campaign verification');
  if(verified.length!==3)throw new Error('Expected three campaigns; stopped.');
  const after=(await checked(db.from('profiles').select('tester_xp,developer_xp,completed_tests').eq('id',owner.id),'XP verification'))[0];
  const unchanged=['tester_xp','developer_xp','completed_tests'].every(key=>after[key]===owner[key]);
  fs.mkdirSync('.backup-tools',{recursive:true});
  fs.writeFileSync('.backup-tools/demo-playtests-manifest.json',JSON.stringify({createdAt:new Date().toISOString(),project:'qtcmzckdhgahuqqilmzj',ownerId:owner.id,games:games.map(g=>({id:g.id,campaignId:g.campaignId,title:g.title,genre:g.genre,restricted:g.restricted,url:`http://localhost:3000/submissions/${g.id}`})),verified,xpUnchanged:unchanged},null,2));
  console.log(`Verified three demo campaigns. Owner XP/counts ${unchanged?'unchanged':'changed concurrently; inspect before continuing'}. No claims or feedback created. Manifest: .backup-tools/demo-playtests-manifest.json`);
}catch(error){console.error(error.message);process.exitCode=1;}

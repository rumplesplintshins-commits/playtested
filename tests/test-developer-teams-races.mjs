import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
assert.equal(backend.origin,"http://127.0.0.1:54341","Use the local fixture database");
const fixtures=JSON.parse(await readFile(".backup-tools/developer-teams/credentials.json","utf8"));
const serviceKey=process.env.LOCAL_STUDIO_SERVICE_KEY;
assert(serviceKey,"Use the local service key only to create and remove the disposable overflow account");
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(backend.origin,serviceKey,options);
async function auth(fixture){
  const client=createClient(backend.origin,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  const {error}=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
  assert(!error,"Fixture authentication failed");
  return client;
}
async function ok(call){
  const {data,error}=await call;
  if(error)throw new Error(error.message);
  return data;
}
function sql(query){
  execFileSync("docker",["exec","-i","supabase_db_supabase","psql","-U","postgres","-d","postgres","-X","-v","ON_ERROR_STOP=1"],{input:query,stdio:["pipe","ignore","inherit"]});
}
const [owner,...members]=fixtures;

const users=await Promise.all(members.map(auth));
const account={email:`studio-race-${randomBytes(6).toString("hex")}@playtested.local`,password:randomBytes(24).toString("base64url")};
const {user}=await ok(admin.auth.admin.createUser({...account,email_confirm:true,app_metadata:{local_studio_fixture:true}}));
const id=user.id;
let studio,foreign;
try{
  await ok(admin.from("profiles").upsert({id,display_name:"Disposable overflow fixture",role:"developer",roles:["developer"]}));
  const ownerClient=await auth(account);
  const create=()=>ownerClient.rpc("change_studio",{p_action:"create",p_name:"Developer Teams Capacity Fixture"});
  const studios=await Promise.all([create(),create()]);
  studio=studios.find(result=>!result.error)?.data.id;
  assert.equal(studios.filter(result=>!result.error).length,1);
  assert.match(studios.find(result=>result.error).error.message,/ownership limit/);
  foreign=(await ok(users[4].rpc("change_studio",{p_action:"create",p_name:"Developer Teams Foreign Fixture"}))).id;
  assert((await users[4].rpc("get_studio_workspace",{p_studio:studio})).error);
  assert((await ownerClient.rpc("get_studio_team",{p_studio:foreign})).error);
  assert((await ownerClient.rpc("change_studio",{p_action:"remove",p_studio:studio,p_target:id})).error);
  assert((await ownerClient.rpc("change_studio",{p_action:"role",p_studio:studio,p_target:id,p_role:"viewer"})).error);
  const invite=email=>ownerClient.rpc("change_studio",{p_action:"invite",p_studio:studio,p_email:email,p_role:"viewer"});
  const pending=async()=> (await ok(ownerClient.rpc("get_studio_team",{p_studio:studio}))).pending;
  let item;
  await ok(invite(members[0].email));
  item=(await pending())[0];
  await ok(users[0].rpc("change_studio",{p_action:"decline",p_target:item.id}));
  assert((await users[0].rpc("get_studio_workspace",{p_studio:studio})).error);
  assert((await users[0].rpc("change_studio",{p_action:"accept",p_target:item.id})).error);
  await ok(invite(members[1].email));
  item=(await pending())[0];
  await ok(ownerClient.rpc("change_studio",{p_action:"cancel",p_studio:studio,p_target:item.id}));
  assert((await users[1].rpc("change_studio",{p_action:"accept",p_target:item.id})).error);
  await ok(invite(members[2].email));
  item=(await pending())[0];
  assert.match(item.id,/^[0-9a-f-]{36}$/);
  sql(`update playtested_studios.invites set expires_at=now()-interval '1 second' where id='${item.id}';`);
  assert((await users[2].rpc("change_studio",{p_action:"accept",p_target:item.id})).error);
  assert((await ok(users[2].rpc("get_my_notifications",{p_limit:20}))).notifications.some(n=>n.title==="Studio invitation expired"&&n.href===null));
  for(const member of members.slice(0,4))await ok(invite(member.email));
  assert.equal((await pending()).length,4);
  const results=await Promise.all([invite(members[4].email),invite(owner.email)]);
  assert.equal(results.filter(r=>!r.error).length,1);
  assert.match(results.find(r=>r.error).error.message,/colleague places/);
  assert.equal((await pending()).length,5);
  const original=(await pending()).find(a=>a.email===members[0].email);
  await ok(users[0].rpc("change_studio",{p_action:"accept",p_target:original.id}));
  assert((await users[0].rpc("change_studio",{p_action:"accept",p_target:original.id})).error);
  assert.equal((await pending()).length,4);
  assert((await ownerClient.rpc("change_studio",{p_action:"invite",p_studio:studio,p_email:"nobody@playtested.local",p_role:"viewer"})).error);
  await ok(ownerClient.rpc("change_studio",{p_action:"role",p_studio:studio,p_target:members[0].id,p_role:"editor"}));
  const games=[randomUUID(),randomUUID()];
  assert.match(id,/^[0-9a-f-]{36}$/);
  sql(`insert into public.game_submissions(id,developer_id,title,developer_name,genre,description,game_link,image_url,release_status,ai_type,status)
    values ${games.map(game=>`('${game}','${id}','Race ${game}','Fixture','Action','Local race test','https://race.invalid/${game}','https://race.invalid/cover','Not announced','No AI used','Pending Review')`).join(",")};
    update public.game_submissions set status='Approved' where developer_id='${id}';
    insert into public.game_developer_links(developer_id,submission_id,relationship)
      select developer_id,id,'Original submitter' from public.game_submissions s where developer_id='${id}'
      and not exists(select 1 from public.game_developer_links l where l.submission_id=s.id and l.developer_id=s.developer_id);
    insert into playtested_studios.games(studio_id,link_id)
      select '${studio}',id from public.game_developer_links where developer_id='${id}';`);
  const settings={p_access_link:"http://127.0.0.1:3118/demo-games/neon-courier",p_access_type:"browser_game",
    p_instructions:"Test the controls and report performance.",p_focus_areas:["Controls"],p_audience:"playtested_testers",
    p_target_testers:1,p_estimated_minutes:15,p_release_label:"Race fixture"};
  const actors=[ownerClient,users[0]];
  const drafts=await Promise.all(actors.map((actor,index)=>ok(actor.rpc("create_community_playtest",{
    ...settings,p_imported_game_id:null,p_approved_game_id:null,p_submission_id:games[index],p_publish:false,
  }))));
  const launches=await Promise.all(actors.map((actor,index)=>actor.rpc("update_community_playtest",{
    ...settings,p_playtest_id:drafts[index],p_status:"open",
  })));
  assert.equal(launches.filter(result=>!result.error).length,1);
  assert.match(launches.find(result=>result.error).error.message,/workspace allowance/i);
  assert.equal((await ok(ownerClient.rpc("get_studio_developer_plan",{p_studio:studio}))).rounds_used,1);
  await ok(ownerClient.rpc("change_studio",{p_action:"remove",p_studio:studio,p_target:members[0].id}));
  assert((await users[0].rpc("get_studio_workspace",{p_studio:studio})).error);
  console.log("PASS independent local transactions: invitation lifecycle, immediate removal, cross-studio denial, concurrent Free studio creation, final member place, and one winner for a shared Free launch.");
}finally{
  sql(`delete from playtested_studios.launches where campaign_id in (select id from public.community_playtests where developer_id='${id}');
    delete from public.community_playtests where developer_id='${id}';
    delete from public.game_developer_links where developer_id='${id}';
    delete from public.approved_games where id in (select id from public.game_submissions where developer_id='${id}');
    delete from public.game_submissions where developer_id='${id}';`);
  for(const studioId of [studio,foreign].filter(Boolean)){
    assert.match(studioId,/^[0-9a-f-]{36}$/);
    sql(`delete from public.notifications n using playtested_studios.invites i where i.studio_id='${studioId}' and n.recipient_id=i.user_id and n.dedupe_key='studio-invitation:'||i.id; delete from playtested_studios.studios where id='${studioId}' and name in ('Developer Teams Capacity Fixture','Developer Teams Foreign Fixture');`);
  }
  await ok(admin.auth.admin.deleteUser(id));
}

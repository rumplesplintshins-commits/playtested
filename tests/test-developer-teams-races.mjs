import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
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
const ownerClient=await auth(owner);
const users=await Promise.all(members.map(auth));
const overflow=await ok(admin.auth.admin.createUser({
 email:`studio-overflow-${randomBytes(6).toString("hex")}@playtested.local`,password:randomBytes(24).toString("base64url"),
 email_confirm:true,app_metadata:{local_studio_fixture:true},
}));
const id=overflow.user.id;
let studio,foreign;
try{
  await ok(admin.from("profiles").upsert({id,display_name:"Disposable overflow fixture",role:"developer",roles:["developer"]}));
  studio=(await ok(ownerClient.rpc("change_studio",{p_action:"create",p_name:"Developer Teams Capacity Fixture"}))).id;
  foreign=(await ok(users[4].rpc("change_studio",{p_action:"create",p_name:"Developer Teams Foreign Fixture"}))).id;
  assert((await users[4].rpc("get_studio_workspace",{p_studio:studio})).error);
  assert((await ownerClient.rpc("get_studio_team",{p_studio:foreign})).error);
  assert((await ownerClient.rpc("change_studio",{p_action:"remove",p_studio:studio,p_target:owner.id})).error);
  assert((await ownerClient.rpc("change_studio",{p_action:"role",p_studio:studio,p_target:owner.id,p_role:"viewer"})).error);
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
  const results=await Promise.all([invite(members[4].email),invite(overflow.user.email)]);
  assert.equal(results.filter(r=>!r.error).length,1);
  assert.match(results.find(r=>r.error).error.message,/colleague places/);
  assert.equal((await pending()).length,5);
  const original=(await pending()).find(a=>a.email===members[0].email);
  await ok(users[0].rpc("change_studio",{p_action:"accept",p_target:original.id}));
  assert((await users[0].rpc("change_studio",{p_action:"accept",p_target:original.id})).error);
  assert.equal((await pending()).length,4);
  assert((await ownerClient.rpc("change_studio",{p_action:"invite",p_studio:studio,p_email:"nobody@playtested.local",p_role:"viewer"})).error);
  console.log("PASS independent local transactions: cancellation, decline, expiry, replay, immutable owner, cross-studio denial and concurrent final-place enforcement.");
}finally{
  for(const studioId of [studio,foreign].filter(Boolean)){
    assert.match(studioId,/^[0-9a-f-]{36}$/);
    sql(`delete from public.notifications n using playtested_studios.invites i where i.studio_id='${studioId}' and n.recipient_id=i.user_id and n.dedupe_key='studio-invitation:'||i.id; delete from playtested_studios.studios where id='${studioId}' and name in ('Developer Teams Capacity Fixture','Developer Teams Foreign Fixture');`);
  }
  await ok(admin.auth.admin.deleteUser(id));
}

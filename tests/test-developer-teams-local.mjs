import assert from "node:assert/strict";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect as baseExpect } from "playwright/test";

const expect=baseExpect.configure({timeout:15000});
const origin=new URL(process.env.STUDIO_APP_URL||"http://127.0.0.1:3118");
const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for(const url of [origin,backend])assert(["127.0.0.1","localhost"].includes(url.hostname),"Only local fixture servers are allowed");
const identities=JSON.parse(await readFile(".backup-tools/developer-teams/credentials.json","utf8"));
const [owner,...colleagues]=identities;
const browsers=[];
const browser=await chromium.launch({headless:true});
const releaseA="6f001900-0000-4000-8000-000000000011";
const releaseB="6f001900-0000-4000-8000-000000000012";
const gameId="6f001900-0000-4000-8000-000000000001";
const studioName="Power Spike Local QA";
const handles=new Map();
let ownerPage, studioId;

async function session(account){
  const client=createClient(backend.origin,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await client.auth.signInWithPassword({email:account.email,password:account.password});
  if(error)throw new Error("Local fixture sign-in failed for "+account.email);
  return client;
}

async function signIn(account,width=1280){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce"});
  browsers.push(context);
  const page=await context.newPage();
  await page.goto(origin+"/login?next=/my-team");
  const form=page.locator("form");
  await page.waitForFunction(()=>{
    const button=document.querySelector('form button[type=submit]');
    return button&&Object.keys(button).some(key=>key.startsWith('__reactProps$'));
  });
  try{
    await form.getByLabel("Email address").fill(account.email);
    await form.getByLabel("Password",{exact:true}).fill(account.password);
    await form.getByRole("button",{name:"Sign in",exact:true}).click();
    await page.waitForURL(url=>url.pathname==="/my-team",{timeout:15000});
  }catch{
    await form.getByLabel("Password",{exact:true}).fill("").catch(()=>{});
    throw new Error("Browser sign-in did not reach Manage Team for "+account.email);
  }
  await expect(page.getByRole("heading",{name:"Manage Team"})).toBeVisible();
  return page;
}

async function rpc(client,name,args){
  const {data,error}=await client.rpc(name,args);
  if(error)throw new Error(name+": "+error.message);
  return data;
}

async function invite(account){
  await ownerPage.getByLabel("Registered Playtested email").fill(account.email);
  await ownerPage.getByLabel("Access level").selectOption(account.intendedRole.toLowerCase());
  await ownerPage.getByRole("button",{name:"Invite member"}).click();
  await expect(ownerPage.getByText(account.email+" · "+account.intendedRole,{exact:false})).toBeVisible();
}

async function report(page,label,expected,excluded){
  await page.locator("[data-build-selection-row]").getByRole("button",{name:new RegExp(label.replace(".","\\."))}).click();
  await expect(page.getByRole("region",{name:"Results snapshot"})).toContainText("Build: "+label);
  await page.getByRole("tab",{name:"Individual responses"}).click();
  const panel=page.locator("#"+await page.getByRole("tab",{name:"Individual responses"}).getAttribute("aria-controls"));
  await expect(panel.getByText(expected,{exact:true})).toHaveCount(1);
  await expect(panel.getByText(excluded,{exact:true})).toHaveCount(0);
  await page.evaluate(()=>{window.print=()=>{};});
  await page.getByRole("button",{name:"Print feedback",exact:true}).click();
  await expect(page.locator("body > .feedback-print")).toContainText(expected);
  await expect(page.locator("body > .feedback-print")).not.toContainText(excluded);
  await page.emulateMedia({media:"print"});
  const pdf=await page.pdf({preferCSSPageSize:true});
  assert(pdf.subarray(0,5).equals(Buffer.from("%PDF-"))&&pdf.length>5000);
  await page.evaluate(()=>window.dispatchEvent(new Event("afterprint")));
  await page.emulateMedia({media:"screen"});
}

async function verifyZoom(sourcePage){
  const directory=await mkdtemp(join(tmpdir(),"studio-zoom-"));
  const manifest=join(directory,"manifest.json");
  const workerFile=join(directory,"worker.js");
  await writeFile(manifest,JSON.stringify({manifest_version:3,name:"Local studio zoom",version:"1.0",permissions:["tabs"],background:{service_worker:"worker.js"}}));
  await writeFile(workerFile,"chrome.runtime.onInstalled.addListener(() => {});");
  let context;
  try {
    context=await chromium.launchPersistentContext("",{channel:"chromium",headless:true,viewport:null,args:["--window-size=1500,1000","--disable-extensions-except="+directory,"--load-extension="+directory]});
    await context.addCookies(await sourcePage.context().cookies());
    const page=context.pages()[0];
    await page.goto(origin+"/my-team?studio="+studioId);
    const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
    const factor=await worker.evaluate(async()=>{
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      await chrome.tabs.setZoom(tab.id,1.5);
      return chrome.tabs.getZoom(tab.id);
    });
    assert.equal(factor,1.5);
    await expect.poll(()=>page.evaluate(()=>devicePixelRatio)).toBe(1.5);
    await expect(page.getByRole("heading",{name:studioName})).toBeVisible();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole("link",{name:"Open studio My Games"}).click();
    await page.getByRole("button",{name:"View feedback"}).click();
    await report(page,"Alpha 0.4","Historical build fixture report.","Current build fixture report.");
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    console.log("PASS actual 150% Chromium zoom and historical studio PDF.");
  }finally{
    await context?.close();
    await unlink(workerFile);
    await unlink(manifest);
    await rmdir(directory);
  }
}

const ownerClient=await session(owner);
const clients=await Promise.all(colleagues.map(session));
try {
  const inbox=await rpc(ownerClient,"get_studio_team",{p_studio:null});
  const prior=inbox.studios.find(item=>item.name===studioName);
  ownerPage=await signIn(owner);
  if(prior){
    studioId=prior.id;
    for(const member of (await rpc(ownerClient,"get_studio_team",{p_studio:studioId})).members.filter(m=>m.role!=="owner"))await rpc(ownerClient,"change_studio",{p_action:"remove",p_studio:studioId,p_target:member.id});
    for(const item of (await rpc(ownerClient,"get_studio_team",{p_studio:studioId})).pending)await rpc(ownerClient,"change_studio",{p_action:"cancel",p_studio:studioId,p_target:item.id});
    await ownerPage.goto(origin+"/my-team?studio="+studioId);
  }else{
    await ownerPage.getByLabel("New studio name").fill(studioName);
    await ownerPage.getByRole("button",{name:"Create studio"}).click();
    await expect(ownerPage.getByRole("heading",{name:studioName})).toBeVisible();
    studioId=(await rpc(ownerClient,"get_my_studios")).find(item=>item.name===studioName).id;
  }
  const gameRow=ownerPage.getByText("Ashen Hollow (local fixture)",{exact:true}).locator("xpath=../../..");
  await expect(gameRow).toBeVisible();
  if(await gameRow.getByRole("button",{name:"Assign to studio"}).count())await gameRow.getByRole("button",{name:"Assign to studio"}).click();
  await expect(gameRow.getByText("Shared with studio",{exact:true})).toBeVisible();
  const target=(await rpc(ownerClient,"get_studio_team",{p_studio:studioId})).games.find(game=>game.title.startsWith("Ashen Hollow"));
  assert(target.shared);
  for(const client of clients){
    assert((await client.rpc("get_studio_workspace",{p_studio:studioId})).error);
    assert((await client.rpc("get_developer_accepted_playtest_feedback",{p_playtest_id:releaseB})).error);
  }
  await invite(colleagues[0]);
  const original=(await rpc(ownerClient,"get_studio_team",{p_studio:studioId})).pending[0];
  await rpc(ownerClient,"change_studio",{p_action:"invite",p_studio:studioId,p_email:colleagues[0].email,p_role:"viewer"});
  await rpc(ownerClient,"change_studio",{p_action:"invite",p_studio:studioId,p_email:"missing@playtested.local",p_role:"editor"});
  await rpc(ownerClient,"change_studio",{p_action:"invite",p_studio:studioId,p_email:owner.email,p_role:"editor"});
  assert.equal((await rpc(ownerClient,"get_studio_team",{p_studio:studioId})).pending.length,1);
  assert((await clients[1].rpc("change_studio",{p_action:"accept",p_target:original.id})).error);
  const first=await signIn(colleagues[0]);
  handles.set(colleagues[0].id,first);
  await first.getByRole("button",{name:/^Notifications/}).click();
  const bell=first.getByRole("region",{name:"Notifications"});
  await expect(bell.getByText("You have been invited to join "+studioName)).toBeVisible();
  await bell.getByText("You have been invited to join "+studioName,{exact:true}).locator("xpath=../../..").getByRole("button",{name:"Accept",exact:true}).click();
  await expect(bell.getByText("You joined "+studioName,{exact:true}).first()).toBeVisible();
  await bell.getByText("You joined "+studioName,{exact:true}).first().click();
  await expect(first).toHaveURL(/\/my-submissions\?studio=/);

  for(let i=1;i<colleagues.length;i++){
    await invite(colleagues[i]);
    const page=await signIn(colleagues[i],i===2?390:1280);
    handles.set(colleagues[i].id,page);
    await expect(page.getByRole("region",{name:"Studio invitations"}).getByText(studioName)).toBeVisible();
    await page.getByRole("button",{name:"Accept",exact:true}).click();
    await expect(page.getByText("You joined the studio.",{exact:true})).toBeVisible();
    await page.getByRole("link",{name:"Open studio My Games"}).click();
    await expect(page).toHaveURL(/\/my-submissions\?studio=/);
  }
  await ownerPage.reload();
  await expect(ownerPage.getByText("0 of 5 colleague places available.",{exact:false})).toBeVisible();
  await expect(ownerPage.getByRole("button",{name:"Invite member"})).toBeDisabled();
  assert((await ownerClient.rpc("change_studio",{p_action:"invite",p_studio:studioId,p_email:"missing@playtested.local",p_role:"viewer"})).error);

  const ownerData=await rpc(ownerClient,"get_studio_workspace",{p_studio:studioId});
  for(const [index,client] of clients.entries()){
    const data=await rpc(client,"get_studio_workspace",{p_studio:studioId});
    assert.deepEqual(data.links,ownerData.links);
    assert.deepEqual(data.campaigns,ownerData.campaigns);
    assert.deepEqual(data.receptions,ownerData.receptions);
    assert.equal(data.role,colleagues[index].intendedRole.toLowerCase());
    assert.equal((await rpc(client,"get_developer_accepted_playtest_feedback",{p_playtest_id:releaseB}))[0].feedback,"Current build fixture report.");
    assert((await client.rpc("change_studio",{p_action:"remove",p_studio:studioId,p_target:owner.id})).error);
    assert((await client.rpc("set_listing_control",{p_kind:"submission",p_id:gameId,p_action:"archive",p_confirmation:"Ashen Hollow (local fixture)"})).error);
    const page=handles.get(colleagues[index].id);
    await expect(page.getByRole("combobox",{name:"Workspace"})).toHaveValue(studioId);
    await expect(page.getByRole("button",{name:/Ashen Hollow/})).toBeVisible();
    await expect(page.getByText("Personal game (local fixture)",{exact:true})).toHaveCount(0);
    await page.getByRole("button",{name:"View feedback"}).click();
    await expect(page.getByRole("region",{name:"Results snapshot"})).toBeVisible();
    if(index<2)await expect(page.getByRole("link",{name:"Edit listing"})).toBeVisible();
    else await expect(page.getByRole("link",{name:"Edit listing"})).toHaveCount(0);
  }
  await report(first,"Alpha 0.5","Current build fixture report.","Historical build fixture report.");
  const viewer=handles.get(colleagues[2].id);
  await report(viewer,"Alpha 0.4","Historical build fixture report.","Current build fixture report.");
  assert(await viewer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await verifyZoom(viewer);
  assert((await clients[2].rpc("get_my_listing_edit",{p_kind:"submission",p_id:gameId})).error);
  const plan=await rpc(ownerClient,"get_studio_developer_plan",{p_studio:studioId});
  const editorPlan=await rpc(clients[0],"get_studio_developer_plan",{p_studio:studioId});
  assert.equal(plan.rounds_used,editorPlan.rounds_used);
  assert((await clients[2].rpc("get_studio_developer_plan",{p_studio:studioId})).error);
  const draft=ownerData.campaigns.find(item=>item.id===releaseB);
  const update={p_playtest_id:releaseB,p_access_link:draft.access_link,p_access_type:draft.access_type,p_instructions:draft.instructions,p_focus_areas:draft.focus_areas,p_audience:draft.audience,p_target_testers:draft.target_testers,p_estimated_minutes:draft.estimated_minutes,p_release_label:draft.release_label,p_status:draft.status};
  assert((await clients[2].rpc("update_community_playtest",update)).error);
  await rpc(clients[0],"update_community_playtest",update);
  const listing=await rpc(clients[0],"get_my_listing_edit",{p_kind:"submission",p_id:gameId});
  assert.equal(listing.submission.title,"Ashen Hollow (local fixture)");
  assert((await clients[2].rpc("save_game_pc_requirements",{p_kind:"submission",p_id:gameId,p_minimum:{},p_recommended:{}})).error);
  await rpc(clients[0],"save_game_pc_requirements",{p_kind:"submission",p_id:gameId,p_minimum:{},p_recommended:{}});

  const listingWrite={p_kind:"submission",p_id:gameId,p_fields:{description:listing.submission.description},
    p_revision:listing.submission.submission_revision,p_resubmit:false,p_minimum:{},p_recommended:{}};
  assert((await clients[2].rpc("save_game_edit_with_pc_requirements",listingWrite)).error);
  await rpc(clients[0],"save_game_edit_with_pc_requirements",listingWrite);
  await rpc(ownerClient,"change_studio",{p_action:"role",p_studio:studioId,p_target:colleagues[0].id,p_role:"viewer"});
  assert((await clients[0].rpc("update_community_playtest",update)).error);
  await rpc(ownerClient,"change_studio",{p_action:"role",p_studio:studioId,p_target:colleagues[0].id,p_role:"editor"});
  await rpc(ownerClient,"change_studio",{p_action:"unassign",p_studio:studioId,p_target:target.id});
  assert.equal((await rpc(clients[2],"get_studio_workspace",{p_studio:studioId})).links.length,0);
  assert((await clients[2].rpc("get_developer_accepted_playtest_feedback",{p_playtest_id:releaseB})).error);
  await rpc(ownerClient,"change_studio",{p_action:"assign",p_studio:studioId,p_target:target.id});

  const removeRow=ownerPage.getByText("Developer Test 3",{exact:false}).filter({has:ownerPage.getByText("Viewer",{exact:true})}).locator("xpath=../..");
  await expect(removeRow.getByRole("button",{name:"Remove",exact:true})).toBeVisible();
  ownerPage.once("dialog",dialog=>void dialog.accept());
  await removeRow.getByRole("button",{name:"Remove",exact:true}).click();
  await expect(ownerPage.getByText("1 of 5 colleague places available.",{exact:false})).toBeVisible();
  assert((await clients[2].rpc("get_studio_workspace",{p_studio:studioId})).error);
  assert((await clients[2].rpc("get_developer_accepted_playtest_feedback",{p_playtest_id:releaseB})).error);
  console.log("PASS local UI and RPC: five independent acceptances, bell, assigned games, current/historical PDF, owner/editor/viewer isolation, shared entitlement, and removal.");
}finally{
  if(studioId){
    const data=await rpc(ownerClient,"get_studio_team",{p_studio:studioId});
    for(const member of data.members.filter(m=>m.role!=="owner"))await rpc(ownerClient,"change_studio",{p_action:"remove",p_studio:studioId,p_target:member.id});
    for(const invite of data.pending)await rpc(ownerClient,"change_studio",{p_action:"cancel",p_studio:studioId,p_target:invite.id});
  }
  await browser.close();
}

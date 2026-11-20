import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "playwright/test";

const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
assert.equal(backend.origin, "http://127.0.0.1:54341");
const app = "http://127.0.0.1:3118";
const [owner] = JSON.parse(await readFile(".backup-tools/developer-teams/credentials.json", "utf8"));
const client = createClient(backend.origin, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:false}});
const signedIn = await client.auth.signInWithPassword({email:owner.email,password:owner.password});
assert(!signedIn.error,"Local owner authentication failed");

const created = [];
const suffix = randomBytes(2).toString("hex");
const name50 = "Studio name validation " + suffix.padEnd(27,"X");
assert.equal(name50.length,50);
async function studioChange(action,name,studio) {
  const result=await client.rpc("change_studio",{p_action:action,p_name:name,...(studio?{p_studio:studio}:{})});
  if(action==="create"&&result.data?.id)created.push(result.data.id);
  return result;
}

const extension = await mkdtemp(join(tmpdir(),"studio-name-zoom-"));
const manifest = join(extension,"manifest.json");
const workerFile = join(extension,"worker.js");
let context;
try{
  for(const invalid of ["","   ","ab","x".repeat(51),"one\ttwo",null,"🙂".repeat(26)]){
    const result=await studioChange("create",invalid);
    assert.equal(result.error?.code,"22023");
    assert.match(result.error.message,/3 to 50 characters/);
  }
  const minimum=await studioChange("create","\u00a0abc \t");
  assert(!minimum.error,minimum.error?.message);
  const max=await studioChange("create",name50);
  assert(!max.error,max.error?.message);
  for(const invalid of ["","   ","ab","x".repeat(51),"one\ttwo",null]){
    assert.equal((await studioChange("rename",invalid,minimum.data.id)).error?.code,"22023");
  }
  assert(!(await studioChange("rename","   "+name50+"  ",minimum.data.id)).error);
  assert(!(await studioChange("rename","  XYZ  ",minimum.data.id)).error);
  const {data:studios}=await client.rpc("get_my_studios");
  assert.equal(studios.find(s=>s.id===minimum.data.id).name,"XYZ");
  assert.equal(studios.find(s=>s.id===max.data.id).name,name50);

  await writeFile(manifest,JSON.stringify({manifest_version:3,name:"Studio name zoom test",version:"1.0",permissions:["tabs"],background:{service_worker:"worker.js"}}));
  await writeFile(workerFile,"chrome.runtime.onInstalled.addListener(() => {});");
  context=await chromium.launchPersistentContext("",{channel:"chromium",headless:true,viewport:null,args:["--window-size=1500,1000","--disable-extensions-except="+extension,"--load-extension="+extension]});
  const page=context.pages()[0];
  await page.goto(app+"/login?next=/my-team");
  await page.waitForFunction(()=>{const button=document.querySelector("form button[type=submit]");return button&&Object.keys(button).some(key=>key.startsWith("__reactProps$"));});
  try{
    await page.getByLabel("Email address").fill(owner.email);
    await page.getByLabel("Password",{exact:true}).fill(owner.password);
    await page.getByRole("button",{name:"Sign in",exact:true}).click();
    await page.waitForURL(url=>url.pathname==="/my-team");
  }catch{
    await page.getByLabel("Password",{exact:true}).fill("").catch(()=>{});
    throw new Error("Local browser sign-in failed");
  }
  const createInput=page.getByLabel("New studio name",{exact:true});
  await expect(createInput).toHaveAttribute("maxlength","50");
  const createButton=page.getByRole("button",{name:"Create studio",exact:true});
  await createButton.click();
  await expect(page.getByText("Enter a studio name.",{exact:true})).toBeVisible();
  await createInput.fill("  ");
  await createButton.click();
  await expect(page.getByText("Enter a studio name.",{exact:true})).toBeVisible();
  await createInput.fill("ab");
  await expect(createInput.locator("..").getByText("2/50",{exact:true})).toBeVisible();
  await createButton.click();
  await expect(page.getByText("Use 3 to 50 characters.",{exact:true})).toBeVisible();
  await createInput.fill("  UI3  ");
  const createdResponse=page.waitForResponse(r=>r.url().endsWith("/rpc/change_studio")&&r.request().postDataJSON()?.p_action==="create");
  await createButton.click();
  const response=await createdResponse;
  assert(response.ok());
  const newStudio=await response.json();
  created.push(newStudio.id);
  await expect(page.getByRole("heading",{name:"UI3",exact:true})).toBeVisible();

  const renameInput=page.getByLabel("Studio name",{exact:true});
  const renameButton=page.getByRole("button",{name:"Save name",exact:true});
  await expect(renameInput).toHaveAttribute("maxlength","50");
  await renameInput.fill("aa");
  await renameButton.click();
  await expect(renameInput.locator("..").getByText("Use 3 to 50 characters.",{exact:true})).toBeVisible();
  await renameInput.fill(name50+"Z");
  await expect(renameInput).toHaveValue(name50);
  await expect(renameInput.locator("..").getByText("50/50",{exact:true})).toBeVisible();
  await renameButton.click();
  await expect(page.getByRole("heading",{name:name50,exact:true})).toBeVisible();
  await renameInput.fill("  UI4  ");
  await renameButton.click();
  await expect(page.getByRole("heading",{name:"UI4",exact:true})).toBeVisible();

  const legacy=studios.find(item=>item.id==="6f001900-0000-4000-8000-000000000051");
  const studioToCheck=legacy??{id:newStudio.id,name:"UI4"};
  await page.goto(app+"/my-team?studio="+studioToCheck.id);
  const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
  async function zoom(value){
    const actual=await worker.evaluate(async factor=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});await chrome.tabs.setZoom(tab.id,factor);return chrome.tabs.getZoom(tab.id);},value);
    assert.equal(actual,value);
    await expect.poll(()=>page.evaluate(()=>devicePixelRatio)).toBe(value);
  }
  await zoom(1.5);
  await expect(page.getByRole("heading",{name:studioToCheck.name,exact:true})).toBeVisible();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Layout overflow at 150% zoom");
  await zoom(1);
  await page.setViewportSize({width:320,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Layout overflow at mobile width");
  await expect(page.getByRole("button",{name:"Save name",exact:true})).toBeVisible();
  console.log("PASS localhost studio names: UI create/rename, counters, 2/3/50/51 boundaries, direct RPC rejection, trimming, mobile and actual 150% Chromium zoom.");
}finally{
  await context?.close();
  await Promise.all([manifest,workerFile].map(file=>unlink(file).catch(error=>{if(error.code!=="ENOENT")throw error;})));
  await rmdir(extension);
  for(const id of created){
    assert.match(id,/^[0-9a-f-]{36}$/);
    execFileSync("docker",["exec","-i","supabase_db_supabase","psql","-U","postgres","-d","postgres","-X","-v","ON_ERROR_STOP=1"],{input:`delete from playtested_studios.studios where id='${id}' and owner_id in (select id from auth.users where email='studio-owner@playtested.local' and raw_app_meta_data->>'local_studio_fixture'='true');`,stdio:["pipe","ignore","inherit"]});
  }
}

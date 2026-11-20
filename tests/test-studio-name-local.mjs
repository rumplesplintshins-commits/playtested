import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "playwright/test";

const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
assert.equal(backend.origin, "http://127.0.0.1:54341");
const app = "http://127.0.0.1:3118";
assert(process.env.LOCAL_STUDIO_SERVICE_KEY,"Use the local service key for the disposable test account");
const admin = createClient(backend.origin, process.env.LOCAL_STUDIO_SERVICE_KEY, {auth:{persistSession:false}});
const owner = {email:`studio-name-${randomBytes(8).toString("hex")}@playtested.local`,password:randomBytes(24).toString("base64url")};
const client = createClient(backend.origin, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:false}});
let ownerId;
function removeStudio(id){
  assert.match(id,/^[0-9a-f-]{36}$/);
  assert.match(ownerId,/^[0-9a-f-]{36}$/);
  execFileSync("docker",["exec","-i","supabase_db_supabase","psql","-U","postgres","-d","postgres","-X","-v","ON_ERROR_STOP=1"],{input:`delete from playtested_studios.studios where id='${id}' and owner_id='${ownerId}';`,stdio:["pipe","ignore","inherit"]});
}
const suffix = randomBytes(2).toString("hex");
const name50 = "Studio name validation " + suffix.padEnd(27,"X");
assert.equal(name50.length,50);
async function studioChange(action,name,studio) {
  return client.rpc("change_studio",{p_action:action,p_name:name,...(studio?{p_studio:studio}:{})});
}

const extension = await mkdtemp(join(tmpdir(),"studio-name-zoom-"));
const manifest = join(extension,"manifest.json");
const workerFile = join(extension,"worker.js");
let context;
try{
  const {data,error}=await admin.auth.admin.createUser({...owner,email_confirm:true,app_metadata:{local_studio_fixture:true}});
  assert(!error,error?.message);
  ownerId=data.user.id;
  const profile=await admin.from("profiles").upsert({id:ownerId,display_name:"Studio name fixture",role:"developer",roles:["developer"]});
  assert(!profile.error,profile.error?.message);
  const signedIn=await client.auth.signInWithPassword(owner);
  assert(!signedIn.error,"Local owner authentication failed");
  for(const invalid of ["","   ","ab","x".repeat(51),"one\ttwo",null,"🙂".repeat(26)]){
    const result=await studioChange("create",invalid);
    assert.equal(result.error?.code,"22023");
    assert.match(result.error.message,/3 to 50 characters/);
  }
  const minimum=await studioChange("create","\u00a0abc \t");
  assert(!minimum.error,minimum.error?.message);
  for(const invalid of ["","   ","ab","x".repeat(51),"one\ttwo",null]){
    assert.equal((await studioChange("rename",invalid,minimum.data.id)).error?.code,"22023");
  }
  assert(!(await studioChange("rename","   "+name50+"  ",minimum.data.id)).error);
  assert(!(await studioChange("rename","  XYZ  ",minimum.data.id)).error);
  assert.equal((await client.rpc("get_my_studios")).data[0].name,"XYZ");
  removeStudio(minimum.data.id);
  const max=await studioChange("create",name50);
  assert(!max.error,max.error?.message);
  assert.equal((await client.rpc("get_my_studios")).data[0].name,name50);
  removeStudio(max.data.id);

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
  await expect(page.getByRole("combobox",{name:"Studio workspace"})).toHaveCount(0);
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

  async function checkTeam(path){
    await page.goto(app+path);
    await expect(page.getByRole("heading",{name:"UI4",exact:true})).toBeVisible();
    const selector=page.getByRole("combobox",{name:"Studio workspace"});
    await expect(selector).toHaveValue(newStudio.id);
    await expect(selector.getByRole("option",{name:"Choose a studio"})).toHaveCount(0);
    const counter=renameInput.locator("..").getByText("3/50",{exact:true});
    const [field,save,count]=await Promise.all([renameInput.boundingBox(),renameButton.boundingBox(),counter.boundingBox()]);
    assert(field&&save&&count);
    assert.equal(field.y,save.y,"Input and button start at the same height");
    assert.equal(field.height,save.height,"Input and button have the same height");
    assert(count.y>=field.y+field.height && count.x+count.width<=field.x+field.width,"Counter sits beneath the input");
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Manage Team fits the viewport");
    await page.getByRole("link",{name:"Open studio My Games"}).click();
    const workspace=page.getByRole("combobox",{name:"Workspace"});
    await expect(workspace).toHaveValue(newStudio.id);
    await workspace.selectOption({label:"Personal games"});
    await expect(page.getByRole("region",{name:"Developer plan"})).toContainText("Personal developer plan");
    await expect(workspace).toHaveValue("");
  }

  await checkTeam("/my-team");
  await checkTeam("/my-team?studio=invalid");
  const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
  async function zoom(value){
    const actual=await worker.evaluate(async factor=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});await chrome.tabs.setZoom(tab.id,factor);return chrome.tabs.getZoom(tab.id);},value);
    assert.equal(actual,value);
    await expect.poll(()=>page.evaluate(()=>devicePixelRatio)).toBe(value);
  }
  await zoom(1.5);
  await checkTeam("/my-team?studio=ffffffff-ffff-ffff-ffff-ffffffffffff");
  await zoom(1);
  await page.setViewportSize({width:320,height:800});
  await checkTeam("/my-team?studio="+newStudio.id);
  console.log("PASS localhost studio name validation, aligned controls and counter, studio selection and Personal Games at desktop, 320px and actual 150% Chromium zoom.");
}finally{
  await context?.close();
  await Promise.all([manifest,workerFile].map(file=>unlink(file).catch(error=>{if(error.code!=="ENOENT")throw error;})));
  await rmdir(extension);
  if(ownerId){
    const {error}=await admin.auth.admin.deleteUser(ownerId);
    assert(!error,error?.message);
  }
}

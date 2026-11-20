import assert from "node:assert/strict";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect as baseExpect } from "playwright/test";

const expect=baseExpect.configure({timeout:15000});
const origin=new URL(process.env.STUDIO_APP_URL||"http://127.0.0.1:3118");
const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for(const url of [origin,backend])assert(["127.0.0.1","localhost"].includes(url.hostname),"Only local fixture servers are allowed");
const identities=JSON.parse(await readFile(".backup-tools/developer-teams/credentials.json","utf8"));
const [owner,...colleagues]=identities;
const proStudio=process.argv.includes("--pro-studio");
const browser=await chromium.launch({headless:true});
async function signIn(account,width=1280){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce"});
  const page=await context.newPage();
  await page.goto(origin+"/login?next=/my-submissions");
  const form=page.locator("form");
  await page.waitForFunction(()=>{
    const button=document.querySelector('form button[type=submit]');
    return button&&Object.keys(button).some(key=>key.startsWith('__reactProps$'));
  });
  try{
    await form.getByLabel("Email address").fill(account.email);
    await form.getByLabel("Password",{exact:true}).fill(account.password);
    await form.getByRole("button",{name:"Sign in",exact:true}).click();
    await page.waitForURL(url=>url.pathname==="/my-submissions",{timeout:15000});
  }catch{
    await form.getByLabel("Password",{exact:true}).fill("").catch(()=>{});
    throw new Error("Browser sign-in did not reach Manage Team for "+account.email);
  }

  return page;
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
    await page.goto(sourcePage.url());
    const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
    const factor=await worker.evaluate(async()=>{
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      await chrome.tabs.setZoom(tab.id,1.5);
      return chrome.tabs.getZoom(tab.id);
    });
    assert.equal(factor,1.5);
    await expect.poll(()=>page.evaluate(()=>devicePixelRatio)).toBe(1.5);

    await checkStudio(page);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{
    await context?.close();
    await unlink(workerFile);
    await unlink(manifest);
    await rmdir(directory);
  }
}
const plan=page=>page.getByRole("region",{name:"Developer plan"});
async function checkStudio(page){
  await expect(plan(page)).toContainText("Power Spike Local QA");
  await expect(plan(page)).toContainText(proStudio?"Studio Pro":"Studio Free");
  await expect(plan(page)).toContainText("Shared across all authorised studio members.");
  const viewFeedback=page.getByRole("button",{name:"View feedback"});
  if(!await page.getByRole("region",{name:"Results snapshot"}).isVisible()) await viewFeedback.click({timeout:10000});
  await expect(page.getByRole("region",{name:"Results snapshot"})).toBeVisible();
  const print=page.getByRole("button",{name:"Print feedback",exact:true});
  if(proStudio){
    await page.locator("[data-build-selection-row]").getByRole("button",{name:/Alpha 0\.4/}).click();
    await expect(print).toBeEnabled();
    await page.evaluate(()=>{window.print=()=>{};});
    await print.click();
    const report=page.locator("body > .feedback-print");
    await expect(report).toContainText("Historical build fixture report.");
    await expect(report).not.toContainText("Current build fixture report.");
    await page.emulateMedia({media:"print"});
    const pdf=await page.pdf({preferCSSPageSize:true});
    assert(pdf.subarray(0,5).equals(Buffer.from("%PDF-"))&&pdf.length>5000);
    await page.evaluate(()=>window.dispatchEvent(new Event("afterprint")));
    await page.emulateMedia({media:"screen"});
  }else{
    await expect(print).toHaveCount(0);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
try{
  for(const [index,account] of (proStudio?[owner]:[owner,...colleagues]).entries()){
    const page=await signIn(account,index===3?390:1280);
    await expect(plan(page)).toContainText("Personal developer plan");
    await expect(plan(page)).toContainText("Free");
    await expect(page.getByRole("button",{name:"Print feedback",exact:true})).toHaveCount(0);
    await page.getByRole("combobox",{name:"Workspace"}).selectOption({label:"Power Spike Local QA"});
    await checkStudio(page);
    if(index===0)await verifyZoom(page);
    await page.getByRole("combobox",{name:"Workspace"}).selectOption({label:"Personal games"});
    await expect(plan(page)).toContainText("Your allowance applies across your personal games.");
    await expect(page.getByRole("button",{name:/Ashen Hollow \(local fixture\)/})).toHaveCount(0);
    await page.context().close();
  }
  console.log(proStudio
    ?"PASS authorised local Studio Pro historical PDF at desktop and actual 150% Chromium zoom."
    :"PASS actual local owner and five colleagues: separate workspace plans and games, Free feedback access without Print, desktop/mobile layout and actual 150% Chromium zoom.");
}finally{
  await browser.close();
}

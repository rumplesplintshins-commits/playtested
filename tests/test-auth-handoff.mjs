import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {chromium,expect} from 'playwright/test';
const require=createRequire(import.meta.url);
function load(path,resolve=require){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,resolve);return exports;}
const navigation=load('lib/auth-navigation.ts');
for(const value of [null,'https://example.test','//example.test','/\\example.test','/%5cexample.test','/%2fexample.test','/\n/example.test','/%00evil','/%zz'])assert.equal(navigation.getSafeNextPath(value),'/');
for(const value of ['/tester','/my-submissions','/playtest/fixture?view=report#feedback'])assert.equal(navigation.getSafeNextPath(value),value);
let outcome='success',calls=0;
const callback=load('app/auth/callback/route.ts',name=>name.endsWith('/auth-navigation')?navigation:name.endsWith('/supabase-server')?{createClient:async()=>({auth:{exchangeCodeForSession:async()=>{calls++;if(outcome==='throw')throw new Error('private diagnostic');return {error:outcome==='fail'?new Error('private diagnostic'):null};}}})}:require(name));
for(const target of ['/tester','/my-submissions','/playtest/fixture?view=report#feedback','//example.test','/%5cexample.test']){
 const response=await callback.GET(new Request(`http://localhost:3000/auth/callback?code=fixture&next=${encodeURIComponent(target)}`));
 assert.equal(response.headers.get('location'),'http://localhost:3000'+navigation.getSafeNextPath(target));
}
for(const state of ['fail','throw']){outcome=state;const response=await callback.GET(new Request('http://localhost:3000/auth/callback?code=fixture&next=/tester'));const url=new URL(response.headers.get('location'));assert.equal(url.pathname,'/login');assert.equal(url.searchParams.get('next'),'/tester');assert.equal(url.searchParams.get('error'),'auth_callback_failed');assert(!url.href.includes('private'));}
const before=calls;await callback.GET(new Request('http://localhost:3000/auth/callback?next=/tester'));assert.equal(calls,before,'Missing code must not call Auth');
console.log('PASS: callback success/failure/outage, safe internal destinations, external/encoded redirect rejection and missing-code handling. Mocked Auth only.');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let signup=null;
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='localhost')return route.continue();
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname.endsWith('/auth/v1/signup')){signup={url:url.href,body:request.postDataJSON()};return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({id:'fixture-user',aud:'authenticated',email:'fixture@example.test',identities:[]})});}
  return route.fulfill({status:200,headers,contentType:'application/json',body:'[]'});
 });
 await page.goto('http://localhost:3000/auth/callback?next=/tester');
 await expect(page.getByRole('alert',{name:"We couldn't confirm your email link"})).toContainText('Your destination is saved: Tester Hub');
 await expect(page.getByLabel('Email address')).toBeVisible();
 await page.getByLabel('Email address').focus();await page.keyboard.press('Tab');await expect(page.getByLabel('Password',{exact:true})).toBeFocused();
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow at ${width}`);}
 await page.getByRole('button',{name:'Create an account',exact:true}).click();
 assert.equal(new URL(page.url()).searchParams.get('next'),'/tester');
 await page.goto('http://localhost:3000/login?mode=signup&role=developer&next=/my-submissions');
 await expect(page.getByRole('checkbox',{name:/Game Developer/})).toBeChecked();
 await expect(page.getByText('After signing in, continue to My Games.',{exact:false})).toBeVisible();
 await page.getByLabel('Email address').fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-not-a-real-password');
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('After confirmation, continue to My Games.');
 assert.equal(signup.body.data.signup_roles[0],'developer');
 assert.equal(new URL(signup.body.email_redirect_to||new URL(signup.url).searchParams.get('redirect_to')).searchParams.get('next'),'/my-submissions');
 await page.screenshot({path:'.backup-tools/auth-handoff-mobile.png',fullPage:true});
 console.log('PASS: browser callback recovery, destination preservation across mode switch, role preselection, signup confirmation copy, keyboard labels and 320/390/1280 widths. No real signup/email/source writes.');
}finally{await browser.close();}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {chromium,expect} from 'playwright/test';
const require=createRequire(import.meta.url);
if(process.argv.includes('--passwords')){await passwordChecks();process.exit(0);}
async function passwordChecks(){
 const {default:env}=await import('@next/env');env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
 const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL),origin='http://localhost:3000';
 const uid='a1000000-0000-4000-8000-000000000001',user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{}};
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.fixture';
 const session={access_token:token,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 const dir='app/password-change-fixture';if(fs.existsSync(dir))throw Error('Refusing existing fixture');fs.mkdirSync(dir);fs.writeFileSync(dir+'/page.tsx',`import PasswordSettings from '../components/PasswordSettings';export default function Fixture(){return <main className="mx-auto max-w-lg p-5"><PasswordSettings mode="change"/></main>}`);
 const browser=await chromium.launch({headless:true});let recoveryStatus=200,updateError=null,expired=false,otherUser=false;const recoveryRequests=[],updates=[];let codes=0;
 try{
  const context=await browser.newContext();await context.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin===origin){const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
   if(url.origin!==backend.origin)return route.abort();
   if(url.pathname.endsWith('/recover')){recoveryRequests.push({body:req.postDataJSON(),redirect:url.searchParams.get('redirect_to')});return route.fulfill({status:recoveryStatus,json:recoveryStatus===429?{code:'over_email_send_rate_limit',msg:'fixture limit'}:{}});}
   if(url.pathname.endsWith('/token'))return expired?route.fulfill({status:400,json:{code:'otp_expired',msg:'expired'}}):route.fulfill({json:session});
   if(url.pathname.endsWith('/user')){if(req.method()==='PUT'){updates.push({body:req.postDataJSON(),auth:req.headers().authorization});if(updateError)return route.fulfill({status:400,json:{error_code:updateError,msg:'fixture failure'}});}return route.fulfill({json:otherUser?{...user,id:"a1000000-0000-4000-8000-000000000002"}:user});}
   if(url.pathname.endsWith('/reauthenticate')){codes++;return route.fulfill({json:{}});}
   if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();
  async function request(email){await page.goto(origin+'/forgot-password');await page.getByLabel('Email address').fill(email);await page.getByRole('button',{name:'Send recovery email',exact:true}).click();}
  await request('fixture@example.test');const generic=await page.getByRole('status').innerText();assert(generic.startsWith('If an account exists'));await expect(page.getByRole('button',{name:'Wait before requesting again'})).toBeDisabled();assert.equal(recoveryRequests.at(-1).redirect,origin+'/reset-password');
  await page.goto(origin+'/reset-password?code=fixture');await expect(page.getByLabel('New password',{exact:true})).toBeVisible();await expect(page).toHaveURL(origin+'/reset-password');
  await page.getByLabel('New password',{exact:true}).fill('fixture-new-password');await page.getByLabel('Confirm new password').fill('fixture-other-password');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'both new passwords match'})).toBeVisible();assert.equal(updates.length,0);
  await page.getByRole('button',{name:'Show passwords'}).click();await expect(page.getByLabel('New password',{exact:true})).toHaveAttribute('type','text');await page.getByLabel('Confirm new password').fill('fixture-new-password');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('status')).toContainText('Password reset.');assert.equal(updates[0].auth,'Bearer '+token);assert(!('current_password' in updates[0].body));
  await page.goto(origin+'/reset-password?code=fixture');await expect(page.getByRole('alert').filter({hasText:'invalid, expired or already used'})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);
  await request('unknown@example.test');assert.equal(await page.getByRole('status').innerText(),generic);
  expired=true;await page.goto(origin+'/reset-password?code=expired');await expect(page.getByRole('alert').filter({hasText:'invalid, expired or already used'})).toBeVisible();expired=false;
  recoveryStatus=429;await request('fixture@example.test');await expect(page.getByRole('alert').filter({hasText:'Too many requests'})).toContainText('Too many requests');recoveryStatus=200;
  await context.addCookies([{name:'sb-'+backend.hostname.split('.')[0]+'-auth-token',value:'base64-'+encode(session),url:origin}]);
  await page.goto(origin+'/reset-password');await expect(page.getByRole('alert').filter({hasText:'invalid, expired or already used'})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);
  await page.goto(origin+'/password-change-fixture');await page.getByLabel('Current password').fill('fixture-current-password');await page.getByLabel('New password',{exact:true}).fill('fixture-another-password');await page.getByLabel('Confirm new password').fill('fixture-another-password');
  otherUser=true;const prior=updates.length;await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'session could not be verified'})).toBeVisible();assert.equal(updates.length,prior,'Mismatched account must not be updated');otherUser=false;
  updateError='invalid_credentials';await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'Check your current password'})).toBeVisible();
  updateError='reauthentication_needed';await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'Verify this change'})).toContainText('Verify this change');await page.getByRole('button',{name:'Send verification code'}).click();assert.equal(codes,1);await page.getByLabel('Verification code').fill('123456');updateError=null;await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('status')).toContainText('Password changed successfully.');assert.equal(updates.at(-1).body.current_password,'fixture-current-password');assert.equal(updates.at(-1).body.nonce,'123456');assert.equal(updates.at(-1).auth,'Bearer '+token);
  for(const width of [320,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert(fs.readFileSync('app/components/PasswordSettings.tsx','utf8').includes('window.location.origin'),'Hosted redirects use the current origin');
  console.log('PASS password browser: generic known/unknown request, throttling, PKCE recovery, mismatch/visibility, used/expired/ordinary-session rejection, captured-account update, current password and reauthentication nonce, mobile. All Auth calls mocked; no real emails or credentials.');
 }finally{await browser.close();fs.unlinkSync(dir+'/page.tsx');fs.rmdirSync(dir);}
}
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

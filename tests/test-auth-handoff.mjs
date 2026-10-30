import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {chromium,expect} from 'playwright/test';
const require=createRequire(import.meta.url);
const origin=process.env.TEST_APP_URL||'http://localhost:3000';
if(process.argv.includes('--seo-http')){await seoHttpChecks();process.exit(0);}
if(process.argv.includes('--seo')){await seoChecks();process.exit(0);}
if(process.argv.includes('--navigation')){await navigationChecks();process.exit(0);}
if(process.argv.includes('--passwords')){await passwordChecks();process.exit(0);}
async function passwordChecks(){
 const {default:env}=await import('@next/env');env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
 const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL),origin=process.env.TEST_APP_URL||'http://localhost:3000';
 const uid='a1000000-0000-4000-8000-000000000001',user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{}};
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.fixture';
 const session={access_token:token,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 const dir='app/password-change-fixture';if(fs.existsSync(dir))throw Error('Refusing existing fixture');fs.mkdirSync(dir);fs.writeFileSync(dir+'/page.tsx',`import PasswordSettings from '../components/PasswordSettings';export default function Fixture(){return <main className="mx-auto max-w-lg p-5"><PasswordSettings mode="change"/></main>}`);
 const browser=await chromium.launch({headless:true});let recoveryStatus=200,updateError=null,expired=false,otherUser=false,exchangeError=null;const recoveryRequests=[],updates=[];let codes=0,exchanges=0;
 try{
  const context=await browser.newContext();await context.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin===origin){const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
   if(url.origin!==backend.origin)return route.abort();
   if(url.pathname.endsWith('/recover')){recoveryRequests.push({body:req.postDataJSON(),redirect:url.searchParams.get('redirect_to')});return route.fulfill({status:recoveryStatus,headers:{'Retry-After':'120','Access-Control-Expose-Headers':'Retry-After'},json:recoveryStatus===429?{error_code:'over_email_send_rate_limit',msg:'fixture limit'}:recoveryStatus===400?{error_code:'email_address_not_authorized',msg:'fixture delivery restriction'}:{}});}
   if(url.pathname.endsWith('/token')){if(url.searchParams.get('grant_type')==='pkce')exchanges++;return expired||exchangeError?route.fulfill({status:exchangeError==='unexpected_failure'?503:400,json:{error_code:exchangeError||'otp_expired',msg:'fixture failure'}}):route.fulfill({json:session});}
   if(url.pathname.endsWith('/user')){if(req.method()==='PUT'){updates.push({body:req.postDataJSON(),auth:req.headers().authorization});if(updateError)return route.fulfill({status:400,json:{error_code:updateError,msg:'fixture failure'}});}return route.fulfill({json:otherUser?{...user,id:"a1000000-0000-4000-8000-000000000002"}:user});}
   if(url.pathname.endsWith('/reauthenticate')){codes++;return route.fulfill({json:{}});}
   if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();await page.clock.install();
  // Independent scenarios simulate an elapsed cooldown. The reload check below
  // verifies a still-active cooldown cannot be bypassed through navigation.
  async function request(email){if(page.url().startsWith(origin))await page.evaluate(()=>sessionStorage.removeItem('playtested-recovery-retry-at'));await page.goto(origin+'/forgot-password');await page.getByLabel('Email address').fill(email);await page.getByRole('button',{name:'Send recovery email',exact:true}).click();}
  await request('fixture@example.test');const generic=await page.getByRole('status').innerText();assert(generic.startsWith('If an account exists'));await expect(page.getByRole('button',{name:'Wait before requesting again'})).toBeDisabled();assert.equal(recoveryRequests.at(-1).redirect,origin+'/reset-password');
  await page.reload();await expect(page.getByRole('button',{name:'Wait before requesting again'})).toBeDisabled();assert.equal(recoveryRequests.length,1);
  const beforeExchange=exchanges;await page.goto(origin+'/reset-password?code=fixture');await expect(page.getByLabel('New password',{exact:true})).toBeVisible();await expect(page).toHaveURL(origin+'/reset-password');assert.equal(exchanges-beforeExchange,1,'Only one exchange despite effect replay');
  await page.getByLabel('New password',{exact:true}).fill('fixture-new-password');await page.getByLabel('Confirm new password').fill('fixture-other-password');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'both new passwords match'})).toBeVisible();assert.equal(updates.length,0);
  await page.getByRole('button',{name:'Show passwords'}).click();await expect(page.getByLabel('New password',{exact:true})).toHaveAttribute('type','text');await page.getByLabel('Confirm new password').fill('fixture-new-password');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('status')).toContainText('Password reset.');assert.equal(updates[0].auth,'Bearer '+token);assert(!('current_password' in updates[0].body));
  await page.goto(origin+'/reset-password?code=fixture');await expect(page.getByRole('alert').filter({hasText:'could not be verified in this browser'})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);
  await request('unknown@example.test');assert.equal(await page.getByRole('status').innerText(),generic);
  expired=true;await page.goto(origin+'/reset-password?code=expired');await expect(page.getByRole('alert').filter({hasText:'invalid, expired or already used'})).toBeVisible();expired=false;
  recoveryStatus=429;await request('fixture@example.test');await expect(page.getByRole('alert').filter({hasText:'Too many requests'})).toContainText('120 seconds');await page.reload();await expect(page.getByRole('button',{name:'Wait before requesting again'})).toBeDisabled();recoveryStatus=200;
  recoveryStatus=400;await request('fixture@example.test');await expect(page.getByRole('alert').filter({hasText:'temporarily unavailable'})).toBeVisible();recoveryStatus=200;
  await context.addCookies([{name:'sb-'+backend.hostname.split('.')[0]+'-auth-token',value:'base64-'+encode(session),url:origin}]);
  await page.goto(origin+'/reset-password');await expect(page.getByRole('alert').filter({hasText:'invalid, expired or already used'})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);
  await page.goto(origin+'/password-change-fixture');await page.getByLabel('Current password').fill('fixture-current-password');await page.getByLabel('New password',{exact:true}).fill('fixture-another-password');await page.getByLabel('Confirm new password').fill('fixture-another-password');
  otherUser=true;const prior=updates.length;await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'session could not be verified'})).toBeVisible();assert.equal(updates.length,prior,'Mismatched account must not be updated');otherUser=false;
  updateError='invalid_credentials';await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'Check your current password'})).toBeVisible();
  updateError='reauthentication_needed';await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('alert').filter({hasText:'Verify this change'})).toContainText('Verify this change');await page.getByRole('button',{name:'Send verification code'}).click();assert.equal(codes,1);await page.getByLabel('Verification code').fill('123456');updateError=null;await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('status')).toContainText('Password changed successfully.');assert.equal(updates.at(-1).body.current_password,'fixture-current-password');assert.equal(updates.at(-1).body.nonce,'123456');assert.equal(updates.at(-1).auth,'Bearer '+token);
  for(const width of [320,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  // A different browser has no PKCE cookie: do not send an exchange at all.
  const clean=await browser.newContext();await clean.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const other=await clean.newPage();const beforeMissing=exchanges;await other.goto(origin+'/reset-password?code=fixture');await expect(other.getByRole('alert').filter({hasText:'same browser and device'})).toContainText('same browser and device');await expect(other.getByLabel('New password',{exact:true})).toHaveCount(0);assert.equal(exchanges,beforeMissing);await clean.close();
  // A newer request overwrites the earlier verifier; the old link must fail closed.
  await request('fixture@example.test');const firstChallenge=recoveryRequests.at(-1).body.code_challenge;
  await request('fixture@example.test');assert.notEqual(recoveryRequests.at(-1).body.code_challenge,firstChallenge);
  exchangeError='bad_code_verifier';await page.goto(origin+'/reset-password?code=older');await expect(page.getByRole('alert').filter({hasText:'This browser could not verify'})).toContainText('This browser could not verify');await expect(page.getByRole('link',{name:'Request another recovery email'})).toBeVisible();exchangeError=null;
  await request('fixture@example.test');exchangeError='unexpected_failure';await page.goto(origin+'/reset-password?code=outage');await page.clock.runFor(12000);await expect(page.getByRole('alert').filter({hasText:'temporarily unavailable'})).toContainText('temporarily unavailable');await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);exchangeError=null;
  await request('fixture@example.test');await page.goto(origin+'/reset-password?code=latest');await expect(page.getByLabel('New password',{exact:true})).toBeVisible();
  assert(fs.readFileSync('app/components/PasswordSettings.tsx','utf8').includes('window.location.origin'),'Hosted redirects use the current origin');
  console.log('PASS password browser: generic known/unknown request, reload-persistent cooldown, single-exchange PKCE recovery, missing/overwritten verifier and temporary-outage distinctions, mismatch/visibility, used/expired/ordinary-session rejection, captured-account update, current password and reauthentication nonce, mobile. All Auth calls mocked; no real emails or credentials.');
 }finally{await browser.close();fs.unlinkSync(dir+'/page.tsx');fs.rmdirSync(dir);}
}
async function seoChecks(){
 const seo=load('lib/seo.ts');
 assert.equal(seo.SITE_TITLE,'Playtested | Find Your Next Good Game');
 for(const path of ['/login','/submit','/account','/my-submissions','/tester','/admin/submissions','/auth/callback','/reset-password','/share/id','/playtest/token'])assert(seo.noIndexPath(path));
 for(const path of ['/','/contact','/games/steam-123','/submissions/id'])assert(!seo.noIndexPath(path));
 const robots=load('app/robots.ts',n=>n==='@/lib/seo'?seo:require(n)).default();
 assert.equal(robots.sitemap,'https://playtested.co.uk/sitemap.xml');assert.equal(robots.rules.disallow,'/api/');
 let fail=false,unlinked=false;const requests=[];
 const client={rpc:async()=>({data:[{fields:{title:'Reviewed title',description:'Published description'}}],error:null}),from(table){const filters={};let columns;return{select(value){columns=value;return this;},order(){return this;},eq(k,v){filters[k]=v;return this;},limit(){return this;},async range(from,to){requests.push({table,columns,from,to});if(fail)return{data:null,error:{code:'fixture'}};return{data:table==='approved_games'?[{id:'10000000-0000-4000-8000-000000000001'}]:[{id:'link',imported_game_id:'imported'},{id:'duplicate',imported_game_id:'imported'}],error:null};},in(k,v){filters[k]=v;return this;},then(resolve){requests.push({table,filters,columns});return Promise.resolve(fail?{data:null,error:{code:'fixture'}}:{data:[{steam_app_id:'123'},{steam_app_id:'PLAYTESTED_TEST'}],error:null}).then(resolve);},async maybeSingle(){requests.push({table,filters});if(fail)return{error:{code:'fixture_error'}};if(table==='game_developer_links')return{data:unlinked?null:{id:'link'},error:null};return{data:filters.steam_app_id==='123'?{id:'10000000-0000-4000-8000-000000000001',title:'Game',description:''}:null,error:null};}};}};
 const gameSeo=load('lib/public-game-seo.ts',n=>n==='server-only'?{}:n==='next/cache'?{cacheLife(){}}:n==='next/navigation'?{notFound(){throw Error('NOT_FOUND')}}:n==='@supabase/supabase-js'?{createClient:()=>client}:n==='./seo'?seo:n==='./listing-updates'?load('lib/listing-updates.ts'):require(n));
 const sitemap=await gameSeo.publicSitemap();assert.equal(requests.length,3);assert(requests.slice(0,2).every(r=>r.to-r.from===99&&!r.columns.includes('description')));assert.deepEqual(requests[2].filters.id,['imported']);assert.equal(requests[2].filters.catalogue_eligible,true);
 assert.deepEqual(sitemap.map(r=>r.url),['https://playtested.co.uk/','https://playtested.co.uk/contact','https://playtested.co.uk/submissions/10000000-0000-4000-8000-000000000001','https://playtested.co.uk/games/steam-123']);assert(sitemap.every(r=>!r.lastModified));
 const metadata=await gameSeo.gameMetadata('imported','123');assert.equal(metadata.title,'Reviewed title | Playtested');assert.equal(metadata.description,'Reviewed title. Published description');assert.equal(metadata.alternates.canonical,'https://playtested.co.uk/games/steam-123');assert.equal(requests.findLast(row=>row.table==='imported_games').filters.catalogue_eligible,true);
 await assert.rejects(gameSeo.gameMetadata('imported','PLAYTESTED_TEST'),/NOT_FOUND/);await assert.rejects(gameSeo.gameMetadata('imported','999'),/NOT_FOUND/);
 unlinked=true;await assert.rejects(gameSeo.gameMetadata('imported','123'),/NOT_FOUND/);unlinked=false;
 const unsafe={name:'</script><img src=x onerror=alert(1)>'};const encoded=seo.serializeJsonLd(unsafe);assert(!encoded.includes('<'));assert.deepEqual(JSON.parse(encoded),unsafe);
 fail=true;await assert.rejects(gameSeo.publicSitemap(),/unavailable/);await assert.rejects(gameSeo.gameMetadata('imported','123'),/unavailable/);
 assert(fs.existsSync('public/images/roles/player-role.png'));
 console.log('PASS SEO units: canonical origin/title, private noindex classification, crawlable directives, bounded public view/link sitemap batches, dedup/external Steam omission, no invented dates, published metadata, hidden/missing 404 and service-error distinction. Mocked public reads only.');
}

async function navigationChecks(){
 const origin=process.env.TEST_APP_URL||'http://localhost:3000';
 const browser=await chromium.launch({headless:true});
 const user={id:'a1000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{provider:'email'},user_metadata:{}};
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.fixture';
 try{for(const flow of ['login','signup','submit','invitation']){
  let signedIn=false;const context=await browser.newContext();const errors=[];
  await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin===origin){if(flow==='invitation'&&u.pathname.startsWith('/playtest/'))return route.fulfill({contentType:'text/html',body:'<h1>Intentional invitation destination</h1>'});const headers={...req.headers()};delete headers.cookie;return route.continue({headers});}
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(u.pathname.endsWith('/token')||u.pathname.endsWith('/signup')){signedIn=true;return route.fulfill({headers,json:{access_token:token,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}});}
   if(u.pathname.endsWith('/user'))return signedIn?route.fulfill({headers,json:user}):route.fulfill({status:401,headers,json:{msg:'Not signed in'}});
   if(u.pathname.endsWith('/profiles'))return route.fulfill({headers,json:{id:user.id,role:'user',roles:['player','developer'],tester_xp:0,developer_xp:0,completed_tests:0}});
   return route.fulfill({headers,json:[]});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/');
  const invitation='/playtest/10000000-0000-4000-8000-000000000001?pt_visit='+'a'.repeat(64);
  if(flow==='submit'){await page.getByRole('link',{name:'Submit a game',exact:true}).first().click();await expect(page).toHaveURL(/\/login\?next=/);}
  else await page.goto(origin+(flow==='invitation'?'/login?mode=signup&next='+encodeURIComponent(invitation):flow==='signup'?'/login?mode=signup':'/login'));
  if(flow==='submit')await expect(page.getByText('After signing in, continue to adding your game.',{exact:false})).toBeVisible();
  if(flow==='signup'||flow==='invitation')await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeVisible();
  await page.getByLabel('Email address').fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-not-a-real-password');
  await page.getByRole('button',{name:flow==='signup'||flow==='invitation'?/Create account|Join/:/Log in|Sign in/}).click();
  const target=flow==='submit'?'/submit':flow==='invitation'?invitation:'/';await expect(page).toHaveURL(origin+target);
  if(flow==='submit'){await expect(page.getByRole('heading',{name:'Submit your game.'})).toBeVisible();await expect(page.getByText('Checking account permissions...', {exact:true})).toHaveCount(0);assert(!/\uFFFD/.test(await page.locator('body').innerText()));}
  await page.goBack();await expect(page).toHaveURL(origin+'/');assert.equal(errors.length,0,errors.join('\n'));
  await context.close();
 }
 console.log('PASS mocked navigation: default login/immediate signup -> Home; signed-out Submit -> intentional Submit; invitation token preserved; Back returns Home, no Auth trap or broken submit text. Existing browser history outside app-created entries is not rewritten. No live users/emails.');
 }finally{await browser.close();}
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
 await page.goto(origin+'/auth/callback?next=/tester');
 await expect(page.getByRole('alert',{name:"We couldn't confirm your email link"})).toContainText('Your destination is saved: Tester Hub');
 await expect(page.getByLabel('Email address')).toBeVisible();
 await page.getByLabel('Email address').focus();await page.keyboard.press('Tab');await expect(page.getByLabel('Password',{exact:true})).toBeFocused();
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow at ${width}`);}
 await page.getByRole('button',{name:'Create an account',exact:true}).click();
 assert.equal(new URL(page.url()).searchParams.get('next'),'/tester');
 await page.goto(origin+'/login?mode=signup&role=developer&next=/my-submissions');
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

async function seoHttpChecks(){
 const response=await fetch(origin+'/');assert.equal(response.status,200);const home=await response.text();assert(home.includes('<title>Playtested | Find Your Next Good Game</title>'));assert(home.includes('structured,')&&home.includes('build-specific feedback'));assert(home.includes('id="public-profiles"'));
 const graph=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));assert.equal(graph.length,1);assert.equal(graph[0]['@type'],'WebSite');assert.equal(graph[0].url,'https://playtested.co.uk/');assert(!JSON.stringify(graph).includes('aggregateRating'));
 const image=/property="og:image" content="([^"]+)"/.exec(home)?.[1];assert(image?.startsWith('https://playtested.co.uk/'));const asset=await fetch(origin+new URL(image).pathname);assert.equal(asset.status,200);assert(asset.headers.get('content-type').startsWith('image/'));
 const robots=await(await fetch(origin+'/robots.txt')).text();assert(robots.includes('Disallow: /api/'));assert(robots.includes('https://playtested.co.uk/sitemap.xml'));
 const sitemapResponse=await fetch(origin+'/sitemap.xml');assert.equal(sitemapResponse.status,200);const xml=await sitemapResponse.text(),urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert(urls.length>=2);assert.equal(new Set(urls).size,urls.length);assert(!xml.includes('<lastmod>'));
 for(const url of urls){assert(url.startsWith('https://playtested.co.uk/'));assert(!/\/(login|account|share|playtest|tester|demo-games)(?:\/|$)/.test(new URL(url).pathname));const r=await fetch(origin+new URL(url).pathname,{headers:{'User-Agent':'Googlebot'}});assert.equal(r.status,200,url);const html=await r.text();assert(html.includes('rel="canonical"'));if(url.includes('/submissions/')||url.includes('/games/'))assert(home.includes('href="'+new URL(url).pathname+'"')||urls.length>14);}
 for(const userAgent of ['Mozilla/5.0','Googlebot','facebookexternalhit'])for(const path of ['/seo-missing-check','/games/steam-999999999999','/games/not-a-profile','/submissions/d3100000-0000-4000-8000-000000000001']){const r=await fetch(origin+path,{headers:{'User-Agent':userAgent}});assert.equal(r.status,404,path+' '+userAgent);assert((await r.text()).includes('noindex'));}
 const login=await fetch(origin+'/login');assert(login.headers.get('x-robots-tag').includes('noindex'));
 const query=await(await fetch(origin+'/?page=2&sort=oldest')).text();assert(/rel="canonical" href="https:\/\/playtested.co.uk\/?"/.test(query));
 console.log('PASS built SEO HTTP: homepage title/canonical/visible offer/server links; safe WebSite JSON-LD; public social image; canonical accessible sitemap without invented dates/private routes; browser/Googlebot/social true 404s; login noindex and ignored-query canonical. Real public reads only.');
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,env={},imports={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports','process',js)(name=>imports[name]??require(name),module,module.exports,{env:{...process.env,...env},cwd:()=>process.cwd()});return module.exports;}
const env={NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture'};
const config=load('next.config.ts',env).default;
const rules=await config.headers(),headers=Object.fromEntries(rules[0].headers.map(h=>[h.key.toLowerCase(),h.value]));
assert.equal(headers['x-frame-options'],'DENY');assert.equal(headers['x-content-type-options'],'nosniff');assert.equal(headers['cross-origin-opener-policy'],'same-origin-allow-popups');
assert(headers['content-security-policy'].includes("frame-ancestors 'none'"));assert(!headers['content-security-policy'].includes('script-src'),'Do not claim a strict script policy');
const report=headers['content-security-policy-report-only'];for(const origin of ['https://fixture.supabase.co','wss://fixture.supabase.co','https://www.youtube-nocookie.com','https://player.vimeo.com','https://drive.google.com'])assert(report.includes(origin));
assert(report.includes("img-src 'self' https: data: blob:"));assert(report.includes("'unsafe-inline'"));assert(!report.includes('unsafe-eval'));assert(!report.includes('nonce-'));
for(const h of ['cross-origin-embedder-policy','cross-origin-resource-policy'])assert(!(h in headers),'Do not force cross-origin media isolation');
assert(!/fullscreen|picture-in-picture|autoplay/.test(headers['permissions-policy']));
const hsts=rules.find(r=>r.headers.some(h=>h.key==='Strict-Transport-Security'));assert(hsts.has.some(c=>c.key==='x-forwarded-proto'&&c.value==='https'));const host=hsts.has.find(c=>c.type==='host');assert(new RegExp('^'+host.value+'$').test('playtested.co.uk'));assert(!new RegExp('^'+host.value+'$').test('other.playtested.co.uk'));assert.equal(hsts.headers[0].value,'max-age=31536000');
const dev=Object.fromEntries((await load('next.config.ts',{...env,NODE_ENV:'development'}).default.headers())[0].headers.map(h=>[h.key,h.value]));assert(dev['Content-Security-Policy-Report-Only'].includes("'unsafe-eval'"));
const {NextRequest}=require('next/server');const seo=load('lib/seo.ts',env);let refreshed=false;
const ssr={createServerClient(_url,_key,{cookies}){return {auth:{async getClaims(){
  if(refreshed)cookies.setAll([{name:'sb-fixture-auth-token.0',value:'refreshed-a',options:{httpOnly:true,path:'/'}},{name:'sb-fixture-auth-token.1',value:'refreshed-b',options:{path:'/'}}]);
  return {data:{claims:null},error:null};
}}};}};
const {proxy}=load('proxy.ts',env,{'./lib/seo':seo,'@supabase/ssr':ssr});
for(const path of ['/login','/auth/callback','/forgot-password','/reset-password','/account','/tester','/submit','/admin/submissions','/my-submissions','/notifications','/api/admin/analytics','/api/game-media/fixture/video-poster']){const response=await proxy(new NextRequest('http://localhost'+path));assert.equal(response.headers.get('cache-control'),'private, no-store',path);if(seo.noIndexPath(path))assert.equal(response.headers.get('x-robots-tag'),'noindex, follow');}
assert.equal((await proxy(new NextRequest('http://localhost/store'))).headers.get('cache-control'),null,'Do not override public caching globally');
refreshed=true;const response=await proxy(new NextRequest('http://localhost/store',{headers:{cookie:'sb-fixture-auth-token.0=old'}}));assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.cookies.get('sb-fixture-auth-token.0').value,'refreshed-a');assert.equal(response.cookies.get('sb-fixture-auth-token.1').value,'refreshed-b');
const privateRefresh=await proxy(new NextRequest('http://localhost/account'));assert.equal(privateRefresh.headers.get('x-robots-tag'),'noindex, follow');assert.equal(privateRefresh.cookies.getAll().length,2);
console.log('PASS browser-security unit: header/CSP/media allowlists; HTTPS-apex HSTS; dev-only eval; no COEP/CORP; private/API/session cache protection; public cache preserved; refreshed chunked auth cookies and robots header retained. No network or SQL.');

import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,resolve=require,mode='production'){
 const exports={};new Function('exports','require','process',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,resolve,{env:{NODE_ENV:mode}});return exports;
}
const seo=load('lib/seo.ts'),origin=load('lib/request-origin.ts',()=>seo),local=load('lib/request-origin.ts',()=>seo,'development');
const publicOrigin='https://playtested.co.uk',internal='https://localhost:10000',id='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000001';
function req(path,method='POST',value=publicOrigin,body={consent:false},extra={}){
 const headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0',...extra};if(value!==undefined)headers.Origin=value;
 return new Request(internal+path,{method,headers,body:JSON.stringify(body)});
}
const bad=[null,'null','https://evil.test','https://playtested.co.uk.evil.test','http://playtested.co.uk','https://playtested.co.uk:444','https://www.playtested.co.uk','https://playtested.co.uk/','https://playtested.co.uk, https://evil.test','https://localhost:10000'];
for(const value of bad){const r=req('/api/analytics','POST',value);if(value===null)r.headers.delete('origin');assert.equal(origin.hasTrustedOrigin(r),false);}
assert(origin.hasTrustedOrigin(req('/api/analytics')),'Canonical origin accepted with internal authority');
for(const host of ['localhost:3000','127.0.0.1:3000','[::1]:3000']){const r=new Request('http://'+host+'/api/analytics',{headers:{Origin:'http://'+host}});assert(local.hasTrustedOrigin(r));assert(!origin.hasTrustedOrigin(r));}
assert(!local.hasTrustedOrigin(new Request('https://preview.evil.test/api/analytics',{headers:{Origin:'https://preview.evil.test'}})));
assert(!origin.hasTrustedOrigin(req('/api/analytics','POST','https://evil.test',{}, {'host':'evil.test','x-forwarded-host':'evil.test','x-forwarded-proto':'https','forwarded':'host=evil.test;proto=https'})));
assert(origin.hasTrustedOrigin(req('/api/analytics','POST',publicOrigin,{}, {'x-forwarded-host':'evil.test'})),'Forwarded headers cannot redefine canonical trust');

let writes=0;
const acquisition=load('lib/acquisition.ts');
const analytics=load('app/api/analytics/route.ts',name=>name==='@/lib/request-origin'?origin:name==='@/lib/acquisition'?acquisition:name==='@/lib/admin-server'?{analyticsService:()=>({from:()=>({upsert:async()=>{writes++;return {error:null};}})})}:require(name));
const event={consent:true,event_id:id,visitor_id:owner,page:'/'};
assert.equal((await analytics.POST(req('/api/analytics','POST',publicOrigin,event))).status,204);assert.equal(writes,1);
assert.equal((await analytics.POST(req('/api/analytics'))).status,400);assert.equal(writes,1,'Consent remains mandatory');
for(const flag of [{dnt:'1'},{'sec-gpc':'1'},{'User-Agent':'HeadlessChrome'}]){assert.equal((await analytics.POST(req('/api/analytics','POST',publicOrigin,event,flag))).status,204);assert.equal(writes,1,'Privacy suppression retained');}
for(const value of bad){const r=req('/api/analytics','POST',value,event);if(value===null)r.headers.delete('origin');assert.equal((await analytics.POST(r)).status,403);}
assert.equal(writes,1);

let actor=owner,owns=true,uploads=0,mutations=0,authChecks=0;
const client={auth:{getUser:async()=>{authChecks++;return {data:{user:actor?{id:actor}:null},error:null};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{developer_id:owns?owner:'other'},error:null})})})})};
const service={from:()=>({select:()=>({order:()=>({limit:async()=>({data:[]})})})}),storage:{from:()=>({upload:async()=>{uploads++;return {error:null};}})},rpc:async()=>{mutations++;return {error:null};}};
const media=load('app/api/game-media/[id]/[slot]/route.ts',name=>name==='@/lib/request-origin'?origin:name==='@/lib/supabase-server'?{createClient:async()=>client}:name==='@/lib/admin-server'?{analyticsService:()=>service}:name==='@/lib/screenshot-processing'?{processScreenshot:async()=>({image:new Uint8Array([1]),thumbnail:new Uint8Array([2])})}:name==='@/lib/game-screenshots'?{SCREENSHOT_BYTES:5242880}:require(name));
const context={params:Promise.resolve({id,slot:'1'})},path='/api/game-media/'+id+'/1';
for(const method of ['PUT','DELETE']){
 for(const value of bad){const r=req(path,method,value);if(value===null)r.headers.delete('origin');assert.equal((await media[method](r,context)).status,403);}
}
assert.equal(authChecks,0,'Untrusted origin rejected before authentication');assert.equal(mutations,0);
actor=null;for(const method of ['PUT','DELETE'])assert.equal((await media[method](req(path,method),context)).status,401);
actor=owner;owns=false;for(const method of ['PUT','DELETE'])assert.equal((await media[method](req(path,method),context)).status,403);
assert.equal(uploads,0);assert.equal(mutations,0,'No anonymous/foreign writes');
owns=true;assert.equal((await media.DELETE(req(path,'DELETE'),context)).status,200);assert.equal(mutations,1);
const form=new FormData();form.set('file',new File([new Uint8Array([1])],'fixture.png',{type:'image/png'}));
assert.equal((await media.PUT(new Request(internal+path,{method:'PUT',headers:{Origin:publicOrigin},body:form}),context)).status,200);assert.equal(uploads,2);assert.equal(mutations,2);
console.log('PASS proxy-origin hotfix: canonical HTTPS through internal bind URLs; localhost development only; missing/null/spoofed/cross-site/HTTP/port/suffix origins denied; no forwarding-header trust; actual routes retain consent/DNT/GPC/bot checks, anonymous/foreign denial and owner PUT/DELETE success. Mocked services; no database writes.');

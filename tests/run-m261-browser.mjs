// Starts only its own local server. No hosted writes or production credentials.
import {spawn} from 'node:child_process';import fs from 'node:fs';
const origin='http://127.0.0.1:3026',existing=process.env.M261_USE_EXISTING_SERVER==='1';let child;
const run=(path,overrides={})=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path],{stdio:'inherit',windowsHide:true,env:{...process.env,...overrides}});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(path+' exited '+code)));});
try{
 if(!existing){
  const busy=await fetch(origin).then(()=>true).catch(()=>false);if(busy)throw Error('Port3026 already occupied; refuse to reuse another server without M261_USE_EXISTING_SERVER=1');
  fs.mkdirSync('.backup-tools/m261-readiness',{recursive:true});const log=fs.openSync('.backup-tools/m261-readiness/browser-server.log','a');
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3026'],{stdio:['ignore',log,log],env:process.env,windowsHide:true});
  for(let n=0;n<90;n++){if(child.exitCode!==null)throw Error('Local server exited; inspect private browser-server.log');if(await fetch(origin).then(r=>r.ok).catch(()=>false))break;if(n===89)throw Error('Local server startup timeout');await new Promise(r=>setTimeout(r,1000));}
 }
 await run('tests/test-m261-browser.mjs');await run('tests/test-m261-admin-browser.mjs');
 await run('tests/test-tester-browser.mjs',{TEST_APP_URL:origin});
 await run('tests/test-tester-card-layout.mjs',{TEST_APP_URL:origin});
}finally{if(child)child.kill('SIGTERM');}

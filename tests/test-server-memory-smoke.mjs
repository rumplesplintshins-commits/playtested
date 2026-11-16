// Short production-server comparison, not an OOM-resolution soak test.
// Run against a build compiled with the isolated mock backend at port 32829.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {startMockPublicSupabase} from './helpers/mock-public-supabase.mjs';
const backend=await startMockPublicSupabase();
fs.mkdirSync('.backup-tools',{recursive:true});
const probe=path.resolve('.backup-tools/issue60-memory-probe.cjs');
fs.writeFileSync(probe,"setInterval(()=>process.stdout.write('MEMORY_SAMPLE '+JSON.stringify(process.memoryUsage())+'\\n'),500).unref();");
const baseConfig=JSON.parse(fs.readFileSync('.next/required-server-files.json','utf8')).config;
const results=[];
try{
 for(const budget of [50,8]){
  const samples=[],latencies=[];let logs='',requests=0;
  // Test-only Next startup override; never changes application or Render config.
  const child=spawn(process.execPath,['--require',probe,'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','32932'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:32829',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'isolated-fixture',__NEXT_PRIVATE_STANDALONE_CONFIG:JSON.stringify({...baseConfig,cacheMaxMemorySize:budget*1024*1024})},stdio:['ignore','pipe','pipe']});
  let pending='';child.stdout.on('data',d=>{pending+=d;const lines=pending.split('\n');pending=lines.pop();for(const line of lines){if(line.startsWith('MEMORY_SAMPLE '))samples.push(JSON.parse(line.slice(14)));else logs+=line+'\n';}});child.stderr.on('data',d=>logs+=d);
  const started=performance.now();
  try{
   let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:32932/community')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,logs.slice(-1000));
   const paths=['/','/community','/contact','/games/steam-912345'];
   for(let i=0;i<240;i++){
    await Promise.all(paths.map(async p=>{const start=performance.now(),response=await fetch('http://127.0.0.1:32932'+p);await response.arrayBuffer();assert.equal(response.status,200);latencies.push(performance.now()-start);requests++;}));
    if(i%40===0){const response=await fetch('http://127.0.0.1:32932/games/steam-'+(900000+i));await response.arrayBuffer();assert.equal(response.status,404);}
   }
   while(performance.now()-started<30000)await new Promise(r=>setTimeout(r,500));
   const sorted=latencies.sort((a,b)=>a-b);
   results.push({cache_budget_mib:budget,duration_ms:performance.now()-started,requests,median_ms:sorted[Math.floor(sorted.length/2)],p95_ms:sorted[Math.floor(sorted.length*.95)],peak_rss_mib:Math.max(...samples.map(s=>s.rss))/1024/1024,final_rss_mib:samples.at(-1).rss/1024/1024,samples});
   console.log('Completed cache budget '+budget+' MiB: '+requests+' local requests');
  }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));}
 }
 fs.writeFileSync('docs/performance/issue-60-server-smoke.json',JSON.stringify({environment:'Windows local production Next server; mock anonymous backend, 30-second runs, four concurrent routes plus negative metadata lookups; short smoke only, not a Render reproduction or 512 MiB cgroup test',results},null,2)+'\n');
 console.log(JSON.stringify(results.map(({samples,...r})=>r)));
}finally{await backend.close();}

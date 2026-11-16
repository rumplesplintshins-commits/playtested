import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
if(process.argv.includes('--child')){
 const {createDefaultCacheHandler}=require('next/dist/server/lib/cache-handlers/default.js');
 const cap=Number(process.argv.at(-1))*1024*1024,handler=createDefaultCacheHandler(cap);
 const entry=()=>({value:new ReadableStream({start(c){c.enqueue(Buffer.alloc(128*1024,65));c.close();}}),tags:[],stale:300,timestamp:Date.now(),expire:3600,revalidate:300});
 // Distinct cold metadata entries plus a repeatedly accessed homepage seed.
 for(let i=0;i<700;i++){
  await handler.set('metadata-'+i,Promise.resolve(entry()));
  if(i%10===0)await handler.set('homepage',Promise.resolve(entry()));
 }
 global.gc();
 let hits=0;
 for(let i=0;i<700;i++){const hit=await handler.get('metadata-'+i);if(hit){hits++;await new Response(hit.value).arrayBuffer();}}
 assert(await handler.get('homepage'),'Hot seed survives churn');
 assert.equal(await handler.get('missing'),undefined);
 global.gc();
 console.log(JSON.stringify({budget_mib:cap/1024/1024,retained_entries:hits,retained_payload_mib:(hits+1)/8,memory:process.memoryUsage()}));
}else{
 const results=[50,8].map(cap=>{
  const run=spawnSync(process.execPath,['--expose-gc',import.meta.filename,'--child',String(cap)],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
 });
 assert(results[1].retained_payload_mib<8);
 assert(results[0].retained_payload_mib-results[1].retained_payload_mib>40);
 fs.mkdirSync('docs/performance',{recursive:true});
 fs.writeFileSync('docs/performance/issue-60-cache-budget.json',JSON.stringify({environment:'Isolated Node processes; installed Next.js default production use-cache handler, synthetic 128 KiB entries; not a Render soak test',results},null,2)+'\n');
 console.log('PASS cache budget: '+JSON.stringify(results));
}

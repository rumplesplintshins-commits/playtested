import fs from 'node:fs';
import assert from 'node:assert/strict';
import http from 'node:http';
import ts from 'typescript';
const exports={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/public-server-fetch.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const server=http.createServer((req,res)=>{
 if(req.url==='/ok'){assert.equal(req.headers.apikey,'fixture');res.end('ok');}
 else if(req.url==='/body'){res.writeHead(200);res.write('partial');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,timeout=AbortSignal.timeout;
try{
 assert.equal(await (await exports.publicServerFetch(origin+'/ok',{headers:{apikey:'fixture'}})).text(),'ok');
 const durations=[];AbortSignal.timeout=ms=>{durations.push(ms);return timeout(80);};
 await assert.rejects(exports.publicServerFetch(origin+'/headers'),{name:'TimeoutError'});
 await assert.rejects(async()=>{const response=await exports.publicServerFetch(origin+'/body');await response.text();});
 assert(durations.every(ms=>ms===15000));
 AbortSignal.timeout=timeout;
 const controller=new AbortController();const pending=exports.publicServerFetch(origin+'/headers',{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});
 const requestController=new AbortController();const request=new Request(origin+'/headers',{signal:requestController.signal});requestController.abort();await assert.rejects(exports.publicServerFetch(request),{name:'AbortError'});
 console.log('PASS anonymous server fetch deadline, stalled headers/body, API header preservation and both caller cancellation forms');
}finally{AbortSignal.timeout=timeout;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

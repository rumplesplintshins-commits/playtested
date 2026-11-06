// Tab-memory only. Callers must use anonymous public data, never account RPCs.
export function publicRequestCache<T>(ttlMs=30000,limit=16){
 const entries=new Map<string,{value:T;expires:number}>(),pending=new Map<string,Promise<T>>();
 function peek(key:string){const entry=entries.get(key);if(!entry)return undefined;if(entry.expires<=Date.now()){entries.delete(key);return undefined;}entries.delete(key);entries.set(key,entry);return entry.value;}
 function get(key:string,fetcher:()=>Promise<T>):Promise<T>{
  const hit=peek(key);if(hit!==undefined)return Promise.resolve(hit);
  const running=pending.get(key);if(running)return running;
  const request=Promise.resolve().then(fetcher).then(value=>{entries.set(key,{value,expires:Date.now()+ttlMs});while(entries.size>limit)entries.delete(entries.keys().next().value!);return value;}).finally(()=>pending.delete(key));
  pending.set(key,request);return request;
 }
 return {peek,get};
}
export function mayPrefetchPublicPage(){
 if(typeof navigator==='undefined')return false;
 const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
 return !connection?.saveData&&!['slow-2g','2g'].includes(connection?.effectiveType||'');
}

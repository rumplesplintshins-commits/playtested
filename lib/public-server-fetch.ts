// Anonymous read requests must release pending response/cache work when the
// upstream stalls. Preserve caller cancellation and cover body consumption too.
export function publicServerFetch(input:RequestInfo|URL,init?:RequestInit){
 const upstream=init?.signal??(input instanceof Request?input.signal:undefined);
 return fetch(input,{...init,signal:AbortSignal.any([AbortSignal.timeout(15_000),...(upstream?[upstream]:[])])});
}

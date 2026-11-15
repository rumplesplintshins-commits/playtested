export type IntentCounts={definitely:number;probably:number;answered:number};
export type GameIntentCounts={kind:string;id:string;lifetime:{recommend:IntentCounts;continue:IntentCounts};builds:{playtest_id:string;recommend:IntentCounts;continue:IntentCounts}[]};
export function intentCounts(values:unknown[]):IntentCounts{
 const valid=values.filter(v=>typeof v==="string"&&["definitely","probably","maybe","probably_not","definitely_not"].includes(v));
 return {definitely:valid.filter(v=>v==="definitely").length,probably:valid.filter(v=>v==="probably").length,answered:valid.length};
}
export function intentText(counts:IntentCounts|null|undefined){return !counts?"Responses unavailable":counts.answered?`${counts.definitely+counts.probably} out of ${counts.answered} positive`:"No answers yet";}
export async function publicIntentCounts(client:{rpc(name:string,args:{p_games:{kind:string;id:string}[]}):PromiseLike<{data:unknown;error:{code?:string}|null}>},games:{kind:string;id:string}[]):Promise<GameIntentCounts[]|null>{
 if(!games.length)return [];
 try{const r=await client.rpc("get_public_intent_counts",{p_games:games});if(r.error||!Array.isArray(r.data)){console.warn("Public response counts unavailable",{rpc:"get_public_intent_counts",code:r.error?.code||"invalid_response"});return null;}return r.data as GameIntentCounts[];}catch{return null;}
}

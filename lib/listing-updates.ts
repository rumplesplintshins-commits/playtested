export type ListingUpdate={kind:string;id:string;fields:Record<string,string>;disputed:boolean;reassessment:boolean;pending:boolean};
type PublicClient={rpc(name:string,args:{p_games:{kind:string;id:string}[]}):PromiseLike<{data:unknown;error:{code?:string}|null}>};
export async function listingUpdates(client:PublicClient,games:{kind:string;id:string}[]):Promise<ListingUpdate[]|null>{
 if(!games.length)return [];
 try{const result=await client.rpc("get_public_listing_updates",{p_games:games});if(result.error||!Array.isArray(result.data)){console.warn("Public listing status unavailable",{rpc:"get_public_listing_updates",code:result.error?.code||"invalid_response"});return null;}return result.data as ListingUpdate[];}catch{console.warn("Public listing status unavailable",{rpc:"get_public_listing_updates",code:"request_failed"});return null;}
}
export function listingNotice(update:ListingUpdate|undefined){return update?.disputed?(update.pending?"Disclosure update pending review":"Disclosure needs review"):update?.reassessment?"Assessment needs reassessment":"";}

export type ShareSource={kind:"imported"|"approved"|"submission";id:string};
export type ShareTags={source:string;medium:string;campaign:string};
export const JOURNEY_MINUTES=30;
export function marketingTag(value:string,fallback="playtested"){
 if(value.length>80||/@|https?:|\d{7}/i.test(value))throw new Error("Use a marketing label, not an email, URL or personal identifier.");
 const tag=value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"");
 return tag.slice(0,64)||fallback;
}
export function journeyToken(search:string){const value=new URLSearchParams(search).get("pt_visit");return value&&/^[a-f0-9]{64}$/.test(value)?value:null;}
export function taggedPath(path:string,tags:ShareTags,token?:string|null){
 if(!path.startsWith("/")||path.startsWith("//")||/[\\\u0000-\u0020]/.test(path))throw new Error("Invalid internal destination");
 const url=new URL(path,"https://playtested.invalid");
 if(url.origin!=="https://playtested.invalid"||!(/^\/games\/steam-[0-9]+$/.test(url.pathname)||/^\/(?:submissions|playtest)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url.pathname)||url.pathname==="/tester"))throw new Error("Invalid internal destination");
 url.searchParams.set("utm_source",tags.source);url.searchParams.set("utm_medium",tags.medium);url.searchParams.set("utm_campaign",tags.campaign);
 if(token&&/^[a-f0-9]{64}$/.test(token))url.searchParams.set("pt_visit",token);
 return url.pathname+url.search+url.hash;
}
export function currentJourney(){return typeof window==="undefined"?null:journeyToken(window.location.search);}
export function subscribeJourney(notify:()=>void){window.addEventListener("popstate",notify);return()=>window.removeEventListener("popstate",notify);}
export function carryJourney(path:string,token:string|null){if(!token)return path;const url=new URL(path,"https://playtested.invalid");if(url.origin!=="https://playtested.invalid")return path;url.searchParams.set("pt_visit",token);return url.pathname+url.search+url.hash;}

export type StorefrontLink={href:string;label:string;steam:boolean};
export function activityStorefront(value:unknown):StorefrontLink|null{
 if(typeof value!=="string"||value.length>2048)return null;
 try{const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
 if(url.hostname==='store.steampowered.com'&&/^\/app\/[0-9]+(?:\/|$)/.test(url.pathname))return {href:url.href,label:'View Steam Page',steam:true};
 if(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)itch\.io$/.test(url.hostname)&&url.pathname!=='/'&&!url.pathname.startsWith('//'))return {href:url.href,label:'View itch.io page',steam:false};
 if(url.hostname==='www.gog.com'&&/^\/(?:[a-z]{2}\/)?game\/[^/]+\/?$/.test(url.pathname))return {href:url.href,label:'View GOG page',steam:false};
 if(url.hostname==='store.epicgames.com'&&/^\/[a-z]{2}(?:-[A-Za-z]{2})?\/p\/[^/]+\/?$/.test(url.pathname))return {href:url.href,label:'View Epic Games page',steam:false};
 if(url.hostname==='www.humblebundle.com'&&/^\/store\/[^/]+\/?$/.test(url.pathname))return {href:url.href,label:'View Humble Store page',steam:false};
 return null;}catch{return null;}
}

import type { Metadata } from "next";

export const SITE_ORIGIN = "https://playtested.co.uk";
export const SITE_TITLE = "Playtested | Discover Indie Games & Playtest New Releases";
export const SITE_DESCRIPTION = "Discover promising indie games, read structured player feedback and join community playtests that help developers improve new releases.";
const image = {url:"/images/roles/player-role.png",width:2171,height:724,alt:"Playtested - indie game discovery and community playtesting"};

export function publicMetadata(title:string,description:string,path:string):Metadata {
  return {
    title,description,alternates:{canonical:new URL(path,SITE_ORIGIN).href},
    openGraph:{type:"website",siteName:"Playtested",title,description,url:new URL(path,SITE_ORIGIN).href,images:[image]},
    twitter:{card:"summary_large_image",title,description,images:[image.url]},
  };
}

export function videoGameStructuredData({name,path,description,genre,image}:{name:string;path:string;description:string|null;genre:string|null;image:string|null}) {
  const data:Record<string,string>={"@context":"https://schema.org","@type":"VideoGame",name,url:new URL(path,SITE_ORIGIN).href};
  if(description?.trim())data.description=description.trim();
  if(genre?.trim())data.genre=genre.trim();
  if(image){
    try{
      const imageUrl=new URL(image);
      if(imageUrl.protocol==="https:"&&!imageUrl.username&&!imageUrl.password)data.image=imageUrl.href;
    }catch{}
  }
  return data;
}

export function noIndexPath(path:string) {
  return /^\/(?:login|forgot-password|reset-password|auth|account|my-submissions|submit|tester|admin|library|share|playtest|demo-games)(?:\/|$)/.test(path);
}

// Prevent public content from closing a JSON-LD script element.
export function serializeJsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c");}

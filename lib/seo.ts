import type { Metadata } from "next";

export const SITE_ORIGIN = "https://playtested.co.uk";
export const SITE_TITLE = "Playtested | Find Your Next Good Game";
export const SITE_DESCRIPTION = "Discover games, share honest player feedback and help developers improve their games through structured community playtesting.";
const image = {url:"/images/roles/player-role.png",width:2171,height:724,alt:"Playtested - game discovery and community playtesting"};

export function publicMetadata(title:string,description:string,path:string):Metadata {
  return {
    title,description,alternates:{canonical:new URL(path,SITE_ORIGIN).href},
    openGraph:{type:"website",siteName:"Playtested",title,description,url:new URL(path,SITE_ORIGIN).href,images:[image]},
    twitter:{card:"summary_large_image",title,description,images:[image.url]},
  };
}

export function noIndexPath(path:string) {
  return /^\/(?:login|forgot-password|reset-password|auth|account|my-submissions|submit|tester|admin|library|share|playtest|demo-games)(?:\/|$)/.test(path);
}

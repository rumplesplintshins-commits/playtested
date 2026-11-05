"use client";
import {steamReferralsAllowed} from '@/lib/acquisition';
import {activityStorefront} from '@/lib/activity-storefront';
export default function ActivityStorefrontLink({url,testId}:{url?:string|null;testId:string}){
 const link=activityStorefront(url);if(!link)return null;
 function record(){
  try{if(!link?.steam||!steamReferralsAllowed()||navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)return;
   // One handler, one UUID per deliberate activation. Never wait for recording to open the store.
   void fetch('/api/analytics/steam-referral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_id:crypto.randomUUID(),test_id:testId,consent:true}),keepalive:true}).catch(()=>{});
  }catch{/* Optional measurement never blocks the ordinary external link. */}
 }
 return <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={record} onAuxClick={event=>{if(event.button===1)record();}} className="inline-block rounded text-sm text-emerald-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-emerald-300">{link.label}<span className="sr-only"> (opens in a new tab)</span></a>;
}

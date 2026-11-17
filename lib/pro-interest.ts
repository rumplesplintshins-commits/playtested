import {purposeAllowed} from "@/lib/acquisition";
let lastClick = 0;
export function trackProInterest() {
 if (!purposeAllowed("pro") || navigator.doNotTrack === "1" || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl) return;
 if (Date.now() - lastClick < 60000) return;
 lastClick = Date.now();
 void fetch("/api/developer/pro-interest", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({consent:true}),keepalive:true}).catch(()=>{});
}

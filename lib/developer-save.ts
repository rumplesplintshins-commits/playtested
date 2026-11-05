import {showToast} from "@/app/components/ToastHost";

// Call only after the server confirms a developer management mutation.
export function developerSaved(message:string){
 showToast(message);
 window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}

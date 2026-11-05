"use client";
import {useEffect} from "react";
export function useUnsavedPcChanges(dirty:boolean){
 useEffect(()=>{if(!dirty)return;
  const before=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  const navigate=(event:MouseEvent)=>{const anchor=(event.target as Element)?.closest?.('a[href]');if(!(anchor instanceof HTMLAnchorElement)||anchor.target==='_blank'||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey)return;const target=new URL(anchor.href);if(target.pathname===location.pathname&&target.search===location.search)return;if(!window.confirm("Leave without saving your PC details?")){event.preventDefault();event.stopPropagation();}};
  window.addEventListener('beforeunload',before);document.addEventListener('click',navigate,true);
  return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',navigate,true);};
 },[dirty]);
}

"use client";
import {createClient} from "@/lib/supabase";
export type FeedbackIdentity={public_number:number|null;current_rank:number|null};
type Listener=(identity:FeedbackIdentity|null)=>void;
const pending=new Set<string>(),listeners=new Map<string,Set<Listener>>();
let scheduled=false;
// Batch sibling labels into one RPC. Never persist mappings or cache stale ranks.
export function subscribeFeedbackIdentity(id:string,listener:Listener){
 let set=listeners.get(id);if(!set){set=new Set();listeners.set(id,set);}set.add(listener);pending.add(id);
 if(!scheduled){scheduled=true;setTimeout(()=>void flush(),0);}
 return()=>{set?.delete(listener);if(!set?.size)listeners.delete(id);};
}
async function flush(){
 scheduled=false;const ids=[...pending];pending.clear();
 for(let offset=0;offset<ids.length;offset+=500){
  const batch=ids.slice(offset,offset+500);
  try{
   const {data,error}=await createClient().rpc("get_feedback_tester_identities",{p_test_ids:batch});
   const found=new Map<string,FeedbackIdentity>((error?[]:data||[]).map((row:{test_id:string;public_number:number|null;current_rank:number|null})=>[row.test_id,{public_number:row.public_number,current_rank:row.current_rank}]));
   for(const id of batch)for(const listener of listeners.get(id)||[])listener(found.get(id)||null);
  }catch{for(const id of batch)for(const listener of listeners.get(id)||[])listener(null);}
 }
}

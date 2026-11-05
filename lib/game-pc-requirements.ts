"use client";
import {createClient} from "@/lib/supabase";
import type {PcRequirements} from "./pc-specifications";
type Listener=(value:PcRequirements|null,error:boolean)=>void;
const listeners=new Map<string,Set<Listener>>(),pending=new Map<string,{kind:string;id:string}>();let scheduled=false;
export function subscribeGamePc(kind:string,id:string,listener:Listener){
 const key=kind+':'+id;let set=listeners.get(key);if(!set){set=new Set();listeners.set(key,set);}set.add(listener);pending.set(key,{kind,id});
 if(!scheduled){scheduled=true;setTimeout(()=>void flush(),0);}
 return()=>{set?.delete(listener);if(!set?.size)listeners.delete(key);};
}
async function flush(){scheduled=false;const games=[...pending.values()];pending.clear();
 for(let offset=0;offset<games.length;offset+=100){const batch=games.slice(offset,offset+100),recipients=new Map(batch.map(g=>[g.kind+':'+g.id,new Set(listeners.get(g.kind+':'+g.id))]));
  try{const {data,error}=await createClient().rpc('get_game_pc_requirements',{p_games:batch});const found=new Map<string,PcRequirements>((data||[]).map((r:PcRequirements&{kind:string;id:string})=>[r.kind+':'+r.id,{minimum:r.minimum,recommended:r.recommended}]));for(const [key,subscribers] of recipients)for(const notify of subscribers)if(listeners.get(key)?.has(notify))notify(found.get(key)||null,!!error);}
  catch{for(const [key,subscribers] of recipients)for(const notify of subscribers)if(listeners.get(key)?.has(notify))notify(null,true);}
 }
}

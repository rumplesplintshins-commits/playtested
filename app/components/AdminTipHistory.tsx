"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase";
type TipRow={test_id:string;tip_amount_pence:number;paid_at:string|null};
const gbp=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
export default function AdminTipHistory({testId}:{testId:string}){
  const [row,setRow]=useState<TipRow|null>(null);
  useEffect(()=>{let active=true;void createClient().rpc("get_admin_tester_tip_history",{p_test_ids:[testId]}).then(({data,error})=>{
    if(!active)return;const match=!error&&Array.isArray(data)?(data as TipRow[])[0]??null:null;setRow(match);
  });return()=>{active=false;};},[testId]);
  if(!row)return null;
  return <p className="mt-2 rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/[0.04] px-3 py-2 text-xs text-[#aef8c2]">
    {gbp.format(row.tip_amount_pence/100)} Tip sent · {row.paid_at?new Date(row.paid_at).toLocaleString():"Payment confirmed"}
  </p>;
}

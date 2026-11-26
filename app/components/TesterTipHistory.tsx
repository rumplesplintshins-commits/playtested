"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase";

type TipRow={test_id:string;tip_amount_pence:number;paid_at:string|null};
const gbp=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
let historyRequest: Promise<TipRow[]> | null = null;
function loadTipHistory(){
  if(!historyRequest){
    historyRequest=createClient().rpc("get_my_tester_tip_history").then(({data,error})=>{
      if(error) throw error;
      return Array.isArray(data)?data as TipRow[]:[];
    }).catch(error=>{historyRequest=null;throw error;});
  }
  return historyRequest;
}
export default function TesterTipHistory({testId,expanded=false}:{testId:string;expanded?:boolean}){
  const [row,setRow]=useState<TipRow|null>(null);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{let active=true;void loadTipHistory().then(rows=>{
    if(!active)return;
    setRow(rows.find(item=>item.test_id===testId)??null);setLoaded(true);
  }).catch(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[testId]);
  if(!loaded||!row)return null;
  return <>
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-2.5 py-1 text-xs font-semibold text-[#aef8c2]">
      Tipped {gbp.format(row.tip_amount_pence/100)}
    </span>
    {expanded&&<div className="mt-3 rounded-lg border border-[#77f29b]/25 bg-[#77f29b]/[0.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#aef8c2]">{gbp.format(row.tip_amount_pence/100)} Tip received</p>
        <p className="text-xs text-zinc-500">{row.paid_at?new Date(row.paid_at).toLocaleString():"Payment confirmed"}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-zinc-300">A developer appreciated your feedback and sent you a tip. Thank you for helping make Playtested a stronger community.</p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">Check your tip and payout status in your Stripe account.</p>
      <a href="/account#tester-payouts" className="mt-2 inline-block text-sm font-semibold text-[#77f29b] hover:text-[#aef8c2]">Manage Stripe account &rarr;</a>
    </div>}
  </>;
}

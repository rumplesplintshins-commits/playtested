"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase";

type TipRow={test_id:string;tip_amount_pence:number;paid_at:string|null};
const gbp=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
export default function TesterTipHistory({testId}:{testId:string}){
  const [row,setRow]=useState<TipRow|null>(null);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{let active=true;void createClient().rpc("get_my_tester_tip_history").then(({data,error})=>{
    if(!active)return;
    const match=!error&&Array.isArray(data)?(data as TipRow[]).find(item=>item.test_id===testId):null;
    setRow(match??null);setLoaded(true);
  });return()=>{active=false;};},[testId]);
  if(!loaded||!row)return null;
  return <div className="mt-3 rounded-lg border border-[#77f29b]/25 bg-[#77f29b]/[0.04] p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-[#aef8c2]">{gbp.format(row.tip_amount_pence/100)} Tip received</p>
      <p className="text-xs text-zinc-500">{row.paid_at?new Date(row.paid_at).toLocaleString():"Payment confirmed"}</p>
    </div>
    <p className="mt-1 text-xs leading-5 text-zinc-300">A developer appreciated your feedback and sent you a tip. Thank you for helping make Playtested a stronger community.</p>
    <p className="mt-2 text-xs leading-5 text-zinc-400">Check your tip and payout status in your Stripe account.</p>
    <a href="/account#tester-payouts" className="mt-2 inline-block text-sm font-semibold text-[#77f29b] hover:text-[#aef8c2]">Manage Stripe account &rarr;</a>
  </div>;
}

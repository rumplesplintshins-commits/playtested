"use client";
import {useState} from "react";
import {SUPPORT_EMAIL} from "@/lib/site-information";

export default function SupportEmail() {
  const [message,setMessage]=useState("");
  async function copy(){try{await navigator.clipboard.writeText(SUPPORT_EMAIL);setMessage("Email address copied.");}catch{setMessage("Copy was unavailable. Select the email address above and copy it manually.");}}
  return <div className="my-6 space-y-3">
    <a className="block w-fit break-all rounded text-emerald-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    <button type="button" onClick={()=>void copy()} className="rounded-lg border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">Copy email address</button>
    <p role="status" className="text-sm text-zinc-300">{message}</p>
  </div>;
}

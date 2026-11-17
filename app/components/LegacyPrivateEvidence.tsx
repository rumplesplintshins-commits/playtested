"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase";
import {DeveloperEvidenceLinks} from "./StartPlaytest";
type Evidence={test_id:string;document_url:string|null;recording_url:string|null;submitted_at:string|null};
export default function LegacyPrivateEvidence({submissionId}:{submissionId?:string|null}) {
 const [data,setData]=useState<{id:string;rows:Evidence[]}|null>(null),[error,setError]=useState("");
 useEffect(()=>{if(!submissionId)return;let active=true;void createClient().rpc("get_developer_legacy_private_playtest_evidence",{p_submission_id:submissionId}).then(({data,error})=>{if(!active)return;setData({id:submissionId,rows:error?[]:data||[]});setError(error?"Historical private evidence could not be loaded.":"");});return()=>{active=false;};},[submissionId]);
 if(!submissionId||data?.id!==submissionId)return null;
 if(error)return <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>;
 if(!data.rows.length)return null;
 return <section aria-label="Accepted legacy playtest evidence" className="mt-5 rounded-xl border border-white/10 p-4"><h3 className="font-semibold text-zinc-200">Accepted legacy playtest evidence</h3><p className="mt-1 text-xs text-zinc-400">Private supporting links from accepted reports submitted before campaign tracking.</p>{data.rows.map(row=><div key={row.test_id} className="mt-4">{row.submitted_at&&<p className="text-xs text-zinc-400">Report submitted {new Date(row.submitted_at).toLocaleDateString("en-GB")}</p>}<DeveloperEvidenceLinks evidence={row}/></div>)}</section>;
}

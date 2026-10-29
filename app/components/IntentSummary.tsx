import {intentText,type IntentCounts} from "@/lib/intent-counts";
export default function IntentSummary({counts}:{counts:IntentCounts|null|undefined}){return <span className="block"><span>{intentText(counts)}</span>{!!counts?.answered&&<span className="mt-1 block text-xs font-normal text-zinc-400">{counts.definitely} definitely · {counts.probably} probably</span>}</span>;}

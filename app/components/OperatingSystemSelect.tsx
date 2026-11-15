"use client";
export const OPERATING_SYSTEMS=['Windows 10','Windows 11','Linux','macOS','Other'] as const;
export default function OperatingSystemSelect({id,value,onChange}:{id:string;value:string;onChange:(value:string)=>void}){
 const legacy=!!value&&!OPERATING_SYSTEMS.some(os=>os===value);
 return <select id={id} value={value} onChange={event=>onChange(event.target.value)} className="mt-2 block w-full min-w-0 rounded-lg border border-white/20 bg-[#101310] p-3 text-zinc-200 focus-visible:outline-2 focus-visible:outline-emerald-300"><option value="">Not provided</option>{legacy&&<option value={value}>{value} (saved value)</option>}{OPERATING_SYSTEMS.map(os=><option key={os} value={os}>{os}</option>)}</select>;
}

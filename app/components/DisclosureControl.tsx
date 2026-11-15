export default function DisclosureControl({expanded=false}:{expanded?:boolean}){
 return <span aria-hidden="true" className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border text-base transition-transform motion-reduce:transition-none ${expanded?"rotate-45 border-emerald-300/50 text-emerald-300":"border-white/20 text-zinc-300"}`}>+</span>;
}

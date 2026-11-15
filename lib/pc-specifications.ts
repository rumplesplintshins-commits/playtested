import {canonicalHardware} from './hardware-catalogue';
export type PcSpecs=Record<string,string|number>;
export type PcDraft=Record<string,string>;
export type PcRequirements={minimum:PcSpecs;recommended:PcSpecs};
export const PC_FIELDS=[
 {key:"os",label:"Operating system",example:"Windows 11, Linux, macOS"},
 {key:"os_version",label:"OS version / details",example:"64-bit, Ubuntu 24.04"},
 {key:"cpu",label:"Processor (CPU)",example:"Intel Core i5-12400F / AMD Ryzen 5 5600X"},
 {key:"gpu",label:"Graphics card (GPU)",example:"NVIDIA GeForce RTX 3060 / AMD Radeon RX 6600"},
 {key:"ram_gb",label:"RAM (GB)",example:"16",numeric:true,min:0.25,max:4096},
 {key:"vram_gb",label:"Graphics memory (GB)",example:"8",numeric:true,min:0,max:4096},
 {key:"storage_gb",label:"Storage (GB)",example:"100",numeric:true,min:0,max:1000000},
 {key:"storage_type",label:"Storage type",example:"SSD"},
 {key:"api",label:"DirectX / graphics API",example:"DirectX 12 / Vulkan"},
 {key:"notes",label:"Additional notes",example:"Developer-provided details",notes:true},
] as const;
export function pcDraft(value:PcSpecs={}):PcDraft{return Object.fromEntries(Object.entries(value).map(([key,value])=>[key,String(value)]));}
export function parsePcSpecs(value:PcDraft,allowNotes=false):PcSpecs{
 const result:PcSpecs={};
 for(const [key,raw] of Object.entries(value)){
  const field=PC_FIELDS.find(f=>f.key===key);if(!field||('notes'in field&&!allowNotes))throw Error("Unsupported PC specification field.");
  const text=raw.trim();if(!text||text==='custom:')continue;
  if('numeric'in field){const amount=Number(text);if(!Number.isFinite(amount)||amount<field.min||amount>field.max)throw Error(`${field.label}: enter a number between ${field.min} and ${field.max}, or leave blank.`);result[key]=amount;}
  else{if(text.length>('notes'in field?1000:160))throw Error(`${field.label} is too long.`);if(key==='storage_type'&&!['SSD','HDD','NVMe SSD','Other'].includes(text))throw Error("Choose a supported storage type.");result[key]=(key==='cpu'||key==='gpu')?canonicalHardware(key,text):text;}
 }
 return result;
}

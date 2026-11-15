import data from './hardware-catalogue.json';
export type HardwareKind='cpu'|'gpu';
export const hardwareCatalogue=data;
const key=(value:string)=>value.toLowerCase().replace(/\b(nvidia|geforce|amd|radeon|intel|core|processor|graphics)\b/g,'').replace(/[^a-z0-9]/g,'').replace(/^(rtx|gtx|rx)/,'');
export function recognisedHardware(kind:HardwareKind,value:string){if(value.startsWith('custom:'))return null;const exact=data[kind].find(item=>item.id===value);if(exact)return exact;const matches=data[kind].filter(item=>key(item.label)===key(value));return matches.length===1?matches[0]:null;}
export function hardwareLabel(kind:HardwareKind,value:string){return recognisedHardware(kind,value)?.label??value.replace(/^custom:/,'');}
export function canonicalHardware(kind:HardwareKind,value:string){return recognisedHardware(kind,value)?.id??value;}
export function searchHardware(kind:HardwareKind,search:string){const words=search.toLowerCase().split(/\s+/).filter(Boolean),compact=search.toLowerCase().replace(/[^a-z0-9]/g,'');return data[kind].filter(item=>words.every(word=>item.label.toLowerCase().includes(word))||item.label.toLowerCase().replace(/[^a-z0-9]/g,'').includes(compact)||(key(search).length>0&&key(item.label).includes(key(search))));}

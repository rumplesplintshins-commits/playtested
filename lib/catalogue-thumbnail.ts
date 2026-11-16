import manifest from './catalogue-thumbnails.json';
export function catalogueThumbnail(original:string){
 const variants=(manifest as Record<string,{url:string;width:number}[]>)[original];
 if(!variants)return {src:original,srcSet:undefined};
 return {src:variants[1].url,srcSet:[...new Map(variants.map(v=>[v.width,v])).values()].map(v=>`${v.url} ${v.width}w`).join(', ')};
}

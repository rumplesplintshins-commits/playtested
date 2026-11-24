import manifest from './catalogue-thumbnails.json';
export function catalogueThumbnail(original:string){
 const variants=(manifest as Record<string,{url:string;width:number}[]>)[original];
 if(!variants)return {src:original,srcSet:undefined};
 const storageUrl=(variantUrl:string)=>new URL(`/storage/v1/object/public/game-thumbnails${variantUrl}`,original).href;
 return {src:storageUrl(variants[1].url),srcSet:[...new Map(variants.map(v=>[v.width,v])).values()].map(v=>`${storageUrl(v.url)} ${v.width}w`).join(', ')};
}

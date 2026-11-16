import type {SupabaseClient} from '@supabase/supabase-js';
import {thumbnailExtension} from './thumbnail';

export async function thumbnailWebp(file:File):Promise<Blob>{
 const image=await createImageBitmap(file);
 try{
  if(image.width*image.height>25_000_000)throw new Error('Use a thumbnail up to 25 megapixels.');
  const scale=Math.min(1,960/image.width);
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('Image processing unavailable.');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Image processing failed.')),'image/webp',0.75));
  if(blob.type!=='image/webp')throw new Error('WebP encoding unavailable.');
  return blob;
 }finally{image.close();}
}

// Both submission and correction uploads retain an untouched, uniquely named
// original. The catalogue uses a separate WebP; neither object is overwritten.
export async function uploadGameThumbnail(client:SupabaseClient,userId:string,file:File){
 const extension=await thumbnailExtension(file);
 const webp=await thumbnailWebp(file);
 const base=`${userId}/${crypto.randomUUID()}`,bucket=client.storage.from('game-thumbnails');
 const original=await bucket.upload(`${base}.${extension}`,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
 if(original.error)throw original.error;
 const path=`${base}-card-v1.webp`;
 const variant=await bucket.upload(path,webp,{contentType:'image/webp',cacheControl:'31536000',upsert:false});
 // Keep the successful original usable if the second upload fails.
 return bucket.getPublicUrl(variant.error?`${base}.${extension}`:path).data.publicUrl;
}

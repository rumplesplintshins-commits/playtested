export type ActivityMedia={test_id:string;game_id?:string;game_kind?:string;title?:string|null;developer_name?:string|null;image_url?:string|null;store_url?:string|null};
export function safeActivityImage(value:unknown){
 if(typeof value!=="string")return null;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}

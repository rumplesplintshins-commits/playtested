import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = new URL(process.env.LOCAL_STUDIO_SUPABASE_URL || "http://127.0.0.1:54341");
if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("Studio fixture seeding only accepts a loopback Supabase URL.");
}
const key = process.env.LOCAL_STUDIO_SERVICE_KEY;
if (!key) throw new Error("Set LOCAL_STUDIO_SERVICE_KEY from the local Supabase status.");
const client = createClient(url.origin, key, { auth: { persistSession:false, autoRefreshToken:false } });
const directory = resolve(".backup-tools", "developer-teams");
await mkdir(directory, { recursive:true, mode:0o700 });
const credentialsPath = resolve(directory, "credentials.json");
const old = await readFile(credentialsPath,"utf8").then(JSON.parse, error => {
  if (error.code === "ENOENT") return [];
  throw error;
});
const accounts = [
  { email:"studio-owner@playtested.local", name:"Local Studio Owner", intendedRole:"Owner" },
  ...Array.from({length:5}, (_,i)=>({ email:`devtest${i+1}@playtested.local`,name:`Developer Test ${i+1}`,intendedRole:i<2?"Editor":"Viewer" })),
];
const available = new Map();
for(let page=1;;page++){
  const {data,error}=await client.auth.admin.listUsers({page,perPage:100});
  if(error)throw error;
  for(const user of data.users) available.set(user.email,user);
  if(data.users.length<100)break;
}
const credentials=[];
for(const account of accounts){
  const existing=available.get(account.email);
  const previous=old.find(item=>item.email===account.email);
  if(existing && existing.app_metadata?.local_studio_fixture!==true) throw new Error("An existing account is not marked as a local studio fixture.");
  const password=process.env.LOCAL_STUDIO_ROTATE_PASSWORDS==="1" || !previous?.password ? randomBytes(24).toString("base64url") : previous.password;
  const payload={password,email_confirm:true,user_metadata:{display_name:account.name},app_metadata:{local_studio_fixture:true}};
  const {data,error}=existing ? await client.auth.admin.updateUserById(existing.id,payload) :
    await client.auth.admin.createUser({email:account.email,...payload});
  if(error)throw error;
  const {error:profileError}=await client.from("profiles").upsert({id:data.user.id,display_name:account.name,role:"developer",roles:["developer"]});
  if(profileError)throw profileError;
  credentials.push({...account,id:data.user.id,password});
  await writeFile(credentialsPath,JSON.stringify([...credentials,...old.filter(item=>!credentials.some(saved=>saved.email===item.email))],null,2)+"\n",{mode:0o600});
}
console.log("Six local fixture accounts are ready. Open .backup-tools/developer-teams/credentials.json locally to retrieve passwords.");

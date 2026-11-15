import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,'ktifgybnkdaotdxrvjgq.supabase.co');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const fixtures=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
for(const role of ['owner','admin']){
 const {data:{user},error}=await service.auth.admin.getUserById(fixtures.users[role]);assert(!error&&user.email.startsWith(`m24-${role}-`));
 const {data,error:linkError}=await service.auth.admin.generateLink({type:'magiclink',email:user.email});assert(!linkError);
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 assert(!(await client.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);
 const result=await client.rpc('get_my_developer_plan');
 assert(!result.error,result.error?.message);console.log(role,JSON.stringify(result.data));
}

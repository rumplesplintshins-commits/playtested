import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname,'ktifgybnkdaotdxrvjgq.supabase.co','Development only');
const options={auth:{persistSession:false,autoRefreshToken:false}},service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const client=()=>createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const must=(r,label)=>{assert(!r.error,label);return r.data;};
let fixture;
try{
 const email='m26-rights-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomUUID()+'aA1!';
 fixture=must(await service.auth.admin.createUser({email,password,email_confirm:true}),'Create disposable development account').user;
 const tester=client(),session=must(await tester.auth.signInWithPassword({email,password}),'Fixture sign in').session;
 must(await tester.from('account_pc_specs').insert({user_id:fixture.id,specs:{os:'Linux',ram_gb:16}}),'Save own fixture PC');
 const args={p_tester:fixture.id,p_restricted:true,p_deidentify:false,p_case_reference:'DEV_RIGHTS_FIXTURE'};
 assert((await tester.rpc('set_tester_privacy_restriction',args)).error,'Ordinary account denied');
 const previous=JSON.parse(fs.readFileSync('technical-test-results/m24-development-fixtures.json','utf8'));
 const adminUser=must(await service.auth.admin.getUserById(previous.users.admin),'Existing QA admin').user;assert(adminUser.email.startsWith('m24-admin-'));
 const link=must(await service.auth.admin.generateLink({type:'magiclink',email:adminUser.email}),'Generate local QA token');
 const admin=client();must(await admin.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'Authenticate QA admin');
 must(await admin.rpc('set_tester_privacy_restriction',args),'Apply fixture restriction');
 must(await service.auth.admin.updateUserById(fixture.id,{ban_duration:'24h'}),'Ban disposable account');
 assert((await client().auth.signInWithPassword({email,password})).error,'Banned fixture cannot sign in');
 assert((await client().auth.refreshSession({refresh_token:session.refresh_token})).error,'Banned fixture cannot refresh');
 // Ban/revocation cannot be represented as immediate expiry of a previously issued JWT.
 const existing=await tester.from('account_pc_specs').select('user_id').eq('user_id',fixture.id);
 const oldJwtStillReads=!existing.error&&existing.data?.length===1;
 must(await admin.rpc('set_tester_privacy_restriction',{...args,p_deidentify:true}),'Minimise fixture without deleting Auth');
 assert.equal(must(await service.from('account_pc_specs').select('user_id').eq('user_id',fixture.id),'Inspect fixture PC cleanup').length,0);
 assert.equal(must(await service.auth.admin.getUserById(fixture.id),'Auth retained').user.id,fixture.id);
 fs.mkdirSync('technical-test-results/m26-final',{recursive:true});fs.writeFileSync('technical-test-results/m26-final/privacy-development.json',JSON.stringify({development_only:true,new_login_denied:true,refresh_denied:true,old_jwt_still_reads:oldJwtStillReads,partial_minimisation:true,report_fixture_used:false,full_erasure_tested:false},null,2));
 console.log('PASS development privacy: disposable account ordinary denial, real admin restriction/minimisation, Auth ban denies sign-in/refresh; old JWT still reads='+oldJwtStillReads+' (wait for actual expiry before claiming full containment).');
}finally{
 // This newly-created account has no reports; never use hard deletion for a genuine report owner.
 if(fixture){must(await service.auth.admin.deleteUser(fixture.id),'Remove empty disposable Auth account');}
}

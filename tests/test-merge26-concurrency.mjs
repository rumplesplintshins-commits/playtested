import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {availabilityFixtureSQL,availabilitySeedSQL,id} from './merge26-availability-fixture.mjs';
const docker=process.env.REHEARSAL_DOCKER||'C:/Users/OWNER/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const name='playtested-merge26-test-'+Date.now(),image='public.ecr.aws/supabase/postgres:17.11.0.006';
function command(args,input){const result=spawnSync(docker,args,{input,encoding:'utf8',timeout:60000,maxBuffer:8000000});if(result.status!==0)throw Error(result.stderr||result.error?.message||'Disposable PostgreSQL command failed');return result.stdout.trim();}
const psql=['exec','-i',name,'psql','-h','/tmp','-U','postgres','-d','postgres','-X','-qAt','--set=ON_ERROR_STOP=1'];
function session(sql,held=false){const child=spawn(docker,psql);let out='',err='',ready;const waiting=new Promise(resolve=>{ready=resolve;});child.stdout.on('data',chunk=>{out+=chunk;if(out.includes('HELD'))ready();});child.stderr.on('data',chunk=>{err+=chunk;});child.stdin.end(sql);const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{ready();resolve({code,out,err});});});return {ready:held?waiting:Promise.resolve(),done};}
let started=false;
try{
 command(['run','--pull=never','--rm','-d','--name',name,'--network','none','--user','postgres','--tmpfs','/tmp:rw,mode=1777','--entrypoint','sh',image,'-c',`initdb -D /tmp/m26-pg -A trust >/tmp/init.log && pg_ctl -D /tmp/m26-pg -l /tmp/postgres.log -o "-k /tmp -c listen_addresses=''" -w start && touch /tmp/ready && exec sleep infinity`]);started=true;
 command(['exec',name,'sh','-c','n=0; while ! test -f /tmp/ready; do n=$((n+1)); test "$n" -lt 200 || exit 1; sleep .1; done']);
 command(psql,availabilityFixtureSQL()+availabilitySeedSQL());
 command(psql,`insert into auth.users(id) values('${id(5)}'),('${id(6)}');insert into profiles(id,roles) values('${id(5)}',array['player']),('${id(6)}',array['player']);`);
 const registrations=await Promise.all([session(`update profiles set roles=array['tester'] where id='${id(5)}';`).done,session(`update profiles set roles=array['tester'] where id='${id(6)}';`).done,session(`update profiles set roles=array['tester'] where id='${id(5)}';`).done]);assert(registrations.every(r=>r.code===0));
 assert.equal(command(psql,`select count(*)=count(distinct public_number) from tester_public_identities;`),'t');assert.equal(command(psql,`select count(*) from tester_public_identities where user_id in('${id(5)}','${id(6)}');`),'2');
 command(psql,`set test.uid='${id(1)}';select claim_community_game_test('${id(20)}');set test.uid='${id(2)}';select set_tester_availability_preference('${id(20)}',true);set test.uid='${id(3)}';select set_tester_availability_preference('${id(20)}',true);`);
 const release=session(`begin;set test.uid='${id(1)}';select release_community_game_test('${id(20)}');select 'HELD';select pg_sleep(.4);commit;`,true);await release.ready;const worker=session('select process_tester_availability();');assert.equal((await release.done).code,0);assert.equal((await worker.done).code,0);
 assert.equal(command(psql,"select count(*) from notifications where dedupe_key like 'tester:availability:%';"),'2');
 const winner=session(`begin;set test.uid='${id(2)}';select claim_community_game_test('${id(20)}');select 'HELD';select pg_sleep(.4);commit;`,true);await winner.ready;const loser=session(`set test.uid='${id(3)}';select claim_community_game_test('${id(20)}');`);assert.equal((await winner.done).code,0);const blocked=await loser.done;assert.notEqual(blocked.code,0);assert.match(blocked.err,/full/);assert.equal(command(psql,`select testing from campaign_places('${id(20)}');`),'1');
 command(psql,`insert into community_playtests(id,title,submission_id,developer_id,status,audience,target_testers,minimum_rank,genre_restricted,access_link) values('${id(21)}','Other QA','${id(10)}','${id(9)}','open','both',1,0,false,'https://example.test/build');`);
 const active=session(`set test.uid='${id(2)}';select claim_community_game_test('${id(21)}');`);assert.match((await active.done).err,/One test at a time/);
 command(psql,"alter table community_game_tests disable trigger aa_testing_reservation;update community_game_tests set reservation_expires_at=now()-interval '1 hour' where status='claimed';alter table community_game_tests enable trigger aa_testing_reservation;");
 const expires=await Promise.all([session('select process_tester_availability();').done,session('select process_tester_availability();').done]);assert(expires.every(r=>r.code===0));assert.equal(command(psql,"select count(*) from notifications where dedupe_key like 'tester:availability:%';"),'3');
 console.log('PASS real PostgreSQL concurrency: unique identity allocation under concurrent profile registration; release versus scheduler dedupe; only one concurrent last-place claimant; one active test across campaigns; simultaneous expiry workers emit one event per recipient. Disposable network-isolated database only.');
}finally{if(started)command(['rm','-f',name]);}

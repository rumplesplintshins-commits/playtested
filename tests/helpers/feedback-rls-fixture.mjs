import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
export const id=n=>`28100000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const migration='supabase/migrations/20261111200825_feedback_rls_read_models.sql';
export async function feedbackRlsFixture(){
 const db=new PGlite();
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(fs.readFileSync('tests/fixtures/merge26-tester-rank.sql','utf8'));
 for(const file of ['202611040108_merge26_tester_identity.sql','202611040111_merge26_private_rank_helpers.sql','202611050124_merge26_attribution_restrictions.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 // These are the deployed policies/grants for the two private tables, reproduced
 // only in this disposable in-memory database. Never load .env or a live URL.
 await db.exec(`
 revoke all on profiles,community_game_tests from public,anon,authenticated;
 alter table profiles enable row level security;
 create policy "Users can read own profile" on profiles for select to authenticated using((select auth.uid())=id);
 grant select on profiles to authenticated;
 alter table community_game_tests enable row level security;
 create policy "Testers can view own tests" on community_game_tests for select to authenticated using(auth.uid()=tester_id);
 create policy "Authenticated users can view approved game tests" on community_game_tests for select to authenticated using(exists(select 1 from game_submissions s where s.id=community_game_tests.submission_id and s.status='Approved'));
 grant select on community_game_tests to authenticated;
 grant select on game_submissions to authenticated;
 grant usage on schema public to anon,authenticated;
 `);
 // Apply the proposed migration only after production-equivalent RLS exists.
 const accessQuery="select relname,relrowsecurity,relacl::text from pg_class where oid in ('profiles'::regclass,'community_game_tests'::regclass) order by relname";
 const accessBefore=(await db.query(accessQuery)).rows;
 await db.exec(fs.readFileSync(migration,'utf8'));
 if(JSON.stringify(accessBefore)!==JSON.stringify((await db.query(accessQuery)).rows))throw Error('Migration changed private-table RLS or grants');
 for(let n=1;n<=9;n++)await db.query('insert into auth.users(id) values($1)',[id(n)]);
 for(let n=1;n<=8;n++)await db.query("insert into profiles(id,display_name,role,roles,tester_xp,preferred_genres) values($1,$2,'user',array['tester','developer'],$3,$4)",[id(n),'PRIVATE fixture '+n,({5:500,6:2000,7:5000})[n]??0,n===4?[]:['RPG','Adventure','Action']]);
 for(let n=10;n<=14;n++)await db.query("insert into imported_games(id,steam_app_id,title,developer_name,genre,description,catalogue_eligible,catalogue_review_status,metadata_backfill_status) values($1,$2,$3,'Fixture studio','Action','Isolated feedback fixture',true,$4,'complete')",[id(n),String(912335+n),'RLS Game '+n,n===13?'held_for_review':'eligible']);
 for(const n of [10,11,13,14])await db.query("insert into game_developer_links(id,developer_id,imported_game_id,relationship,created_at)values($1,$2,$3,'Developer',now())",[id(100+n),id(n===11?2:1),id(n)]);
 for(let n=20;n<=29;n++)await db.query("insert into community_playtests(id,developer_id,imported_game_id,title,release_label,status,audience,created_at,published_at,target_testers)values($1,$2,$3,'RLS campaign',$4,$5,'both',now(),$6,1000)",[id(n),id(n===21?2:1),id(n===21?11:n===27?12:n===28?13:n===29?14:10),'Build '+n,n===22?'draft':n===25?'closed':'open',n===24?null:'2026-01-01T00:00:00Z']);
 await db.exec(`insert into listing_controls(game_kind,source_id,archived,is_admin_test)values('imported','${id(14)}',true,false);`);
 // The listing helper recognises a hidden campaign through its linked submission.
 await db.query("insert into game_submissions(id,title,status,developer_id)values($1,'Hidden source','Approved',$2)",[id(15),id(1)]);
 await db.query("update community_playtests set submission_id=$1 where id=$2",[id(15),id(23)]);
 await db.query("insert into listing_controls(game_kind,source_id,archived,is_admin_test)values('submission',$1,true,false)",[id(15)]);
 await db.query("insert into tester_privacy_restrictions(tester_id,restricted)values($1,true)",[id(8)]);
 const add=async(n,tester,campaign=20,outcome='accepted',status='reviewed',replacement=null)=>db.query("insert into community_game_tests(id,tester_id,playtest_id,status,review_outcome,xp_awarded,quality_reviewed,overall_score,gameplay_score,performance_score,hours_played,continue_playing,recommend_game,enjoyed_most,frustrations,bugs_found,biggest_improvement,feedback,submitted_at,reviewed_at,replacement_at)values($1,$2,$3,$4,$5,true,true,8,9,7,1.5,'probably','definitely',$6,'Friction','No bugs','Improve tutorial','Other notes',now(),now(),$7)",[id(n),id(tester),id(campaign),status,outcome,'Recorded tester '+tester+' report '+n,replacement]);
 await add(30,3);await add(31,4);await add(32,8);await add(33,9);await add(34,3,21);await add(35,3,20,'pending','submitted');await add(36,3,20,'rejected');await add(37,3,20,'accepted','reviewed','2026-01-02');
 for(let c=22;c<=29;c++)await add(40+c,3,c);
 for(const [tester,count]of[[5,5],[6,20],[7,50]])for(let i=0;i<count;i++)await add(1000+tester*100+i,tester);
 let tail=Promise.resolve();
 const asRole=(role,uid,query,params=[])=>{if(!['anon','authenticated'].includes(role))throw Error('Invalid test role');const result=tail.then(()=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('test.uid',$1,true)",[uid??'']);return tx.query(query,params);}));tail=result.catch(()=>{});return result;};
 const rpc=(name,args,role='anon',uid=null)=>{if(name==='get_developer_feedback_genres')return asRole(role,uid,'select * from get_developer_feedback_genres($1)',[args.p_playtest_id]);if(name==='get_public_imported_playtest_feedback')return asRole(role,uid,'select * from get_public_imported_playtest_feedback($1)',[args.p_imported_game_id]);if(name==='get_feedback_tester_identities')return asRole(role,uid,'select * from get_feedback_tester_identities($1)',[args.p_test_ids]);throw Error('Unexpected isolated RPC: '+name);};
 return{db,asRole,rpc,add,close:()=>db.close()};
}

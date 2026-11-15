import fs from 'node:fs';
export function availabilityFixtureSQL({legacy72=false}={}){
 let sql=fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8');
 for(const name of ['202611010029_notifications.sql','202611010030_notification_events.sql','202611010033_feedback_useful_notification_kind.sql','202611020035_notification_management.sql','202611040013_notification_routing.sql'])sql+='\n'+fs.readFileSync('supabase/migrations/'+name,'utf8');
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040108').sort())sql+='\n'+fs.readFileSync('supabase/migrations/'+file,'utf8');
 sql+='\n'+fs.readFileSync('tests/fixtures/merge26-reservation-policy.sql','utf8');
 sql+='\n'+fs.readFileSync('supabase/migrations/202611040110_merge26_availability_notifications.sql','utf8');
 sql+='\n'+fs.readFileSync('supabase/migrations/202611040112_merge26_explicit_availability_choice.sql','utf8');
 if(!legacy72)sql+='\n'+fs.readFileSync('supabase/migrations/202611040114_merge26_48_hour_reservations.sql','utf8');
 return sql;
}
export const id=n=>`26300000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const availabilitySeedSQL=()=>`
 insert into auth.users(id) values('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}'),('${id(9)}');
 insert into profiles(id,role,roles,tester_xp) values('${id(1)}','user',array['tester'],0),('${id(2)}','user',array['tester'],0),('${id(3)}','user',array['tester'],0),('${id(4)}','user',array['player'],0),('${id(9)}','admin',array['admin','developer','tester'],0);
 insert into game_submissions(id,title,status,developer_id) values('${id(10)}','Availability QA','Approved','${id(9)}');
 insert into community_playtests(id,title,submission_id,developer_id,status,audience,target_testers,minimum_rank,genre_restricted,access_link)
 values('${id(20)}','Availability QA','${id(10)}','${id(9)}','open','both',1,0,false,'https://example.test/build');
`;

begin;
create function public.m26_tester_analytics() returns jsonb
language sql stable security definer set search_path='' as $$
 with population as materialized (
  select p.id,public.tester_rank(p.id) rank from public.profiles p join auth.users u on u.id=p.id
  where 'tester'=any(p.roles) and not coalesce(u.is_anonymous,false) and u.deleted_at is null
   and not coalesce(u.raw_app_meta_data @> '{"is_synthetic":true}'::jsonb,false)
 ), reports as materialized (
  select t.id,t.tester_id,t.submitted_at,coalesce(public.tester_rank(t.tester_id),-1) rank,
   case when t.status='reviewed' and t.review_outcome in('accepted','rejected') then t.review_outcome else 'pending' end decision,
   case when t.hours_played>=0 and t.hours_played::text not in('NaN','Infinity','-Infinity') then t.hours_played end hours
  from public.community_game_tests t left join public.community_playtests c on c.id=t.playtest_id
  where t.status in('submitted','reviewed')
   and not public._m26_legacy_fixture_hidden(coalesce(c.id,t.submission_id))
   and not public.m26_test_listing(t.submission_id) and not public.m26_test_listing(c.submission_id)
   and not public.m26_test_listing(c.approved_game_id) and not public.m26_test_listing(c.imported_game_id)
   and not exists(select 1 from auth.users u where u.id=t.tester_id and u.raw_app_meta_data @> '{"is_synthetic":true}'::jsonb)
 ), ranks as (
  select * from(values(0,'Bronze'),(1,'Silver'),(2,'Gold'),(3,'Platinum'),(-1,'Profile unavailable'))r(rank,label)
 ), breakdown as (
  select r.rank,r.label,(select count(*) from population p where p.rank=r.rank) testers,
   count(t.id) completed,count(t.id) filter(where decision='accepted') accepted,
   count(t.id) filter(where decision='rejected') rejected,
   round(100.0*count(t.id) filter(where decision='accepted')/nullif(count(t.id) filter(where decision in('accepted','rejected')),0),1) acceptance_rate,
   round(avg(t.hours),2) average_hours,count(t.hours) duration_reports
  from ranks r left join reports t on t.rank=r.rank group by r.rank,r.label
 )
 select jsonb_build_object(
  'registered_testers',(select count(*) from population),
  'active_30_days',(select count(distinct tester_id) from reports where submitted_at>=now()-interval '30 days' and submitted_at<=now()),
  'completed',(select count(*) from reports),'pending',(select count(*) from reports where decision='pending'),
  'accepted',(select count(*) from reports where decision='accepted'),'rejected',(select count(*) from reports where decision='rejected'),
  'testing_hours',(select coalesce(sum(hours),0) from reports),'duration_reports',(select count(hours) from reports),
  'acceptance_rate',(select round(100.0*count(*) filter(where decision='accepted')/nullif(count(*) filter(where decision in('accepted','rejected')),0),1) from reports),
  'ranks',(select jsonb_agg(to_jsonb(b)||jsonb_build_object('population_percent',round(100.0*b.testers/nullif((select count(*) from population),0),1)) order by case when rank=-1 then 4 else rank end) from breakdown b)
 );
$$;
revoke all on function public.m26_tester_analytics() from public,anon,authenticated;
grant execute on function public.m26_tester_analytics() to service_role;
commit;

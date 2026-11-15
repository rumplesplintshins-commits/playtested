-- Merge 26 admin activity and genuine acquisition cohorts.
begin;
create function public.m26_admin_review_activity() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Administrator required.';end if;
 return coalesce((select jsonb_object_agg(id,activity) from (
 select g.id,coalesce(max(e.created_at) filter(where e.new_status=g.status and
  (e.previous_status is distinct from e.new_status or e.review_reason is distinct from e.previous_review_reason
   or(g.status='Pending Review' and e.kind in('submitted','resubmitted')))),g.submitted_at) activity
 from public.game_submissions g left join public.submission_review_events e on e.submission_id=g.id group by g.id
 ) t),'{}'::jsonb);
end;$$;
revoke all on function public.m26_admin_review_activity() from public,anon;
grant execute on function public.m26_admin_review_activity() to authenticated;
CREATE OR REPLACE FUNCTION public.m24_analytics_summary()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
select jsonb_build_object(
  'windows',(select jsonb_agg(jsonb_build_object('days',d,'visitors',visitors,'views',views) order by d) from (
    select d,count(distinct v.visitor_id) visitors,count(v.event_id) views from unnest(array[1,7,30]) d
    left join public.m24_page_views v on v.occurred_at>=now()-make_interval(days=>d) group by d) w),
  'trend',(select coalesce(jsonb_agg(to_jsonb(t) order by t.day),'[]'::jsonb) from (
    select day_date::date as day,count(v.event_id) views,count(distinct v.visitor_id) visitors
    from generate_series((now() at time zone 'UTC')::date-29,(now() at time zone 'UTC')::date,'1 day') as calendar(day_date)
    left join public.m24_page_views v on (v.occurred_at at time zone 'UTC')::date=day_date::date group by day_date) t),
  'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by views desc),'[]'::jsonb) from (
    select coalesce(source,referral,'direct_or_unknown') source,medium,campaign,count(*) views,count(distinct visitor_id) visitors
    from public.m24_page_views where occurred_at>=now()-interval '30 days' group by 1,2,3 order by count(*) desc limit 50) s),
  'submissions',(select coalesce(jsonb_agg(to_jsonb(s) order by submissions desc),'[]'::jsonb) from (
    select coalesce(a.source,a.referral,'unknown') source,a.campaign,a.self_reported,a.medium,a.referral,count(*) submissions,
      count(*) filter(where g.status='Approved') approved,count(distinct g.developer_id) developers
    from public.game_submissions g left join public.m24_submission_acquisition a on a.submission_id=g.id
    where g.submitted_at>=now()-interval '30 days' and not public.beta_fixture_hidden(g.id) group by 1,2,3,4,5 order by count(*) desc limit 50) s),
  'submission_totals',(select jsonb_build_object('submissions',count(*),'approved',count(*) filter(where g.status='Approved'),'developers',count(distinct g.developer_id)) from public.game_submissions g where g.submitted_at>=now()-interval '30 days' and not public.beta_fixture_hidden(g.id))
);
$function$
;
create function public.m26_testing_hidden(p_id uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public._m26_legacy_fixture_hidden(p_id) or public.m26_listing_hidden(p_id,
 not exists(select 1 from public.profiles where id=p_user and id=auth.uid() and role='admin'));
$$;
revoke all on function public.m26_testing_hidden(uuid,uuid) from public;
grant execute on function public.m26_testing_hidden(uuid,uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.campaign_eligible(p_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
   select 1 from public.community_playtests c join public.profiles p on p.id=p_user
   where not public.m26_testing_hidden(c.id,p_user) and not public.m26_testing_hidden(c.submission_id,p_user) and not public.m26_testing_hidden(c.approved_game_id,p_user) and c.id=p_id and 'tester'=any(p.roles)
     and public.tester_rank(p_user)>=c.minimum_rank
     and (not c.genre_restricted or
       array_remove(public.game_genres(c.testing_genre),'Other') && public.normalize_testing_genres(p.preferred_genres))
 );
$function$
;
CREATE OR REPLACE FUNCTION public.get_discoverable_community_test_games()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and 'tester'=any(roles)) then
  raise exception 'Tester access required.';
 end if;
 return (
  select coalesce(jsonb_agg(item order by item->>'title'),'[]'::jsonb) from (
   select to_jsonb(g)||jsonb_build_object('can_claim',true,'restriction_reason',null) item
   from public.get_available_community_test_games() g
   union all
   select jsonb_build_object(
    'submission_id',c.id,'title',c.title,
    'developer_name',coalesce(ig.developer_name,ag.developer_name,s.developer_name,'Independent developer'),
    'genre',coalesce(c.testing_genre,ig.genre,ag.genre,s.genre,'Other'),
    'description',coalesce(ig.description,ag.description,s.description,''),
    'game_link',null,'access_type',c.access_type,
    'image_url',coalesce(ig.image_url,ag.image_url,s.image_url),
    'ai_type',coalesce(s.ai_type,'AI use unknown'),'focus_areas',c.focus_areas,
    'can_claim',false,
    'restriction_reason',case when public.tester_rank(auth.uid())<c.minimum_rank
      then 'Requires '||(array['Bronze','Silver','Gold','Platinum'])[c.minimum_rank+1]||' tester rank'
      else 'Requires '||coalesce(c.testing_genre,'the selected genre')||' interest' end
   )
   from public.community_playtests c
   left join public.imported_games ig on ig.id=c.imported_game_id
   left join public.approved_games ag on ag.id=c.approved_game_id
   left join public.game_submissions s on s.id=c.submission_id
   where not public.m26_testing_hidden(c.id,auth.uid()) and not public.m26_testing_hidden(c.submission_id,auth.uid()) and not public.m26_testing_hidden(c.approved_game_id,auth.uid()) and c.status='open' and c.audience in ('both','playtested_testers')
     and not public.campaign_eligible(c.id,auth.uid())
     and not exists(select 1 from public.community_game_tests own
       where own.playtest_id=c.id and own.tester_id=auth.uid() and own.status in ('claimed','in_progress') and (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp()))
  ) discovery
 );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.notify_developer_feedback()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare campaign public.community_playtests%rowtype; v_owner uuid; v_title text; v_link uuid; v_href text;
begin
 if new.status is distinct from 'reviewed' or new.review_outcome is distinct from 'accepted' then return new; end if;
 if tg_op='UPDATE' and old.status='reviewed' and old.review_outcome='accepted' then return new; end if;
 if new.playtest_id is not null then
  select * into campaign from public.community_playtests where id=new.playtest_id;
  v_owner:=campaign.developer_id; v_title:=campaign.title;
  select l.id into v_link from public.game_developer_links l where l.developer_id=v_owner and
   ((campaign.submission_id is not null and l.submission_id=campaign.submission_id)
    or (campaign.approved_game_id is not null and l.approved_game_id=campaign.approved_game_id)
    or (campaign.imported_game_id is not null and l.imported_game_id=campaign.imported_game_id)) order by l.id limit 1;
  if v_link is not null then v_href:='/my-submissions?tab=games&game='||v_link::text;
  elsif campaign.submission_id is not null then v_href:='/my-submissions?tab=submissions&game='||campaign.submission_id::text;
  else v_href:='/my-submissions?tab=games'; end if;
 else
  select developer_id,title into v_owner,v_title from public.game_submissions where id=new.submission_id;
  v_href:='/my-submissions?tab=submissions&game='||new.submission_id::text;
 end if;
 if new.playtest_id is not null then v_href:=v_href||'&campaign='||new.playtest_id::text;end if;
 if v_owner is not null and exists(select 1 from public.profiles where id=v_owner) then
  perform public._create_notification(v_owner,'developer_feedback_received','New feedback for your game',
   left(coalesce(v_title,'Your game'),100)||' has new accepted tester feedback.',v_href,'playtest',coalesce(new.playtest_id,new.submission_id),
   'developer:feedback:'||new.id::text);
 end if;
 return new;
end $function$
;
commit;

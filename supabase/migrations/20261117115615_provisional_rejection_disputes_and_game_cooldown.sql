begin;
-- New workflow only. Historical accepted/final decisions and original report text are untouched.
create table if not exists public.playtest_feedback_appeals (
 test_id uuid primary key references public.community_game_tests(id),tester_id uuid not null,
 game_key text not null,state text not null check(state in('provisional_rejection','disputed','accepted','final_rejection')),
 rejected_at timestamptz not null,dispute_deadline timestamptz not null,rejected_by uuid not null,
 rejection_reason text not null,rejection_assessment jsonb not null,
 disputed_at timestamptz,dispute_text text,finalized_at timestamptz,cooldown_until timestamptz,
 decided_by uuid,decision_reason text,
 check(dispute_deadline=rejected_at+interval '24 hours'),
 check(disputed_at is null or(disputed_at<dispute_deadline and length(btrim(dispute_text)) between 1 and 10000)),
 check((state='final_rejection' and finalized_at is not null and cooldown_until=finalized_at+interval '24 hours') or(state<>'final_rejection' and cooldown_until is null)),
 check(state<>'disputed' or disputed_at is not null)
);
alter table public.playtest_feedback_appeals enable row level security;
revoke all on public.playtest_feedback_appeals from public,anon,authenticated;
create index if not exists feedback_appeals_due on public.playtest_feedback_appeals(dispute_deadline) where state='provisional_rejection';
create index if not exists feedback_appeals_cooldown on public.playtest_feedback_appeals(tester_id,game_key,cooldown_until) where state='final_rejection';

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in(
 'admin_new_submission','submission_needs_info','submission_approved','submission_rejected','tester_playtest_available',
 'tester_feedback_useful','developer_feedback_received','campaign_completed','admin_feedback_moderation','tester_feedback_accepted',
 'tester_feedback_provisional_rejection','tester_feedback_final_rejection','admin_feedback_dispute'));
create or replace function public._create_notification(
  p_recipient uuid,
  p_kind text,
  p_title text,
  p_message text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedupe_key text default null
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_reserved uuid;
begin
  if p_recipient is null or not exists(select 1 from public.profiles where id=p_recipient) then
    raise exception 'Notification recipient is unavailable.';
  end if;

  if p_kind is null or p_kind not in (
    'admin_new_submission',
    'submission_needs_info',
    'submission_approved',
    'tester_playtest_available',
    'tester_feedback_useful',
    'submission_rejected',
    'developer_feedback_received',
    'campaign_completed',
    'admin_feedback_moderation',
    'tester_feedback_accepted',
    'tester_feedback_provisional_rejection','tester_feedback_final_rejection','admin_feedback_dispute'
  ) then
    raise exception 'Unsupported notification type.';
  end if;

  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title)) > 120 then
    raise exception 'Notification title is invalid.';
  end if;

  if nullif(btrim(p_message),'') is null or char_length(btrim(p_message)) > 500 then
    raise exception 'Notification message is invalid.';
  end if;

  if p_href is not null and (left(p_href,1) <> '/' or left(p_href,2) = '//') then
    raise exception 'Notification destination must be an internal path.';
  end if;

  if (p_entity_type is null) <> (p_entity_id is null) then
    raise exception 'Notification entity reference is incomplete.';
  end if;

  if p_entity_type is not null and p_entity_type not in ('submission','playtest','game') then
    raise exception 'Unsupported notification entity type.';
  end if;

  if p_dedupe_key is not null then
    insert into public.notification_delivery_keys(recipient_id,dedupe_key) values(p_recipient,p_dedupe_key)
    on conflict do nothing returning recipient_id into v_reserved;
    if v_reserved is null then
      return (select id from public.notifications where recipient_id=p_recipient and dedupe_key=p_dedupe_key);
    end if;
  end if;
  insert into public.notifications(
    recipient_id,kind,title,message,href,entity_type,entity_id,dedupe_key
  ) values (
    p_recipient,p_kind,btrim(p_title),btrim(p_message),p_href,p_entity_type,p_entity_id,p_dedupe_key
  )
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null
  do nothing
  returning id into v_id;

  if v_id is null and p_dedupe_key is not null then
    select id into v_id
    from public.notifications
    where recipient_id=p_recipient and dedupe_key=p_dedupe_key;
  end if;

  return v_id;
end;
$$;


create or replace function public._feedback_campaign_game_key(p_id uuid) returns text language sql stable security definer set search_path='' as $$
 select public._m261_game_identity(coalesce(i.steam_app_id::text,a.steam_app_id::text,s.steam_app_id::text),case when c.imported_game_id is not null then 'imported' else 'submission' end,coalesce(c.imported_game_id,c.approved_game_id,c.submission_id))
 from public.community_playtests c left join public.imported_games i on i.id=c.imported_game_id
 left join public.approved_games a on a.id=c.approved_game_id left join public.game_submissions s on s.id=c.submission_id where c.id=p_id;
$$;
create or replace function public._feedback_report_game_key(p_id uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce(public._feedback_campaign_game_key(t.playtest_id),public._m261_game_identity(s.steam_app_id::text,'submission',s.id))
 from public.community_game_tests t left join public.game_submissions s on s.id=coalesce(t.submission_id,t.legacy_submission_id) where t.id=p_id;
$$;
create or replace function public._feedback_game_cooldown_until(p_tester uuid,p_game_key text) returns timestamptz language sql stable security definer set search_path='' as $$
 select max(deadline) from(
 select a.cooldown_until deadline from public.playtest_feedback_appeals a where a.tester_id=p_tester and a.state='final_rejection' and(a.game_key=p_game_key or public._feedback_report_game_key(a.test_id)=p_game_key)
 union all
 select coalesce(t.reviewed_at,t.submitted_at)+interval '24 hours' from public.community_game_tests t
 where t.tester_id=p_tester and t.status='reviewed' and t.review_outcome='rejected'
 and not exists(select 1 from public.playtest_feedback_appeals a where a.test_id=t.id)
 and public._feedback_report_game_key(t.id)=p_game_key) deadlines;
$$;
create or replace function public._feedback_report_holds_place(p_test uuid,p_status text,p_outcome text,p_expires timestamptz,p_replaced timestamptz) returns boolean
language sql volatile security definer set search_path='' as $$
 select p_replaced is null and(
 (p_status in('claimed','in_progress') and(p_expires is null or p_expires>clock_timestamp()))
 or(p_status in('submitted','reviewed') and(p_outcome is distinct from 'rejected' or exists(select 1 from public.playtest_feedback_appeals a where a.test_id=p_test and a.state in('provisional_rejection','disputed')))));
$$;
create or replace function public.campaign_places(p_id uuid) returns table(submitted integer,testing integer,available integer)
language sql volatile security definer set search_path='' as $$
 with occupied as materialized(select t.*,public._feedback_report_holds_place(t.id,t.status,t.review_outcome,t.reservation_expires_at,t.replacement_at) holds from public.community_game_tests t where t.playtest_id=p_id)
 select count(*) filter(where holds and status in('submitted','reviewed'))::integer,
 count(*) filter(where holds and status in('claimed','in_progress'))::integer,
 greatest(0,coalesce((select target_testers from public.community_playtests where id=p_id),0)-count(*) filter(where holds))::integer from occupied;
$$;
create or replace function public._validate_feedback_assessment(p_outcome text,p_reason text,p_criteria jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rubric public.feedback_quality_rubrics;scores jsonb;eligibility jsonb;eligible boolean;score integer;award integer;outcome text;
begin
 if p_outcome is null or p_outcome not in('accepted','rejected') or nullif(btrim(p_reason),'') is null then raise exception 'Choose an outcome and give a tester-visible reason.';end if;
 select * into rubric from public.feedback_quality_rubrics where active;
 if jsonb_typeof(p_criteria) is distinct from 'object' or p_criteria->>'rubric_version' is distinct from rubric.version::text then raise exception 'The feedback quality rubric changed. Refresh before saving.';end if;
 scores:=p_criteria->'scores';eligibility:=p_criteria->'eligibility';
 if jsonb_typeof(scores) is distinct from 'object' or jsonb_typeof(eligibility) is distinct from 'object' then raise exception 'Assess eligibility separately from scored criteria.';end if;
 if exists(select 1 from jsonb_object_keys(rubric.criteria) k where not(scores ? k)) or exists(select 1 from jsonb_object_keys(scores) k where not(rubric.criteria ? k)) or exists(select 1 from jsonb_each(scores)e where e.value not in('true'::jsonb,'false'::jsonb)) then raise exception 'Record each scored criterion as true or false.';end if;
 if exists(select 1 from jsonb_object_keys(rubric.eligibility) k where not(eligibility ? k)) or exists(select 1 from jsonb_object_keys(eligibility) k where not(rubric.eligibility ? k)) or exists(select 1 from jsonb_each(eligibility)e where e.value not in('true'::jsonb,'false'::jsonb)) then raise exception 'Explicitly assess both originality and relevance.';end if;
 eligible:=not exists(select 1 from jsonb_each(eligibility)e where e.value='false'::jsonb);
 outcome:=case when eligible then p_outcome else 'rejected' end;
 select case when eligible then count(*) filter(where value='true'::jsonb)*100/(select count(*) from jsonb_object_keys(rubric.criteria)) else 0 end into score from jsonb_each(scores);
 award:=case when outcome='accepted' then rubric.maximum_xp*score/100 else 0 end;
 return jsonb_build_object('outcome',outcome,'rubric_version',rubric.version,'scores',scores,'eligibility',eligibility,'score',score,'award',award);
end;$$;
create or replace function public._notify_feedback_final_rejection(p_test_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.playtest_feedback_appeals;t public.community_game_tests;
begin
 select * into a from public.playtest_feedback_appeals where test_id=p_test_id;select * into t from public.community_game_tests where id=p_test_id;
 perform public._create_notification(t.tester_id,'tester_feedback_final_rejection','Your playtest feedback was finally rejected',
 left(coalesce(a.decision_reason,a.rejection_reason),300)||' You may test other games now. Same-game cooldown ends '||to_char(a.cooldown_until at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')||' UTC.',
 '/tester#testing-activity-'||t.id,'playtest',coalesce(t.playtest_id,t.submission_id),'feedback:final-rejection:'||t.id);
end;$$;
-- Trusted scheduler helper: expiration finalises the original provisional assessment,
-- without impersonating an admin JWT, changing feedback, or awarding/reversing XP.
create or replace function public._expire_feedback_appeal(p_test_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare a public.playtest_feedback_appeals;t public.community_game_tests;
begin
 perform public._lock_feedback_review(p_test_id);
 select * into a from public.playtest_feedback_appeals where test_id=p_test_id for update;
 if not found or a.state<>'provisional_rejection' or a.dispute_deadline>clock_timestamp() then return false;end if;
 select * into t from public.community_game_tests where id=p_test_id;
 if t.status<>'submitted' or t.review_outcome<>'pending' or t.base_xp_amount<>0 or t.xp_awarded then raise exception 'Inconsistent provisional report; finalisation refused.';end if;
 update public.playtest_feedback_appeals set state='final_rejection',finalized_at=a.dispute_deadline,cooldown_until=a.dispute_deadline+interval '24 hours',decision_reason=a.rejection_reason where test_id=p_test_id;
 update public.community_game_tests set status='reviewed',review_outcome='rejected',quality_reviewed=true,review_reason=a.rejection_reason,reviewed_at=a.dispute_deadline,
 quality_rubric_version=(a.rejection_assessment->>'rubric_version')::integer,quality_criteria=a.rejection_assessment->'scores',quality_eligibility=a.rejection_assessment->'eligibility',feedback_quality_score=(a.rejection_assessment->>'score')::integer,quality_reviewer=a.rejected_by where id=p_test_id;
 insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta,rubric_version,quality_score,actual_xp_award)
 values(t.id,a.rejected_by,'rejected',a.rejection_reason,jsonb_build_object('automatic_expiry',true,'initial_rejection_at',a.rejected_at,'dispute_deadline',a.dispute_deadline,'assessment',a.rejection_assessment),0,(a.rejection_assessment->>'rubric_version')::integer,(a.rejection_assessment->>'score')::integer,0);
 perform public._notify_feedback_final_rejection(t.id);
 return true;
end;$$;
create or replace function public.process_feedback_appeal_expiry(p_limit integer default 200) returns integer language plpgsql security definer set search_path='' as $$
declare test uuid;done integer:=0;
begin
 -- Only trusted scheduler/service roles receive EXECUTE. No browser or HTTP visit is required.
 for test in select test_id from public.playtest_feedback_appeals where state='provisional_rejection' and dispute_deadline<=clock_timestamp() order by dispute_deadline,test_id limit least(greatest(p_limit,1),1000) loop
  if public._expire_feedback_appeal(test) then done:=done+1;end if;
 end loop;
 return done;
end;$$;
create or replace function public._expire_campaign_feedback_appeals(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare test uuid;begin
 for test in select a.test_id from public.playtest_feedback_appeals a join public.community_game_tests t on t.id=a.test_id where t.playtest_id=p_id and a.state='provisional_rejection' and a.dispute_deadline<=clock_timestamp() order by a.test_id loop perform public._expire_feedback_appeal(test);end loop;
end;$$;
create or replace function public.review_test_quality(p_test_id uuid,p_outcome text,p_reason text,p_criteria jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare t public.community_game_tests;a public.playtest_feedback_appeals;assessment jsonb;stamp timestamptz;admin_id uuid;v_title text;
begin
 admin_id:=auth.uid();if not exists(select 1 from public.profiles where id=admin_id and role='admin') then raise exception 'Only an admin can review tests.';end if;
 assessment:=public._validate_feedback_assessment(p_outcome,p_reason,p_criteria);
 perform public._lock_feedback_review(p_test_id);select * into t from public.community_game_tests where id=p_test_id;
 if not found or t.status not in('submitted','reviewed') then raise exception 'Only submitted reports can be reviewed.';end if;
 select * into a from public.playtest_feedback_appeals where test_id=p_test_id for update;
 if a.state='provisional_rejection' then
  if assessment->>'outcome'='rejected' and a.rejection_reason=btrim(p_reason) and a.rejection_assessment=assessment then return;end if;
  raise exception 'Provisional rejection: wait for a timely dispute or automatic expiry. The initial 24-hour deadline cannot be reset.';
 end if;
 if a.state='disputed' then
  stamp:=clock_timestamp();
  update public.playtest_feedback_appeals set state=case when assessment->>'outcome'='accepted' then 'accepted' else 'final_rejection' end,
   finalized_at=stamp,cooldown_until=case when assessment->>'outcome'='rejected' then stamp+interval '24 hours' end,decided_by=admin_id,decision_reason=btrim(p_reason) where test_id=p_test_id;
  perform public._assess_final_test_quality(p_test_id,p_outcome,p_reason,p_criteria,false,null);
  if assessment->>'outcome'='rejected' then perform public._notify_feedback_final_rejection(p_test_id);end if;
  return;
 end if;
 if t.status='reviewed' then
  perform public._assess_final_test_quality(p_test_id,p_outcome,p_reason,p_criteria,false,null);return;
 end if;
 if assessment->>'outcome'='accepted' then perform public._assess_final_test_quality(p_test_id,p_outcome,p_reason,p_criteria,false,null);return;end if;
 if t.replacement_at is not null or t.base_xp_amount<>0 or t.xp_awarded then raise exception 'Only an unawarded pending report can receive a provisional rejection.';end if;
 stamp:=clock_timestamp();
 insert into public.playtest_feedback_appeals(test_id,tester_id,game_key,state,rejected_at,dispute_deadline,rejected_by,rejection_reason,rejection_assessment)
 values(t.id,t.tester_id,public._feedback_report_game_key(t.id),'provisional_rejection',stamp,stamp+interval '24 hours',admin_id,btrim(p_reason),assessment);
 update public.community_game_tests set review_reason=btrim(p_reason) where id=t.id;
 insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta,actual_xp_award) values(t.id,admin_id,'provisional_rejection',btrim(p_reason),assessment||jsonb_build_object('dispute_deadline',stamp+interval '24 hours'),0,0);
 select coalesce(c.title,s.title,'your game') into v_title from public.community_game_tests r left join public.community_playtests c on c.id=r.playtest_id left join public.game_submissions s on s.id=coalesce(r.submission_id,c.submission_id,c.approved_game_id) where r.id=t.id;
 perform public._create_notification(t.tester_id,'tester_feedback_provisional_rejection','Your playtest feedback was provisionally rejected',
 left(coalesce(v_title,'Your game'),100)||': '||left(btrim(p_reason),220)||' Submit one written dispute within 24 hours. Your campaign place remains reserved.',
 '/tester#testing-activity-'||t.id,'playtest',coalesce(t.playtest_id,t.submission_id),'feedback:provisional-rejection:'||t.id);
end;$$;
create or replace function public.request_test_reconsideration(p_test_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.community_game_tests;a public.playtest_feedback_appeals;stamp timestamptz;admin_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to dispute your report.';end if;
 if p_reason is null or p_reason !~ '[^[:space:]]' or length(p_reason)>10000 then raise exception 'Provide additional written information or clarification (up to 10000 characters).';end if;
 perform public._lock_feedback_review(p_test_id);select * into t from public.community_game_tests where id=p_test_id;
 if not found or t.tester_id<>auth.uid() then raise exception 'Test not found or not owned.';end if;
 select * into a from public.playtest_feedback_appeals where test_id=p_test_id for update;
 if not found then raise exception 'This report has no open dispute window.';end if;
 if a.disputed_at is not null then
  if a.dispute_text=btrim(p_reason) then return;end if;
  raise exception 'Only one dispute may be submitted for this report.';
 end if;
 stamp:=clock_timestamp();if a.state<>'provisional_rejection' or stamp>=a.dispute_deadline then raise exception 'The 24-hour dispute window has closed.';end if;
 update public.playtest_feedback_appeals set state='disputed',disputed_at=stamp,dispute_text=btrim(p_reason) where test_id=p_test_id;
 insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta) values(t.id,auth.uid(),'reconsideration',btrim(p_reason),jsonb_build_object('appeal_workflow',true,'disputed_at',stamp,'dispute_deadline',a.dispute_deadline),0);
 for admin_id in select id from public.profiles where role='admin' loop
  perform public._create_notification(admin_id,'admin_feedback_dispute','Playtest feedback dispute awaiting review',
  'A tester supplied additional written information. The original campaign place remains reserved until you accept or finally reject the dispute.',
  '/admin/submissions/test-reviews#report-'||t.id,'playtest',coalesce(t.playtest_id,t.submission_id),'feedback:dispute:'||t.id||':admin:'||admin_id);
 end loop;
end;$$;
-- Keep the old report immutable and permit only one non-final-rejected attempt per campaign/tester.
drop index if exists public.community_game_tests_playtest_tester_unique;
create unique index community_game_tests_playtest_tester_unique on public.community_game_tests(playtest_id,tester_id)
 where playtest_id is not null and not(status='reviewed' and review_outcome='rejected');
create or replace function public._assert_feedback_game_retry(p_campaign uuid,p_tester uuid) returns void language plpgsql security definer set search_path='' as $$
declare until_at timestamptz;begin
 until_at:=public._feedback_game_cooldown_until(p_tester,public._feedback_campaign_game_key(p_campaign));
 if until_at>clock_timestamp() then raise exception 'Same-game cooldown: you may claim this game again after % UTC. Other games remain available.',to_char(until_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS');end if;
 if exists(select 1 from public.community_game_tests where playtest_id=p_campaign and tester_id=p_tester and status='reviewed' and review_outcome='accepted') then raise exception 'You have already completed this campaign.';end if;
end;$$;

CREATE OR REPLACE FUNCTION public.claim_community_game_test(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare existing public.community_game_tests;result uuid;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and 'tester'=any(roles)) then raise exception 'Tester sign-in required.';end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry using read committed.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||p_submission_id::text,0));
 perform public._expire_campaign_feedback_appeals(p_submission_id);
 perform public._assert_feedback_game_retry(p_submission_id,auth.uid());
 if exists(select 1 from public.community_game_tests where tester_id=auth.uid() and status in('claimed','in_progress') and (reservation_expires_at is null or reservation_expires_at>clock_timestamp())) then raise exception 'One test at a time. Submit or release your current reservation.';end if;
 select * into existing from public.community_game_tests where tester_id=auth.uid() and playtest_id=p_submission_id and not(status='reviewed' and review_outcome='rejected') order by reservation_started_at desc nulls last,id limit 1 for update;
 if not found then
  select t.* into existing from public.community_game_tests t join public.community_playtests c on c.id=p_submission_id where t.tester_id=auth.uid() and t.playtest_id is null and(t.submission_id=c.submission_id or t.submission_id=c.approved_game_id) and t.status in('claimed','in_progress') and t.reservation_expires_at<=clock_timestamp() for update of t;
 end if;
 if found then
  if existing.status not in('claimed','in_progress') or existing.reservation_expires_at is null or existing.reservation_expires_at>clock_timestamp() then raise exception 'You have already tested or claimed this playtest.';end if;
  perform set_config('playtested.reclaim_test',existing.id::text,true);
  update public.community_game_tests set status='claimed',legacy_submission_id=case when existing.playtest_id is null then existing.submission_id else existing.legacy_submission_id end,submission_id=null,playtest_id=p_submission_id where id=existing.id returning id into result;
  perform set_config('playtested.reclaim_test','',true);
 else
  insert into public.community_game_tests(playtest_id,tester_id,status) values(p_submission_id,auth.uid(),'claimed') returning id into result;
 end if;return result;end;$function$
;
CREATE OR REPLACE FUNCTION public.guard_tester_places()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare fresh boolean;checked timestamptz;legacy_conversion boolean;begin
 if TG_OP='DELETE' then return old;end if;
 if TG_OP='UPDATE' and old.status in('submitted','reviewed') then return new;end if;
 if new.status not in('claimed','in_progress','submitted') then return new;end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry using read committed.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||new.tester_id::text,0));
 if new.playtest_id is not null then perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||new.playtest_id::text,0));end if;
 checked:=clock_timestamp();fresh:=TG_OP='INSERT';
 if TG_OP='UPDATE' then
  if current_setting('playtested.reservation_activation',true)='yes' and old.reservation_expires_at is null and new.status=old.status then return new;end if;
  legacy_conversion:=old.playtest_id is null and old.submission_id is not null and new.submission_id is null and new.legacy_submission_id=old.submission_id and old.reservation_expires_at<=checked and current_setting('playtested.reclaim_test',true)=old.id::text and exists(select 1 from public.community_playtests c where c.id=new.playtest_id and(old.submission_id=c.submission_id or old.submission_id=c.approved_game_id));
  if new.tester_id<>old.tester_id or ((new.playtest_id is distinct from old.playtest_id or new.submission_id is distinct from old.submission_id or new.legacy_submission_id is distinct from old.legacy_submission_id) and not coalesce(legacy_conversion,false)) then raise exception 'Participation identity cannot change.';end if;
  if old.reservation_expires_at is not null and old.reservation_expires_at<=checked then
   if current_setting('playtested.reclaim_test',true) is distinct from new.id::text or new.status<>'claimed' then raise exception 'Reservation expired. Reclaim place before submitting; your draft is preserved.';end if;fresh:=true;
  elsif new.reservation_expires_at is distinct from old.reservation_expires_at or new.reservation_started_at is distinct from old.reservation_started_at or new.reservation_round<>old.reservation_round then raise exception 'Starting or refreshing cannot extend a reservation.';end if;
 end if;
 if fresh then
  perform public._expire_campaign_feedback_appeals(new.playtest_id);
  perform public._assert_feedback_game_retry(new.playtest_id,new.tester_id);
  if new.playtest_id is null then raise exception 'A published Tester Hub campaign is required to reclaim a place.';end if;
  if not public.campaign_eligible(new.playtest_id,new.tester_id) then raise exception 'Minimum rank or required genre match not met.';end if;
  if not exists(select 1 from public.community_playtests where id=new.playtest_id and status='open' and audience in('both','playtested_testers')) then raise exception 'Campaign is not available.';end if;
  if (select available from public.campaign_places(new.playtest_id))<=0 then raise exception 'This campaign is full: no tester places remain.';end if;
  new.reservation_started_at:=clock_timestamp();new.reservation_expires_at:=new.reservation_started_at+(select reservation_window from public.testing_policy);
  if TG_OP='UPDATE' then new.reservation_round:=old.reservation_round+1;end if;
 end if;return new;end;$function$
;
create or replace function public._feedback_appeal_view(p_test uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('appeal',coalesce((select jsonb_build_object('state',a.state,'rejected_at',a.rejected_at,'rejection_reason',a.rejection_reason,'dispute_deadline',a.dispute_deadline,'disputed_at',a.disputed_at,'dispute_text',a.dispute_text,'finalized_at',a.finalized_at,'cooldown_until',a.cooldown_until,'decision_reason',a.decision_reason) from public.playtest_feedback_appeals a where a.test_id=t.id),
 case when t.status='reviewed' and t.review_outcome='rejected' then jsonb_build_object('state','final_rejection','finalized_at',coalesce(t.reviewed_at,t.submitted_at),'cooldown_until',public._feedback_game_cooldown_until(t.tester_id,public._feedback_report_game_key(t.id))) end),
 'retry_available',t.status='reviewed' and t.review_outcome='rejected' and coalesce(public._feedback_game_cooldown_until(t.tester_id,public._feedback_report_game_key(t.id))<=clock_timestamp(),true))
 from public.community_game_tests t where t.id=p_test;
$$;
CREATE OR REPLACE FUNCTION public.get_my_test_reservations()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$select jsonb_build_object('server_now',clock_timestamp(),'claims',coalesce((select jsonb_agg(to_jsonb(t)||public._feedback_appeal_view(t.id)||jsonb_build_object('game_title',coalesce(c.title,s.title),'reclaim_campaign_id',coalesce(t.playtest_id,(select candidate.id from public.community_playtests candidate where(candidate.submission_id=t.submission_id or candidate.approved_game_id=t.submission_id) and candidate.status='open' and candidate.audience in('both','playtested_testers') and public.campaign_eligible(candidate.id,auth.uid()) order by candidate.created_at desc limit 1)))) from public.community_game_tests t left join public.community_playtests c on c.id=t.playtest_id left join public.game_submissions s on s.id=t.submission_id where t.tester_id=auth.uid()),'[]'::jsonb)) where auth.uid() is not null;$function$
;
CREATE OR REPLACE FUNCTION public.get_quality_review_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('report',to_jsonb(t)||public._feedback_appeal_view(t.id),'context',
   coalesce((select jsonb_build_object('title',c.title,'build',c.release_label,'instructions',c.instructions,'focus_areas',c.focus_areas)
     from public.community_playtests c where c.id=t.playtest_id),
     (select jsonb_build_object('title',s.title,'build','Legacy submission','instructions',s.description,'focus_areas','[]'::jsonb)
     from public.game_submissions s where s.id=t.submission_id)),
   'events',
   (select jsonb_agg(to_jsonb(e) order by e.id) from public.test_review_events e where e.test_id=t.id),
   'developer_signals',(select jsonb_agg(to_jsonb(s)) from public.developer_feedback_signals s where s.test_id=t.id)) order by t.submitted_at),'[]')
   from public.community_game_tests t where t.status in ('submitted','reviewed'));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_available_community_test_games()
 RETURNS TABLE(submission_id uuid, title text, developer_name text, genre text, description text, game_link text, access_type text, image_url text, price text, ai_type text, focus_areas text[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$;
-- Legacy submissions: direct game access first, then Steam.
  SELECT s.id, s.title, s.developer_name, s.genre, s.description,
         access.link,
         CASE WHEN access.link ~* '^https?://store[.]steampowered[.]com(/|$)'
              THEN 'steam_game' ELSE 'other' END::text,
         s.image_url, s.price, s.ai_type, ARRAY[]::text[]
  FROM public.game_submissions s
  CROSS JOIN LATERAL (
    SELECT coalesce(
      CASE WHEN btrim(s.game_link) ~* '^https?://[^[:space:]]+$'
           THEN btrim(s.game_link) END,
      CASE WHEN btrim(s.steam_url) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(s.steam_url) END,
      CASE WHEN btrim(s.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(s.steam_app_id) || '/' END
    ) AS link
  ) access
  WHERE EXISTS (
    SELECT 1 FROM public.community_game_tests own
    WHERE own.submission_id=s.id AND own.tester_id=auth.uid()
      AND own.status IN ('claimed','in_progress') AND (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp())
  )

  UNION ALL

  -- Campaigns: keep the campaign's build link ahead of Store fallbacks.
  -- A Store link doesn't guarantee ownership or a free demo.
  SELECT p.id, p.title,
         coalesce(ig.developer_name, ag.developer_name, s.developer_name,
                  'Independent developer'),
         coalesce(p.testing_genre, ig.genre, ag.genre, s.genre, 'Other'),
         p.instructions,
         access.link,
         CASE WHEN access.link ~* '^https?://store[.]steampowered[.]com(/|$)'
              THEN CASE WHEN p.access_type = 'steam_demo'
                        THEN 'steam_demo' ELSE 'steam_game' END
              ELSE coalesce(p.access_type, 'other') END::text,
         coalesce(ig.image_url, ag.image_url, s.image_url),
         coalesce(ig.price, ag.price, s.price, 'Unknown'),
         coalesce(s.ai_type, 'AI use unknown'),
         coalesce(p.focus_areas, ARRAY[]::text[])
  FROM public.community_playtests p
  LEFT JOIN public.imported_games ig ON ig.id = p.imported_game_id
  LEFT JOIN public.approved_games ag ON ag.id = p.approved_game_id
  LEFT JOIN public.game_submissions s ON s.id = p.submission_id
  CROSS JOIN LATERAL (
    SELECT coalesce(
      CASE WHEN btrim(p.access_link) ~* '^https?://[^[:space:]]+$'
           THEN btrim(p.access_link) END,
      CASE WHEN btrim(ig.steam_url) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(ig.steam_url) END,
      CASE WHEN btrim(s.steam_url) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(s.steam_url) END,
      CASE WHEN btrim(ag.game_link) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(ag.game_link) END,
      CASE WHEN btrim(s.game_link) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(s.game_link) END,
      CASE WHEN btrim(ig.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(ig.steam_app_id) || '/' END,
      CASE WHEN btrim(ag.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(ag.steam_app_id) || '/' END,
      CASE WHEN btrim(s.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(s.steam_app_id) || '/' END
    ) AS link
  ) access
  WHERE (p.status = 'open' AND p.audience IN ('playtested_testers', 'both') AND public.campaign_eligible(p.id,auth.uid()) AND (select available from public.campaign_places(p.id))>0 AND coalesce(public._feedback_game_cooldown_until(auth.uid(),public._feedback_campaign_game_key(p.id))<=clock_timestamp(),true) AND NOT EXISTS(select 1 from public.community_game_tests own where own.playtest_id=p.id and own.tester_id=auth.uid() and own.status in('submitted','reviewed') and own.review_outcome<>'rejected'))
    OR EXISTS (SELECT 1 FROM public.community_game_tests own WHERE own.playtest_id=p.id AND own.tester_id=auth.uid() AND own.status IN ('claimed','in_progress') AND (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp()))
  ORDER BY title;
$function$;
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
     and (select available from public.campaign_places(c.id))>0
     and coalesce(public._feedback_game_cooldown_until(auth.uid(),public._feedback_campaign_game_key(c.id))<=clock_timestamp(),true)
     and not exists(select 1 from public.community_game_tests done where done.playtest_id=c.id and done.tester_id=auth.uid() and done.status in('submitted','reviewed') and done.review_outcome<>'rejected')
     and not public.campaign_eligible(c.id,auth.uid())
     and not exists(select 1 from public.community_game_tests own
       where own.playtest_id=c.id and own.tester_id=auth.uid() and own.status in ('claimed','in_progress') and (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp()))
  ) discovery
 );
end;
$function$;
CREATE OR REPLACE FUNCTION public.get_campaign_testing_details(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
select jsonb_build_object('minimum_rank',c.minimum_rank,'testing_genre',c.testing_genre,'genre_restricted',c.genre_restricted,'build_locked',exists(select 1 from public.campaign_build_locks where playtest_id=c.id),'capacity',c.target_testers,'accepted',(select count(*)::int from public.community_game_tests tt where tt.playtest_id=c.id and tt.replacement_at is null and tt.status='reviewed' and tt.review_outcome='accepted'),'completed_at',c.completed_at,'pending',greatest(0,p.submitted-(select count(*)::integer from public.community_game_tests t where t.playtest_id=c.id and t.replacement_at is null and t.status='reviewed' and t.review_outcome='accepted')),'awaiting_tester',(select count(*)::integer from public.community_game_tests t join public.playtest_feedback_appeals a on a.test_id=t.id where t.playtest_id=c.id and a.state='provisional_rejection'),'disputes',(select count(*)::integer from public.community_game_tests t join public.playtest_feedback_appeals a on a.test_id=t.id where t.playtest_id=c.id and a.state='disputed'),'awaiting_admin',(select count(*)::integer from public.community_game_tests t left join public.playtest_feedback_appeals a on a.test_id=t.id where t.playtest_id=c.id and t.status='submitted' and t.replacement_at is null and(a.state is null or a.state='disputed')),'rejected',(select count(*)::integer from public.community_game_tests t where t.playtest_id=c.id and t.status='reviewed' and t.review_outcome='rejected'),'submitted',p.submitted,'testing',p.testing,'available',p.available,'server_now',clock_timestamp(),'reservation_hours',extract(epoch from (select reservation_window from public.testing_policy))/3600)
from public.community_playtests c cross join lateral public.campaign_places(c.id)p
where c.id=p_id and (c.developer_id=auth.uid() or(c.status='open' and c.audience in('both','playtested_testers') and public.campaign_eligible(c.id,auth.uid())) or exists(select 1 from public.community_game_tests where playtest_id=c.id and tester_id=auth.uid()));$function$;

CREATE OR REPLACE FUNCTION public.get_developer_playtested_test_progress(p_playtest_id uuid)
 RETURNS TABLE(total_testers bigint, claimed_count bigint, in_progress_count bigint, submitted_count bigint, accepted_count bigint, rejected_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if auth.uid() is null or not exists(select 1 from public.community_playtests where id=p_playtest_id and developer_id=auth.uid()) then raise exception 'Developer access required.';end if;
 return query with measured as materialized(select clock_timestamp() checked)
 select count(*) filter(where t.replacement_at is null and public._feedback_report_holds_place(t.id,t.status,t.review_outcome,t.reservation_expires_at,t.replacement_at)),
 count(*) filter(where t.replacement_at is null and t.status='claimed' and(t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))),
 count(*) filter(where t.replacement_at is null and t.status='in_progress' and(t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))),
 count(*) filter(where t.replacement_at is null and t.status='submitted' and t.review_outcome='pending'),
 count(*) filter(where t.replacement_at is null and t.status='reviewed' and t.review_outcome='accepted'),
 count(*) filter(where t.status='reviewed' and t.review_outcome='rejected')
 from public.community_game_tests t where t.playtest_id=p_playtest_id;
end;$function$
;
create or replace function public.notify_feedback_reconsideration() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_admin uuid;v_playtest_id uuid;
begin
 if new.kind<>'reconsideration' or coalesce((new.criteria->>'appeal_workflow')::boolean,false) then return new; end if;
 select playtest_id into v_playtest_id from public.community_game_tests where id=new.test_id;
 for v_admin in select id from public.profiles where role='admin' loop
  perform public._create_notification(v_admin,'admin_feedback_moderation','Reconsideration requested',
   'A tester has asked for a second look at earlier feedback moderation.',
   '/admin/submissions',
   case when v_playtest_id is not null then 'playtest' end,
   v_playtest_id,
   'feedback:moderation:'||new.test_id::text||':recon:'||new.id::text||':admin:'||v_admin::text);
 end loop;
 return new;
end;$$;
create or replace function public.admin_correct_test_quality(p_test_id uuid,p_outcome text,p_reason text,p_criteria jsonb,p_audit_reason text) returns void language plpgsql security definer set search_path='' as $$
declare a public.playtest_feedback_appeals;t public.community_game_tests;assessment jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Only an admin can correct feedback.';end if;
 if char_length(btrim(coalesce(p_audit_reason,'')))<12 then raise exception 'Provide an exceptional correction audit reason of at least 12 characters.';end if;
 perform public._lock_feedback_review(p_test_id);select * into t from public.community_game_tests where id=p_test_id;select * into a from public.playtest_feedback_appeals where test_id=p_test_id for update;
 if a.state in('provisional_rejection','disputed') then raise exception 'Use the normal dispute workflow; a correction cannot bypass the protected dispute window.';end if;
 assessment:=public._validate_feedback_assessment(p_outcome,p_reason,p_criteria);
 if t.review_outcome='accepted' and assessment->>'outcome'='rejected' then raise exception 'An accepted report cannot be demoted through a correction that bypasses a first-rejection dispute window.';end if;
 perform public._assess_final_test_quality(p_test_id,p_outcome,p_reason,p_criteria,true,p_audit_reason);
 if a.test_id is not null and assessment->>'outcome'='accepted' then update public.playtest_feedback_appeals set state='accepted',cooldown_until=null,decided_by=auth.uid(),decision_reason=btrim(p_reason) where test_id=p_test_id;end if;
end;$$;
-- A moderator-replacement shortcut must not bypass a new rejection's protected place.
create or replace function public.replace_unusable_test(p_test_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 if exists(select 1 from public.community_game_tests where id=p_test_id and replacement_at is not null) then return;end if;
 raise exception 'Use provisional rejection and the dispute workflow. A pending report cannot release its place through replacement.';
end;$$;

CREATE OR REPLACE FUNCTION public.campaign_eligible(p_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
   select 1 from public.community_playtests c join public.profiles p on p.id=p_user
   where not public.m26_testing_hidden(c.id,p_user) and not public.m26_testing_hidden(c.submission_id,p_user) and not public.m26_testing_hidden(c.approved_game_id,p_user) and c.id=p_id and 'tester'=any(p.roles)
     and coalesce(public._feedback_game_cooldown_until(p_user,public._feedback_campaign_game_key(p_id))<=clock_timestamp(),true)
     and public.tester_rank(p_user)>=c.minimum_rank
     and (not c.genre_restricted or
       array_remove(public.game_genres(c.testing_genre),'Other') && public.normalize_testing_genres(p.preferred_genres))
 );
$function$
;
CREATE OR REPLACE FUNCTION public._m26_refresh_availability(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare available_now boolean;state public.campaign_availability_state;w record;game_title text;sent integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||p_id,0));
 if not exists(select 1 from public.community_playtests where id=p_id) then return 0;end if;
 available_now:=public._m26_campaign_open(p_id) and(select available>0 from public.campaign_places(p_id));
 insert into public.campaign_availability_state(playtest_id,is_available,epoch) values(p_id,available_now,case when available_now then 1 else 0 end)
 on conflict(playtest_id) do update set is_available=excluded.is_available,
  epoch=campaign_availability_state.epoch+case when not campaign_availability_state.is_available and excluded.is_available then 1 else 0 end
 returning * into state;
 if not available_now then return 0;end if;
 select left(title,100) into game_title from public.community_playtests where id=p_id;
 for w in select p.tester_id from public.tester_availability_preferences p
  where p.playtest_id=p_id and p.expires_at>clock_timestamp() and p.last_notified_epoch<state.epoch
   and exists(select 1 from public.profiles where id=p.tester_id and 'tester'=any(roles))
   and public.campaign_eligible(p_id,p.tester_id)
   and not exists(select 1 from public.community_game_tests t where t.tester_id=p.tester_id and
    ((t.status in('claimed','in_progress') and(t.reservation_expires_at is null or t.reservation_expires_at>clock_timestamp()))
     or(t.playtest_id=p_id and t.status in('submitted','reviewed') and t.review_outcome<>'rejected')))
  order by p.tester_id
 loop
  perform public._create_notification(w.tester_id,'tester_playtest_available','Testing place available',
   'A place has opened for '||coalesce(game_title,'a game')||'. First come, first served; this alert does not reserve a place.',
   '/tester?campaign='||p_id,'playtest',p_id,'tester:availability:'||p_id||':'||state.epoch);
  update public.tester_availability_preferences set last_notified_epoch=state.epoch where tester_id=w.tester_id and playtest_id=p_id;
  sent:=sent+1;
 end loop;
 return sent;
end;$function$
;
CREATE OR REPLACE FUNCTION public.set_tester_availability_preference(p_id uuid, p_enabled boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if p_enabled is null then raise exception 'An explicit availability choice is required.';end if;
 if auth.uid() is null then raise exception 'Tester sign-in required.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||auth.uid(),0));
 perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||p_id,0));
 if not p_enabled then delete from public.tester_availability_preferences where tester_id=auth.uid() and playtest_id=p_id;return false;end if;
 perform public._assert_feedback_game_retry(p_id,auth.uid());
 if not public._m26_campaign_open(p_id) or not public.campaign_eligible(p_id,auth.uid()) then raise exception 'This campaign is not available to you.';end if;
 if exists(select 1 from public.community_game_tests t where t.tester_id=auth.uid() and
  ((t.status in('claimed','in_progress') and(t.reservation_expires_at is null or t.reservation_expires_at>clock_timestamp()))
   or(t.playtest_id=p_id and t.status in('submitted','reviewed') and t.review_outcome<>'rejected'))) then raise exception 'An active reservation or completed report prevents this availability request.';end if;
 if(select available from public.campaign_places(p_id))>0 then raise exception 'A place is already available. Refresh and claim it directly.';end if;
 insert into public.campaign_availability_state(playtest_id,is_available) values(p_id,false)
  on conflict(playtest_id) do update set is_available=false;
 insert into public.tester_availability_preferences(tester_id,playtest_id) values(auth.uid(),p_id)
  on conflict(tester_id,playtest_id) do nothing;
 return true;
end;$function$;
revoke insert,update,delete on public.community_game_tests from anon,authenticated;
-- Private helpers can only be reached through authorised RPCs or the trusted scheduler.
do $$declare f regprocedure;begin for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in(
 '_feedback_campaign_game_key','_feedback_report_game_key','_feedback_game_cooldown_until','_feedback_report_holds_place','_validate_feedback_assessment','_notify_feedback_final_rejection','_expire_feedback_appeal','_expire_campaign_feedback_appeals','_assert_feedback_game_retry','_feedback_appeal_view','process_feedback_appeal_expiry') loop execute format('revoke all on function %s from public,anon,authenticated',f);end loop;end;$$;
grant execute on function public.process_feedback_appeal_expiry(integer) to service_role;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('playtested-feedback-appeals-expiry','* * * * *','select public.process_feedback_appeal_expiry();');
notify pgrst,'reload schema';
commit;

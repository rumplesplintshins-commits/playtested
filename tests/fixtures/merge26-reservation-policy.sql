create table public.testing_policy(places integer,reservation_window interval);insert into testing_policy values(1,interval '72 hours');alter table community_game_tests alter column id set default gen_random_uuid();
CREATE OR REPLACE FUNCTION public.campaign_places(p_id uuid)
 RETURNS TABLE(submitted integer, testing integer, available integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with measured as materialized(select clock_timestamp() checked)
select count(*) filter(where t.status in('submitted','reviewed'))::integer,count(*) filter(where t.status in('claimed','in_progress') and (t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured)))::integer,
 greatest(0,coalesce((select target_testers from public.community_playtests where id=p_id),0)-count(*) filter(where t.status in('submitted','reviewed') or (t.status in('claimed','in_progress') and (t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))))::integer)
 from public.community_game_tests t where t.playtest_id=p_id and t.replacement_at is null;
$function$
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
  if new.playtest_id is null then raise exception 'A published Tester Hub campaign is required to reclaim a place.';end if;
  if not public.campaign_eligible(new.playtest_id,new.tester_id) then raise exception 'Minimum rank or required genre match not met.';end if;
  if not exists(select 1 from public.community_playtests where id=new.playtest_id and status='open' and audience in('both','playtested_testers')) then raise exception 'Campaign is not available.';end if;
  if (select available from public.campaign_places(new.playtest_id))<=0 then raise exception 'This campaign is full: no tester places remain.';end if;
  new.reservation_started_at:=clock_timestamp();new.reservation_expires_at:=new.reservation_started_at+(select reservation_window from public.testing_policy);
  if TG_OP='UPDATE' then new.reservation_round:=old.reservation_round+1;end if;
 end if;return new;end;$function$
;
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
 if exists(select 1 from public.community_game_tests where tester_id=auth.uid() and status in('claimed','in_progress') and (reservation_expires_at is null or reservation_expires_at>clock_timestamp())) then raise exception 'One test at a time. Submit or release your current reservation.';end if;
 select * into existing from public.community_game_tests where tester_id=auth.uid() and playtest_id=p_submission_id for update;
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
CREATE OR REPLACE FUNCTION public._lock_test_reservation(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare t public.community_game_tests;begin
 select * into t from public.community_game_tests where id=p_id and tester_id=auth.uid();if not found then raise exception 'Test not found or not owned.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||t.tester_id::text,0));
 if t.playtest_id is not null then perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||t.playtest_id::text,0));end if;
 select * into t from public.community_game_tests where id=p_id and tester_id=auth.uid() for update;
 if not found then raise exception 'Test not found or not owned.';end if;
 if t.status not in('claimed','in_progress') then raise exception 'Only an active reservation can be used.';end if;
 if t.reservation_expires_at<=clock_timestamp() then raise exception 'Reservation expired. Reclaim place before submitting; your draft is preserved.';end if;
end;$function$
;
CREATE OR REPLACE FUNCTION public.release_community_game_test(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare target uuid;begin
 select id into target from public.community_game_tests where tester_id=auth.uid() and (playtest_id=p_submission_id or submission_id=p_submission_id) and status in('claimed','in_progress');
 perform public._lock_test_reservation(target);delete from public.community_game_tests where id=target and tester_id=auth.uid();end;$function$
;
create trigger aa_testing_reservation before insert or update on community_game_tests for each row execute function guard_tester_places();

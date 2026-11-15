begin;
alter table public.testing_policy drop constraint testing_policy_places_check;
alter table public.testing_policy alter column places set default 4;
update public.testing_policy set places=4;
alter table public.testing_policy add constraint testing_policy_places_check check(places=4);
alter table public.testing_policy add column reservation_window interval not null default interval '72 hours' check(reservation_window=interval '72 hours'), add column reservations_activated_at timestamptz;
alter table public.community_game_tests add column legacy_submission_id uuid, add column reservation_started_at timestamptz, add column reservation_expires_at timestamptz, add column reservation_round integer not null default 1;
alter table public.community_playtests alter column target_testers set default 4;
-- Existing capacities and claims are deliberately NOT backfilled here.
create or replace function public.fix_free_target() returns trigger language plpgsql security definer set search_path='' as $$begin
 new.target_testers:=case when TG_OP='INSERT' then (select places from public.testing_policy) else old.target_testers end;
 new.testing_genre:=coalesce(nullif(btrim(new.testing_genre),''),(select genre from public.imported_games where id=new.imported_game_id),(select genre from public.approved_games where id=new.approved_game_id),(select genre from public.game_submissions where id=new.submission_id),'Other');return new;end;$$;
create or replace function public.campaign_places(p_id uuid) returns table(submitted integer,testing integer,available integer)
language sql volatile security definer set search_path='' as $$
 with measured as materialized(select clock_timestamp() checked)
select count(*) filter(where t.status in('submitted','reviewed'))::integer,count(*) filter(where t.status in('claimed','in_progress') and (t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured)))::integer,
 greatest(0,coalesce((select target_testers from public.community_playtests where id=p_id),0)-count(*) filter(where t.status in('submitted','reviewed') or (t.status in('claimed','in_progress') and (t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))))::integer)
 from public.community_game_tests t where t.playtest_id=p_id and t.replacement_at is null;
$$;
create or replace function public._playtested_limit_active_tests() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status not in('claimed','in_progress') then return new;end if;
 if TG_OP='UPDATE' and new.tester_id=old.tester_id and old.status in('claimed','in_progress') and (old.reservation_expires_at is null or old.reservation_expires_at>clock_timestamp()) then return new;end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry using read committed.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||new.tester_id::text,0));
 if exists(select 1 from public.community_game_tests t where t.tester_id=new.tester_id and t.id<>new.id and t.status in('claimed','in_progress') and (t.reservation_expires_at is null or t.reservation_expires_at>clock_timestamp())) then raise exception 'One test at a time. Submit or release your current reservation.';end if;return new;end;$$;
create or replace function public.guard_tester_places() returns trigger language plpgsql security definer set search_path='' as $$declare fresh boolean;checked timestamptz;legacy_conversion boolean;begin
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
 end if;return new;end;$$;
drop trigger testing_capacity on public.community_game_tests;
create trigger aa_testing_reservation before insert or update on public.community_game_tests for each row execute function public.guard_tester_places();
create or replace function public.claim_community_game_test(p_submission_id uuid) returns uuid language plpgsql security definer set search_path='' as $$declare existing public.community_game_tests;result uuid;begin
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
 end if;return result;end;$$;
-- Lock order before the existing RPCs lock a row: tester -> capacity -> participation.
create function public._lock_test_reservation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$declare t public.community_game_tests;begin
 select * into t from public.community_game_tests where id=p_id and tester_id=auth.uid();if not found then raise exception 'Test not found or not owned.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||t.tester_id::text,0));
 if t.playtest_id is not null then perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||t.playtest_id::text,0));end if;
 select * into t from public.community_game_tests where id=p_id and tester_id=auth.uid() for update;
 if not found then raise exception 'Test not found or not owned.';end if;
 if t.status not in('claimed','in_progress') then raise exception 'Only an active reservation can be used.';end if;
 if t.reservation_expires_at<=clock_timestamp() then raise exception 'Reservation expired. Reclaim place before submitting; your draft is preserved.';end if;
end;$$;
alter function public.start_community_game_test(uuid) rename to _start_reserved_test;
create function public.start_community_game_test(p_test_id uuid) returns void language plpgsql security definer set search_path='' as $$begin perform public._lock_test_reservation(p_test_id);perform public._start_reserved_test(p_test_id);end;$$;
alter function public.submit_community_game_test(uuid,integer,integer,text,text,numeric) rename to _submit_reserved_test;
alter function public.submit_community_game_test(uuid,integer,integer,text,text,numeric,integer,text,text,text,text,text,jsonb) rename to _submit_reserved_test;
create function public.submit_community_game_test(p_test_id uuid,p_gameplay_score integer,p_performance_score integer,p_bugs_found text,p_feedback text,p_hours_played numeric) returns void language plpgsql security definer set search_path='' as $$begin perform public._lock_test_reservation(p_test_id);perform public._submit_reserved_test(p_test_id,p_gameplay_score,p_performance_score,p_bugs_found,p_feedback,p_hours_played);end;$$;
create function public.submit_community_game_test(p_test_id uuid,p_gameplay_score integer,p_performance_score integer,p_bugs_found text,p_feedback text,p_hours_played numeric,p_overall_score integer,p_continue_playing text,p_recommend_game text,p_enjoyed_most text,p_frustrations text,p_biggest_improvement text,p_focus_responses jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$begin perform public._lock_test_reservation(p_test_id);perform public._submit_reserved_test(p_test_id,p_gameplay_score,p_performance_score,p_bugs_found,p_feedback,p_hours_played,p_overall_score,p_continue_playing,p_recommend_game,p_enjoyed_most,p_frustrations,p_biggest_improvement,p_focus_responses);end;$$;
create or replace function public.release_community_game_test(p_submission_id uuid) returns void language plpgsql security definer set search_path='' as $$declare target uuid;begin
 select id into target from public.community_game_tests where tester_id=auth.uid() and (playtest_id=p_submission_id or submission_id=p_submission_id) and status in('claimed','in_progress');
 perform public._lock_test_reservation(target);delete from public.community_game_tests where id=target and tester_id=auth.uid();end;$$;
-- Separate explicit activation; idempotent retries must never restart historical clocks.
create function public.activate_testing_reservations() returns timestamptz language plpgsql security definer set search_path='' as $$declare activated timestamptz;begin
 select reservations_activated_at into activated from public.testing_policy for update;if activated is not null then return activated;end if;
 activated:=clock_timestamp();update public.testing_policy set reservations_activated_at=activated;
 perform set_config('playtested.reservation_activation','yes',true);
 update public.community_game_tests set reservation_started_at=activated,reservation_expires_at=activated+(select reservation_window from public.testing_policy) where status in('claimed','in_progress') and reservation_expires_at is null;
 perform set_config('playtested.reservation_activation','',true);return activated;end;$$;
create function public.get_testing_capacity_policy() returns jsonb language sql volatile security definer set search_path='' as $$select jsonb_build_object('places',places,'reservation_hours',extract(epoch from reservation_window)/3600,'server_now',clock_timestamp(),'activated_at',reservations_activated_at) from public.testing_policy where auth.uid() is not null;$$;
create function public.get_my_test_reservations() returns jsonb language sql volatile security definer set search_path='' as $$select jsonb_build_object('server_now',clock_timestamp(),'claims',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('game_title',coalesce(c.title,s.title),'reclaim_campaign_id',coalesce(t.playtest_id,(select candidate.id from public.community_playtests candidate where(candidate.submission_id=t.submission_id or candidate.approved_game_id=t.submission_id) and candidate.status='open' and candidate.audience in('both','playtested_testers') and public.campaign_eligible(candidate.id,auth.uid()) order by candidate.created_at desc limit 1)))) from public.community_game_tests t left join public.community_playtests c on c.id=t.playtest_id left join public.game_submissions s on s.id=t.submission_id where t.tester_id=auth.uid()),'[]'::jsonb)) where auth.uid() is not null;$$;
create or replace function public.get_campaign_testing_details(p_id uuid) returns jsonb language sql volatile security definer set search_path='' as $$select jsonb_build_object('minimum_rank',c.minimum_rank,'testing_genre',c.testing_genre,'genre_restricted',c.genre_restricted,'build_locked',exists(select 1 from public.campaign_build_locks where playtest_id=c.id),'capacity',c.target_testers,'submitted',p.submitted,'testing',p.testing,'available',p.available,'server_now',clock_timestamp(),'reservation_hours',extract(epoch from (select reservation_window from public.testing_policy))/3600) from public.community_playtests c cross join lateral public.campaign_places(c.id)p where c.id=p_id and (c.developer_id=auth.uid() or(c.status='open' and c.audience in('both','playtested_testers') and public.campaign_eligible(c.id,auth.uid())) or exists(select 1 from public.community_game_tests where playtest_id=c.id and tester_id=auth.uid()));$$;
-- Expired reservations no longer qualify for private access through the own-claim exception.
-- Preserve the existing access-resolution and eligibility bodies; fail closed if their known predicate changes.
do $migration$declare source text;needle text;begin
 needle:='own.status IN (''claimed'',''in_progress'')';
 source:=pg_get_functiondef('public.get_available_community_test_games()'::regprocedure);
 if position(needle in source)=0 then raise exception 'Unexpected discovery definition: review reservation access predicate';end if;
 source:=replace(source,needle,needle||' AND (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp())');execute source;
 source:=pg_get_functiondef('public.get_discoverable_community_test_games()'::regprocedure);
 needle:='own.status in (''claimed'',''in_progress'')';
 if position(needle in source)=0 then raise exception 'Unexpected restricted-discovery definition';end if;
 source:=replace(source,needle,needle||' and (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp())');execute source;
end;$migration$;
do $$declare f regprocedure;begin for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in('_lock_test_reservation','_start_reserved_test','_submit_reserved_test','activate_testing_reservations','get_testing_capacity_policy','get_my_test_reservations','start_community_game_test','submit_community_game_test') loop execute format('revoke all on function %s from public,anon,authenticated',f);end loop;end;$$;
grant execute on function public.activate_testing_reservations() to service_role;
grant execute on function public.get_testing_capacity_policy(),public.get_my_test_reservations(),public.start_community_game_test(uuid),public.submit_community_game_test(uuid,integer,integer,text,text,numeric),public.submit_community_game_test(uuid,integer,integer,text,text,numeric,integer,text,text,text,text,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;

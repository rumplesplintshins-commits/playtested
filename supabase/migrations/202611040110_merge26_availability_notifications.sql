-- Availability is advisory. Existing reservation locks/guards remain authoritative.
begin;
create table public.tester_availability_preferences(
 tester_id uuid not null references auth.users(id) on delete cascade,
 playtest_id uuid not null references public.community_playtests(id) on delete cascade,
 requested_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '30 days'),
 last_notified_epoch bigint not null default 0,
 primary key(tester_id,playtest_id)
);
create index tester_availability_campaign on public.tester_availability_preferences(playtest_id,expires_at);
alter table public.tester_availability_preferences enable row level security;
revoke all on public.tester_availability_preferences from public,anon,authenticated;
grant select on public.tester_availability_preferences to authenticated;
grant all on public.tester_availability_preferences to service_role;
create policy availability_own_read on public.tester_availability_preferences for select to authenticated using(tester_id=auth.uid());
create table public.campaign_availability_state(
 playtest_id uuid primary key references public.community_playtests(id) on delete cascade,
 is_available boolean not null,epoch bigint not null default 0
);
alter table public.campaign_availability_state enable row level security;
revoke all on public.campaign_availability_state from public,anon,authenticated;
grant all on public.campaign_availability_state to service_role;

create function public._m26_campaign_open(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_playtests c where c.id=p_id and c.status='open'
  and c.audience in('both','playtested_testers') and nullif(btrim(c.access_link),'') is not null
  and not public.beta_fixture_hidden(c.id) and not public.beta_fixture_hidden(c.submission_id)
  and not public.beta_fixture_hidden(c.approved_game_id) and not public.beta_fixture_hidden(c.imported_game_id));
$$;
revoke all on function public._m26_campaign_open(uuid) from public,anon,authenticated;

create function public.set_tester_availability_preference(p_id uuid,p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Tester sign-in required.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:tester:'||auth.uid(),0));
 perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||p_id,0));
 if not p_enabled then delete from public.tester_availability_preferences where tester_id=auth.uid() and playtest_id=p_id;return false;end if;
 if not public._m26_campaign_open(p_id) or not public.campaign_eligible(p_id,auth.uid()) then raise exception 'This campaign is not available to you.';end if;
 if exists(select 1 from public.community_game_tests t where t.tester_id=auth.uid() and
  ((t.status in('claimed','in_progress') and(t.reservation_expires_at is null or t.reservation_expires_at>clock_timestamp()))
   or(t.playtest_id=p_id and t.status in('submitted','reviewed')))) then raise exception 'An active reservation or completed report prevents this availability request.';end if;
 if(select available from public.campaign_places(p_id))>0 then raise exception 'A place is already available. Refresh and claim it directly.';end if;
 insert into public.campaign_availability_state(playtest_id,is_available) values(p_id,false)
  on conflict(playtest_id) do update set is_available=false;
 insert into public.tester_availability_preferences(tester_id,playtest_id) values(auth.uid(),p_id)
  on conflict(tester_id,playtest_id) do nothing;
 return true;
end;$$;
revoke all on function public.set_tester_availability_preference(uuid,boolean) from public,anon;
grant execute on function public.set_tester_availability_preference(uuid,boolean) to authenticated;

create function public._m26_refresh_availability(p_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
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
     or(t.playtest_id=p_id and t.status in('submitted','reviewed'))))
  order by p.tester_id
 loop
  perform public._create_notification(w.tester_id,'tester_playtest_available','Testing place available',
   'A place has opened for '||coalesce(game_title,'a game')||'. First come, first served; this alert does not reserve a place.',
   '/tester?campaign='||p_id,'playtest',p_id,'tester:availability:'||p_id||':'||state.epoch);
  update public.tester_availability_preferences set last_notified_epoch=state.epoch where tester_id=w.tester_id and playtest_id=p_id;
  sent:=sent+1;
 end loop;
 return sent;
end;$$;
revoke all on function public._m26_refresh_availability(uuid) from public,anon,authenticated;

create function public._m26_reservation_availability_event() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if tg_op<>'DELETE' then
  if new.playtest_id is not null and new.status in('claimed','in_progress') and(new.reservation_expires_at is null or new.reservation_expires_at>clock_timestamp()) then
   delete from public.tester_availability_preferences where tester_id=new.tester_id and playtest_id=new.playtest_id;
  end if;
  if new.playtest_id is not null then perform public._m26_refresh_availability(new.playtest_id);end if;
 end if;
 if tg_op='DELETE' or(tg_op='UPDATE' and old.playtest_id is distinct from new.playtest_id) then
  if old.playtest_id is not null then perform public._m26_refresh_availability(old.playtest_id);end if;
 end if;
 return null;
end;$$;
revoke all on function public._m26_reservation_availability_event() from public,anon,authenticated;
create trigger m26_reservation_availability after insert or update or delete on public.community_game_tests
 for each row execute function public._m26_reservation_availability_event();
create function public._m26_capacity_availability_event() returns trigger
language plpgsql security definer set search_path='' as $$begin
 perform public._m26_refresh_availability(new.id);return null;
end;$$;
revoke all on function public._m26_capacity_availability_event() from public,anon,authenticated;
create trigger m26_capacity_availability after update of target_testers,status,audience on public.community_playtests
 for each row execute function public._m26_capacity_availability_event();

-- Expiry is already enforced by campaign_places/reservation guards using server
-- time. This scheduled pass sends alerts without rewriting reports or drafts.
create function public.process_tester_availability() returns integer
language plpgsql security definer set search_path='' as $$declare campaign record;sent integer:=0;begin
 delete from public.tester_availability_preferences p where p.expires_at<=clock_timestamp() or not exists(select 1 from public.profiles where id=p.tester_id);
 for campaign in select distinct playtest_id from public.tester_availability_preferences order by playtest_id
 loop sent:=sent+public._m26_refresh_availability(campaign.playtest_id);end loop;
 -- Only this new alert class is subject to the new 90-day visible retention.
 delete from public.notifications where dedupe_key like 'tester:availability:%' and created_at<now()-interval '90 days';
 delete from public.notification_delivery_keys d where d.dedupe_key like 'tester:availability:%'
  and not exists(select 1 from public.notifications n where n.recipient_id=d.recipient_id and n.dedupe_key=d.dedupe_key)
  and not exists(select 1 from public.tester_availability_preferences p where p.tester_id=d.recipient_id
   and d.dedupe_key like 'tester:availability:'||p.playtest_id||':%');
 return sent;
end;$$;
revoke all on function public.process_tester_availability() from public,anon,authenticated;
grant execute on function public.process_tester_availability() to service_role;
commit;

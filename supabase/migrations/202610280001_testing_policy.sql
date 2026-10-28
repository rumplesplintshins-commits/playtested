-- Prepared from the 2026-10-28 live audit. Apply once, in order, on staging first.
begin;

create table public.testing_policy (
  singleton boolean primary key default true check (singleton),
  launch_window interval not null default interval '720 hours',
  launches integer not null default 1 check (launches = 1),
  places integer not null default 2 check (places = 2),
  base_xp integer not null default 100 check (base_xp > 0)
);
insert into public.testing_policy default values;
alter table public.testing_policy enable row level security;
revoke all on public.testing_policy from public, anon, authenticated;

alter table public.profiles add column preferred_genres text[] not null default '{}';
alter table public.community_playtests
  add column minimum_rank integer not null default 0 check (minimum_rank between 0 and 3),
  add column testing_genre text,
  add column genre_restricted boolean not null default false;
alter table public.community_game_tests
  add column quality_reviewed boolean not null default false,
  add column review_reason text,
  add column replacement_reason text,
  add column replacement_by uuid,
  add column replacement_at timestamptz;

alter table public.community_game_tests add column base_xp_amount integer not null default 0 check(base_xp_amount >= 0);
-- The audited legacy review function awarded exactly 100. Record its amount;
-- do not change any historical profile balance or infer rubric scores.
update public.community_game_tests set base_xp_amount=100 where xp_awarded;

create table public.campaign_build_locks (
 playtest_id uuid primary key references public.community_playtests(id),
 locked_at timestamptz not null default now()
);
insert into public.campaign_build_locks(playtest_id)
select distinct playtest_id from public.community_game_tests
where playtest_id is not null and review_outcome='accepted';
alter table public.campaign_build_locks enable row level security;
revoke all on public.campaign_build_locks from public,anon,authenticated;

create table public.test_review_events (
  id bigint generated always as identity primary key,
  test_id uuid not null references public.community_game_tests(id),
  actor_id uuid not null,
  kind text not null,
  reason text not null,
  criteria jsonb,
  xp_delta integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.test_review_events enable row level security;
revoke all on public.test_review_events from public, anon, authenticated;
grant select on public.test_review_events to authenticated;
create policy review_events_read on public.test_review_events for select to authenticated
using (exists (select 1 from public.community_game_tests t where t.id = test_id and t.tester_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create function public.tester_rank(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  with history as (
    select count(*) filter (where review_outcome = 'accepted' and xp_awarded) as accepted,
      count(*) filter (where quality_reviewed) as assessed,
      count(*) filter (where quality_reviewed and review_outcome = 'accepted') as passed
    from public.community_game_tests where tester_id = p_user
  ) select case
    when p.tester_xp >= 5000 and h.accepted >= 50 and (h.assessed < 5 or h.passed::numeric/h.assessed >= .8) then 3
    when p.tester_xp >= 2000 and h.accepted >= 20 and (h.assessed < 5 or h.passed::numeric/h.assessed >= .8) then 2
    when p.tester_xp >= 500 and h.accepted >= 5 and (h.assessed < 5 or h.passed::numeric/h.assessed >= .8) then 1
    else 0 end from public.profiles p cross join history h where p.id = p_user;
$$;

create function public.genre_key(p_value text) returns text
language sql immutable set search_path = '' as $$
 select nullif(regexp_replace(lower(btrim(p_value)), '\s+', ' ', 'g'), '');
$$;

create function public.campaign_eligible(p_id uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
   select 1 from public.community_playtests c join public.profiles p on p.id = p_user
   where c.id = p_id and 'tester' = any(p.roles)
   and public.tester_rank(p_user) >= c.minimum_rank
   and (not c.genre_restricted or (
     public.genre_key(c.testing_genre) not in ('other','unknown','uncategorised','uncategorized')
     and exists (select 1 from unnest(p.preferred_genres) g
       where public.genre_key(g) = public.genre_key(c.testing_genre))
   ))
 );
$$;

create function public.update_my_testing_genres(p_genres text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to update preferences.'; end if;
 if coalesce(cardinality(p_genres),0) > 30 then raise exception 'Select at most 30 genres.'; end if;
 if exists (select 1 from unnest(p_genres) g where length(g)>100) then raise exception 'Genre is too long.'; end if;
 update public.profiles set preferred_genres = array(
   select distinct btrim(g) from unnest(p_genres) g where public.genre_key(g) is not null
 ) where id = auth.uid();
end;
$$;

create function public.review_test_quality(p_test_id uuid, p_outcome text, p_reason text, p_criteria jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.community_game_tests%rowtype; delta integer; award integer;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then
   raise exception 'Only an admin can review tests.'; end if;
 if p_outcome is null or p_outcome not in ('accepted','rejected') or nullif(btrim(p_reason),'') is null then
   raise exception 'Choose an outcome and explain the quality decision.'; end if;
 if p_criteria is null or not (p_criteria ?& array['specific','examples','useful','relevant','original']) then
   raise exception 'Assess all five quality criteria.'; end if;
 if exists(select 1 from jsonb_each(p_criteria) e where e.value not in ('true'::jsonb,'false'::jsonb)) then
   raise exception 'Quality criteria must be boolean.'; end if;
 if p_outcome='accepted' and exists(select 1 from jsonb_each(p_criteria) e where e.value='false'::jsonb) then
   raise exception 'Acceptance requires all criteria; examples may be marked satisfied when not applicable.'; end if;
 -- Serialize acceptance with developer build edits, which lock the campaign.
 perform 1 from public.community_playtests c where c.id=(select playtest_id from public.community_game_tests where id=p_test_id) for update;
 select * into t from public.community_game_tests where id=p_test_id for update;
 if not found or t.status not in ('submitted','reviewed') then raise exception 'Only submitted reports can be reviewed.'; end if;
 if t.quality_reviewed and t.review_outcome=p_outcome and not exists (
   select 1 from public.test_review_events e where e.test_id=p_test_id and e.kind='reconsideration'
   and e.id > coalesce((select max(r.id) from public.test_review_events r where r.test_id=p_test_id and r.kind in ('accepted','rejected')),0)
 ) then return; end if;
 select base_xp into award from public.testing_policy;
 delta := case when p_outcome='accepted' then award else 0 end - t.base_xp_amount;
 -- Never retroactively award previously accepted historical reports without an explicit new review.
 update public.profiles set tester_xp=tester_xp+delta,
   completed_tests=completed_tests + case when delta>0 then 1 when delta<0 then -1 else 0 end
 where id=t.tester_id;
 if not found then raise exception 'Tester profile missing.'; end if;
 update public.community_game_tests set review_outcome=p_outcome, status='reviewed',
   xp_awarded=(p_outcome='accepted'), base_xp_amount=case when p_outcome='accepted' then award else 0 end,
   quality_reviewed=true, review_reason=btrim(p_reason), reviewed_at=now()
 where id=p_test_id;
 insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta)
 values(p_test_id,auth.uid(),p_outcome,btrim(p_reason),p_criteria,delta);
 if p_outcome='accepted' and t.playtest_id is not null then
   insert into public.campaign_build_locks(playtest_id) values(t.playtest_id) on conflict do nothing;
 end if;
end;
$$;

-- Old clients cannot bypass the explicit quality rubric.
create or replace function public.review_community_game_test(p_test_id uuid,p_outcome text)
returns void language plpgsql security definer set search_path='' as $$
begin raise exception 'Use the quality review form with criteria and a reason.'; end;
$$;

create function public.request_test_reconsideration(p_test_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if nullif(btrim(p_reason),'') is null then raise exception 'Explain your request.'; end if;
 perform 1 from public.community_game_tests where id=p_test_id and tester_id=auth.uid()
   and review_outcome='rejected' for update;
 if not found then raise exception 'Rejected report not found.'; end if;
 if exists(select 1 from public.test_review_events e where e.test_id=p_test_id and e.kind='reconsideration'
   and e.id > coalesce((select max(r.id) from public.test_review_events r where r.test_id=p_test_id and r.kind in ('accepted','rejected')),0)) then
   raise exception 'A reconsideration request is already pending.'; end if;
 insert into public.test_review_events(test_id,actor_id,kind,reason)
 values(p_test_id,auth.uid(),'reconsideration',btrim(p_reason));
end;
$$;

create function public.replace_unusable_test(p_test_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.community_game_tests%rowtype;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Moderator access required.'; end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'Document fraud or unusable evidence.'; end if;
 select * into t from public.community_game_tests where id=p_test_id for update;
 if not found or t.status not in ('submitted','reviewed') then raise exception 'Submitted report required.'; end if;
 if t.replacement_at is not null then return; end if;
 -- This does not reverse XP: the quality decision must be reviewed separately.
 update public.community_game_tests set replacement_at=now(),replacement_by=auth.uid(),replacement_reason=btrim(p_reason) where id=p_test_id;
 insert into public.test_review_events(test_id,actor_id,kind,reason) values(p_test_id,auth.uid(),'replacement',btrim(p_reason));
end;
$$;

create function public.campaign_places(p_id uuid)
returns table(submitted integer,testing integer,available integer)
language sql stable security definer set search_path='' as $$
 select count(*) filter(where t.status in ('submitted','reviewed'))::integer,
   count(*) filter(where t.status in ('claimed','in_progress'))::integer,
   greatest(0,(select places from public.testing_policy)-count(*)::integer)
 from public.community_game_tests t where t.playtest_id=p_id and t.replacement_at is null;
$$;

create function public.guard_tester_places() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.playtest_id is null then return new; end if;
 if current_setting('transaction_isolation') <> 'read committed' then raise exception 'Retry using a normal read-committed request.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||new.playtest_id::text,0));
 if not public.campaign_eligible(new.playtest_id,new.tester_id) then
   raise exception 'Minimum rank or required genre match not met. Update genre preferences in your account.'; end if;
 if not exists(select 1 from public.community_playtests c where c.id=new.playtest_id and c.status='open' and c.audience in ('both','playtested_testers')) then
   raise exception 'Campaign is not available.'; end if;
 if (select available from public.campaign_places(new.playtest_id)) <= 0 then raise exception 'This campaign is full: no tester places remain.'; end if;
 return new;
end;
$$;
create trigger testing_capacity before insert on public.community_game_tests
for each row execute function public.guard_tester_places();

create or replace function public.release_community_game_test(p_submission_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.community_game_tests%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 select * into t from public.community_game_tests where tester_id=auth.uid()
   and (submission_id=p_submission_id or playtest_id=p_submission_id)
   and status in ('claimed','in_progress') for update;
 if not found then raise exception 'No active claim found. Submitted reports cannot be released.'; end if;
 delete from public.community_game_tests where id=t.id and status in ('claimed','in_progress');
end;
$$;

create function public._playtested_launch_window_at(p_imported_game_id uuid,p_approved_game_id uuid,p_submission_id uuid,p_checked_at timestamptz)
returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz)
language sql security definer set search_path='' as $$
 with recent as (
   select c.tester_hub_started_at as launched from public.community_playtests c
   where c.tester_hub_started_at > p_checked_at-(select launch_window from public.testing_policy)
   and (c.imported_game_id=p_imported_game_id or c.approved_game_id=p_approved_game_id or c.submission_id=p_submission_id)
 ), totals as (select count(*)::integer n,max(launched)+(select launch_window from public.testing_policy) deadline from recent)
 select n,null::timestamptz,deadline,deadline from totals;
$$;

create or replace function public._playtested_launch_window(p_imported_game_id uuid,p_approved_game_id uuid,p_submission_id uuid)
returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz)
language sql security definer set search_path='' as $$
 select * from public._playtested_launch_window_at(p_imported_game_id,p_approved_game_id,p_submission_id,clock_timestamp());
$$;

-- Private helpers must not be callable through the public API.
revoke all on function public.tester_rank(uuid),public.campaign_eligible(uuid,uuid),public.campaign_places(uuid),
 public.guard_tester_places(),public._playtested_launch_window(uuid,uuid,uuid),
 public._playtested_launch_window_at(uuid,uuid,uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.update_my_testing_genres(text[]),public.review_test_quality(uuid,text,text,jsonb),
 public.request_test_reconsideration(uuid,text),public.replace_unusable_test(uuid,text) from public,anon;
grant execute on function public.update_my_testing_genres(text[]),public.review_test_quality(uuid,text,text,jsonb),
 public.request_test_reconsideration(uuid,text),public.replace_unusable_test(uuid,text) to authenticated;
commit;

begin;
create table public.developer_plan_policy(plan text primary key check(plan in('free','pro')),launch_limit integer not null check(launch_limit>0),launch_window interval not null check(launch_window=interval '720 hours'),launch_gap interval not null check(launch_gap>=interval '0 hours'),rank_targeting boolean not null,genre_targeting boolean not null);
insert into public.developer_plan_policy values('free',1,interval '720 hours',interval '0 hours',false,false),('pro',15,interval '720 hours',interval '48 hours',true,true);
create table public.developer_entitlements(developer_id uuid primary key references public.profiles(id),plan text not null references public.developer_plan_policy(plan),assigned_by uuid not null,assigned_at timestamptz not null default clock_timestamp());
create table public.developer_entitlement_events(id bigint generated always as identity primary key,developer_id uuid not null,old_plan text not null,new_plan text not null,actor_id uuid not null,reason text not null,created_at timestamptz not null default clock_timestamp());
alter table public.developer_plan_policy enable row level security;alter table public.developer_entitlements enable row level security;alter table public.developer_entitlement_events enable row level security;
revoke all on public.developer_plan_policy,public.developer_entitlements,public.developer_entitlement_events from public,anon,authenticated;
grant select on public.developer_entitlement_events to authenticated;
create policy entitlement_audit_admin_read on public.developer_entitlement_events for select to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create function public._developer_plan(p_id uuid) returns public.developer_plan_policy language sql volatile security definer set search_path='' as $$select p from public.developer_plan_policy p where p.plan=coalesce((select e.plan from public.developer_entitlements e where e.developer_id=p_id),'free');$$;
create function public.admin_assign_developer_plan(p_developer_id uuid,p_plan text,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$declare previous text;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 if not exists(select 1 from public.profiles where id=p_developer_id and 'developer'=any(roles)) then raise exception 'A developer account is required.';end if;
 if not exists(select 1 from public.developer_plan_policy where plan=p_plan) or nullif(btrim(p_reason),'') is null then raise exception 'Select a valid plan and provide an audit reason.';end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry using read committed.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:developer:'||p_developer_id::text,0));
 select p.plan into previous from public._developer_plan(p_developer_id)p;
 if previous=p_plan then return jsonb_build_object('plan',p_plan,'changed',false);end if;
 insert into public.developer_entitlements values(p_developer_id,p_plan,auth.uid(),clock_timestamp()) on conflict(developer_id) do update set plan=excluded.plan,assigned_by=excluded.assigned_by,assigned_at=excluded.assigned_at;
 insert into public.developer_entitlement_events(developer_id,old_plan,new_plan,actor_id,reason)values(p_developer_id,previous,p_plan,auth.uid(),btrim(p_reason));
 return jsonb_build_object('plan',p_plan,'changed',true);end;$$;
create or replace function public._playtested_developer_launch_window_at(p_developer_id uuid,p_checked_at timestamptz) returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz)
language sql volatile security definer set search_path='' as $$
 with policy as(select p.* from public._developer_plan(p_developer_id)p),recent as(select tester_hub_started_at launched from public.community_playtests,policy where developer_id=p_developer_id and tester_hub_started_at>p_checked_at-policy.launch_window),totals as(select count(*)::integer n,max(launched) latest from recent),limits as(
 select n,case when launch_gap>interval '0 hours' and latest+launch_gap>p_checked_at then latest+launch_gap end cooldown,
 case when n>=launch_limit then(select launched+launch_window from recent order by launched offset greatest(n-launch_limit,0) limit 1)end quota from totals cross join policy)
 select n,cooldown,quota,greatest(cooldown,quota) from limits;
$$;
create function public._assert_developer_targeting(p_new jsonb,p_old jsonb) returns void language plpgsql security definer set search_path='' as $$declare policy public.developer_plan_policy;published boolean;begin
 if p_new->>'status'='closed' then return;end if;
 select * into policy from public._developer_plan((p_new->>'developer_id')::uuid);
 published:=p_old is not null and nullif(p_old->>'published_at','') is not null;
 if not policy.rank_targeting and (p_new->>'minimum_rank')::integer>(case when published then (p_old->>'minimum_rank')::integer else 0 end) then raise exception 'Higher minimum tester ranks require Pro. Published rounds may retain or lower existing restrictions.';end if;
 if not policy.genre_targeting and (p_new->>'genre_restricted')::boolean and(not published or not(p_old->>'genre_restricted')::boolean or public.genre_key(p_new->>'testing_genre') is distinct from public.genre_key(p_old->>'testing_genre')) then raise exception 'Required genre matching needs Pro. Keep existing published targeting unchanged, or remove the restriction before changing genre.';end if;
end;$$;
CREATE OR REPLACE FUNCTION public._playtested_guard_launch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text;
  v_window record;
  v_now timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.developer_id IS DISTINCT FROM OLD.developer_id
       OR NEW.imported_game_id IS DISTINCT FROM OLD.imported_game_id
       OR NEW.approved_game_id IS DISTINCT FROM OLD.approved_game_id
       OR NEW.submission_id IS DISTINCT FROM OLD.submission_id THEN
      RAISE EXCEPTION 'A campaign cannot be moved to another game or developer.';
    END IF;
    IF NEW.published_at IS DISTINCT FROM OLD.published_at
       AND OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'The original publication date cannot be changed.';
    END IF;
    IF NEW.tester_hub_started_at IS DISTINCT FROM OLD.tester_hub_started_at THEN
      RAISE EXCEPTION 'Tester Hub launch history cannot be changed manually.';
    END IF;
    IF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'Closed playtests cannot be edited.';
    END IF;
    IF NEW.status = 'draft' AND OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'Published playtests cannot be changed back to drafts. Pause or close the campaign instead.';
    END IF;
  ELSE
    IF NEW.tester_hub_started_at IS NOT NULL THEN
      RAISE EXCEPTION 'Tester Hub launch history is assigned automatically.';
    END IF;
  END IF;

  v_scope := CASE
    WHEN NEW.imported_game_id IS NOT NULL THEN 'imported:' || NEW.imported_game_id::text
    WHEN NEW.approved_game_id IS NOT NULL THEN 'approved:' || NEW.approved_game_id::text
    ELSE 'submission:' || NEW.submission_id::text END;

  -- Serialize writes for the same game, including requests in separate tabs.
  -- Read committed is PostgreSQL/Supabase's normal RPC isolation level.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Campaign changes require a read-committed transaction. Retry using the normal app request.';
  END IF;
  -- Always lock developer before game so simultaneous launches on different games serialize.
  PERFORM pg_advisory_xact_lock(hashtextextended('playtested:developer:' || NEW.developer_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('playtested:' || v_scope, 0));
  PERFORM public._assert_developer_targeting(to_jsonb(NEW),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END);
  v_now := clock_timestamp();

  IF NEW.status = 'open' AND NEW.published_at IS NULL THEN
    NEW.published_at := v_now;
  END IF;

  -- Drafts may be prepared during a cooldown; first Hub publication is
  -- the only event that consumes launch allowance. Resume/edit is free.
  IF NEW.tester_hub_started_at IS NULL
     AND NEW.audience IN ('playtested_testers', 'both')
     AND NEW.status = 'paused' THEN
    RAISE EXCEPTION 'Publish this campaign to the Tester Hub before pausing it.';
  END IF;

  IF NEW.tester_hub_started_at IS NULL
     AND NEW.audience IN ('playtested_testers', 'both')
     AND NEW.status = 'open' THEN
    SELECT * INTO v_window
    FROM public._playtested_developer_launch_window_at(NEW.developer_id, v_now);
    IF v_window.next_at IS NOT NULL THEN
      RAISE EXCEPTION 'Tester Hub launch unavailable until %. Account-wide rolling allowance or minimum launch spacing applies.',
        v_window.next_at;
    END IF;
    NEW.tester_hub_started_at := v_now;
  END IF;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_playtest_eligibility(p_imported_game_id uuid, p_approved_game_id uuid, p_submission_id uuid)
 RETURNS TABLE(has_active_playtest boolean, active_playtest_id uuid, active_playtest_status text, tester_hub_eligible boolean, tester_hub_reason text, next_tester_hub_at timestamp with time zone, tester_hub_rounds_last_30_days integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_active_id uuid;
  v_active_status text;
  v_window record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if num_nonnulls(
    p_imported_game_id,
    p_approved_game_id,
    p_submission_id
  ) <> 1 then
    raise exception 'Select exactly one game.';
  end if;

  if not exists (
    select 1
    from public.game_developer_links l
    where l.developer_id = v_user_id
      and (
        (
          p_imported_game_id is not null
          and l.imported_game_id = p_imported_game_id
        )
        or
        (
          p_approved_game_id is not null
          and l.approved_game_id = p_approved_game_id
        )
        or
        (
          p_submission_id is not null
          and l.submission_id = p_submission_id
        )
      )
  ) then
    raise exception 'You do not have an approved developer relationship with this game.';
  end if;

  select cp.id, cp.status
  into v_active_id, v_active_status
  from public.community_playtests cp
  where cp.status in ('draft', 'open', 'paused')
    and (
      (p_imported_game_id is not null and cp.imported_game_id = p_imported_game_id)
      or (p_approved_game_id is not null and cp.approved_game_id = p_approved_game_id)
      or (p_submission_id is not null and cp.submission_id = p_submission_id)
    )
  order by cp.created_at desc
  limit 1;

  select * into v_window
  from public._playtested_developer_launch_window_at(v_user_id, clock_timestamp());

  return query select
    v_active_id is not null,
    v_active_id,
    v_active_status,
    v_active_id is null and v_window.next_at is null,
    case
      when v_active_status = 'draft' then
        'A draft is already prepared for this game. Manage it to publish when the launch allowance is available.'
      when v_active_id is not null then
        'Close the current playtest before starting another round.'
      when v_window.quota_until is not null
        and (v_window.cooldown_until is null or v_window.quota_until >= v_window.cooldown_until) then
        'Your account rolling launch allowance is used. Wait until enough earlier launches leave the 30-day window.'
      when v_window.cooldown_until is not null then
        'The minimum elapsed spacing between account launches has not yet passed.'
      else 'Eligible for a new Playtested Tester Hub round.'
    end,
    v_window.next_at,
    v_window.rounds_used;
end;
$function$;



create function public.get_my_developer_plan() returns jsonb language plpgsql volatile security definer set search_path='' as $$declare p public.developer_plan_policy;w record;checked timestamptz;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and('developer'=any(roles) or role='admin')) then raise exception 'Developer access required.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('playtested:developer:'||auth.uid()::text,0));
 checked:=clock_timestamp();select * into p from public._developer_plan(auth.uid());select * into w from public._playtested_developer_launch_window_at(auth.uid(),checked);
 return to_jsonb(p)||to_jsonb(w)||jsonb_build_object('server_now',checked,'can_assign',exists(select 1 from public.profiles where id=auth.uid() and role='admin'),'window_hours',extract(epoch from p.launch_window)/3600,'gap_hours',extract(epoch from p.launch_gap)/3600);
end;$$;
revoke all on function public._developer_plan(uuid),public._assert_developer_targeting(jsonb,jsonb),public._playtested_developer_launch_window_at(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.get_my_developer_plan(),public.admin_assign_developer_plan(uuid,text,text) from public,anon;
grant execute on function public.get_my_developer_plan(),public.admin_assign_developer_plan(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;

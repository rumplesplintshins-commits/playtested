-- Free plan: one free playtest campaign per rolling 30 days, and each free
-- campaign reserves one accepted tester place. Drafts and community-only
-- campaigns never consume the allowance; closing a campaign does not renew
-- it before the 30-day window passes. Paid (Pro) rules are untouched.
-- Idempotent: only CREATE OR REPLACE statements. Replaces the withdrawn
-- six-campaign introductory offer that briefly lived in this migration.

create or replace function public._playtested_free_allowance_at(p_developer_id uuid, p_checked_at timestamptz)
returns table(campaigns_used integer, campaigns_limit integer, campaigns_remaining integer, place_cap integer, next_at timestamptz)
language sql
security definer
set search_path to ''
as $function$
  with usage as (
    select
      count(*)::integer as used,
      max(tester_hub_started_at) as latest
    from public.community_playtests
    where developer_id = p_developer_id
      and tester_hub_started_at > p_checked_at - interval '30 days'
  )
  select
    usage.used,
    1,
    greatest(1 - usage.used, 0),
    1,
    case when usage.used > 0 then usage.latest + interval '30 days' end
  from usage;
$function$;

drop function if exists public._playtested_free_intro_at(uuid, timestamptz);

create or replace function public.fix_free_target()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$begin
  -- Free campaigns reserve exactly one accepted tester place; pro plans keep
  -- the full policy capacity.
  new.target_testers:=least(
    (select places from public.testing_policy),
    coalesce((
      select f.place_cap
      from public._playtested_free_allowance_at(new.developer_id,coalesce(new.published_at,clock_timestamp())) f
      where (select plan from public._developer_plan(new.developer_id)) = 'free'
    ),(select places from public.testing_policy))
  );
  new.testing_genre:=coalesce(nullif(btrim(new.testing_genre),''),(select genre from public.imported_games where id=new.imported_game_id),(select genre from public.approved_games where id=new.approved_game_id),(select genre from public.game_submissions where id=new.submission_id),'Other');
  return new;
end;$function$;

create or replace function public.get_my_developer_plan()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare p public.developer_plan_policy; w record; f record; checked timestamptz;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and ('developer'=any(roles) or role='admin')) then raise exception 'Developer access required.'; end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('playtested:developer:'||auth.uid()::text,0));
 checked:=clock_timestamp(); select * into p from public._developer_plan(auth.uid());
 if p.plan is null then raise exception 'Developer plan policy is not configured. Restore the Free/Pro policy seeds.'; end if;
 select * into w from public._playtested_developer_launch_window_at(auth.uid(),checked);
 if p.plan='free' then
   select * into f from public._playtested_free_allowance_at(auth.uid(),checked);
   return to_jsonb(p)||to_jsonb(w)||jsonb_build_object(
     'server_now',checked,
     'can_assign',exists(select 1 from public.profiles where id=auth.uid() and role='admin'),
     'window_hours',extract(epoch from p.launch_window)/3600,
     'gap_hours',extract(epoch from p.launch_gap)/3600,
     -- free-plan rolling allowance (additive keys)
     'free_campaigns_used',f.campaigns_used,
     'free_campaigns_limit',f.campaigns_limit,
     'free_campaigns_remaining',f.campaigns_remaining,
     'free_place_cap',f.place_cap,
     'free_next_at',f.next_at,
     'free_window_hours',720
   )||jsonb_build_object('next_at',f.next_at);
 end if;
 return to_jsonb(p)||to_jsonb(w)||jsonb_build_object('server_now',checked,'can_assign',exists(select 1 from public.profiles where id=auth.uid() and role='admin'),'window_hours',extract(epoch from p.launch_window)/3600,'gap_hours',extract(epoch from p.launch_gap)/3600);
end $function$;

create or replace function public.get_playtest_eligibility(p_imported_game_id uuid, p_approved_game_id uuid, p_submission_id uuid)
returns table(has_active_playtest boolean, active_playtest_id uuid, active_playtest_status text, tester_hub_eligible boolean, tester_hub_reason text, next_tester_hub_at timestamp with time zone, tester_hub_rounds_last_30_days integer)
language plpgsql
security definer
set search_path to ''
as $function$declare r record;kind text;source_id uuid;w record;f record;v_plan text;allowed boolean;begin
 select * into r from public._pre_admission_eligibility(p_imported_game_id,p_approved_game_id,p_submission_id);
 kind:=case when p_imported_game_id is not null then 'imported' when p_approved_game_id is not null then 'approved' else 'submission' end;source_id:=coalesce(p_imported_game_id,p_approved_game_id,p_submission_id);
 allowed:=public._listing_has_admission(kind,source_id) and public._listing_current_claim(kind,source_id,auth.uid()) and not exists(select 1 from public.game_submissions where kind<>'imported' and id=source_id and status<>'Approved') and not exists(select 1 from public.imported_games where kind='imported' and id=source_id and catalogue_review_status in('held_for_review','excluded'));
 if not allowed then r.tester_hub_eligible:=false;r.tester_hub_reason:='Complete initial listing admission and obtain admin approval before publishing to Tester Hub.';end if;
 if r.active_playtest_status='draft' and allowed then
   select plan into v_plan from public._developer_plan(auth.uid());
   if v_plan='free' then
     select * into f from public._playtested_free_allowance_at(auth.uid(),clock_timestamp());
     if f.campaigns_remaining>0 then
       r.tester_hub_eligible:=true;
       r.tester_hub_reason:=format('Free allowance available: %s of %s free campaigns used; this launch reserves one tester place.',f.campaigns_used,f.campaigns_limit);
     else
       r.tester_hub_eligible:=false;
       r.tester_hub_reason:=format('Free allowance used: %s of %s free campaigns used. Next campaign available %s.',f.campaigns_used,f.campaigns_limit,to_char(f.next_at,'YYYY-MM-DD HH24:MI'));
       r.next_tester_hub_at:=f.next_at;
     end if;
   else
     select * into w from public._playtested_developer_launch_window_at(auth.uid(),clock_timestamp());
     if w.next_at is null then r.tester_hub_eligible:=true;r.tester_hub_reason:='Approved listing: draft may be published when campaign requirements are met.';end if;
   end if;
 elsif allowed and coalesce(r.active_playtest_status,'')<>'draft' then
   -- No draft yet: explain the current free-plan allowance instead of the
   -- legacy rolling-window wording from _pre_admission_eligibility.
   select plan into v_plan from public._developer_plan(auth.uid());
   if v_plan='free' then
     select * into f from public._playtested_free_allowance_at(auth.uid(),clock_timestamp());
     if f.campaigns_remaining>0 then
       r.tester_hub_reason:=format('Free allowance: %s of %s free campaigns used; a launch reserves one tester place. Save a draft to publish.',f.campaigns_used,f.campaigns_limit);
     else
       r.tester_hub_reason:=format('Free allowance used: %s of %s free campaigns used. Next campaign available %s. Save a draft to publish.',f.campaigns_used,f.campaigns_limit,to_char(f.next_at,'YYYY-MM-DD HH24:MI'));
       r.next_tester_hub_at:=f.next_at;
     end if;
   end if;
 end if;
 return query select r.has_active_playtest,r.active_playtest_id,r.active_playtest_status,r.tester_hub_eligible,r.tester_hub_reason,r.next_tester_hub_at,r.tester_hub_rounds_last_30_days;
end;$function$;

create or replace function public._playtested_guard_launch()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE
  v_scope text;
  v_window record;
  v_free record;
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

  -- Drafts may be prepared during the allowance window; first Hub publication
  -- is the only event that consumes launch allowance. Resume/edit is free.
  IF NEW.tester_hub_started_at IS NULL
     AND NEW.audience IN ('playtested_testers', 'both')
     AND NEW.status = 'paused' THEN
    RAISE EXCEPTION 'Publish this campaign to the Tester Hub before pausing it.';
  END IF;

  IF NEW.tester_hub_started_at IS NULL
     AND NEW.audience IN ('playtested_testers', 'both')
     AND NEW.status = 'open' THEN
    IF (select plan from public._developer_plan(NEW.developer_id)) = 'free' THEN
      -- Free plan: one Tester Hub campaign per rolling 30 days, and that
      -- campaign reserves exactly one accepted tester place. Only the first
      -- Hub publication consumes the allowance.
      SELECT * INTO v_free
      FROM public._playtested_free_allowance_at(NEW.developer_id, v_now);
      IF NEW.target_testers > v_free.place_cap THEN
        RAISE EXCEPTION 'Free plan place cap: a launch may reserve up to % accepted tester place (this campaign targets %). Drafts do not consume allowance until they are first published.',
          v_free.place_cap, NEW.target_testers;
      END IF;
      IF v_free.next_at IS NOT NULL THEN
        RAISE EXCEPTION 'Tester Hub launch unavailable until %. Free plan: one playtest campaign per rolling 30 days applies.',
          v_free.next_at;
      END IF;
    ELSE
      SELECT * INTO v_window
      FROM public._playtested_developer_launch_window_at(NEW.developer_id, v_now);
      IF v_window.next_at IS NOT NULL THEN
        RAISE EXCEPTION 'Tester Hub launch unavailable until %. Account-wide rolling allowance or minimum launch spacing applies.',
          v_window.next_at;
      END IF;
    END IF;
    NEW.tester_hub_started_at := v_now;
  END IF;
  RETURN NEW;
END;
$function$;

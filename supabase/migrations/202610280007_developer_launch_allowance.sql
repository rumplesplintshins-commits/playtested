begin;
-- Preserve every existing campaign, report and timestamp. Only new Hub launches change.
create function public._playtested_developer_launch_window_at(p_developer_id uuid,p_checked_at timestamptz)
returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz)
language sql security definer set search_path='' as $$
 with recent as (
  select c.tester_hub_started_at launched from public.community_playtests c
  where c.developer_id=p_developer_id
    and c.tester_hub_started_at > p_checked_at-(select launch_window from public.testing_policy)
 ), totals as (
  select count(*)::integer n,max(launched)+(select launch_window from public.testing_policy) deadline from recent
 ) select n,null::timestamptz,deadline,deadline from totals;
$$;
revoke all on function public._playtested_developer_launch_window_at(uuid,timestamptz) from public,anon,authenticated;

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
      RAISE EXCEPTION 'Tester Hub launch unavailable until %. One Tester Hub launch across all your games per rolling 30 days.',
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
        'Your account has launched a Tester Hub campaign in the last 30 days. The next slot opens 30 days after your latest launch across all games.'
      when v_window.cooldown_until is not null then
        'The rolling 30-day launch allowance is used.'
      else 'Eligible for a new Playtested Tester Hub round.'
    end,
    v_window.next_at,
    v_window.rounds_used;
end;
$function$;


commit;

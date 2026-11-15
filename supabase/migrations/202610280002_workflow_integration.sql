begin;

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
    FROM public._playtested_launch_window(
      NEW.imported_game_id, NEW.approved_game_id, NEW.submission_id
    );
    IF v_window.next_at IS NOT NULL THEN
      RAISE EXCEPTION 'Tester Hub launch unavailable until %. One Tester Hub launch per rolling 30 days.',
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
  from public._playtested_launch_window(
    p_imported_game_id, p_approved_game_id, p_submission_id
  );

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
        'The one-launch allowance is used. The next slot opens when an earlier launch leaves the rolling 30-day window.'
      when v_window.cooldown_until is not null then
        'The rolling 30-day launch allowance is used.'
      else 'Eligible for a new Playtested Tester Hub round.'
    end,
    v_window.next_at,
    v_window.rounds_used;
end;
$function$;


CREATE OR REPLACE FUNCTION public.get_available_community_test_games()
 RETURNS TABLE(submission_id uuid, title text, developer_name text, genre text, description text, game_link text, access_type text, image_url text, price text, ai_type text, focus_areas text[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      AND own.status IN ('claimed','in_progress')
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
  WHERE (p.status = 'open' AND p.audience IN ('playtested_testers', 'both') AND public.campaign_eligible(p.id,auth.uid()))
    OR EXISTS (SELECT 1 FROM public.community_game_tests own WHERE own.playtest_id=p.id AND own.tester_id=auth.uid() AND own.status IN ('claimed','in_progress'))
  ORDER BY title;
$function$;


drop function public.create_community_playtest(uuid, uuid, uuid, text, text, text, text[], text, integer, integer, text, boolean);

CREATE OR REPLACE FUNCTION public.create_community_playtest(p_imported_game_id uuid, p_approved_game_id uuid, p_submission_id uuid, p_access_link text, p_access_type text, p_instructions text, p_focus_areas text[], p_audience text, p_target_testers integer, p_estimated_minutes integer, p_release_label text, p_publish boolean, p_minimum_rank integer DEFAULT 0, p_testing_genre text DEFAULT NULL, p_genre_restricted boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_playtest_id uuid;
  v_title text;
  v_game_count integer;
  v_has_active boolean;
begin
  if p_genre_restricted and (public.genre_key(p_testing_genre) is null or public.genre_key(p_testing_genre) in ('unknown','other','uncategorised','uncategorized')) then raise exception 'Choose an explicit testing genre before restricting the audience.'; end if;
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and 'developer' = any(p.roles)
  ) then
    raise exception 'Developer access is required.';
  end if;

  if num_nonnulls(
    p_imported_game_id,
    p_approved_game_id,
    p_submission_id
  ) <> 1 then
    raise exception 'Select exactly one game.';
  end if;

  if p_access_link is null
     or trim(p_access_link) = ''
     or trim(p_access_link) !~ '^https?://' then
    raise exception 'Enter a valid HTTP or HTTPS game access link.';
  end if;

  if p_access_type is null or p_access_type not in (
    'steam_demo',
    'steam_game',
    'browser_game',
    'download_build',
    'other'
  ) then
    raise exception 'Choose a valid game access type.';
  end if;

  if p_instructions is null
     or length(trim(p_instructions)) < 20 then
    raise exception 'Testing instructions must contain at least 20 characters.';
  end if;

  if p_focus_areas is null
     or cardinality(p_focus_areas) = 0 then
    raise exception 'Select at least one testing focus area.';
  end if;

  if p_audience is null or p_audience not in (
    'playtested_testers',
    'own_community',
    'both'
  ) then
    raise exception 'Choose a valid testing audience.';
  end if;

  if p_target_testers is null
     or p_target_testers not between 1 and 100 then
    raise exception 'Target testers must be between 1 and 100.';
  end if;

  if p_estimated_minutes is not null
     and p_estimated_minutes not between 1 and 1440 then
    raise exception 'Estimated duration must be between 1 and 1440 minutes.';
  end if;

  select count(*)
  into v_game_count
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
    );

  if v_game_count = 0 then
    raise exception 'You do not have an approved developer relationship with this game.';
  end if;

  /*
   * One active playtest round per game.
   *
   * Draft, open and paused all count as active.
   * This applies regardless of audience so one game cannot have
   * multiple overlapping playtest rounds.
   */
  select exists (
    select 1
    from public.community_playtests cp
    where cp.status in ('draft', 'open', 'paused')
      and (
        (
          p_imported_game_id is not null
          and cp.imported_game_id = p_imported_game_id
        )
        or
        (
          p_approved_game_id is not null
          and cp.approved_game_id = p_approved_game_id
        )
        or
        (
          p_submission_id is not null
          and cp.submission_id = p_submission_id
        )
      )
  )
  into v_has_active;

  if v_has_active then
    raise exception 'This game already has an active playtest. Close the current round before starting another.';
  end if;

  -- The table trigger checks limits atomically at actual publication.
  -- Creating an unpublished draft never consumes launch allowance.

  if p_imported_game_id is not null then
    select g.title
    into v_title
    from public.imported_games g
    where g.id = p_imported_game_id;

  elsif p_approved_game_id is not null then
    select g.title
    into v_title
    from public.approved_games g
    where g.id = p_approved_game_id;

  else
    select s.title
    into v_title
    from public.game_submissions s
    where s.id = p_submission_id
      and s.developer_id = v_user_id;
  end if;

  if v_title is null then
    raise exception 'The selected game could not be found.';
  end if;

  insert into public.community_playtests (
    developer_id,
    imported_game_id,
    approved_game_id,
    submission_id,
    title,
    access_link,
    access_type,
    instructions,
    focus_areas,
    audience,
    target_testers,
    estimated_minutes,
    release_label,
    status,
    published_at, minimum_rank, testing_genre, genre_restricted
  )
  values (
    v_user_id,
    p_imported_game_id,
    p_approved_game_id,
    p_submission_id,
    v_title,
    trim(p_access_link),
    p_access_type,
    trim(p_instructions),
    coalesce(p_focus_areas, '{}'),
    p_audience,
    p_target_testers,
    p_estimated_minutes,
    nullif(trim(coalesce(p_release_label, '')), ''),
    case
      when coalesce(p_publish, false) then 'open'
      else 'draft'
    end,
    case
      when coalesce(p_publish, false) then now()
      else null
    end, p_minimum_rank, nullif(btrim(p_testing_genre),''), p_genre_restricted
  )
  returning id into v_playtest_id;

  return v_playtest_id;
end;
$function$;


revoke all on function public.create_community_playtest(uuid, uuid, uuid, text, text, text, text[], text, integer, integer, text, boolean, integer, text, boolean) from public,anon; grant execute on function public.create_community_playtest(uuid, uuid, uuid, text, text, text, text[], text, integer, integer, text, boolean, integer, text, boolean) to authenticated;

drop function public.update_community_playtest(uuid, text, text, text, text[], text, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.update_community_playtest(p_playtest_id uuid, p_access_link text, p_access_type text, p_instructions text, p_focus_areas text[], p_audience text, p_target_testers integer, p_estimated_minutes integer, p_release_label text, p_status text, p_minimum_rank integer DEFAULT 0, p_testing_genre text DEFAULT NULL, p_genre_restricted boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_current_status text;
  v_current_access_link text;
  v_current_access_type text;
  v_current_release_label text;
  v_current_audience text;
  v_imported_game_id uuid;
  v_approved_game_id uuid;
  v_submission_id uuid;
  v_has_accepted_response boolean;
begin
  if p_genre_restricted and (public.genre_key(p_testing_genre) is null or public.genre_key(p_testing_genre) in ('unknown','other','uncategorised','uncategorized')) then raise exception 'Choose an explicit testing genre before restricting the audience.'; end if;
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select
    cp.status,
    cp.access_link,
    cp.access_type,
    cp.release_label,
    cp.audience,
    cp.imported_game_id,
    cp.approved_game_id,
    cp.submission_id
  into
    v_current_status,
    v_current_access_link,
    v_current_access_type,
    v_current_release_label,
    v_current_audience,
    v_imported_game_id,
    v_approved_game_id,
    v_submission_id
  from public.community_playtests cp
  where cp.id = p_playtest_id
    and cp.developer_id = v_user_id
  for update;

  if not found then
    raise exception 'You do not have permission to manage this playtest.';
  end if;

  if v_current_status = 'closed' then
    raise exception 'Closed playtests cannot be edited.';
  end if;

  if p_access_link is null
     or btrim(p_access_link) = ''
     or (
       p_access_link not like 'http://%'
       and p_access_link not like 'https://%'
     ) then
    raise exception 'Enter a valid game access link.';
  end if;

  if p_access_type is null or p_access_type not in (
    'steam_demo',
    'steam_game',
    'browser_game',
    'download_build',
    'other'
  ) then
    raise exception 'Choose a valid game access type.';
  end if;

  if p_instructions is null
     or length(btrim(p_instructions)) < 20 then
    raise exception 'Testing instructions must contain at least 20 characters.';
  end if;

  if p_focus_areas is null
     or cardinality(p_focus_areas) = 0 then
    raise exception 'Select at least one testing focus area.';
  end if;

  if p_audience is null or p_audience not in (
    'playtested_testers',
    'own_community',
    'both'
  ) then
    raise exception 'Invalid testing audience.';
  end if;

  if p_target_testers is null
     or p_target_testers < 1
     or p_target_testers > 100 then
    raise exception 'Target testers must be between 1 and 100.';
  end if;

  if p_estimated_minutes is not null
     and (
       p_estimated_minutes < 1
       or p_estimated_minutes > 1440
     ) then
    raise exception 'Estimated testing time must be between 1 and 1440 minutes.';
  end if;

  if p_status is null or p_status not in (
    'draft',
    'open',
    'paused',
    'closed'
  ) then
    raise exception 'Invalid playtest status.';
  end if;

  /*
   * Once an accepted independent tester response exists,
   * the identity of the tested build is frozen.
   */
  select exists (
    select 1
    from public.community_game_tests cgt
    where cgt.playtest_id = p_playtest_id
      and (cgt.review_outcome = 'accepted' or exists (select 1 from public.campaign_build_locks l where l.playtest_id=cgt.playtest_id))
  )
  into v_has_accepted_response;

  if v_has_accepted_response then
    if btrim(p_access_link) is distinct from btrim(v_current_access_link) then
      raise exception 'The build access link is locked because accepted tester evidence has already been collected for this playtest.';
    end if;

    if p_access_type is distinct from v_current_access_type then
      raise exception 'The build access type is locked because accepted tester evidence has already been collected for this playtest.';
    end if;

    if nullif(btrim(coalesce(p_release_label, '')), '')
       is distinct from v_current_release_label then
      raise exception 'The release/build label is locked because accepted tester evidence has already been collected for this playtest.';
    end if;
  end if;

  -- The table trigger enforces first-launch limits, preserves launch
  -- history across audience changes, and does not charge pause/resume.

  update public.community_playtests
  set
    access_link = btrim(p_access_link),
    access_type = p_access_type,
    instructions = btrim(p_instructions),
    focus_areas = p_focus_areas,
    audience = p_audience,
    target_testers = p_target_testers,
    minimum_rank = p_minimum_rank, testing_genre = nullif(btrim(p_testing_genre),''), genre_restricted = p_genre_restricted,
    estimated_minutes = p_estimated_minutes,
    release_label = nullif(btrim(p_release_label), ''),
    status = p_status,
    published_at = case
      when p_status = 'open'
        and published_at is null
        then now()
      else published_at
    end
  where id = p_playtest_id
    and developer_id = v_user_id;
end;
$function$;


revoke all on function public.update_community_playtest(uuid, text, text, text, text[], text, integer, integer, text, text, integer, text, boolean) from public,anon; grant execute on function public.update_community_playtest(uuid, text, text, text, text[], text, integer, integer, text, text, integer, text, boolean) to authenticated;

create function public.fix_free_target() returns trigger language plpgsql security definer set search_path='' as $$ begin
 new.target_testers := (select places from public.testing_policy);
 new.testing_genre := coalesce(nullif(btrim(new.testing_genre),''),
   (select genre from public.imported_games where id=new.imported_game_id),
   (select genre from public.approved_games where id=new.approved_game_id),
   (select genre from public.game_submissions where id=new.submission_id),'Other');
 return new; end; $$;
create trigger free_target before insert or update on public.community_playtests for each row execute function public.fix_free_target();

CREATE OR REPLACE FUNCTION public.submit_community_game_test(p_test_id uuid, p_gameplay_score integer, p_performance_score integer, p_bugs_found text, p_feedback text, p_hours_played numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_tester_id uuid;
    v_status text;
    v_normalized_feedback text;
    v_word_count integer;
    v_distinct_words integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be signed in to submit a test.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND 'tester' = ANY(roles)
    ) THEN
        RAISE EXCEPTION 'You must have the Tester role to submit a test.';
    END IF;

    IF p_gameplay_score IS NULL
       OR p_gameplay_score NOT BETWEEN 1 AND 10 THEN
        RAISE EXCEPTION 'Gameplay score must be between 1 and 10.';
    END IF;

    IF p_performance_score IS NULL
       OR p_performance_score NOT BETWEEN 1 AND 10 THEN
        RAISE EXCEPTION 'Performance score must be between 1 and 10.';
    END IF;

    IF nullif(btrim(p_feedback),'') is null THEN RAISE EXCEPTION 'Describe your testing experience.'; END IF;
    IF p_hours_played IS NULL
       OR p_hours_played < 0
       OR p_hours_played > 1000 THEN
        RAISE EXCEPTION 'Hours played must be between 0 and 1000.';
    END IF;

    SELECT t.tester_id, t.status
    INTO v_tester_id, v_status
    FROM public.community_game_tests AS t
    WHERE t.id = p_test_id
    FOR UPDATE;

    IF NOT FOUND OR v_tester_id <> auth.uid() THEN
        RAISE EXCEPTION 'Test not found or you do not own this claim.';
    END IF;

    IF v_status NOT IN ('claimed', 'in_progress') THEN
        RAISE EXCEPTION 'This test cannot be submitted in its current state.';
    END IF;

    UPDATE public.community_game_tests
    SET gameplay_score = p_gameplay_score,
        performance_score = p_performance_score,
        bugs_found = NULLIF(trim(p_bugs_found), ''),
        feedback = trim(p_feedback),
        hours_played = p_hours_played,
        status = 'submitted',
        review_outcome = 'pending',
        xp_awarded = false,
        submitted_at = now()
    WHERE id = p_test_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.submit_community_game_test(p_test_id uuid, p_gameplay_score integer, p_performance_score integer, p_bugs_found text, p_feedback text, p_hours_played numeric, p_overall_score integer, p_continue_playing text, p_recommend_game text, p_enjoyed_most text, p_frustrations text, p_biggest_improvement text, p_focus_responses jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    v_tester_id uuid;
    v_status text;
begin
    if auth.uid() is null then
        raise exception 'You must be signed in to submit a test.';
    end if;

    if not exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and 'tester' = any(roles)
    ) then
        raise exception 'You must have the Tester role to submit a test.';
    end if;

    if p_overall_score is null
       or p_overall_score not between 1 and 10 then
        raise exception 'Overall score must be between 1 and 10.';
    end if;

    if p_gameplay_score is null
       or p_gameplay_score not between 1 and 10 then
        raise exception 'Gameplay score must be between 1 and 10.';
    end if;

    if p_performance_score is null
       or p_performance_score not between 1 and 10 then
        raise exception 'Performance score must be between 1 and 10.';
    end if;

    if p_continue_playing is null
       or p_continue_playing not in (
           'definitely',
           'probably',
           'maybe',
           'probably_not',
           'definitely_not'
       ) then
        raise exception 'Please say whether you would continue playing.';
    end if;

    if p_recommend_game is null
       or p_recommend_game not in (
           'definitely',
           'probably',
           'maybe',
           'probably_not',
           'definitely_not'
       ) then
        raise exception 'Please say whether you would recommend the game.';
    end if;

    if p_hours_played is null
       or p_hours_played < 0
       or p_hours_played > 1000 then
        raise exception 'Hours played must be between 0 and 1000.';
    end if;

    if p_enjoyed_most is null
       or nullif(btrim(p_enjoyed_most),'') is null then
        raise exception 'Please describe what you enjoyed most.';
    end if;

    if p_frustrations is null
       or nullif(btrim(p_frustrations),'') is null then
        raise exception 'Please describe anything that frustrated you or got in the way.';
    end if;

    if p_biggest_improvement is null
       or nullif(btrim(p_biggest_improvement),'') is null then
        raise exception 'Please describe the single biggest improvement you would make.';
    end if;

    if p_focus_responses is null
       or jsonb_typeof(p_focus_responses) <> 'object' then
        raise exception 'Focus responses must be a valid object.';
    end if;

    select t.tester_id, t.status
    into v_tester_id, v_status
    from public.community_game_tests as t
    where t.id = p_test_id
    for update;

    if not found or v_tester_id <> auth.uid() then
        raise exception 'Test not found or you do not own this claim.';
    end if;

    if v_status not in ('claimed', 'in_progress') then
        raise exception 'This test cannot be submitted in its current state.';
    end if;

    update public.community_game_tests
    set
        overall_score = p_overall_score,
        gameplay_score = p_gameplay_score,
        performance_score = p_performance_score,
        continue_playing = p_continue_playing,
        recommend_game = p_recommend_game,
        enjoyed_most = trim(p_enjoyed_most),
        frustrations = trim(p_frustrations),
        bugs_found = nullif(trim(p_bugs_found), ''),
        biggest_improvement = trim(p_biggest_improvement),
        feedback = nullif(trim(p_feedback), ''),
        hours_played = p_hours_played,
        focus_responses = p_focus_responses,
        status = 'submitted',
        review_outcome = 'pending',
        xp_awarded = false,
        submitted_at = now()
    where id = p_test_id;
end;
$function$;


commit;
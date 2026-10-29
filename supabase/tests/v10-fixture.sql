-- Reduced structural fixture derived from the supplied live audit; no live data.
create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create table public.community_game_tests(
"id" uuid default gen_random_uuid() not null,
"submission_id" uuid,
"tester_id" uuid not null,
"status" text default 'claimed'::text not null,
"gameplay_score" integer,
"performance_score" integer,
"bugs_found" text,
"feedback" text,
"hours_played" numeric(5,2),
"claimed_at" timestamp with time zone default now() not null,
"submitted_at" timestamp with time zone,
"reviewed_at" timestamp with time zone,
"review_outcome" text default 'pending'::text not null,
"xp_awarded" boolean default false not null,
"playtest_id" uuid,
"overall_score" integer,
"continue_playing" text,
"recommend_game" text,
"enjoyed_most" text,
"frustrations" text,
"biggest_improvement" text,
"focus_responses" jsonb default '{}'::jsonb not null,
CHECK (((continue_playing IS NULL) OR (continue_playing = ANY (ARRAY['definitely'::text, 'probably'::text, 'maybe'::text, 'probably_not'::text, 'definitely_not'::text])))),
CHECK ((num_nonnulls(submission_id, playtest_id) = 1)),
CHECK (((gameplay_score >= 1) AND (gameplay_score <= 10))),
CHECK ((hours_played >= (0)::numeric)),
CHECK (((overall_score IS NULL) OR ((overall_score >= 1) AND (overall_score <= 10)))),
CHECK (((performance_score >= 1) AND (performance_score <= 10))),
PRIMARY KEY (id),
CHECK (((recommend_game IS NULL) OR (recommend_game = ANY (ARRAY['definitely'::text, 'probably'::text, 'maybe'::text, 'probably_not'::text, 'definitely_not'::text])))),
CHECK ((review_outcome = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
CHECK ((status = ANY (ARRAY['claimed'::text, 'in_progress'::text, 'submitted'::text, 'reviewed'::text]))));
create table public.community_playtests(
"id" uuid default gen_random_uuid() not null,
"developer_id" uuid not null,
"imported_game_id" uuid,
"approved_game_id" uuid,
"submission_id" uuid,
"title" text not null,
"access_link" text not null,
"instructions" text not null,
"focus_areas" text[] default '{}'::text[] not null,
"audience" text default 'playtested_testers'::text not null,
"target_testers" integer default 5 not null,
"estimated_minutes" integer,
"release_label" text,
"status" text default 'draft'::text not null,
"created_at" timestamp with time zone default now() not null,
"published_at" timestamp with time zone,
"share_token" uuid default gen_random_uuid() not null,
"access_type" text default 'other'::text not null,
"tester_hub_started_at" timestamp with time zone,
CHECK ((access_type = ANY (ARRAY['steam_demo'::text, 'steam_game'::text, 'browser_game'::text, 'download_build'::text, 'other'::text]))),
CHECK ((audience = ANY (ARRAY['playtested_testers'::text, 'own_community'::text, 'both'::text]))),
CHECK (((estimated_minutes >= 1) AND (estimated_minutes <= 1440))),
CHECK ((num_nonnulls(imported_game_id, approved_game_id, submission_id) = 1)),
PRIMARY KEY (id),
CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'paused'::text, 'closed'::text]))),
CHECK (((target_testers >= 1) AND (target_testers <= 100))));
create table public.game_developer_links(
"id" uuid default gen_random_uuid() not null,
"developer_id" uuid not null,
"imported_game_id" uuid,
"approved_game_id" uuid,
"submission_id" uuid,
"relationship" text not null,
"source_claim_id" uuid,
"created_at" timestamp with time zone default now() not null,
CHECK ((((imported_game_id IS NOT NULL) AND (approved_game_id IS NULL) AND (submission_id IS NULL)) OR ((imported_game_id IS NULL) AND (approved_game_id IS NOT NULL) AND (submission_id IS NULL)) OR ((imported_game_id IS NULL) AND (approved_game_id IS NULL) AND (submission_id IS NOT NULL)))),
PRIMARY KEY (id));
create table public.game_submissions(
"id" uuid default gen_random_uuid() not null,
"developer_id" uuid not null,
"title" text not null,
"developer_name" text not null,
"genre" text not null,
"description" text not null,
"game_link" text not null,
"image_url" text,
"price" text default ''::text not null,
"ai_type" text not null,
"ai_areas" text[] default '{}'::text[] not null,
"ai_explanation" text default ''::text not null,
"evidence_link" text default ''::text not null,
"status" text default 'Pending Review'::text not null,
"submitted_at" timestamp with time zone default now() not null,
"steam_url" text,
"review_reason" text,
"steam_app_id" text,
"release_status" text,
"release_date" date,
PRIMARY KEY (id),
CHECK (((release_status IS NULL) OR (release_status = ANY (ARRAY['Released'::text, 'Upcoming'::text, 'Not announced'::text])))),
CHECK ((status = ANY (ARRAY['Pending Review'::text, 'Approved'::text, 'Rejected'::text, 'Needs More Information'::text]))));
create table public.imported_games(
"id" uuid default gen_random_uuid() not null,
"steam_app_id" text not null,
"title" text not null,
"developer_name" text,
"genre" text,
"description" text,
"steam_url" text not null,
"image_url" text,
"price" text,
"release_date" date,
"imported_at" timestamp with time zone default now() not null,
"last_synced_at" timestamp with time zone default now() not null,
"catalogue_eligible" boolean default false not null,
"publisher_name" text,
"metadata_backfill_status" text default 'pending'::text not null,
"metadata_backfill_attempts" integer default 0 not null,
"metadata_backfill_error" text,
"catalogue_review_status" text,
"catalogue_review_reason" text,
"required_age" integer,
"content_descriptor_ids" integer[] default '{}'::integer[] not null,
"is_nsfw" boolean default false not null,
"content_descriptor_notes" text,
CHECK (((catalogue_review_status IS NULL) OR (catalogue_review_status = ANY (ARRAY['eligible'::text, 'held_for_review'::text, 'excluded'::text])))),
PRIMARY KEY (id),
UNIQUE (steam_app_id));
create table public.profiles(
"id" uuid not null,
"display_name" text default ''::text not null,
"created_at" timestamp with time zone default now() not null,
"role" text default 'user'::text not null,
"tester_xp" integer default 0 not null,
"completed_tests" integer default 0 not null,
"roles" text[] default ARRAY['player'::text] not null,
"developer_xp" integer default 0 not null,
CHECK ((completed_tests >= 0)),
CHECK ((developer_xp >= 0)),
PRIMARY KEY (id),
CHECK ((role = ANY (ARRAY['user'::text, 'developer'::text, 'admin'::text]))),
CHECK ((tester_xp >= 0)));
create table public.approved_games("id" uuid,"title" text,"developer_name" text,"genre" text,"description" text,"game_link" text,"image_url" text,"price" text,"ai_type" text,"ai_areas" text[],"ai_explanation" text,"evidence_link" text,"submitted_at" timestamp with time zone,"steam_app_id" text);
CREATE OR REPLACE FUNCTION public._playtested_limit_active_tests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Edits and progression within an existing active test are still allowed,
  -- including when this tester has multiple claims from before the rule.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tester_id IS NOT DISTINCT FROM OLD.tester_id
       AND OLD.status IN ('claimed', 'in_progress') THEN
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.status NOT IN ('claimed', 'in_progress') THEN
    RETURN NEW;
  END IF;

  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Claiming a test requires a normal read-committed request. Please retry from the Tester Hub.';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('playtested:tester:' || NEW.tester_id::text, 0)
  );

  IF EXISTS (
    SELECT 1 FROM public.community_game_tests t
    WHERE t.tester_id = NEW.tester_id
      AND t.status IN ('claimed', 'in_progress')
      AND t.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'One test at a time. Submit your feedback or release your current test before choosing another.';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public._playtested_launch_window(p_imported_game_id uuid, p_approved_game_id uuid, p_submission_id uuid)
 RETURNS TABLE(rounds_used integer, cooldown_until timestamp with time zone, quota_until timestamp with time zone, next_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$WITH reference_time AS MATERIALIZED (
  SELECT clock_timestamp() AS checked_at
), recent_launches AS (
  SELECT cp.tester_hub_started_at AS started_at
  FROM public.community_playtests cp
  CROSS JOIN reference_time t
  WHERE cp.tester_hub_started_at > t.checked_at - interval '720 hours'
    AND (
      (p_imported_game_id IS NOT NULL AND cp.imported_game_id = p_imported_game_id)
      OR (p_approved_game_id IS NOT NULL AND cp.approved_game_id = p_approved_game_id)
      OR (p_submission_id IS NOT NULL AND cp.submission_id = p_submission_id)
    )
), launch_totals AS (
  SELECT count(*)::integer AS used,
         max(r.started_at) AS latest_start,
         (array_agg(r.started_at ORDER BY r.started_at DESC))[2] AS second_latest_start
  FROM recent_launches r
), deadlines AS (
  SELECT l.used,
         CASE WHEN l.latest_start + interval '336 hours' > t.checked_at
              THEN l.latest_start + interval '336 hours' END AS cooldown_end,
         CASE WHEN l.used >= 2
              THEN l.second_latest_start + interval '720 hours' END AS quota_end
  FROM launch_totals l
  CROSS JOIN reference_time t
)
SELECT d.used, d.cooldown_end, d.quota_end,
       greatest(d.cooldown_end, d.quota_end)
FROM deadlines d;
$function$
;
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
      RAISE EXCEPTION 'Tester Hub launch unavailable until %. Maximum two launches per 30 days, with at least 14 days between launches.',
        v_window.next_at;
    END IF;
    NEW.tester_hub_started_at := v_now;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_community_game_test(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  new_test_id uuid;
  v_user_id uuid := auth.uid();
  v_is_submission boolean;
  v_is_playtest boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim a game.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id AND 'tester' = ANY(p.roles)
  ) THEN
    RAISE EXCEPTION 'You must have the Tester role to claim a game.';
  END IF;

  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Claiming a test requires a normal read-committed request. Please retry from the Tester Hub.';
  END IF;
  -- Same lock as the table trigger. This serializes concurrent tab requests
  -- before checking eligibility, and stays held until the transaction ends.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('playtested:tester:' || v_user_id::text, 0)
  );

  v_is_submission := EXISTS (
    SELECT 1 FROM public.game_submissions s
    WHERE s.id = p_submission_id AND s.status = 'Approved'
  );
  v_is_playtest := EXISTS (
    SELECT 1 FROM public.community_playtests p
    WHERE p.id = p_submission_id AND p.status = 'open'
      AND p.audience IN ('playtested_testers', 'both')
  );
  IF NOT v_is_submission AND NOT v_is_playtest THEN
    RAISE EXCEPTION 'This game is not available for community testing.';
  END IF;

  IF v_is_submission AND EXISTS (
    SELECT 1 FROM public.community_game_tests t
    WHERE t.submission_id = p_submission_id AND t.tester_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already tested or claimed this game.';
  END IF;
  IF v_is_playtest AND EXISTS (
    SELECT 1 FROM public.community_game_tests t
    WHERE t.playtest_id = p_submission_id AND t.tester_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already tested or claimed this playtest.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_game_tests t
    WHERE t.tester_id = v_user_id AND t.status IN ('claimed', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'One test at a time. Submit your feedback or release your current test before choosing another.';
  END IF;

  IF v_is_submission THEN
    INSERT INTO public.community_game_tests(submission_id, tester_id, status)
    VALUES(p_submission_id, v_user_id, 'claimed')
    RETURNING id INTO new_test_id;
  ELSE
    INSERT INTO public.community_game_tests(playtest_id, tester_id, status)
    VALUES(p_submission_id, v_user_id, 'claimed')
    RETURNING id INTO new_test_id;
  END IF;
  RETURN new_test_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_community_playtest(p_imported_game_id uuid, p_approved_game_id uuid, p_submission_id uuid, p_access_link text, p_access_type text, p_instructions text, p_focus_areas text[], p_audience text, p_target_testers integer, p_estimated_minutes integer, p_release_label text, p_publish boolean)
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
    published_at
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
    end
  )
  returning id into v_playtest_id;

  return v_playtest_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_community_playtest(p_playtest_id uuid, p_access_link text, p_access_type text, p_instructions text, p_focus_areas text[], p_audience text, p_target_testers integer, p_estimated_minutes integer, p_release_label text, p_status text)
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
      and cgt.review_outcome = 'accepted'
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
$function$
;
CREATE OR REPLACE FUNCTION public.release_community_game_test(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_test_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select t.id
  into v_test_id
  from public.community_game_tests t
  where t.tester_id = v_user_id
    and (
      t.submission_id = p_submission_id
      or t.playtest_id = p_submission_id
    )
    and t.status in ('claimed', 'in_progress')
  limit 1;

  if v_test_id is null then
    raise exception 'No active test claim was found for this game.';
  end if;

  delete from public.community_game_tests
  where id = v_test_id
    and tester_id = v_user_id;
end;
$function$
;
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
  WHERE s.status = 'Approved'
    AND NOT EXISTS (
      SELECT 1 FROM public.community_playtests p
      WHERE p.submission_id = s.id AND p.status = 'open'
        AND p.audience IN ('playtested_testers', 'both')
    )

  UNION ALL

  -- Campaigns: keep the campaign's build link ahead of Store fallbacks.
  -- A Store link doesn't guarantee ownership or a free demo.
  SELECT p.id, p.title,
         coalesce(ig.developer_name, ag.developer_name, s.developer_name,
                  'Independent developer'),
         coalesce(ig.genre, ag.genre, s.genre, 'Other'),
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
  WHERE p.status = 'open'
    AND p.audience IN ('playtested_testers', 'both')
  ORDER BY title;
$function$
;
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
        'The two-launch allowance is used. The next slot opens when an earlier launch leaves the rolling 30-day window.'
      when v_window.cooldown_until is not null then
        'The 14-day cooldown between Tester Hub launches is still active.'
      else 'Eligible for a new Playtested Tester Hub round.'
    end,
    v_window.next_at,
    v_window.rounds_used;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.review_community_game_test(p_test_id uuid, p_outcome text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_tester_id uuid;
    v_status text;
    v_xp_awarded boolean;
    v_rows_updated integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be signed in.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only an admin can review tests.';
    END IF;

    IF p_outcome NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Outcome must be accepted or rejected.';
    END IF;

    SELECT
        t.tester_id,
        t.status,
        t.xp_awarded
    INTO
        v_tester_id,
        v_status,
        v_xp_awarded
    FROM public.community_game_tests AS t
    WHERE t.id = p_test_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Test not found.';
    END IF;

    IF v_status <> 'submitted' THEN
        RAISE EXCEPTION 'Only submitted tests can be reviewed.';
    END IF;

    IF v_xp_awarded THEN
        RAISE EXCEPTION 'XP has already been awarded for this test.';
    END IF;

    IF p_outcome = 'accepted' THEN
        UPDATE public.profiles
        SET tester_xp = tester_xp + 100,
            completed_tests = completed_tests + 1
        WHERE id = v_tester_id;

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

        IF v_rows_updated <> 1 THEN
            RAISE EXCEPTION 'Tester profile not found. No changes saved.';
        END IF;
    END IF;

    UPDATE public.community_game_tests
    SET review_outcome = p_outcome,
        xp_awarded = (p_outcome = 'accepted'),
        status = 'reviewed',
        reviewed_at = now()
    WHERE id = p_test_id;
END;
$function$
;
CREATE TRIGGER playtested_one_active_test BEFORE INSERT OR UPDATE ON public.community_game_tests FOR EACH ROW EXECUTE FUNCTION _playtested_limit_active_tests();
CREATE UNIQUE INDEX community_game_tests_playtest_tester_unique ON public.community_game_tests USING btree (playtest_id, tester_id) WHERE (playtest_id IS NOT NULL);
CREATE INDEX community_game_tests_playtest_id_idx ON public.community_game_tests USING btree (playtest_id);
CREATE UNIQUE INDEX community_game_tests_submission_tester_unique ON public.community_game_tests USING btree (submission_id, tester_id) WHERE (submission_id IS NOT NULL);
CREATE TRIGGER playtested_guard_launch BEFORE INSERT OR UPDATE ON public.community_playtests FOR EACH ROW EXECUTE FUNCTION _playtested_guard_launch();
CREATE INDEX community_playtests_developer_idx ON public.community_playtests USING btree (developer_id, created_at DESC);
CREATE INDEX community_playtests_open_idx ON public.community_playtests USING btree (status, published_at DESC);
CREATE UNIQUE INDEX community_playtests_one_active_imported_game ON public.community_playtests USING btree (imported_game_id) WHERE ((imported_game_id IS NOT NULL) AND (status = ANY (ARRAY['draft'::text, 'open'::text, 'paused'::text])));
CREATE UNIQUE INDEX community_playtests_one_active_approved_game ON public.community_playtests USING btree (approved_game_id) WHERE ((approved_game_id IS NOT NULL) AND (status = ANY (ARRAY['draft'::text, 'open'::text, 'paused'::text])));
CREATE UNIQUE INDEX community_playtests_one_active_submission_game ON public.community_playtests USING btree (submission_id) WHERE ((submission_id IS NOT NULL) AND (status = ANY (ARRAY['draft'::text, 'open'::text, 'paused'::text])));
CREATE UNIQUE INDEX community_playtests_share_token_key ON public.community_playtests USING btree (share_token);

grant usage on schema auth to anon,authenticated;
alter table public.profiles enable row level security;grant select on public.profiles to authenticated;
create policy "Users can read own profile" on public.profiles for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = id));
alter table public.community_game_tests enable row level security;grant select on public.community_game_tests to authenticated;
create policy "Testers can view own tests" on public.community_game_tests for SELECT to authenticated using ((auth.uid() = tester_id));
create policy "Authenticated users can view approved game tests" on public.community_game_tests for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM game_submissions s
  WHERE ((s.id = community_game_tests.submission_id) AND (s.status = 'Approved'::text)))));
alter table public.community_playtests enable row level security;grant select on public.community_playtests to authenticated;
create policy "Developers can view own community playtests" on public.community_playtests for SELECT to authenticated using ((developer_id = auth.uid()));
create policy "Admins can view all community playtests" on public.community_playtests for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ('admin'::text = ANY (profiles.roles))))));

create table public.community_playtest_participants("id" uuid default gen_random_uuid() not null,"playtest_id" uuid not null,"tester_id" uuid not null,"source" text default 'community'::text not null,"status" text default 'testing'::text not null,"joined_at" timestamp with time zone default now() not null,"completed_at" timestamp with time zone,PRIMARY KEY (id),UNIQUE (playtest_id, tester_id),CHECK ((source = 'community'::text)),CHECK ((status = ANY (ARRAY['testing'::text, 'completed'::text]))));
CREATE OR REPLACE FUNCTION public.start_community_game_test(p_test_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_tester_id uuid;
    v_status text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be signed in.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND 'tester' = ANY(roles)
    ) THEN
        RAISE EXCEPTION 'You must have the Tester role to start a test.';
    END IF;

    SELECT t.tester_id, t.status
    INTO v_tester_id, v_status
    FROM public.community_game_tests AS t
    WHERE t.id = p_test_id
    FOR UPDATE;

    IF NOT FOUND OR v_tester_id <> auth.uid() THEN
        RAISE EXCEPTION 'Test not found or you do not own this claim.';
    END IF;

    IF v_status <> 'claimed' THEN
        RAISE EXCEPTION 'Only claimed games can be started.';
    END IF;

    UPDATE public.community_game_tests
    SET status = 'in_progress'
    WHERE id = p_test_id;
END;
$function$
;

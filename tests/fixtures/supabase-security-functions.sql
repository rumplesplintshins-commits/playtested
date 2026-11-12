-- Metadata-only baseline definitions from the existing local fixture database.
-- Named signatures/bodies match issue #52 audit; no user rows, keys or credentials.
CREATE OR REPLACE FUNCTION public.award_developer_xp(p_developer_id uuid, p_xp_amount integer, p_award_type text, p_source_type text, p_source_id uuid, p_description text)
 RETURNS TABLE(awarded boolean, xp_awarded integer, developer_xp integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted_id uuid;
  v_developer_xp integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_xp_amount <= 0 then
    raise exception 'XP amount must be greater than zero.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only an admin can award developer XP.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_developer_id
  ) then
    raise exception 'Developer profile not found.';
  end if;

  insert into public.developer_xp_awards (
    developer_id,
    xp_amount,
    award_type,
    source_type,
    source_id,
    description
  )
  values (
    p_developer_id,
    p_xp_amount,
    p_award_type,
    p_source_type,
    p_source_id,
    p_description
  )
  on conflict (developer_id, award_type, source_type, source_id)
  do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    select coalesce(p.developer_xp, 0)
    into v_developer_xp
    from public.profiles p
    where p.id = p_developer_id;

    return query
    select
      false,
      0,
      v_developer_xp;

    return;
  end if;

  update public.profiles
  set developer_xp = developer_xp + p_xp_amount
  where id = p_developer_id
  returning profiles.developer_xp into v_developer_xp;

  return query
  select
    true,
    p_xp_amount,
    v_developer_xp;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_community_test_reviews()
 RETURNS TABLE(test_id uuid, submission_id uuid, tester_id uuid, tester_name text, game_title text, status text, overall_score integer, gameplay_score integer, performance_score integer, continue_playing text, recommend_game text, enjoyed_most text, frustrations text, bugs_found text, biggest_improvement text, feedback text, hours_played numeric, focus_responses jsonb, submitted_at timestamp with time zone, review_outcome text, xp_awarded boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  return query
  select
    t.id,
    coalesce(t.submission_id, t.playtest_id),
    t.tester_id,
    coalesce(p.display_name, 'Unknown tester'),
    coalesce(s.title, cp.title, 'Unknown game'),
    t.status,

    t.overall_score,
    t.gameplay_score,
    t.performance_score,

    t.continue_playing,
    t.recommend_game,

    t.enjoyed_most,
    t.frustrations,
    t.bugs_found,
    t.biggest_improvement,
    t.feedback,

    t.hours_played,
    coalesce(t.focus_responses, '{}'::jsonb),

    t.submitted_at,
    t.review_outcome,
    t.xp_awarded

  from public.community_game_tests t

  left join public.game_submissions s
    on s.id = t.submission_id

  left join public.community_playtests cp
    on cp.id = t.playtest_id

  left join public.profiles p
    on p.id = t.tester_id

  where t.status = 'submitted'

  order by t.submitted_at asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_game_identity(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select trim(
    regexp_replace(
      regexp_replace(
        lower(coalesce(value, '')),
        '[^a-z0-9]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.set_game_build_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_technical_test_run_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

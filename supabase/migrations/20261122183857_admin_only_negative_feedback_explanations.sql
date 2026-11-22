BEGIN;
CREATE TABLE IF NOT EXISTS playtested_studios.feedback_not_useful_reasons (
  test_id uuid PRIMARY KEY REFERENCES public.community_game_tests(id) ON DELETE CASCADE,
  developer_id uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  marked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT feedback_not_useful_reason_length CHECK (char_length(btrim(reason)) BETWEEN 10 AND 500)
);
ALTER TABLE playtested_studios.feedback_not_useful_reasons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON playtested_studios.feedback_not_useful_reasons FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_test_feedback_usefulness(p_test_id uuid, p_usefulness text, p_reason text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_test public.community_game_tests%rowtype;
  v_developer_id uuid;
  v_developer_award uuid;
  v_tester_award bigint;
  v_reason_changed boolean := false;
  v_game_title text;
  v_admin record;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_usefulness is null or p_usefulness not in ('useful','not_useful') then
    raise exception 'Choose useful or not useful.';
  end if;
  if p_usefulness='not_useful' and (p_reason is null or char_length(btrim(p_reason)) not between 10 and 500) then
    raise exception 'Explain why this feedback was not useful (10–500 characters).';
  end if;
  if p_usefulness='useful' and nullif(btrim(p_reason),'') is not null then
    raise exception 'A reason is only accepted for Not useful.';
  end if;
  perform public._lock_feedback_review(p_test_id);
  -- Capacity -> campaign -> feedback -> profile, shared with moderation.
  perform 1 from public.community_playtests
  where id = (select playtest_id from public.community_game_tests where id = p_test_id)
  for update;
  select t.* into v_test from public.community_game_tests t where t.id = p_test_id for update;
  if not found or v_test.review_outcome is distinct from 'accepted'
     or v_test.status is distinct from 'reviewed' or v_test.replacement_at is not null then
    raise exception 'Accepted tester feedback not found.';
  end if;
  select developer_id into v_developer_id from public.community_playtests where id = v_test.playtest_id;
  if v_developer_id is distinct from auth.uid() then
    raise exception 'Only the developer who owns this playtest can rate its feedback.';
  end if;
  -- Do not repeat XP, timestamps or notifications for an identical retry.
  if v_test.feedback_usefulness=p_usefulness and
    (p_usefulness='useful' or exists (
      select 1 from playtested_studios.feedback_not_useful_reasons r
      where r.test_id=p_test_id and r.reason=btrim(p_reason)
    ))
  then return p_usefulness; end if;
  -- Lock both balances in deterministic order for accounts with overlapping roles.
  perform 1 from public.profiles where id in (v_developer_id,v_test.tester_id) order by id for update;

  update public.community_game_tests set feedback_usefulness = p_usefulness,
    feedback_usefulness_marked_at = clock_timestamp(),feedback_usefulness_marked_by = auth.uid()
  where id = p_test_id;

  insert into public.developer_xp_awards(developer_id,xp_amount,award_type,source_type,source_id,description)
  values(v_developer_id,10,'feedback_review','community_game_test',p_test_id,
    'Reviewed accepted tester feedback: +10 Developer XP.')
  on conflict do nothing returning id into v_developer_award;
  if v_developer_award is not null then
    update public.profiles set developer_xp = developer_xp + 10 where id = v_developer_id;
    if not found then raise exception 'Developer profile missing.'; end if;
    perform public._create_notification(v_developer_id,'developer_feedback_received',
      'You earned +10 Developer XP','You reviewed accepted tester feedback. This feedback can earn review XP only once.',
      '/account#developer-xp-history','playtest',v_test.playtest_id,'feedback:developer-review-xp:' || p_test_id::text);
  end if;

  if p_usefulness = 'not_useful' then
    insert into playtested_studios.feedback_not_useful_reasons(test_id,developer_id,reason,marked_at)
    values(p_test_id,v_developer_id,btrim(p_reason),clock_timestamp())
    on conflict (test_id) do update
      set reason=excluded.reason,developer_id=excluded.developer_id,marked_at=excluded.marked_at
      where playtested_studios.feedback_not_useful_reasons.reason is distinct from excluded.reason
    returning true into v_reason_changed;

    if coalesce(v_reason_changed,false) then
      select coalesce(nullif(btrim(c.title),''),'this game') into v_game_title
      from public.community_playtests c where c.id=v_test.playtest_id;
      for v_admin in select id from public.profiles where role='admin' loop
        perform public._create_notification(
          v_admin.id,'admin_feedback_moderation',
          left('Developer marked feedback as Not useful - '||coalesce(v_game_title,'this game'),120),
          'A developer has explained why an accepted playtest review was not useful. View the explanation in Reviewed.',
          '/admin/submissions?tab=playtests&review=reviewed#report-'||p_test_id::text,
          'playtest',v_test.playtest_id,'feedback:not-useful-reason:'||p_test_id::text
        );
      end loop;
    end if;
  end if;

  if p_usefulness = 'useful' then
    insert into public.test_review_events(test_id,actor_id,kind,reason,xp_delta)
    values(p_test_id,auth.uid(),'tester_feedback_useful',
      'Your feedback was marked Useful. One-time bonus: +5 Tester XP.',5)
    on conflict (test_id) where kind = 'tester_feedback_useful'
    do nothing returning id into v_tester_award;
    if v_tester_award is not null then
      update public.profiles set tester_xp = tester_xp + 5 where id = v_test.tester_id;
      if not found then raise exception 'Tester profile missing.'; end if;
      perform public._create_notification(v_test.tester_id,'tester_feedback_useful',
        'Your feedback was marked Useful!','The developer found your feedback helpful. You''ve earned an additional 5 XP.',
        '/tester#testing-activity-' || p_test_id::text,'playtest',v_test.playtest_id,'feedback:useful-xp:' || p_test_id::text);
    end if;
  end if;
  return p_usefulness;
end;
$function$;
CREATE OR REPLACE FUNCTION public.mark_test_feedback_usefulness(p_test_id uuid, p_usefulness text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_usefulness='not_useful' THEN
    RAISE EXCEPTION 'Explain why this feedback was not useful (10–500 characters).';
  END IF;
  RETURN public.mark_test_feedback_usefulness(p_test_id,p_usefulness,NULL::text);
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_admin_feedback_not_useful_reasons(p_test_ids uuid[])
 RETURNS TABLE(test_id uuid, reason text, marked_at timestamp with time zone, developer_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'
  ) THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;
  IF p_test_ids IS NULL OR cardinality(p_test_ids)>5000 THEN
    RAISE EXCEPTION 'Invalid review selection.';
  END IF;
  RETURN QUERY
  SELECT n.test_id,n.reason,n.marked_at,n.developer_id
  FROM playtested_studios.feedback_not_useful_reasons n
  WHERE n.test_id=ANY(p_test_ids);
END;
$function$;
REVOKE ALL ON FUNCTION public.mark_test_feedback_usefulness(uuid,text,text), public.mark_test_feedback_usefulness(uuid,text), public.get_admin_feedback_not_useful_reasons(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_test_feedback_usefulness(uuid,text,text), public.mark_test_feedback_usefulness(uuid,text), public.get_admin_feedback_not_useful_reasons(uuid[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
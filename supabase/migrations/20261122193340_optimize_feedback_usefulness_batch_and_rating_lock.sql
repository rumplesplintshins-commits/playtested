-- The already-applied production migration (20261122193340).
-- Ratings do not affect campaign capacity or tester availability.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_developer_feedback_usefulness_for_campaign(p_playtest_id uuid)
RETURNS TABLE(test_id uuid,usefulness text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $batch$
  SELECT t.id,t.feedback_usefulness
  FROM public.community_game_tests t
  JOIN public.community_playtests c ON c.id=t.playtest_id
  WHERE c.id=p_playtest_id AND c.developer_id=auth.uid()
    AND t.status='reviewed' AND t.review_outcome='accepted' AND t.replacement_at IS NULL;
$batch$;
REVOKE ALL ON FUNCTION public.get_developer_feedback_usefulness_for_campaign(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_developer_feedback_usefulness_for_campaign(uuid) TO authenticated;

DROP TRIGGER aa_campaign_completion ON public.community_game_tests;
CREATE TRIGGER aa_campaign_completion
AFTER INSERT OR UPDATE OF status,review_outcome,replacement_at,playtest_id
ON public.community_game_tests FOR EACH ROW
EXECUTE FUNCTION public.process_campaign_completion();

DROP TRIGGER m26_reservation_availability ON public.community_game_tests;
CREATE TRIGGER m26_reservation_availability
AFTER INSERT OR DELETE OR UPDATE OF
  status,review_outcome,replacement_at,playtest_id,
  reservation_expires_at,reservation_started_at,reservation_round,
  tester_id,submission_id,legacy_submission_id
ON public.community_game_tests FOR EACH ROW
EXECUTE FUNCTION public._m26_reservation_availability_event();

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
  -- Rating-only changes are serialized on the feedback row, not campaign capacity.
  -- Moderation acquires this same row lock, preserving concurrent review safety.
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
NOTIFY pgrst,'reload schema';
COMMIT;
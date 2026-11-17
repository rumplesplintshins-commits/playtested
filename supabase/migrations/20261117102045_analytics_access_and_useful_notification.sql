begin;
-- Restore the existing service-only analytics contract even on schema-only QA restores.
-- User-facing APIs must authenticate an administrator before using this credential.
revoke all on function public.m24_analytics_summary(),public.m24_platform_user_summary(),public.admin_game_activity_metrics() from public,anon,authenticated;
grant execute on function public.m24_analytics_summary(),public.m24_platform_user_summary(),public.admin_game_activity_metrics() to service_role;
-- Wording only: keep both independently deduplicated reward/event paths unchanged.
create or replace function public.mark_test_feedback_usefulness(p_test_id uuid,p_usefulness text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_test public.community_game_tests%rowtype;
  v_developer_id uuid;
  v_developer_award uuid;
  v_tester_award bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_usefulness is null or p_usefulness not in ('useful','not_useful') then
    raise exception 'Choose useful or not useful.';
  end if;
  -- Same campaign -> feedback -> profile ordering as quality moderation.
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
$$;
revoke all on function public.mark_test_feedback_usefulness(uuid,text) from public,anon;
grant execute on function public.mark_test_feedback_usefulness(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

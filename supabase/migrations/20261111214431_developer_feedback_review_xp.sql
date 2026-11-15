begin;

-- A separate immutable award key; moderation continues to adjust only base_xp_amount.
create unique index test_review_events_developer_review_once
  on public.test_review_events(test_id) where kind = 'developer_feedback_reviewed';

create or replace function public.mark_test_feedback_usefulness(
  p_test_id uuid,
  p_usefulness text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test public.community_game_tests%rowtype;
  v_developer_id uuid;
  v_award_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_usefulness is null or p_usefulness not in ('useful','not_useful') then
    raise exception 'Choose useful or not useful.';
  end if;

  -- Match the existing moderation lock order: campaign -> feedback -> profile.
  perform 1 from public.community_playtests
  where id = (select playtest_id from public.community_game_tests where id = p_test_id)
  for update;

  select t.* into v_test
  from public.community_game_tests t
  where t.id = p_test_id
  for update;

  if not found or v_test.review_outcome is distinct from 'accepted' or v_test.replacement_at is not null then
    raise exception 'Accepted tester feedback not found.';
  end if;

  select c.developer_id into v_developer_id
  from public.community_playtests c
  where c.id = v_test.playtest_id;

  if v_developer_id is distinct from auth.uid() then
    raise exception 'Only the developer who owns this playtest can rate its feedback.';
  end if;


  update public.community_game_tests
  set feedback_usefulness = p_usefulness,
      feedback_usefulness_marked_at = clock_timestamp(),
      feedback_usefulness_marked_by = auth.uid()
  where id = p_test_id;

  insert into public.test_review_events(test_id,actor_id,kind,reason,xp_delta)
  values(p_test_id,auth.uid(),'developer_feedback_reviewed',
    'Developer reviewed your feedback. One-time review bonus: +5 XP.',5)
  on conflict (test_id) where kind = 'developer_feedback_reviewed'
  do nothing returning id into v_award_id;

  if v_award_id is not null then
    update public.profiles set tester_xp = tester_xp + 5 where id = v_test.tester_id;
    if not found then raise exception 'Tester profile missing.'; end if;
    -- Reuse the existing bell kind and delivery-key deduplication. Neither
    -- the history nor notification discloses the developer's rating.
    perform public._create_notification(
      v_test.tester_id, 'tester_feedback_useful',
      'Your feedback has been reviewed',
      'A developer reviewed your feedback. You earned a one-time +5 XP bonus.',
      '/tester#testing-activity-' || p_test_id::text,
      'playtest', v_test.playtest_id, 'feedback:reviewed:' || p_test_id::text
    );
  end if;

  return p_usefulness;
end;
$$;

revoke all on function public.mark_test_feedback_usefulness(uuid,text) from public,anon;
grant execute on function public.mark_test_feedback_usefulness(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;

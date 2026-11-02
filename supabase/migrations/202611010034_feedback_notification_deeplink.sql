begin;

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
  v_previous text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_usefulness not in ('useful','not_useful') then
    raise exception 'Choose useful or not useful.';
  end if;

  select t.* into v_test
  from public.community_game_tests t
  where t.id = p_test_id
  for update;

  if not found or v_test.review_outcome is distinct from 'accepted' then
    raise exception 'Accepted tester feedback not found.';
  end if;

  select c.developer_id into v_developer_id
  from public.community_playtests c
  where c.id = v_test.playtest_id;

  if v_developer_id is distinct from auth.uid() then
    raise exception 'Only the developer who owns this playtest can rate its feedback.';
  end if;

  v_previous := v_test.feedback_usefulness;

  update public.community_game_tests
  set feedback_usefulness = p_usefulness,
      feedback_usefulness_marked_at = clock_timestamp(),
      feedback_usefulness_marked_by = auth.uid()
  where id = p_test_id;

  if p_usefulness = 'useful' and v_previous is distinct from 'useful' then
    perform public._create_notification(
      v_test.tester_id,
      'tester_feedback_useful',
      'Your feedback was marked as useful',
      'A developer found your feedback helpful.',
      '/tester#testing-activity-' || p_test_id::text,
      'playtest',
      v_test.playtest_id,
      'feedback:useful:' || p_test_id::text
    );
  end if;

  return p_usefulness;
end;
$$;

-- Existing usefulness notifications should also land on the exact activity card.
update public.notifications
set href = '/tester#testing-activity-' || substring(dedupe_key from length('feedback:useful:') + 1)
where kind = 'tester_feedback_useful'
  and dedupe_key like 'feedback:useful:%';

notify pgrst, 'reload schema';
commit;

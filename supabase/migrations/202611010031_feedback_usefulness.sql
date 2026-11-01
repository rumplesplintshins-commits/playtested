begin;

alter table public.community_game_tests
  add column feedback_usefulness text
    check (feedback_usefulness is null or feedback_usefulness in ('useful','not_useful')),
  add column feedback_usefulness_marked_at timestamptz,
  add column feedback_usefulness_marked_by uuid references public.profiles(id) on delete set null;

alter table public.notifications
  drop constraint notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check check (kind in (
    'admin_new_submission',
    'submission_needs_info',
    'submission_approved',
    'tester_playtest_available',
    'tester_feedback_useful'
  ));

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

  select t.*
  into v_test
  from public.community_game_tests t
  where t.id = p_test_id
  for update;

  if not found or v_test.review_outcome is distinct from 'accepted' then
    raise exception 'Accepted tester feedback not found.';
  end if;

  select c.developer_id
  into v_developer_id
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

  -- A positive judgement is useful feedback for the tester, so surface it once.
  -- Negative judgements are stored for future quality/ranking analysis but are not
  -- pushed to the tester as a punitive notification.
  if p_usefulness = 'useful' and v_previous is distinct from 'useful' then
    perform public._create_notification(
      v_test.tester_id,
      'tester_feedback_useful',
      'Your feedback was marked as useful',
      'A developer found your feedback helpful.',
      '/tester',
      'playtest',
      v_test.playtest_id,
      'feedback:useful:' || p_test_id::text
    );
  end if;

  return p_usefulness;
end;
$$;

create or replace function public.get_my_feedback_usefulness()
returns table(
  test_id uuid,
  playtest_id uuid,
  usefulness text,
  marked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.playtest_id,
    t.feedback_usefulness,
    t.feedback_usefulness_marked_at
  from public.community_game_tests t
  where t.tester_id = auth.uid()
    and t.feedback_usefulness is not null
  order by t.feedback_usefulness_marked_at desc nulls last;
$$;

revoke all on function public.mark_test_feedback_usefulness(uuid,text),
              public.get_my_feedback_usefulness()
from public, anon;

grant execute on function public.mark_test_feedback_usefulness(uuid,text),
                  public.get_my_feedback_usefulness()
to authenticated;

notify pgrst, 'reload schema';
commit;

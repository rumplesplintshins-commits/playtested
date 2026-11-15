begin;

-- Freeze award inputs during the one-time reconciliation, without changing RLS.
lock table public.community_playtests, public.community_game_tests,
  public.profiles, public.test_review_events, public.developer_xp_awards
  in share row exclusive mode;

create unique index if not exists test_review_events_useful_bonus_once
  on public.test_review_events(test_id) where kind = 'tester_feedback_useful';
create unique index if not exists test_review_events_review_bonus_correction_once
  on public.test_review_events(test_id) where kind = 'review_bonus_correction';
-- A feedback record cannot earn another developer award after an ownership change.
create unique index if not exists developer_xp_awards_feedback_review_once
  on public.developer_xp_awards(source_id)
  where award_type = 'feedback_review' and source_type = 'community_game_test';

-- Only reconcile positively identified awards from the previous implementation.
-- Never infer an XP award from a rating, or backfill developer XP for old reviews.
-- Preserve a prior Useful award if the current rating or the older Useful-only
-- notification delivery key proves eligibility. Historical toggles were not logged.
do $$
declare r record;
begin
  for r in
    select e.id as event_id, e.test_id, e.actor_id, t.tester_id,
      (t.feedback_usefulness = 'useful' or exists (
        select 1 from public.notification_delivery_keys k
        where k.recipient_id = t.tester_id
          and k.dedupe_key = 'feedback:useful:' || t.id::text
      )) as retain
    from public.test_review_events e
    join public.community_game_tests t on t.id = e.test_id
    where e.kind = 'developer_feedback_reviewed' and e.xp_delta = 5
      and not exists (select 1 from public.test_review_events m
        where m.test_id = e.test_id
          and m.kind in ('tester_feedback_useful','review_bonus_correction'))
    order by e.id
  loop
    if r.retain then
      -- A zero-delta adoption marker records existing XP, not a new award.
      insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta)
      values(r.test_id,r.actor_id,'tester_feedback_useful',
        'Existing +5 XP review bonus retained for Useful feedback. No additional XP awarded.',
        jsonb_build_object('legacy_review_event_id',r.event_id,'retained_existing_award',true),0);
    else
      update public.profiles set tester_xp = tester_xp - 5
      where id = r.tester_id and tester_xp >= 5;
      if not found then raise exception 'Cannot safely reconcile legacy review bonus: missing profile or insufficient XP.'; end if;
      insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta)
      values(r.test_id,r.actor_id,'review_bonus_correction',
        'Removed the previous +5 XP review bonus: Not useful does not earn tester XP. Base playtest XP is unchanged.',
        jsonb_build_object('legacy_review_event_id',r.event_id),-5);
      -- Correct the existing local award message rather than sending a new award alert.
      update public.notifications set title = 'Review XP correction',
        message = 'The previous +5 XP review bonus was removed under the corrected reward rules. Your base playtest XP is unchanged.'
      where recipient_id = r.tester_id and dedupe_key = 'feedback:reviewed:' || r.test_id::text;
    end if;
  end loop;
end;
$$;

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
        'You earned +5 Tester XP','A developer marked your feedback Useful. You earned a one-time +5 Tester XP bonus.',
        '/tester#testing-activity-' || p_test_id::text,'playtest',v_test.playtest_id,'feedback:useful-xp:' || p_test_id::text);
    end if;
  end if;
  return p_usefulness;
end;
$$;

-- Narrow self-only history projection; no source feedback ID or tester identity.
create or replace function public.get_my_developer_xp_history(p_limit integer default 20)
returns table(id uuid,xp_amount integer,description text,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id,a.xp_amount,a.description,a.created_at from public.developer_xp_awards a
  where a.developer_id = auth.uid()
  order by a.created_at desc,a.id desc limit least(greatest(coalesce(p_limit,20),1),50);
$$;
revoke all on function public.mark_test_feedback_usefulness(uuid,text),public.get_my_developer_xp_history(integer) from public,anon;
grant execute on function public.mark_test_feedback_usefulness(uuid,text),public.get_my_developer_xp_history(integer) to authenticated;
notify pgrst, 'reload schema';
commit;

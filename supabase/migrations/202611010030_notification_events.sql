begin;

-- Persist only asynchronous events that the recipient did not just perform themselves.
-- Toast confirmations remain client-side and are intentionally not stored here.

create or replace function public.notify_submission_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_title text;
begin
  v_title := coalesce(nullif(btrim(new.title), ''), 'Game submission');

  if tg_op = 'INSERT' then
    for v_admin_id in
      select p.id from public.profiles p where p.role = 'admin'
    loop
      perform public._create_notification(
        v_admin_id,
        'admin_new_submission',
        'New submission: ' || v_title,
        v_title || ' has been submitted for review.',
        '/admin',
        'submission',
        new.id,
        'submission:new:' || new.id::text || ':admin:' || v_admin_id::text
      );
    end loop;
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'Needs More Information' then
      perform public._create_notification(
        new.developer_id,
        'developer_more_info',
        'Needs more information',
        v_title || ' needs more information. Review the request and update your submission.',
        '/developer',
        'submission',
        new.id,
        'submission:more-info:' || new.id::text || ':revision:' || coalesce(new.submission_revision, 0)::text
      );
    elsif new.status = 'Approved' then
      perform public._create_notification(
        new.developer_id,
        'developer_approved',
        'Game approved',
        v_title || ' has been approved and added to the Playtested catalogue.',
        '/developer',
        'submission',
        new.id,
        'submission:approved:' || new.id::text
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_submission_lifecycle on public.game_submissions;
create trigger notify_submission_lifecycle
after insert or update of status on public.game_submissions
for each row execute function public.notify_submission_lifecycle();

create or replace function public.notify_playtest_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tester_id uuid;
  v_title text;
  v_genres text[];
  v_genre_label text;
begin
  -- The existing campaign model uses published as the tester-visible state.
  if new.status is distinct from 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from 'published' then
    return new;
  end if;

  v_title := coalesce(nullif(btrim(new.title), ''), 'A game');
  v_genres := public.game_genres(new.testing_genre);
  v_genre_label := case
    when new.genre_restricted and cardinality(array_remove(v_genres, 'Other')) > 0
      then array_to_string(array_remove(v_genres, 'Other'), ', ')
    else null
  end;

  for v_tester_id in
    select p.id
    from public.profiles p
    where 'tester' = any(p.roles)
      and public.tester_rank(p.id) >= new.minimum_rank
      and (
        not new.genre_restricted
        or array_remove(v_genres, 'Other') && public.normalize_testing_genres(p.preferred_genres)
      )
      -- Playtested already enforces one active test. Do not alert someone who cannot act.
      and not exists (
        select 1
        from public.community_game_tests t
        where t.tester_id = p.id
          and t.status not in ('submitted', 'reviewed', 'released', 'cancelled')
      )
  loop
    perform public._create_notification(
      v_tester_id,
      'tester_playtest_available',
      case when v_genre_label is null then 'New playtest available' else 'New ' || v_genre_label || ' playtest available' end,
      v_title || ' is now looking for testers.',
      '/tester',
      'playtest',
      new.id,
      'playtest:available:' || new.id::text || ':tester:' || v_tester_id::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_playtest_available on public.community_playtests;
create trigger notify_playtest_available
after insert or update of status on public.community_playtests
for each row execute function public.notify_playtest_available();

revoke all on function public.notify_submission_lifecycle(), public.notify_playtest_available() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;

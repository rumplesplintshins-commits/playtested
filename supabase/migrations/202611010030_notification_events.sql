begin;

-- Persist only events the recipient did not just perform themselves.
-- Toasts remain client-side confirmations and are intentionally not stored here.

create or replace function public.notify_submission_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.profiles%rowtype;
  v_title text;
  v_reason text;
begin
  v_title := coalesce(nullif(btrim(new.title), ''), 'Game submission');

  -- A newly-created developer submission is useful asynchronous work for admins.
  if tg_op = 'INSERT' then
    for v_admin in
      select p.* from public.profiles p where p.role = 'admin'
    loop
      perform public._create_notification(
        v_admin.id,
        'admin_new_submission',
        'New submission: ' || v_title,
        v_title || ' has been submitted for review.',
        '/admin',
        'submission',
        new.id,
        'submission:new:' || new.id::text || ':admin:' || v_admin.id::text
      );
    end loop;
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'Needs More Information' then
      v_reason := nullif(btrim(new.review_reason), '');
      perform public._create_notification(
        new.developer_id,
        'developer_more_info',
        'Needs more information',
        case
          when v_reason is null then v_title || ' needs more information. Review the request and update your submission.'
          else v_title || ' needs more information. Review the request and update your submission.'
        end,
        '/submit/' || new.id::text,
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

-- Keep the trigger deliberately narrow: no developer bell entry for their own submit/resubmit.
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
  v_tester public.profiles%rowtype;
  v_title text;
  v_genres text[];
  v_genre_label text;
  v_now timestamptz := clock_timestamp();
begin
  -- Only notify on the transition into a genuinely published/available campaign.
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

  for v_tester in
    select p.*
    from public.profiles p
    where 'tester' = any(p.roles)
      and public.tester_rank(p.id) >= new.minimum_rank
      and (
        not new.genre_restricted
        or array_remove(v_genres, 'Other') && public.normalize_testing_genres(p.preferred_genres)
      )
      -- Do not notify someone who cannot act because they already have an active test.
      and not exists (
        select 1
        from public.community_game_tests t
        where t.tester_id = p.id
          and t.status in ('claimed', 'active', 'in_progress')
      )
  loop
    perform public._create_notification(
      v_tester.id,
      'tester_playtest_available',
      case when v_genre_label is null then 'New playtest available' else 'New ' || v_genre_label || ' playtest available' end,
      v_title || ' is now looking for testers.',
      '/tester',
      'playtest',
      new.id,
      'playtest:available:' || new.id::text || ':tester:' || v_tester.id::text
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

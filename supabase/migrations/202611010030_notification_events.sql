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
        '/admin/submissions',
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
        'submission_needs_info',
        'Needs more information',
        v_title || ' needs more information. Review the request and update your submission.',
        '/my-submissions',
        'submission',
        new.id,
        'submission:more-info:' || new.id::text || ':revision:' || coalesce(new.submission_revision, 0)::text
      );
    elsif new.status = 'Approved' then
      perform public._create_notification(
        new.developer_id,
        'submission_approved',
        'Game approved',
        v_title || ' has been approved and added to the Playtested catalogue.',
        '/my-submissions',
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
  v_genre_label text;
begin
  -- Tester Hub campaigns are actionable when open and aimed at Playtested testers.
  if new.status is distinct from 'open'
     or new.audience not in ('playtested_testers', 'both') then
    return new;
  end if;

  -- Notify only on the transition into the actionable Tester Hub state.
  if tg_op = 'UPDATE'
     and old.status is not distinct from 'open'
     and old.audience is not distinct from new.audience then
    return new;
  end if;

  v_title := coalesce(nullif(btrim(new.title), ''), 'A game');
  v_genre_label := case
    when new.genre_restricted then nullif(btrim(new.testing_genre), '')
    else null
  end;

  for v_tester_id in
    select p.id
    from public.profiles p
    where 'tester' = any(p.roles)
      -- Reuse the production eligibility function for rank + genre targeting.
      and public.campaign_eligible(new.id, p.id)
      -- Playtested enforces one active test. Do not alert someone who cannot act.
      and not exists (
        select 1
        from public.community_game_tests t
        where t.tester_id = p.id
          and t.status in ('claimed', 'in_progress')
      )
      -- Do not create alerts after the campaign has already filled.
      and (select available from public.campaign_places(new.id)) > 0
  loop
    perform public._create_notification(
      v_tester_id,
      'tester_playtest_available',
      case
        when v_genre_label is null then 'New playtest available'
        else 'New ' || v_genre_label || ' playtest available'
      end,
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
after insert or update of status, audience on public.community_playtests
for each row execute function public.notify_playtest_available();

revoke all on function public.notify_submission_lifecycle(), public.notify_playtest_available()
from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;

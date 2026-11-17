begin;
-- No backfill: completed reports and existing deliveries remain untouched.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in (
 'admin_new_submission','submission_needs_info','submission_approved','submission_rejected',
 'tester_playtest_available','tester_feedback_useful','developer_feedback_received',
 'campaign_completed','admin_feedback_moderation','tester_feedback_accepted'));
create or replace function public._create_notification(
  p_recipient uuid,
  p_kind text,
  p_title text,
  p_message text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedupe_key text default null
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_reserved uuid;
begin
  if p_recipient is null or not exists(select 1 from public.profiles where id=p_recipient) then
    raise exception 'Notification recipient is unavailable.';
  end if;

  if p_kind is null or p_kind not in (
    'admin_new_submission',
    'submission_needs_info',
    'submission_approved',
    'tester_playtest_available',
    'tester_feedback_useful',
    'submission_rejected',
    'developer_feedback_received',
    'campaign_completed',
    'admin_feedback_moderation',
    'tester_feedback_accepted'
  ) then
    raise exception 'Unsupported notification type.';
  end if;

  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title)) > 120 then
    raise exception 'Notification title is invalid.';
  end if;

  if nullif(btrim(p_message),'') is null or char_length(btrim(p_message)) > 500 then
    raise exception 'Notification message is invalid.';
  end if;

  if p_href is not null and (left(p_href,1) <> '/' or left(p_href,2) = '//') then
    raise exception 'Notification destination must be an internal path.';
  end if;

  if (p_entity_type is null) <> (p_entity_id is null) then
    raise exception 'Notification entity reference is incomplete.';
  end if;

  if p_entity_type is not null and p_entity_type not in ('submission','playtest','game') then
    raise exception 'Unsupported notification entity type.';
  end if;

  if p_dedupe_key is not null then
    insert into public.notification_delivery_keys(recipient_id,dedupe_key) values(p_recipient,p_dedupe_key)
    on conflict do nothing returning recipient_id into v_reserved;
    if v_reserved is null then
      return (select id from public.notifications where recipient_id=p_recipient and dedupe_key=p_dedupe_key);
    end if;
  end if;
  insert into public.notifications(
    recipient_id,kind,title,message,href,entity_type,entity_id,dedupe_key
  ) values (
    p_recipient,p_kind,btrim(p_title),btrim(p_message),p_href,p_entity_type,p_entity_id,p_dedupe_key
  )
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null
  do nothing
  returning id into v_id;

  if v_id is null and p_dedupe_key is not null then
    select id into v_id
    from public.notifications
    where recipient_id=p_recipient and dedupe_key=p_dedupe_key;
  end if;

  return v_id;
end;
$$;

-- The immutable moderation assessment is inserted after the report/XP update,
-- in the same transaction. Retries with no new assessment cannot notify twice.
create or replace function public.notify_tester_feedback_accepted() returns trigger
language plpgsql security definer set search_path='' as $$
declare t public.community_game_tests; game_title text; award integer;
begin
 if new.kind <> 'accepted' then return new; end if;
 select * into t from public.community_game_tests where id=new.test_id;
 if t.status is distinct from 'reviewed' or t.review_outcome is distinct from 'accepted'
    or t.replacement_at is not null then return new; end if;
 select coalesce(g.title,i.title,c.title,'your game') into game_title
 from public.community_game_tests r
 left join public.community_playtests c on c.id=r.playtest_id
 left join public.game_submissions g on g.id=coalesce(r.submission_id,c.submission_id,c.approved_game_id)
 left join public.imported_games i on i.id=c.imported_game_id
 where r.id=t.id;
 award:=coalesce(new.actual_xp_award,t.base_xp_amount);
 perform public._create_notification(t.tester_id,'tester_feedback_accepted',
  'Your playtest feedback was accepted!',
  'Your feedback for '||left(coalesce(game_title,'your game'),200)||' has been approved. You earned '||award||' XP.',
  '/tester#testing-activity-'||t.id::text,'playtest',coalesce(t.playtest_id,t.submission_id),
  'feedback:accepted:assessment:'||new.id::text);
 return new;
end;$$;
create trigger notify_tester_feedback_accepted after insert on public.test_review_events
for each row execute function public.notify_tester_feedback_accepted();
revoke all on function public.notify_tester_feedback_accepted() from public,anon,authenticated;
-- Purpose-specific OPTIONAL analytics: no emails, IPs, URLs or free text.
create table public.developer_pro_interest (
 id bigint generated always as identity primary key,
 developer_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp()
);
create index developer_pro_interest_account_time on public.developer_pro_interest(developer_id,created_at desc);
create index developer_pro_interest_time on public.developer_pro_interest(created_at);
alter table public.developer_pro_interest enable row level security;
revoke all on public.developer_pro_interest from public,anon,authenticated;
create function public.record_developer_pro_interest(p_consent boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); stamp timestamptz;
begin
 if who is null or not exists(select 1 from public.profiles where id=who and 'developer'=any(roles)) then
  raise exception 'Developer access required.' using errcode='42501'; end if;
 if p_consent is distinct from true then return false; end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry using read committed.'; end if;
 -- Serialize across tabs and server instances, then use a fresh READ COMMITTED snapshot.
 perform pg_advisory_xact_lock(hashtextextended('playtested:pro-interest:'||who::text,0));
 stamp:=clock_timestamp();
 if exists(select 1 from public.developer_pro_interest where developer_id=who and created_at>stamp-interval '1 minute')
 or (select count(*) from public.developer_pro_interest where developer_id=who and created_at>stamp-interval '24 hours')>=10
 then return false; end if;
 delete from public.developer_pro_interest where created_at<stamp-interval '90 days';
 insert into public.developer_pro_interest(developer_id,created_at) values(who,stamp);
 return true;
end;$$;
create function public.get_admin_pro_interest() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then
  raise exception 'Admin access required.' using errcode='42501'; end if;
 delete from public.developer_pro_interest where created_at<clock_timestamp()-interval '90 days';
 return (select jsonb_build_object('total_clicks',count(*),'unique_developers',count(distinct developer_id),
  'clicks_7d',count(*) filter(where created_at>=now()-interval '7 days'),
  'clicks_30d',count(*) filter(where created_at>=now()-interval '30 days'),
  'developers_7d',count(distinct developer_id) filter(where created_at>=now()-interval '7 days'),
  'developers_30d',count(distinct developer_id) filter(where created_at>=now()-interval '30 days'),
  'latest_at',max(created_at)) from public.developer_pro_interest);
end;$$;
revoke all on function public.record_developer_pro_interest(boolean),public.get_admin_pro_interest() from public,anon,authenticated;
grant execute on function public.record_developer_pro_interest(boolean),public.get_admin_pro_interest() to authenticated;
commit;

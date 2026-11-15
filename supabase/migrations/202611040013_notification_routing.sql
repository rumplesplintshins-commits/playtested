begin;
-- Recipient-scoped read state is the only browser-editable notification column.
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in (
 'admin_new_submission','submission_needs_info','submission_approved','submission_rejected',
 'tester_playtest_available','tester_feedback_useful','developer_feedback_received'));
-- Keep event deduplication after a recipient dismisses a notification.
create table public.notification_delivery_keys(
 recipient_id uuid references public.profiles(id) on delete cascade,
 dedupe_key text not null check(length(dedupe_key) between 1 and 200),
 primary key(recipient_id,dedupe_key)
);
alter table public.notification_delivery_keys enable row level security;
revoke all on public.notification_delivery_keys from public,anon,authenticated;
grant all on public.notification_delivery_keys to service_role;
insert into public.notification_delivery_keys select recipient_id,dedupe_key from public.notifications where dedupe_key is not null on conflict do nothing;
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
    'developer_feedback_received'
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

revoke all on function public._create_notification(uuid,text,text,text,text,text,uuid,text)
from public, anon, authenticated;

create or replace function public.notify_submission_lifecycle() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_admin uuid; v_title text; v_kind text; v_heading text;
begin
 v_title:=left(coalesce(nullif(btrim(new.title),''),'Game submission'),80);
 if new.status='Pending Review' and (tg_op='INSERT' or old.status is distinct from new.status) then
  for v_admin in select id from public.profiles where role='admin' loop
   perform public._create_notification(v_admin,'admin_new_submission','New submission: '||v_title,
    v_title||' is ready for review.','/admin/submissions?submission='||new.id::text,'submission',new.id,
    case when tg_op='INSERT' then 'submission:new:'||new.id::text||':admin:'||v_admin::text
    else 'submission:review:'||new.id::text||':revision:'||new.submission_revision::text end);
  end loop;
 end if;
 if tg_op='UPDATE' and old.status is distinct from new.status then
  v_kind:=case new.status when 'Approved' then 'submission_approved' when 'Rejected' then 'submission_rejected' when 'Needs More Information' then 'submission_needs_info' end;
  v_heading:=case new.status when 'Approved' then 'Game approved' when 'Rejected' then 'Game submission rejected' when 'Needs More Information' then 'Needs more information' end;
  if v_kind is not null and exists(select 1 from public.profiles where id=new.developer_id) then
   perform public._create_notification(new.developer_id,v_kind,v_heading,
    v_title||': '||new.status||'. Open your submission for details.',
    '/my-submissions?tab=submissions&game='||new.id::text,'submission',new.id,
    'submission:'||v_kind||':'||new.id::text||':revision:'||new.submission_revision::text);
  end if;
 end if;
 return new;
end $$;

create function public.notify_developer_feedback() returns trigger
language plpgsql security definer set search_path='' as $$
declare campaign public.community_playtests%rowtype; v_owner uuid; v_title text; v_link uuid; v_href text;
begin
 if new.status is distinct from 'reviewed' or new.review_outcome is distinct from 'accepted' then return new; end if;
 if tg_op='UPDATE' and old.status='reviewed' and old.review_outcome='accepted' then return new; end if;
 if new.playtest_id is not null then
  select * into campaign from public.community_playtests where id=new.playtest_id;
  v_owner:=campaign.developer_id; v_title:=campaign.title;
  select l.id into v_link from public.game_developer_links l where l.developer_id=v_owner and
   ((campaign.submission_id is not null and l.submission_id=campaign.submission_id)
    or (campaign.approved_game_id is not null and l.approved_game_id=campaign.approved_game_id)
    or (campaign.imported_game_id is not null and l.imported_game_id=campaign.imported_game_id)) order by l.id limit 1;
  if v_link is not null then v_href:='/my-submissions?tab=games&game='||v_link::text;
  elsif campaign.submission_id is not null then v_href:='/my-submissions?tab=submissions&game='||campaign.submission_id::text;
  else v_href:='/my-submissions?tab=games'; end if;
 else
  select developer_id,title into v_owner,v_title from public.game_submissions where id=new.submission_id;
  v_href:='/my-submissions?tab=submissions&game='||new.submission_id::text;
 end if;
 if v_owner is not null and exists(select 1 from public.profiles where id=v_owner) then
  perform public._create_notification(v_owner,'developer_feedback_received','New feedback for your game',
   left(coalesce(v_title,'Your game'),100)||' has new accepted tester feedback.',v_href,'playtest',coalesce(new.playtest_id,new.submission_id),
   'developer:feedback:'||new.id::text);
 end if;
 return new;
end $$;
create trigger notify_developer_feedback after insert or update of status,review_outcome on public.community_game_tests
for each row execute function public.notify_developer_feedback();
revoke all on function public.notify_developer_feedback() from public,anon,authenticated;

-- Repair only destinations. Preserve every recipient, timestamp and read state.
update public.notifications set href=case when kind='admin_new_submission'
 then '/admin/submissions?submission='||entity_id::text
 else '/my-submissions?tab=submissions&game='||entity_id::text end
where entity_type='submission' and kind in ('admin_new_submission','submission_needs_info','submission_approved','submission_rejected');
notify pgrst,'reload schema';
commit;


begin;

create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'admin_new_submission',
    'submission_needs_info',
    'submission_approved',
    'tester_playtest_available'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  href text check (href is null or (left(href,1)='/' and left(href,2)<>'//')),
  entity_type text check (entity_type is null or entity_type in ('submission','playtest','game')),
  entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check ((entity_type is null) = (entity_id is null)),
  check (dedupe_key is null or char_length(dedupe_key) between 1 and 200)
);

create index notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc, id desc);

create index notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc, id desc)
  where read_at is null;

create unique index notifications_recipient_dedupe_idx
  on public.notifications(recipient_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;

revoke all on public.notifications from public, anon, authenticated;
grant select, update on public.notifications to authenticated;

create policy notifications_owner_read
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid());

create policy notifications_owner_mark_read
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- Internal writer used by reviewed server/database workflows only.
-- It is intentionally not executable by authenticated clients.
create function public._create_notification(
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
begin
  if p_recipient is null or not exists(select 1 from public.profiles where id=p_recipient) then
    raise exception 'Notification recipient is unavailable.';
  end if;

  if p_kind is null or p_kind not in (
    'admin_new_submission',
    'submission_needs_info',
    'submission_approved',
    'tester_playtest_available'
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

create function public.get_my_notifications(p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  v_limit := least(greatest(coalesce(p_limit,30),1),100);

  return jsonb_build_object(
    'unread_count',(
      select count(*)
      from public.notifications n
      where n.recipient_id=auth.uid() and n.read_at is null
    ),
    'notifications',coalesce((
      select jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc)
      from (
        select n.id,n.kind,n.title,n.message,n.href,n.entity_type,n.entity_id,n.read_at,n.created_at
        from public.notifications n
        where n.recipient_id=auth.uid()
        order by n.created_at desc,n.id desc
        limit v_limit
      ) q
    ),'[]'::jsonb)
  );
end;
$$;

create function public.mark_notification_read(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.notifications
  set read_at=coalesce(read_at,clock_timestamp())
  where id=p_id and recipient_id=auth.uid();

  return found;
end;
$$;

create function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.notifications
  set read_at=clock_timestamp()
  where recipient_id=auth.uid() and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public._create_notification(uuid,text,text,text,text,text,uuid,text) from public,anon,authenticated;
revoke all on function public.get_my_notifications(integer),public.mark_notification_read(bigint),public.mark_all_notifications_read() from public,anon;
grant execute on function public.get_my_notifications(integer),public.mark_notification_read(bigint),public.mark_all_notifications_read() to authenticated;

notify pgrst,'reload schema';
commit;

begin;

create function public.dismiss_notification(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  delete from public.notifications
  where id = p_id
    and recipient_id = auth.uid();

  return found;
end;
$$;

create function public.clear_read_notifications()
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

  delete from public.notifications
  where recipient_id = auth.uid()
    and read_at is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.dismiss_notification(bigint), public.clear_read_notifications() from public, anon;
grant execute on function public.dismiss_notification(bigint), public.clear_read_notifications() to authenticated;

notify pgrst, 'reload schema';
commit;

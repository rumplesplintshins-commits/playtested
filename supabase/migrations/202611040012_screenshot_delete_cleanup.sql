-- Also queue file cleanup when a submission deletion cascades to its screenshots.
begin;
create function public.queue_deleted_screenshot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.game_screenshot_cleanup(object_path) values(old.object_path) on conflict do nothing;
  return old;
end $$;
revoke all on function public.queue_deleted_screenshot() from public,anon,authenticated;
create trigger queue_deleted_screenshot before delete on public.game_screenshots
for each row execute function public.queue_deleted_screenshot();
commit;

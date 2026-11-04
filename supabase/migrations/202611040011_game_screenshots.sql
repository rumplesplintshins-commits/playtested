begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('game-screenshots','game-screenshots',false,5242880,array['image/webp']);
-- All uploads go through content decoding and owner checks in the application.
-- Restrictive policy prevents another permissive storage policy bypassing this.
create policy screenshot_storage_gateway_only on storage.objects as restrictive
for all to anon,authenticated
using(bucket_id<>'game-screenshots') with check(bucket_id<>'game-screenshots');

create table public.game_screenshots(
  submission_id uuid not null references public.game_submissions(id) on delete cascade,
  slot smallint not null check(slot between 1 and 5),
  revision uuid not null default gen_random_uuid(),
  object_path text not null unique,
  primary key(submission_id,slot),
  check(object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.]webp$')
);
alter table public.game_screenshots enable row level security;
revoke all on public.game_screenshots from public,anon,authenticated;
grant select(submission_id,slot,revision) on public.game_screenshots to anon,authenticated;
grant all on public.game_screenshots to service_role;
create policy screenshot_visible_media on public.game_screenshots for select to anon,authenticated using(
  exists(select 1 from public.approved_games g where g.id=submission_id)
  or exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

-- Retain failed cleanup tasks privately so the next media mutation can retry.
create table public.game_screenshot_cleanup(object_path text primary key,queued_at timestamptz not null default now());
alter table public.game_screenshot_cleanup enable row level security;
revoke all on public.game_screenshot_cleanup from public,anon,authenticated;
grant all on public.game_screenshot_cleanup to service_role;

create function public.set_game_screenshot(p_id uuid,p_slot smallint,p_path text default null) returns void
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; old_path text;
begin
  select developer_id into owner_id from public.game_submissions where id=p_id for update;
  if not found then raise exception 'Submission unavailable.'; end if;
  if p_slot not between 1 and 5 then raise exception 'Screenshot slot must be 1 to 5.'; end if;
  if p_path is not null and (split_part(p_path,'/',1)<>owner_id::text or split_part(p_path,'/',2)<>p_id::text) then raise exception 'Invalid screenshot path.'; end if;
  select object_path into old_path from public.game_screenshots where submission_id=p_id and slot=p_slot;
  if p_path is null then
    delete from public.game_screenshots where submission_id=p_id and slot=p_slot;
  else
    insert into public.game_screenshots(submission_id,slot,object_path) values(p_id,p_slot,p_path)
    on conflict(submission_id,slot) do update set object_path=excluded.object_path,revision=gen_random_uuid();
  end if;
  if old_path is not null and old_path is distinct from p_path then
    insert into public.game_screenshot_cleanup(object_path) values(old_path) on conflict do nothing;
  end if;
end $$;
revoke all on function public.set_game_screenshot(uuid,smallint,text) from public,anon,authenticated;
grant execute on function public.set_game_screenshot(uuid,smallint,text) to service_role;
notify pgrst,'reload schema';
commit;

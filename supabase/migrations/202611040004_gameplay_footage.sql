begin;
create table public.gameplay_footage (
  submission_id uuid primary key references public.game_submissions(id) on delete cascade,
  video_url text not null check (length(video_url)<=500 and (
    video_url ~ '^https://www[.]youtube[.]com/watch[?]v=[a-zA-Z0-9_-]{11}$' or
    video_url ~ '^https://vimeo[.]com/[0-9]{1,12}$' or
    video_url ~ '^https://drive[.]google[.]com/file/d/[a-zA-Z0-9_-]{10,150}/view$'
  )),
  updated_at timestamptz not null default now()
);
alter table public.gameplay_footage enable row level security;
revoke all on public.gameplay_footage from public,anon,authenticated;
grant select on public.gameplay_footage to anon,authenticated;
grant insert,update,delete on public.gameplay_footage to authenticated;
create policy "Approved gameplay or private owner/admin read" on public.gameplay_footage for select using (
  exists(select 1 from public.approved_games g where g.id=submission_id)
  or exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
create policy "Owner creates gameplay" on public.gameplay_footage for insert to authenticated with check (
  exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=(select auth.uid()))
);
create policy "Owner updates gameplay" on public.gameplay_footage for update to authenticated using (
  exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=(select auth.uid()))
) with check (
  exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=(select auth.uid()))
);
create policy "Owner removes gameplay" on public.gameplay_footage for delete to authenticated using (
  exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=(select auth.uid()))
);
commit;

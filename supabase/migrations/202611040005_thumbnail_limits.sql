-- Bucket restrictions apply server-side, including clients bypassing the form.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('game-thumbnails','game-thumbnails',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists game_thumbnails_developer_insert on storage.objects;
create policy game_thumbnails_developer_insert on storage.objects for insert to authenticated with check (
  bucket_id='game-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and 'developer'=any(p.roles))
);
drop policy if exists game_thumbnails_owner_delete on storage.objects;
create policy game_thumbnails_owner_delete on storage.objects for delete to authenticated using (
  bucket_id='game-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text
);
commit;

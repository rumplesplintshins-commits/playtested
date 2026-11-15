-- Integration preview repair: the production-derived local dump restored only
-- the game-thumbnails storage bucket; the game-screenshots bucket (and its
-- developer write/delete) policies existed in production before the snapshot.
-- Idempotent: re-running keeps the same bucket shape and policies.

-- Screenshots are stored privately and served through the API route with the
-- service role; there is deliberately no public-read policy.
insert into storage.buckets (id,name,file_size_limit,allowed_mime_types,public)
values ('game-screenshots','game-screenshots',5242880,'{image/jpeg,image/png,image/webp}',false)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

drop policy if exists game_screenshots_write on storage.objects;
create policy game_screenshots_write on storage.objects as permissive for insert to authenticated
with check (bucket_id='game-screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and 'developer'=any(p.roles)));

drop policy if exists game_screenshots_delete on storage.objects;
create policy game_screenshots_delete on storage.objects as permissive for delete to authenticated
using (bucket_id='game-screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text);

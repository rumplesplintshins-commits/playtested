begin;
-- Restore the singleton configured by 001 and updated by 012, only if absent.
-- Do not activate/backfill old reservations or alter campaign capacities/history.
insert into public.testing_policy(singleton,launch_window,launches,places,base_xp,reservation_window)
values(true,interval '720 hours',1,4,100,interval '72 hours') on conflict(singleton) do nothing;
revoke all on public.testing_policy from public,anon,authenticated;
grant all on public.testing_policy to service_role;
notify pgrst,'reload schema';
commit;

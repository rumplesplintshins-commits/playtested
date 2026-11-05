-- DEVELOPMENT QA FIXTURE ONLY. Not a production migration or general capacity reset.
-- Execute only against ktifgybnkdaotdxrvjgq. Retains both reports, XP, audit and notifications.
begin;
set local lock_timeout='2s';
lock table public.community_playtests in access exclusive mode nowait;
do $$
declare campaign uuid:='41a91bb0-6439-423f-ab59-fc1defbe0ec8';occupied integer;capacity integer;freeze_trigger text;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('playtested:capacity:'||campaign::text,0)) then raise exception 'QA campaign busy; retry later';end if;
 select target_testers into capacity from public.community_playtests where id=campaign and developer_id='64acc8c1-c78d-47b8-b1d7-4fd9ac6e89d9' for update;
 if not found or capacity not in(3,4) then raise exception 'Unexpected QA campaign; stop';end if;
 if (select count(*) from public.community_game_tests where id in('1c6c3bc7-eca4-490c-bd50-ea9b402f960d','423d0044-6664-4561-b842-c3530ab9b739') and playtest_id=campaign and feedback like '%[DEV QA]%')<>2 then raise exception 'Expected explicit QA reports missing; stop';end if;
 select count(*) into occupied from public.community_game_tests where playtest_id=campaign and replacement_at is null and (status in('submitted','reviewed') or(status in('claimed','in_progress') and(reservation_expires_at is null or reservation_expires_at>clock_timestamp())));
 if occupied>3 then raise exception 'Three places would undersize occupied capacity; stop';end if;
 select tgname into freeze_trigger from pg_trigger where tgrelid='public.community_playtests'::regclass and tgfoid='public.fix_free_target()'::regprocedure and not tgisinternal and tgenabled='O';
 if freeze_trigger is null then raise exception 'Expected enabled capacity-freeze trigger missing; stop';end if;
 -- Exclusive table lock prevents concurrent writes while only the capacity-freeze trigger is suspended.
 -- Any error rolls back trigger state and data together. Other triggers/RLS are unchanged.
 execute format('alter table public.community_playtests disable trigger %I',freeze_trigger);
 update public.community_playtests set target_testers=3 where id=campaign and target_testers=4;
 execute format('alter table public.community_playtests enable trigger %I',freeze_trigger);
 if (select target_testers from public.community_playtests where id=campaign)<>3 then raise exception 'QA capacity verification failed';end if;
end;$$;
commit;

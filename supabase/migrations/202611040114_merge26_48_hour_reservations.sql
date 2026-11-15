-- Cutover applies only to NEW/reclaimed reservations. Issued timestamps and
-- historical unactivated claims are deliberately not rewritten or shortened.
begin;
do $$begin
 if(select count(*) from public.testing_policy)<>1 then raise exception 'Expected the existing singleton testing policy.';end if;
 if exists(select 1 from public.testing_policy where reservation_window not in(interval '72 hours',interval '48 hours')) then
  raise exception 'Unexpected reservation duration; review the cutover before proceeding.';end if;
end;$$;
alter table public.testing_policy drop constraint testing_policy_reservation_window_check;
alter table public.testing_policy alter column reservation_window set default interval '48 hours';
update public.testing_policy set reservation_window=interval '48 hours' where reservation_window=interval '72 hours';
alter table public.testing_policy add constraint testing_policy_reservation_window_check check(reservation_window=interval '48 hours');
commit;

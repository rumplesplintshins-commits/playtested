begin;
-- A required deployment prerequisite: do not silently omit expiry/alert cleanup.
do $$
begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then
  raise exception 'pg_cron must be enabled and reviewed before availability scheduling';
 end if;
 if to_regprocedure('public.process_tester_availability()') is null then
  raise exception 'Availability migration 110 is required';
 end if;
 if exists(select 1 from cron.job where command like '%process_tester_availability%' and jobname<>'merge26-tester-availability') then
  raise exception 'Review the differently named availability job before scheduling';
 end if;
end;$$;
select cron.schedule('merge26-tester-availability','* * * * *','select public.process_tester_availability()');
commit;

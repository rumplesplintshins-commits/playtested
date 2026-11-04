-- Only the new Merge 24 analytics records expire; existing service data is untouched.
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('m24-analytics-retention','17 3 * * *','select public.m24_analytics_retention()');
commit;

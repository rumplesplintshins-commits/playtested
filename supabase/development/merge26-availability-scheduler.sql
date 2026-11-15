-- DEVELOPMENT ONLY. Run with an explicit development project target.
-- Production scheduling needs separate owner authorisation after release review.
select cron.schedule('merge26-tester-availability','* * * * *','select public.process_tester_availability();');

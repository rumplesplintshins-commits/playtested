-- Reproduce the owner-accepted five-launch Pro contract; keep gap/window/flags and history.
begin;
do $$begin if not exists(select 1 from public.developer_plan_policy where plan='pro' and launch_limit in(5,15)) then raise exception 'Unexpected Pro policy; review configuration';end if;end;$$;
update public.developer_plan_policy set launch_limit=5 where plan='pro' and launch_limit=15;
commit;

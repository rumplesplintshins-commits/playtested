begin;
-- Missing-only repair of the policy from 202610280014. No entitlement assignment.
insert into public.developer_plan_policy(plan,launch_limit,launch_window,launch_gap,rank_targeting,genre_targeting)
values ('free',1,interval '720 hours',interval '0 hours',false,false),
       ('pro',15,interval '720 hours',interval '48 hours',true,true)
on conflict(plan) do nothing;
revoke all on public.developer_plan_policy from public,anon,authenticated;
grant all on public.developer_plan_policy to service_role;
create or replace function public.get_my_developer_plan() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare p public.developer_plan_policy; w record; checked timestamptz;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and ('developer'=any(roles) or role='admin')) then raise exception 'Developer access required.'; end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('playtested:developer:'||auth.uid()::text,0));
 checked:=clock_timestamp(); select * into p from public._developer_plan(auth.uid());
 if p.plan is null then raise exception 'Developer plan policy is not configured. Restore the Free/Pro policy seeds.'; end if;
 select * into w from public._playtested_developer_launch_window_at(auth.uid(),checked);
 return to_jsonb(p)||to_jsonb(w)||jsonb_build_object('server_now',checked,'can_assign',exists(select 1 from public.profiles where id=auth.uid() and role='admin'),'window_hours',extract(epoch from p.launch_window)/3600,'gap_hours',extract(epoch from p.launch_gap)/3600);
end $$;
revoke all on function public.get_my_developer_plan() from public,anon;
grant execute on function public.get_my_developer_plan() to authenticated,service_role;
notify pgrst,'reload schema';
commit;

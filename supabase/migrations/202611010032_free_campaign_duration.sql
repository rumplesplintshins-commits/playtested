begin;

-- Free campaigns may be unspecified, 15 minutes or 30 minutes in the UI.
-- The database enforces the actual entitlement boundary so a manipulated
-- browser cannot create or change a Free campaign to more than 30 minutes.
-- Existing legacy campaigns over 30 minutes may retain their value while
-- unrelated fields are edited; changing their duration still requires Pro.
create or replace function public._guard_campaign_duration_by_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
begin
  if new.estimated_minutes is null or new.estimated_minutes <= 30 then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.estimated_minutes is not distinct from old.estimated_minutes then
    return new;
  end if;

  select p.plan
  into v_plan
  from public._developer_plan(new.developer_id) p;

  if coalesce(v_plan, 'free') = 'free' then
    raise exception 'Free campaigns can have an estimated test time of up to 30 minutes. Upgrade to Pro for longer testing sessions.';
  end if;

  return new;
end;
$$;

revoke all on function public._guard_campaign_duration_by_plan() from public, anon, authenticated;

drop trigger if exists community_playtests_duration_plan_guard on public.community_playtests;
create trigger community_playtests_duration_plan_guard
before insert or update of estimated_minutes, developer_id
on public.community_playtests
for each row
execute function public._guard_campaign_duration_by_plan();

notify pgrst, 'reload schema';
commit;

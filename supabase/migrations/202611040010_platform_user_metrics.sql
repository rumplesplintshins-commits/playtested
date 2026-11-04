-- Account aggregates are independent of optional visitor analytics.
begin;
create function public.m24_platform_user_summary() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'registered_users', count(distinct u.id),
    'developers', count(distinct u.id) filter (where 'developer'=any(p.roles)),
    'testers', count(distinct u.id) filter (where 'tester'=any(p.roles)),
    'players', count(distinct u.id) filter (where 'player'=any(p.roles)),
    'new_7_days', count(distinct u.id) filter (where u.created_at>=now()-interval '7 days' and u.created_at<=now()),
    'new_30_days', count(distinct u.id) filter (where u.created_at>=now()-interval '30 days' and u.created_at<=now())
  )
  from auth.users u left join public.profiles p on p.id=u.id
  where u.deleted_at is null and not coalesce(u.is_anonymous,false);
$$;
revoke all on function public.m24_platform_user_summary() from public,anon,authenticated;
grant execute on function public.m24_platform_user_summary() to service_role;
comment on function public.m24_platform_user_summary() is
  'Current non-deleted, non-anonymous Auth accounts (including unconfirmed registrations); overlapping roles from profiles.roles; rolling registration windows use Auth created_at.';
notify pgrst,'reload schema';
commit;

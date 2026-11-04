begin;
create table public.tester_public_identities(
 public_number bigint generated always as identity primary key,
 user_id uuid unique references auth.users(id) on delete set null,
 allocated_at timestamptz not null default now()
);
alter table public.tester_public_identities enable row level security;
revoke all on public.tester_public_identities from public,anon,authenticated,service_role;
grant select on public.tester_public_identities to service_role;
revoke all on sequence public.tester_public_identities_public_number_seq from public,anon,authenticated,service_role;
create function public._allocate_tester_public_identity() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if 'tester'=any(new.roles) then insert into public.tester_public_identities(user_id) values(new.id) on conflict(user_id) do nothing;end if;
 return new;
end;$$;
revoke all on function public._allocate_tester_public_identity() from public,anon,authenticated;
create trigger allocate_tester_public_identity after insert or update of roles on public.profiles
 for each row execute function public._allocate_tester_public_identity();
insert into public.tester_public_identities(user_id)
 select p.id from public.profiles p where 'tester'=any(p.roles) or exists(select 1 from public.community_game_tests t where t.tester_id=p.id)
 order by p.created_at,p.id on conflict(user_id) do nothing;
create function public.get_feedback_tester_identities(p_test_ids uuid[])
returns table(test_id uuid,public_number bigint,current_rank integer)
language sql stable security definer set search_path='' as $$
 select t.id,case when p.id is not null then i.public_number end,public.tester_rank(p.id)
 from public.community_game_tests t
 left join public.community_playtests c on c.id=t.playtest_id
 left join public.profiles p on p.id=t.tester_id
 left join public.tester_public_identities i on i.user_id=p.id
 where t.id=any(p_test_ids) and cardinality(p_test_ids)<=500 and(
 exists(select 1 from public.profiles a where a.id=auth.uid() and a.role='admin')
 or(t.status='reviewed' and t.review_outcome='accepted' and(
  c.developer_id=auth.uid() or exists(select 1 from public.game_submissions own where own.id=t.submission_id and own.developer_id=auth.uid())
  or(not public.beta_fixture_hidden(coalesce(c.id,t.submission_id)) and
   (exists(select 1 from public.approved_games g where g.id in(c.submission_id,c.approved_game_id,t.submission_id))
    or exists(select 1 from public.m26_public_imported_profiles(array[c.imported_game_id]))))
 )));
$$;
revoke all on function public.get_feedback_tester_identities(uuid[]) from public;
grant execute on function public.get_feedback_tester_identities(uuid[]) to anon,authenticated;
commit;

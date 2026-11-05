begin;
-- Private case references, never request contents or copies of identity documents.
create table public.tester_privacy_restrictions(
 tester_id uuid primary key references auth.users(id) on delete cascade,
 restricted boolean not null default true,
 deidentified boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.tester_privacy_actions(
 id bigint generated always as identity primary key,
 tester_id uuid not null,
 actor_id uuid not null,
 case_reference text not null,
 restricted boolean not null,
 deidentified boolean not null,
 created_at timestamptz not null default now()
);
alter table public.tester_privacy_restrictions enable row level security;
alter table public.tester_privacy_actions enable row level security;
revoke all on public.tester_privacy_restrictions,public.tester_privacy_actions from public,anon,authenticated,service_role;
revoke all on sequence public.tester_privacy_actions_id_seq from public,anon,authenticated,service_role;

create function public.set_tester_privacy_restriction(p_tester uuid,p_restricted boolean,p_deidentify boolean,p_case_reference text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 if p_restricted is null or p_deidentify is null or p_case_reference is null or p_case_reference !~ '^[A-Za-z0-9_-]{3,64}$' then raise exception 'Explicit choices and a private case reference required.';end if;
 perform 1 from public.profiles where id=p_tester and role is distinct from 'admin' for update;
 if not found then raise exception 'Eligible account unavailable.';end if;
 if p_deidentify and not p_restricted then raise exception 'De-identification requires attribution restriction.';end if;
 if not p_restricted and exists(select 1 from public.tester_privacy_restrictions where tester_id=p_tester and deidentified) then raise exception 'De-identified attribution must remain restricted.';end if;
 insert into public.tester_privacy_restrictions(tester_id,restricted,deidentified) values(p_tester,p_restricted,p_deidentify)
 on conflict(tester_id) do update set restricted=excluded.restricted,deidentified=public.tester_privacy_restrictions.deidentified or excluded.deidentified,updated_at=clock_timestamp();
 if p_deidentify then
  -- Keep private report ownership, XP, review decisions and immutable audits intact.
  -- The deployed profile name is NOT NULL; use a neutral status, not another identity.
  update public.profiles set display_name='Restricted account' where id=p_tester;
  delete from public.account_pc_specs where user_id=p_tester;
  delete from public.tester_availability_preferences where tester_id=p_tester;
 end if;
 insert into public.tester_privacy_actions(tester_id,actor_id,case_reference,restricted,deidentified)
 values(p_tester,auth.uid(),p_case_reference,p_restricted,p_deidentify);
end;$$;
revoke all on function public.set_tester_privacy_restriction(uuid,boolean,boolean,text) from public,anon,service_role;
grant execute on function public.set_tester_privacy_restriction(uuid,boolean,boolean,text) to authenticated;

alter function public.get_feedback_tester_identities(uuid[]) rename to _m26_unrestricted_feedback_identities;
revoke all on function public._m26_unrestricted_feedback_identities(uuid[]) from public,anon,authenticated,service_role;
create function public.get_feedback_tester_identities(p_test_ids uuid[])
returns table(test_id uuid,public_number bigint,current_rank integer)
language sql stable security definer set search_path='' as $$
 select f.test_id,
 case when r.restricted and not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then null else f.public_number end,
 case when r.restricted and not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then null else f.current_rank end
 from public._m26_unrestricted_feedback_identities(p_test_ids) f
 left join public.community_game_tests t on t.id=f.test_id
 left join public.tester_privacy_restrictions r on r.tester_id=t.tester_id;
$$;
revoke all on function public.get_feedback_tester_identities(uuid[]) from public;
grant execute on function public.get_feedback_tester_identities(uuid[]) to anon,authenticated;
commit;

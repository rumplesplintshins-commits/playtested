-- Integration preview hotfix (local database only — do NOT ship to production
-- without review). The production-derived local DB evolved past some merge26
-- chain migrations (040101/040102/040103 abort on drifted definitions), leaving
-- needed base objects missing: listing_controls (used by m26_listing_hidden
-- everywhere), the legacy fixture-hidden alias, and m26_admin_review_activity —
-- the Admin submissions page then fails with
-- "Review activity could not be loaded. Refresh before reviewing." and renders
-- zero submissions because the page aborts mapping on the RPC error.
--
-- This file recreates those missing objects in the shapes the v11 chain and the
-- merged app expect, preserving all existing rows (create-if-missing / replace).
begin;

-- 1) Legacy fixture-hidden alias (production's beta_fixture_hidden already
--    holds the exact hardcoded hotfix list; the rename in 040101 never ran).
create or replace function public._m26_legacy_fixture_hidden(p_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select public.beta_fixture_hidden(p_id) $$;
revoke all on function public._m26_legacy_fixture_hidden(uuid) from public,anon,authenticated;
grant execute on function public._m26_legacy_fixture_hidden(uuid) to authenticated,service_role;

-- 2) Listing controls storage (create-if-missing; tables drive visibility).
create table if not exists public.listing_controls(
 game_kind text not null check(game_kind in('submission','imported')),
 source_id uuid not null,
 archived boolean not null default false,
 is_admin_test boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 primary key(game_kind,source_id)
);
alter table public.listing_controls enable row level security;
alter table public.listing_controls force row level security;
revoke all on public.listing_controls from anon,authenticated;
grant all on public.listing_controls to service_role;

create table if not exists public.listing_control_events(
 id bigint generated always as identity primary key,
 game_kind text not null,source_id uuid not null,actor_id uuid references auth.users(id),
 action text not null,created_at timestamptz not null default now()
);
alter table public.listing_control_events enable row level security;
alter table public.listing_control_events force row level security;
revoke all on public.listing_control_events from anon,authenticated;
grant all on public.listing_control_events to service_role;

-- 3) Listing controls RPCs (from 040101; set_listing_control used by admin UI).
create or replace function public._m26_controls_owner(p_kind text,p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.profiles where id=auth.uid() and role='admin')
 or(p_kind='submission' and exists(select 1 from public.game_submissions where id=p_id and developer_id=auth.uid()))
 or(p_kind='imported' and exists(select 1 from public.game_developer_links where imported_game_id=p_id and developer_id=auth.uid())));
$$;
revoke all on function public._m26_controls_owner(text,uuid) from public,anon,authenticated;
grant execute on function public._m26_controls_owner(text,uuid) to anon,authenticated;

create or replace function public.get_listing_controls(p_kind text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if not public._m26_controls_owner(p_kind,p_id) then raise exception 'Listing owner or administrator required.';end if;
 return coalesce((select to_jsonb(c) from public.listing_controls c where game_kind=p_kind and source_id=p_id),jsonb_build_object('archived',false,'is_admin_test',false));
end;$$;

create or replace function public.set_listing_control(p_kind text,p_id uuid,p_action text,p_confirmation text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare is_admin boolean;v_title text;v_status text;dep record;has_dependencies boolean;
begin
 if not public._m26_controls_owner(p_kind,p_id) then raise exception 'Listing owner or administrator required.';end if;
 is_admin:=exists(select 1 from public.profiles where id=auth.uid() and role='admin');
 perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||p_kind||':'||p_id,0));
 if p_kind='submission' then select title,status into v_title,v_status from public.game_submissions where id=p_id for update;
 elsif p_kind='imported' then select title into v_title from public.imported_games where id=p_id for update;
 else raise exception 'Invalid listing kind.';end if;
 if v_title is null then raise exception 'Listing unavailable.';end if;
 if p_action in('archive','delete') and p_confirmation is distinct from v_title then raise exception 'Confirm the exact game title.';end if;
 if p_action='delete' then
  if p_kind<>'submission' or v_status='Approved' then raise exception 'Published games must be archived, preserving their history.';end if;
  for dep in select c.conrelid::regclass target,a.attname field from pg_constraint c
   join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
   where c.contype='f' and c.confrelid='public.game_submissions'::regclass
    and c.conrelid not in('public.submission_review_events'::regclass,'public.game_screenshots'::regclass,
      'public.gameplay_footage'::regclass,'public.game_submission_contacts'::regclass,'public.m24_submission_acquisition'::regclass,'public.game_pc_requirements'::regclass,'public.listing_controls'::regclass,'public.listing_control_events'::regclass)
  loop
   execute format('select exists(select 1 from %s where %I=$1)',dep.target,dep.field) into has_dependencies using p_id;
   if has_dependencies then raise exception 'This submission has dependent records. Archive it to preserve history.';end if;
  end loop;
  if exists(select 1 from public.submission_review_events where submission_id=p_id and
   (actor_id is distinct from auth.uid() or kind not in('submitted','developer_saved','resubmitted')))
   or exists(select 1 from public.listing_revisions where source_id=p_id)
   then raise exception 'This submission has review history. Archive it instead.';end if;
  delete from public.submission_review_events where submission_id=p_id;
  delete from public.game_submissions where id=p_id;
  delete from public.listing_controls where game_kind=p_kind and source_id=p_id;
 elsif p_action in('archive','restore','mark_test','clear_test') then
  if p_action in('mark_test','clear_test') and not is_admin then raise exception 'Administrator required to change Test / Demo designation.';end if;
  insert into public.listing_controls(game_kind,source_id) values(p_kind,p_id) on conflict do nothing;
  update public.listing_controls set
   archived=case when p_action='archive' then true when p_action='restore' then false else archived end,
   is_admin_test=case when p_action='mark_test' then true when p_action='clear_test' then false else is_admin_test end,
   updated_at=clock_timestamp(),updated_by=auth.uid() where game_kind=p_kind and source_id=p_id;
 else raise exception 'Invalid listing action.';end if;
 insert into public.listing_control_events(game_kind,source_id,actor_id,action) values(p_kind,p_id,auth.uid(),p_action);
 return case when p_action='delete' then jsonb_build_object('deleted',true) else public.get_listing_controls(p_kind,p_id) end;
end;$$;
revoke all on function public.get_listing_controls(text,uuid),public.set_listing_control(text,uuid,text,text) from public,anon;
grant execute on function public.get_listing_controls(text,uuid),public.set_listing_control(text,uuid,text,text) to authenticated;

-- 4) Shared visibility helper (040101 shape; already existed but ensure parity).
create or replace function public.m26_listing_hidden(p_id uuid,p_include_tests boolean default true) returns boolean
language sql stable security definer set search_path='' as $$
 with targets as (
  select p_id id union select unnest(array[c.submission_id,c.approved_game_id,c.imported_game_id]) from public.community_playtests c where c.id=p_id
 )
 select exists(select 1 from public.listing_controls l where (l.archived or(p_include_tests and l.is_admin_test)) and
 (l.source_id in(select id from targets)
  or(l.game_kind='submission' and exists(select 1 from public.game_submissions s join public.imported_games i
    on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where s.id=l.source_id and i.id in(select id from targets)))
  or(l.game_kind='imported' and exists(select 1 from public.imported_games i join public.game_submissions s
    on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where i.id=l.source_id and s.id in(select id from targets)))));
$$;
revoke all on function public.m26_listing_hidden(uuid,boolean) from public;
grant execute on function public.m26_listing_hidden(uuid,boolean) to anon,authenticated,service_role;

-- 5) THE reported defect: admin review activity (040103 shape).
create or replace function public.m26_admin_review_activity() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Administrator required.';end if;
 return coalesce((select jsonb_object_agg(id,activity) from (
 select g.id,coalesce(max(e.created_at) filter(where e.new_status=g.status and
  (e.previous_status is distinct from e.new_status or e.review_reason is distinct from e.previous_review_reason
   or(g.status='Pending Review' and e.kind in('submitted','resubmitted')))),g.submitted_at) activity
 from public.game_submissions g left join public.submission_review_events e on e.submission_id=g.id group by g.id
 ) t),'{}'::jsonb);
end;$$;
revoke all on function public.m26_admin_review_activity() from public,anon;
grant execute on function public.m26_admin_review_activity() to authenticated;

-- 6) Tester-facing visibility composition (040103 shape).
create or replace function public.m26_testing_hidden(p_id uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public._m26_legacy_fixture_hidden(p_id) or public.m26_listing_hidden(p_id,
 not exists(select 1 from public.profiles where id=p_user and id=auth.uid() and role='admin'));
$$;
revoke all on function public.m26_testing_hidden(uuid,uuid) from public;
grant execute on function public.m26_testing_hidden(uuid,uuid) to authenticated;

commit;

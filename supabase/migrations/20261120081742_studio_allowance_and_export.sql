begin;

create table playtested_studios.entitlements (
 studio_id uuid primary key references playtested_studios.studios on delete cascade,
 plan text not null references public.developer_plan_policy(plan)
);
create table playtested_studios.entitlement_audit (
 id bigint generated always as identity primary key,
 studio_id uuid not null, actor_id uuid not null, plan text not null, reason text not null,
 occurred_at timestamptz not null default now()
);
create table playtested_studios.launches (
 campaign_id uuid primary key,
 scope text not null,
 game_key text not null,
 plan text not null check(plan in ('free','pro')),
 launched_at timestamptz not null,
 actor_id uuid
);
create index studio_launch_scope on playtested_studios.launches(scope,launched_at desc);
create index studio_launch_game on playtested_studios.launches(game_key,launched_at desc);
create table playtested_studios.game_aliases (
 alias_key text primary key,
 canonical_key text not null check(alias_key<>canonical_key),
 reviewed_by uuid not null, reason text not null
);
create table playtested_studios.game_ownership_audit (
 id bigint generated always as identity primary key,
 game_key text not null, studio_id uuid not null, actor_id uuid, action text not null,
 occurred_at timestamptz not null default now()
);
alter table playtested_studios.entitlements enable row level security;
alter table playtested_studios.entitlement_audit enable row level security;
alter table playtested_studios.launches enable row level security;
alter table playtested_studios.game_aliases enable row level security;
alter table playtested_studios.game_ownership_audit enable row level security;
revoke all on all tables in schema playtested_studios from public,anon,authenticated;

create function playtested_studios.ownership_limit(plan text) returns integer
language sql immutable set search_path='' as $$select case when plan='pro' then 2 else 1 end$$;

create function playtested_studios.studio_rank(p_studio uuid) returns integer
language sql stable set search_path='' as $$
 select count(*)::integer from playtested_studios.studios target
 join playtested_studios.studios s on s.owner_id=target.owner_id and (s.created_at,s.id)<=(target.created_at,target.id)
 where target.id=p_studio
$$;

create function playtested_studios.studio_policy(p_studio uuid) returns public.developer_plan_policy
language sql stable set search_path='' as $$
 select p from public.developer_plan_policy p
 where p.plan=coalesce((select e.plan from playtested_studios.entitlements e where studio_id=p_studio),'free')
$$;

create function playtested_studios.studio_enabled(p_studio uuid) returns boolean
language sql volatile set search_path='' as $$
 select exists(select 1 from playtested_studios.studios s where s.id=p_studio
  and playtested_studios.studio_rank(s.id)<=playtested_studios.ownership_limit((public._developer_plan(s.owner_id)).plan))
$$;

create function playtested_studios.raw_identity(steam text, link text) returns text
language plpgsql immutable set search_path='' as $$
declare app text; host text; path text; clean text:=btrim(coalesce(link,''));
begin
 app:=coalesce(nullif(ltrim(substring(clean from '(?i)^(?:https?://)?(?:store[.]steampowered[.]com/app|steamcommunity[.]com/app)/([0-9]+)(?:[/#?]|$)'),'0'),''),
  case when steam~'^[0-9]+$' then nullif(ltrim(steam,'0'),'') end);
 if app is not null then return 'steam:'||app;end if;
 app:=substring(clean from '(?i)^https?://(?:www[.])?roblox[.]com/games/([0-9]+)(?:[/#?]|$)');
 if app is not null then return 'roblox:'||app;end if;
 app:=substring(clean from '(?i)^https?://play[.]google[.]com/store/apps/details[?](?:[^#]*&)?id=([a-z0-9_.]+)');
 if app is not null then return 'android:'||app;end if;
 app:=substring(clean from '(?i)^https?://apps[.]apple[.]com/[^?#]*[/]id([0-9]+)(?:[/?#]|$)');
 if app is not null then return 'ios:'||app;end if;
 host:=lower(substring(clean from '(?i)^https?://([^/?#:@]+(?::[0-9]+)?)'));
 if host is null or host~'^(localhost|127[.]0[.]0[.]1)(:|$)' then return null;end if;
 path:=regexp_replace(regexp_replace(clean,'(?i)^https?://[^/?#]+',''),'#.*$','');
 path:=regexp_replace(path,'([?&])(?:utm_[a-z_]+|fbclid|gclid)=[^&]*','\1','gi');
 path:=replace(regexp_replace(path,'[?&]+$',''),'?&','?');
 if path='' then path:='/';end if;
 return 'url:'||host||path;
end $$;

create function playtested_studios.canonical(raw_key text) returns text
language sql stable set search_path='' as $$
 select coalesce((select a.canonical_key from playtested_studios.game_aliases a where a.alias_key=raw_key),raw_key)
$$;

create function playtested_studios.identity(imported uuid, approved uuid, submission uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare k text;
begin
 if imported is not null then
  select playtested_studios.raw_identity(i.steam_app_id,i.steam_url) into k from public.imported_games i where i.id=imported;
 elsif approved is not null or submission is not null then
  select coalesce(playtested_studios.raw_identity(g.steam_app_id,g.steam_url),playtested_studios.raw_identity(g.steam_app_id,g.game_link))
   into k from public.game_submissions g where id=coalesce(approved,submission);
  if k is null and approved is not null then
   select playtested_studios.raw_identity(a.steam_app_id,null) into k from public.approved_games a where a.id=approved;
  end if;
 end if;
 return playtested_studios.canonical(coalesce(k,case when imported is not null then 'imported:'||imported else 'game:'||coalesce(approved,submission) end));
end $$;

alter table playtested_studios.games add column allowance_key text;
update playtested_studios.games g set allowance_key=playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id)
 from public.game_developer_links l where l.id=g.link_id;
alter table playtested_studios.games alter column allowance_key set not null;
create unique index studio_allowance_game on playtested_studios.games(allowance_key);

-- Both reassignment and first publication serialize on the same canonical key.
create function playtested_studios.lock_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if tg_op='DELETE' then
  perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||old.allowance_key,0));
  insert into playtested_studios.game_ownership_audit(game_key,studio_id,actor_id,action)
   values(old.allowance_key,old.studio_id,auth.uid(),'unassign');
  return old;
 end if;
 select playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id) into k
  from public.game_developer_links l where l.id=new.link_id;
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||k,0));
 if tg_op='INSERT' then
  insert into playtested_studios.game_ownership_audit(game_key,studio_id,actor_id,action)
   values(k,new.studio_id,auth.uid(),'assign');
 end if;
 new.allowance_key:=k;
 return new;
end $$;
create trigger studio_lock_assignment before insert or update or delete on playtested_studios.games
 for each row execute function playtested_studios.lock_assignment();

create function playtested_studios.workspace_for(k text) returns uuid
language sql volatile security definer set search_path='' as $$
 select studio_id from playtested_studios.games where allowance_key=k
$$;

-- Keep the historical snapshot and the launch-trigger cutover in one write window.
set local lock_timeout = '5s';
lock table public.community_playtests in share row exclusive mode;

insert into playtested_studios.launches(campaign_id,scope,game_key,plan,launched_at)
select c.id,'personal:'||c.developer_id,playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id),
 coalesce((select e.new_plan from public.developer_entitlement_events e where e.developer_id=c.developer_id and e.created_at<=c.tester_hub_started_at order by e.created_at desc limit 1),'free'),
 c.tester_hub_started_at
from public.community_playtests c where c.tester_hub_started_at is not null;

create function playtested_studios.usage_at(workspace text, policy public.developer_plan_policy, checked timestamptz)
returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz)
language sql volatile set search_path='' as $$
 with recent as (
   select launched_at from playtested_studios.launches where scope=workspace and launched_at>checked-policy.launch_window
 ), totals as (
   select count(*)::integer used,max(launched_at) latest from recent
 ), limits as (
   select used,case when policy.launch_gap>interval '0' and latest+policy.launch_gap>checked then latest+policy.launch_gap end cooldown,
    case when used>=policy.launch_limit then (select launched_at+policy.launch_window from recent order by launched_at offset greatest(used-policy.launch_limit,0) limit 1) end quota
   from totals
 )
 select used,cooldown,quota,greatest(cooldown,quota) from limits
$$;

create or replace function public._playtested_developer_launch_window_at(p_developer_id uuid,p_checked_at timestamptz)
returns table(rounds_used integer,cooldown_until timestamptz,quota_until timestamptz,next_at timestamptz)
language sql volatile security definer set search_path='' as $$
 select * from playtested_studios.usage_at('personal:'||p_developer_id,public._developer_plan(p_developer_id),p_checked_at)
$$;

create or replace function public._playtested_free_allowance_at(p_developer_id uuid,p_checked_at timestamptz)
returns table(campaigns_used integer,campaigns_limit integer,campaigns_remaining integer,place_cap integer,next_at timestamptz)
language sql volatile security definer set search_path='' as $$
 select w.rounds_used,1,greatest(1-w.rounds_used,0),1,w.next_at
 from playtested_studios.usage_at('personal:'||p_developer_id,(select p from public.developer_plan_policy p where p.plan='free'),p_checked_at) w
$$;

create function playtested_studios.campaign_policy(imported uuid,approved uuid,submission uuid,developer uuid)
returns public.developer_plan_policy language sql volatile set search_path='' as $$
 select case when studio is null then public._developer_plan(developer) else playtested_studios.studio_policy(studio) end
 from (select playtested_studios.workspace_for(playtested_studios.identity(imported,approved,submission)) studio) x
$$;

create function playtested_studios.first_launch(c public.community_playtests, launched timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare k text; studio uuid; policy public.developer_plan_policy; workspace text; usage record; game_ready timestamptz; rightful uuid;
begin
 k:=playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id);
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||k,0));
 studio:=playtested_studios.workspace_for(k);
 if studio is not null then
  if not exists(select 1 from playtested_studios.studios s where s.id=studio and s.owner_id=c.developer_id)
     or (auth.uid() is not null and coalesce(playtested_studios.my_role(studio),'') not in ('owner','editor')) then
   raise exception 'This game belongs to its studio workspace.' using errcode='42501';
  end if;
  if not playtested_studios.studio_enabled(studio) then
   raise exception 'This legacy studio cannot launch campaigns while the owner exceeds their studio limit.';
  end if;
  workspace:='studio:'||studio;
  policy:=playtested_studios.studio_policy(studio);
 else
  select l.developer_id into rightful from public.game_developer_links l
   where playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id)=k
   order by l.created_at,l.id limit 1;
  if rightful is distinct from c.developer_id or (auth.uid() is not null and auth.uid()<>c.developer_id) then
   raise exception 'Canonical game ownership requires review before a Tester Hub launch.' using errcode='42501';
  end if;
  workspace:='personal:'||c.developer_id;
  policy:=public._developer_plan(c.developer_id);
 end if;
 select * into usage from playtested_studios.usage_at(workspace,policy,launched);
 if usage.next_at is not null then raise exception 'Workspace allowance unavailable until %.',usage.next_at;end if;
 if policy.plan='free' then
  if c.target_testers>1 then raise exception 'Free plan campaigns reserve one accepted tester place.';end if;
  select max(l.launched_at)+interval '30 days' into game_ready from playtested_studios.launches l
   where playtested_studios.canonical(l.game_key)=k and l.plan='free';
  if game_ready>launched then raise exception 'This game has a Free launch cooldown until %.',game_ready;end if;
 end if;
 insert into playtested_studios.launches(campaign_id,scope,game_key,plan,launched_at,actor_id)
 values(c.id,workspace,k,policy.plan,launched,auth.uid());
end $$;

do $$
declare definition text; start_at integer; end_at integer; original text;
begin
 definition:=pg_get_functiondef('public._playtested_guard_launch()'::regprocedure);
 start_at:=strpos(definition,'    IF (select plan from public._developer_plan(NEW.developer_id))');
 end_at:=strpos(definition,'    NEW.tester_hub_started_at := v_now;');
 if start_at=0 or end_at<=start_at then raise exception 'Review the installed launch guard before applying studio accounting.';end if;
 execute substr(definition,1,start_at-1)||'    PERFORM playtested_studios.first_launch(NEW,v_now);'||chr(10)||substr(definition,end_at);
 definition:=pg_get_functiondef('public.change_studio(text,uuid,uuid,text,text,text)'::regprocedure);
 original:=definition;
 definition:=replace(definition,'  insert into playtested_studios.studios(owner_id,name)', $body$  perform pg_advisory_xact_lock(hashtextextended('playtested:developer:'||actor,0));
  if (select count(*) from playtested_studios.studios where owner_id=actor)>=playtested_studios.ownership_limit((public._developer_plan(actor)).plan) then
   raise exception 'Your developer plan has reached its studio ownership limit.';
  end if;
  insert into playtested_studios.studios(owner_id,name)$body$);
 if definition=original then raise exception 'Review the installed studio creation guard.';end if;
 execute definition;
end $$;

-- Reuse the existing targeting and duration safeguards with the actual
-- workspace policy. Existing published restrictions remain grandfathered.
do $$
declare definition text; revised text;
begin
 definition:=pg_get_functiondef('public._assert_developer_targeting(jsonb,jsonb)'::regprocedure);
 revised:=replace(definition,'public._developer_plan((p_new->>''developer_id'')::uuid)', $body$playtested_studios.campaign_policy((p_new->>'imported_game_id')::uuid,(p_new->>'approved_game_id')::uuid,(p_new->>'submission_id')::uuid,(p_new->>'developer_id')::uuid)$body$);
 if revised=definition then raise exception 'Review the installed targeting plan guard.';end if;
 execute revised;
 definition:=pg_get_functiondef('public._guard_campaign_duration_by_plan()'::regprocedure);
 revised:=regexp_replace(definition,'public[.]_developer_plan\((?:NEW|new)[.]developer_id\)', 'playtested_studios.campaign_policy(NEW.imported_game_id,NEW.approved_game_id,NEW.submission_id,NEW.developer_id)','g');
 if revised=definition then raise exception 'Review the installed duration plan guard.';end if;
 execute revised;
 definition:=pg_get_functiondef('public.fix_free_target()'::regprocedure);
 revised:=replace(definition,'public._developer_plan(new.developer_id)','playtested_studios.campaign_policy(new.imported_game_id,new.approved_game_id,new.submission_id,new.developer_id)');
 if revised=definition then raise exception 'Review the installed place cap guard.';end if;
 execute revised;
end $$;

create or replace function public.get_studio_developer_plan(p_studio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s playtested_studios.studios%rowtype; p public.developer_plan_policy; w record; checked timestamptz:=clock_timestamp(); role text; enabled boolean;
begin
 role:=playtested_studios.my_role(p_studio);
 if role is null then raise exception 'Studio membership required.' using errcode='42501';end if;
 select * into strict s from playtested_studios.studios where id=p_studio;
 p:=playtested_studios.studio_policy(p_studio);
 enabled:=playtested_studios.studio_enabled(p_studio);
 select * into w from playtested_studios.usage_at('studio:'||s.id,p,checked);
 return to_jsonb(p)||to_jsonb(w)||jsonb_build_object('studio_name',s.name,'studio_role',role,'studio_enabled',enabled,
  'available_launches',case when enabled and w.next_at is null then greatest(p.launch_limit-w.rounds_used,0) else 0 end,
  'free_campaigns_used',case when p.plan='free' then w.rounds_used end,
  'free_campaigns_remaining',case when p.plan='free' then case when enabled then greatest(1-w.rounds_used,0) else 0 end end,
  'free_campaigns_limit',1,'free_place_cap',1,'free_next_at',w.next_at,'free_window_hours',720,
  'server_now',checked,'can_assign',false,'window_hours',extract(epoch from p.launch_window)/3600,'gap_hours',extract(epoch from p.launch_gap)/3600);
end $$;

create function public.admin_assign_studio_plan(p_studio uuid,p_plan text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.' using errcode='42501';end if;
 if p_plan not in ('free','pro') or nullif(btrim(p_reason),'') is null then raise exception 'Select a plan and provide an audit reason.';end if;
 select s.owner_id into strict owner_id from playtested_studios.studios s where s.id=p_studio;
 perform pg_advisory_xact_lock(hashtextextended('playtested:developer:'||owner_id,0));
 insert into playtested_studios.entitlements(studio_id,plan) values(p_studio,p_plan)
 on conflict(studio_id) do update set plan=excluded.plan;
 insert into playtested_studios.entitlement_audit(studio_id,actor_id,plan,reason) values(p_studio,auth.uid(),p_plan,btrim(p_reason));
end $$;

create function public.get_pro_feedback_export(p_playtest_id uuid,p_studio uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.community_playtests%rowtype; studio uuid; p public.developer_plan_policy;
begin
 select * into c from public.community_playtests where id=p_playtest_id;
 if not found or not playtested_studios.can_campaign(p_playtest_id) then raise exception 'Report unavailable.' using errcode='42501';end if;
 studio:=playtested_studios.workspace_for(playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id));
 if studio is distinct from p_studio then raise exception 'Report unavailable in this workspace.' using errcode='42501';end if;
 if studio is null then
  if c.developer_id is distinct from auth.uid() then raise exception 'Report unavailable.' using errcode='42501';end if;
  p:=public._developer_plan(c.developer_id);
 else
  if playtested_studios.my_role(studio) is null then raise exception 'Report unavailable.' using errcode='42501';end if;
  p:=playtested_studios.studio_policy(studio);
 end if;
 if p.plan is distinct from 'pro' then raise exception 'Report export is unavailable for this workspace.' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.get_developer_accepted_playtest_feedback(p_playtest_id) r);
end $$;

revoke all on function public.admin_assign_studio_plan(uuid,text,text),public.get_pro_feedback_export(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_assign_studio_plan(uuid,text,text),public.get_pro_feedback_export(uuid,uuid) to authenticated;
revoke all on all functions in schema playtested_studios from public,anon,authenticated;
commit;

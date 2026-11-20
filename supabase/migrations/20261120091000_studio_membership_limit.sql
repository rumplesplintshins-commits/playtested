begin;

create function playtested_studios.associations(p_user uuid)
returns table(studio_id uuid, joined_at timestamptz)
language sql stable set search_path='' as $$
 select id,created_at from playtested_studios.studios where owner_id=p_user
 union all
 select studio_id,joined_at from playtested_studios.members where user_id=p_user
$$;

create function playtested_studios.membership_limit(p_user uuid) returns integer
language sql stable set search_path='' as $$
 select playtested_studios.ownership_limit((public._developer_plan(p_user)).plan)
$$;

create function playtested_studios.membership_slots(p_user uuid, include_pending boolean)
returns integer language sql stable set search_path='' as $$
 select count(*)::integer from (
  select a.studio_id from playtested_studios.associations(p_user) a
  union
  select i.studio_id from playtested_studios.invites i
  where include_pending and i.user_id=p_user and i.status='pending' and i.expires_at>statement_timestamp()
 ) reserved
$$;

create function playtested_studios.lock_membership(p_user uuid) returns void
language plpgsql set search_path='' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Retry studio membership changes using read committed.' using errcode='40001';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:studio-membership:'||p_user,0));
end $$;

create function playtested_studios.admit_studio(p_user uuid, include_pending boolean) returns boolean
language plpgsql volatile set search_path='' as $$
begin
 perform playtested_studios.lock_membership(p_user);
 return playtested_studios.membership_slots(p_user,include_pending)<playtested_studios.membership_limit(p_user);
end $$;

create function playtested_studios.is_launch_association(p_user uuid,p_studio uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(
  select 1 from (
   select studio_id,row_number() over(order by joined_at,studio_id) as admission_order
   from playtested_studios.associations(p_user)
  ) ranked
  where studio_id=p_studio and admission_order<=playtested_studios.membership_limit(p_user)
 )
$$;

create or replace function playtested_studios.studio_enabled(p_studio uuid) returns boolean
language sql volatile set search_path='' as $$
 select exists(select 1 from playtested_studios.studios
  where id=p_studio and playtested_studios.is_launch_association(owner_id,id))
$$;

do $$
declare src text;
begin
 src:=pg_get_functiondef('public.get_studio_team(uuid)'::regprocedure);
 if strpos(src,$body$'limit',playtested_studios.colleague_limit(),$body$)=0 then raise exception 'Studio team contract changed';end if;
 execute replace(src,$body$'limit',playtested_studios.colleague_limit(),$body$,$body$'limit',playtested_studios.colleague_limit(),
  'membership_limit',playtested_studios.membership_limit(actor),
  'active_memberships',playtested_studios.membership_slots(actor,false),
  'reserved_memberships',playtested_studios.membership_slots(actor,true),$body$);

 src:=pg_get_functiondef('public.change_studio(text,uuid,uuid,text,text,text)'::regprocedure);
 if strpos(src,'  insert into playtested_studios.studios(owner_id,name)')=0
  or strpos(src,$body$  if p_action='accept' then$body$)=0
  or strpos(src,'   insert into playtested_studios.invites(studio_id,user_id,role)')=0
  or strpos(src,$body$ if s.owner_id<>actor then raise exception 'Studio owner access required.'$body$)=0 then
  raise exception 'Studio mutation contract changed';
 end if;
 src:=regexp_replace(src,$body$  if \(select count\(\*\) from playtested_studios.studios where owner_id=actor\)>=.*?  end if;\n$body$,'','s');
 src:=replace(src,'  insert into playtested_studios.studios(owner_id,name)',$body$
  if not playtested_studios.admit_studio(actor,true) then
   raise exception 'Your studio membership limit is reached or reserved by an invitation.' using errcode='PST01';
  end if;
  insert into playtested_studios.studios(owner_id,name)$body$);
 src:=replace(src,$body$  if p_action='accept' then$body$,$body$  if p_action='accept' then
   if not playtested_studios.admit_studio(actor,false) then
    raise exception 'Your studio membership limit is reached.' using errcode='PST01';
   end if;$body$);
 src:=replace(src,$body$ if s.owner_id<>actor then raise exception 'Studio owner access required.'$body$,$body$
 if p_action='leave' then
  if s.owner_id=actor then raise exception 'The studio owner cannot leave their own studio.' using errcode='42501';end if;
  perform playtested_studios.lock_membership(actor);
  delete from playtested_studios.members where studio_id=s.id and user_id=actor;
  if not found then raise exception 'Studio membership unavailable.' using errcode='42501';end if;
  return jsonb_build_object('id',s.id,'message','You left the studio.');
 end if;
 if s.owner_id<>actor then raise exception 'Studio owner access required.'$body$);
 src:=replace(src,'   delete from playtested_studios.members where studio_id=s.id and user_id=p_target;',
  '   perform playtested_studios.lock_membership(p_target);'||chr(10)||'   delete from playtested_studios.members where studio_id=s.id and user_id=p_target;');
 src:=replace(src,'   insert into playtested_studios.invites(studio_id,user_id,role)',$body$
   if not playtested_studios.admit_studio(target_user,true) then
    return jsonb_build_object('message','Eligible registered members receive an in-app invitation.');
   end if;
   insert into playtested_studios.invites(studio_id,user_id,role)$body$);
 execute src;

 src:=pg_get_functiondef('playtested_studios.first_launch(public.community_playtests,timestamp with time zone)'::regprocedure);
 if strpos(src,$body$  workspace:='studio:'||studio;$body$)=0 then raise exception 'Studio launch contract changed';end if;
 execute replace(src,$body$  workspace:='studio:'||studio;$body$,$body$
  if auth.uid() is not null and not playtested_studios.is_launch_association(auth.uid(),studio) then
   raise exception 'This legacy studio membership cannot launch campaigns while your account exceeds its studio limit.';
  end if;
  workspace:='studio:'||studio;$body$);
end $$;

revoke all on all functions in schema playtested_studios from public,anon,authenticated;
-- Imported catalogue writes evaluate this pure expression for the identity index.
-- The schema remains private and the other Studio helpers remain restricted.
grant execute on function playtested_studios.raw_identity(text,text) to authenticated,service_role;
commit;

begin;
create schema playtested_studios;
revoke all on schema playtested_studios from public, anon, authenticated;

create table playtested_studios.studios (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80),
 created_at timestamptz not null default now()
);
create index studio_owner on playtested_studios.studios(owner_id);
create table playtested_studios.members (
 studio_id uuid references playtested_studios.studios on delete cascade,
 user_id uuid references auth.users on delete cascade,
 role text not null check (role in ('editor','viewer')),
 joined_at timestamptz not null default now(),
 primary key (studio_id,user_id)
);
create index studio_member_user on playtested_studios.members(user_id,studio_id);
create table playtested_studios.invites (
 id uuid primary key default gen_random_uuid(),
 studio_id uuid not null references playtested_studios.studios on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 role text not null check (role in ('editor','viewer')),
 status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '7 days')
);
create unique index studio_pending_invite on playtested_studios.invites(studio_id,user_id) where status='pending';
create index studio_invited_user on playtested_studios.invites(user_id,studio_id) where status='pending';
create table playtested_studios.games (
 studio_id uuid not null references playtested_studios.studios on delete cascade,
 link_id uuid primary key references public.game_developer_links on delete cascade
);
create index studio_game_workspace on playtested_studios.games(studio_id);
create table playtested_studios.invite_attempts (
 owner_id uuid not null references auth.users on delete cascade,
 attempted_at timestamptz not null default clock_timestamp()
);
create index studio_invite_rate on playtested_studios.invite_attempts(owner_id,attempted_at);
alter table playtested_studios.studios enable row level security;
alter table playtested_studios.members enable row level security;
alter table playtested_studios.invites enable row level security;
alter table playtested_studios.games enable row level security;
alter table playtested_studios.invite_attempts enable row level security;
revoke all on all tables in schema playtested_studios from public, anon, authenticated;

create function playtested_studios.colleague_limit() returns integer
language sql immutable set search_path='' as $$ select 5 $$;
create function playtested_studios.my_role(p_studio uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when s.owner_id=auth.uid() then 'owner' else m.role end
 from playtested_studios.studios s
 left join playtested_studios.members m on m.studio_id=s.id and m.user_id=auth.uid()
 where s.id=p_studio
$$;

create function public.get_my_studios() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'role',playtested_studios.my_role(s.id)) order by s.name,s.id),'[]'::jsonb)
 from playtested_studios.studios s
 where s.owner_id=auth.uid() or exists(select 1 from playtested_studios.members m where m.studio_id=s.id and m.user_id=auth.uid())
$$;

create function public.get_studio_team(p_studio uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r text; s playtested_studios.studios%rowtype;
begin
 if actor is null then raise exception 'Sign in to manage teams.' using errcode='42501'; end if;
 if p_studio is not null then
  r:=playtested_studios.my_role(p_studio);
  if r is null then raise exception 'Studio unavailable.' using errcode='42501'; end if;
  select * into s from playtested_studios.studios where id=p_studio;
 end if;
 return jsonb_build_object(
  'studios',public.get_my_studios(),
  'limit',playtested_studios.colleague_limit(),
  'inbox',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',st.name,'role',i.role,'expires_at',i.expires_at) order by i.created_at desc)
   from playtested_studios.invites i join playtested_studios.studios st on st.id=i.studio_id
   where i.user_id=actor and i.status='pending' and i.expires_at>now()),'[]'::jsonb),
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',x.user_id,'name',p.display_name,'role',x.role,'joined_at',x.joined_at,'email',case when r='owner' or x.user_id=actor then u.email end) order by x.joined_at,x.user_id)
   from (select s.owner_id user_id,'owner' role,s.created_at joined_at union all select m.user_id,m.role,m.joined_at from playtested_studios.members m where m.studio_id=s.id) x
   join public.profiles p on p.id=x.user_id join auth.users u on u.id=x.user_id),'[]'::jsonb),
  'pending',case when r='owner' then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',u.email,'role',i.role,'expires_at',i.expires_at) order by i.created_at)
   from playtested_studios.invites i join auth.users u on u.id=i.user_id where i.studio_id=s.id and i.status='pending' and i.expires_at>now()),'[]'::jsonb) else '[]'::jsonb end,
  'games',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'title',coalesce(i.title,a.title,g.title),'image',coalesce(i.image_url,a.image_url,g.image_url),'shared',sg.studio_id=s.id) order by coalesce(i.title,a.title,g.title))
   from public.game_developer_links l
   left join public.imported_games i on i.id=l.imported_game_id
   left join public.approved_games a on a.id=l.approved_game_id
   left join public.game_submissions g on g.id=l.submission_id
   left join playtested_studios.games sg on sg.link_id=l.id
   where l.developer_id=s.owner_id and (sg.studio_id=s.id or (r='owner' and sg.link_id is null))
    and coalesce(i.title,a.title,g.title) is not null and (g.id is null or (g.developer_id=s.owner_id and g.status='Approved'))),'[]'::jsonb)
 );
end $$;

-- Extend the existing inbox with one narrowly sourced event type.
do $$
declare current_check text;
begin
 select pg_get_expr(conbin,conrelid) into strict current_check from pg_constraint
 where conname='notifications_kind_check' and conrelid='public.notifications'::regclass;
 alter table public.notifications drop constraint notifications_kind_check;
 execute format('alter table public.notifications add constraint notifications_kind_check check ((%s) or kind=''studio_invitation'')',current_check);
end $$;

create function public.change_studio(
 p_action text, p_studio uuid default null, p_target uuid default null,
 p_name text default null, p_email text default null, p_role text default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); s playtested_studios.studios%rowtype; i playtested_studios.invites%rowtype; target_user uuid; new_id uuid;
begin
 if actor is null then raise exception 'Sign in to manage teams.' using errcode='42501'; end if;
 if p_action='create' then
  if not exists(select 1 from public.profiles where id=actor and (role='admin' or 'developer'=any(roles))) then
   raise exception 'Developer access required.' using errcode='42501';
  end if;
  insert into playtested_studios.studios(owner_id,name) values(actor,btrim(p_name)) returning id into new_id;
  return jsonb_build_object('id',new_id);
 end if;

 if p_action in ('accept','decline') then
  select studio_id into p_studio from playtested_studios.invites where id=p_target and user_id=actor;
 end if;
 -- Every operation that changes capacity or assignment takes the same row lock.
 select * into s from playtested_studios.studios where id=p_studio for update;
 if not found then raise exception 'Studio or invitation unavailable.' using errcode='42501'; end if;
 if p_action in ('accept','decline') then
  select * into i from playtested_studios.invites where id=p_target and user_id=actor and status='pending' and expires_at>clock_timestamp();
  if not found or actor=s.owner_id then raise exception 'Invitation is no longer available.' using errcode='42501'; end if;
  if p_action='accept' then
   insert into playtested_studios.members(studio_id,user_id,role) values(s.id,actor,i.role);
  end if;
  update playtested_studios.invites set status=case when p_action='accept' then 'accepted' else 'declined' end where id=i.id;
  update public.notifications set read_at=coalesce(read_at,now()),
   title=case when p_action='accept' then 'You joined '||s.name else 'Invitation declined' end,
   message=case when p_action='accept' then 'Open My Games to view your studio games.' else 'No studio access was granted.' end,
   href=case when p_action='accept' then '/my-submissions?studio='||s.id else null end
   where recipient_id=actor and dedupe_key='studio-invitation:'||i.id;
  return jsonb_build_object('id',s.id);
 end if;
 if s.owner_id<>actor then raise exception 'Studio owner access required.' using errcode='42501'; end if;
 if p_action='rename' then
  update playtested_studios.studios set name=btrim(p_name) where id=s.id;
 elsif p_action in ('role','remove') then
  if p_target=actor then raise exception 'The studio owner cannot be removed or demoted.'; end if;
  if p_action='role' then
   update playtested_studios.members set role=p_role where studio_id=s.id and user_id=p_target;
  else
   delete from playtested_studios.members where studio_id=s.id and user_id=p_target;
  end if;
 elsif p_action='assign' then
  insert into playtested_studios.games(studio_id,link_id)
   select s.id,l.id from public.game_developer_links l where l.id=p_target and l.developer_id=actor and
   (l.imported_game_id is not null or l.approved_game_id is not null or exists(select 1 from public.game_submissions g where g.id=l.submission_id and g.developer_id=actor and g.status='Approved'));
  if not found then raise exception 'An approved game relationship is required.' using errcode='42501'; end if;
 elsif p_action='unassign' then
  delete from playtested_studios.games where studio_id=s.id and link_id=p_target;
 elsif p_action='cancel' then
  update playtested_studios.invites set status='cancelled' where studio_id=s.id and id=p_target and status='pending' returning * into i;
  if found then
   update public.notifications set read_at=coalesce(read_at,now()),title='Invitation cancelled',message='This studio invitation is no longer available.',href=null
   where recipient_id=i.user_id and dedupe_key='studio-invitation:'||i.id;
  end if;
 elsif p_action='invite' then
  if p_role is null or p_role not in ('editor','viewer') then raise exception 'Choose Editor or Viewer.'; end if;
  if p_email is null or char_length(p_email)>254 then raise exception 'Enter a registered email address.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,7122));
  delete from playtested_studios.invite_attempts where owner_id=actor and attempted_at<clock_timestamp()-interval '1 hour';
  if (select count(*) from playtested_studios.invite_attempts where owner_id=actor)>=20 then
   raise exception 'Too many invitation attempts. Try again later.';
  end if;
  insert into playtested_studios.invite_attempts(owner_id) values(actor);
  update playtested_studios.invites set status='expired' where studio_id=s.id and status='pending' and expires_at<=clock_timestamp();
  if ((select count(*) from playtested_studios.members where studio_id=s.id)+(select count(*) from playtested_studios.invites where studio_id=s.id and status='pending'))>=playtested_studios.colleague_limit() then
   raise exception 'All colleague places are reserved.';
  end if;
  select u.id into target_user from auth.users u join public.profiles p on p.id=u.id where lower(u.email)=lower(btrim(p_email)) and u.email_confirmed_at is not null;
  if target_user is not null and target_user<>actor and not exists(select 1 from playtested_studios.members where studio_id=s.id and user_id=target_user) then
   insert into playtested_studios.invites(studio_id,user_id,role) values(s.id,target_user,p_role)
    on conflict (studio_id,user_id) where status='pending' do nothing returning id into new_id;
   if new_id is not null then
    insert into public.notifications(recipient_id,kind,title,message,href,dedupe_key)
    values(target_user,'studio_invitation','You have been invited to join '||s.name,
     'Access level: '||initcap(p_role)||'. Open Manage Team to accept or decline.','/my-team?invite='||new_id,'studio-invitation:'||new_id);
   end if;
  end if;
  return jsonb_build_object('message','Eligible registered members receive an in-app invitation.');
 else
  raise exception 'Unsupported studio action.';
 end if;
 return jsonb_build_object('id',s.id);
end $$;
revoke all on function public.get_my_studios(),public.get_studio_team(uuid),public.change_studio(text,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.get_my_studios(),public.get_studio_team(uuid),public.change_studio(text,uuid,uuid,text,text,text) to authenticated;
commit;

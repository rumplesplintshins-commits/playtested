begin;

create table playtested_studios.identity_reviews (
 source_kind text not null,
 source_id uuid not null,
 reason text not null,
 created_at timestamptz not null default now(),
 primary key(source_kind,source_id)
);
alter table playtested_studios.identity_reviews enable row level security;
revoke all on playtested_studios.identity_reviews from public,anon,authenticated;

create function playtested_studios.personal_owner(k text) returns uuid
language sql volatile security definer set search_path='' as $$
 select l.developer_id from public.game_developer_links l
 where playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id)=k
 order by l.created_at,l.id limit 1
$$;

create function playtested_studios.check_submission_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text; old_key text;
begin
 k:=playtested_studios.canonical(coalesce(playtested_studios.raw_identity(new.steam_app_id,new.steam_url),
  playtested_studios.raw_identity(new.steam_app_id,new.game_link)));
 if tg_op='UPDATE' then
  old_key:=playtested_studios.identity(null,null,old.id);
  if coalesce(k,'game:'||new.id)=old_key then return new;end if;
  if exists(select 1 from playtested_studios.launches l where playtested_studios.canonical(l.game_key)=old_key)
   or playtested_studios.workspace_for(old_key) is not null then
    raise exception 'Changes to a shared or previously launched game identity require admin review.' using errcode='42501';
  end if;
 end if;
 if k is null then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||k,0));
 if exists(select 1 from public.game_submissions s where s.id<>new.id and playtested_studios.identity(null,null,s.id)=k)
   or (k like 'steam:%' and exists(select 1 from public.imported_games g where playtested_studios.identity(g.id,null,null)=k)) then
  raise exception 'This game already has a listing. Use the existing listing or request an ownership review.' using errcode='23505';
 end if;
 return new;
end $$;
create trigger zz_studio_submission_identity before insert or update of steam_app_id,steam_url,game_link on public.game_submissions
 for each row execute function playtested_studios.check_submission_identity();

create function playtested_studios.queue_identity_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.game_submissions s where s.id<>new.id
     and lower(btrim(s.title))=lower(btrim(new.title))
     and lower(btrim(s.developer_name))=lower(btrim(new.developer_name))) then
   insert into playtested_studios.identity_reviews(source_kind,source_id,reason)
    values('submission',new.id,'Similar title and studio with a different or unknown identifier') on conflict do nothing;
 end if;
 return new;
end $$;
create trigger studio_review_ambiguous_game after insert on public.game_submissions
 for each row execute function playtested_studios.queue_identity_review();

create function playtested_studios.check_claim_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text; owner_id uuid;
begin
 k:=playtested_studios.identity(new.imported_game_id,new.approved_game_id,new.submission_id);
 if k is null then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||k,0));
 owner_id:=playtested_studios.personal_owner(k);
 if owner_id is not null and owner_id<>new.claimant_id then
  if new.status='Approved' then raise exception 'A different developer already controls the canonical game. Ownership requires admin review.';end if;
  insert into playtested_studios.identity_reviews(source_kind,source_id,reason)
   values('claim',new.id,'Claim overlaps an existing canonical game owner') on conflict do nothing;
 end if;
 return new;
end $$;
create trigger studio_claim_identity before insert or update of status on public.game_claims
 for each row execute function playtested_studios.check_claim_identity();

create function public.get_game_identity_reviews() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb)
 from (select * from playtested_studios.identity_reviews order by created_at desc limit 100) q);
end $$;

-- Reserve only aliases supported by verified platform evidence. Store the
-- review with the mapping, and keep every historical launch under its old key.
create function public.admin_link_game_allowance_identity(p_alias text,p_canonical text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.' using errcode='42501';end if;
 if p_alias is null or p_canonical is null or p_alias=p_canonical or length(p_alias)>2048 or length(p_canonical)>2048
  or nullif(btrim(p_reason),'') is null then raise exception 'Provide two verified identities and a review reason.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||least(p_alias,p_canonical),0));
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||greatest(p_alias,p_canonical),0));
 if exists(select 1 from playtested_studios.game_aliases where alias_key=p_canonical or canonical_key=p_alias) then
  raise exception 'Use the final canonical identity. Alias chains are unsupported.';
 end if;
 insert into playtested_studios.game_aliases values(p_alias,p_canonical,auth.uid(),btrim(p_reason));
 update playtested_studios.games set allowance_key=p_canonical where allowance_key=p_alias;
end $$;

create function playtested_studios.check_active_game() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text; studio uuid; rightful uuid;
begin
 if new.status not in ('draft','open','paused') then return new;end if;
 k:=playtested_studios.identity(new.imported_game_id,new.approved_game_id,new.submission_id);
 perform pg_advisory_xact_lock(hashtextextended('playtested:developer:'||new.developer_id,0));
 perform pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||k,0));
 studio:=playtested_studios.workspace_for(k);
 if studio is not null then
  if not exists(select 1 from playtested_studios.studios where id=studio and owner_id=new.developer_id)
    or (auth.uid() is not null and coalesce(playtested_studios.my_role(studio),'') not in ('owner','editor')) then
   raise exception 'Manage this campaign from its authorised studio.' using errcode='42501';
  end if;
 else
  rightful:=playtested_studios.personal_owner(k);
  if rightful is not null and rightful<>new.developer_id then raise exception 'Canonical game ownership requires admin review.' using errcode='42501';end if;
  if auth.uid() is not null and auth.uid()<>new.developer_id then raise exception 'Personal campaign ownership required.' using errcode='42501';end if;
 end if;
 if tg_op='INSERT' or old.status='closed' then
  if exists(select 1 from public.community_playtests c where c.id<>new.id and c.status in ('draft','open','paused')
   and playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id)=k) then
    raise exception 'This canonical game already has an active campaign.';
  end if;
 end if;
 return new;
end $$;
create trigger ab_studio_active_game before insert or update on public.community_playtests
 for each row execute function playtested_studios.check_active_game();

do $$
declare definition text; revised text;
begin
 definition:=pg_get_functiondef('playtested_studios.lock_assignment()'::regprocedure);
 revised:=replace(definition,' if tg_op=''INSERT'' then', $body$ if tg_op='INSERT' then
  if playtested_studios.personal_owner(k) is distinct from (select s.owner_id from playtested_studios.studios s where s.id=new.studio_id) then
   raise exception 'Canonical game ownership requires admin review.' using errcode='42501';
  end if;$body$);
 if revised=definition then raise exception 'Assignment guard missing.';end if;
 execute revised;

 definition:=pg_get_functiondef('public.get_playtest_eligibility(uuid,uuid,uuid)'::regprocedure);
 revised:=replace(definition,'allowed boolean;begin','allowed boolean; k text; sid uuid; policy public.developer_plan_policy; usage record; game_ready timestamptz; begin');
 revised:=replace(revised,' return query select r.has_active_playtest', $body$
 k:=playtested_studios.identity(p_imported_game_id,p_approved_game_id,p_submission_id);
 sid:=playtested_studios.workspace_for(k);
 if sid is not null then
  if coalesce(playtested_studios.my_role(sid),'') not in ('owner','editor') then
   raise exception 'Studio campaign management access required.' using errcode='42501';
  end if;
  policy:=playtested_studios.studio_policy(sid);
  select * into usage from playtested_studios.usage_at('studio:'||sid,policy,clock_timestamp());
  r.tester_hub_rounds_last_30_days:=usage.rounds_used;
  r.next_tester_hub_at:=usage.next_at;
  r.tester_hub_eligible:=allowed and playtested_studios.studio_enabled(sid) and usage.next_at is null
    and (not r.has_active_playtest or r.active_playtest_status='draft');
  if not playtested_studios.studio_enabled(sid) then r.tester_hub_reason:='Legacy studio: the owner has reached the studio limit.';
  elsif usage.next_at is not null then r.tester_hub_reason:='The studio has used its shared launch allowance.';
  elsif r.tester_hub_eligible then r.tester_hub_reason:='Studio launch allowance available.';end if;
 else
  policy:=public._developer_plan(auth.uid());
 end if;
 if policy.plan='free' then
  select max(l.launched_at)+interval '30 days' into game_ready from playtested_studios.launches l
   where playtested_studios.canonical(l.game_key)=k and l.plan='free';
  if game_ready>clock_timestamp() then
   r.tester_hub_eligible:=false;
   r.next_tester_hub_at:=greatest(game_ready,r.next_tester_hub_at);
   r.tester_hub_reason:='This canonical game is in its 30-day Free launch cooldown.';
  end if;
 end if;
 return query select r.has_active_playtest$body$);
 if revised=definition then raise exception 'Eligibility return path missing.';end if;
 execute revised;
end $$;

revoke all on function public.get_game_identity_reviews(),public.admin_link_game_allowance_identity(text,text,text) from public,anon,authenticated;
grant execute on function public.get_game_identity_reviews(),public.admin_link_game_allowance_identity(text,text,text) to authenticated;
revoke all on all functions in schema playtested_studios from public,anon,authenticated;
commit;

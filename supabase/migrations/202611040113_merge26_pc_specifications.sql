-- Optional account hardware is private. Game requirements use one canonical
-- listing key, shared by approved/submission/claimed-Steam aliases.
begin;
create function public.pc_specs_valid(p jsonb,p_allow_notes boolean default false) returns boolean
language plpgsql immutable set search_path='' as $$declare item record;amount numeric;begin
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>6000 then return false;end if;
 for item in select key,value from jsonb_each(p) loop
  if item.key in('ram_gb','vram_gb','storage_gb') then
   if jsonb_typeof(item.value)<>'number' then return false;end if;
   amount:=(item.value::text)::numeric;
   if amount<0 or amount>(case when item.key='storage_gb' then 1000000 else 4096 end)
    or(item.key='ram_gb' and amount<0.25) then return false;end if;
  elsif item.key in('os','os_version','cpu','gpu','storage_type','api') or(item.key='notes' and p_allow_notes) then
   if jsonb_typeof(item.value)<>'string' or char_length(item.value#>>'{}')>(case when item.key='notes' then 1000 else 160 end) then return false;end if;
   if item.key='storage_type' and (item.value#>>'{}') not in('SSD','HDD','NVMe SSD','Other') then return false;end if;
  else return false;end if;
 end loop;
 return true;
end;$$;
create table public.account_pc_specs(
 user_id uuid primary key references auth.users(id) on delete cascade,
 specs jsonb not null default '{}' check(public.pc_specs_valid(specs)),
 updated_at timestamptz not null default now()
);
alter table public.account_pc_specs enable row level security;
revoke all on public.account_pc_specs from public,anon,authenticated;
grant select,insert,update,delete on public.account_pc_specs to authenticated;
grant all on public.account_pc_specs to service_role;
create policy pc_specs_owner on public.account_pc_specs for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public._stamp_account_pc_specs() returns trigger language plpgsql set search_path='' as $$begin
 new.updated_at:=clock_timestamp();return new;
end;$$;
revoke all on function public._stamp_account_pc_specs() from public,anon,authenticated;
create trigger stamp_account_pc_specs before insert or update on public.account_pc_specs
 for each row execute function public._stamp_account_pc_specs();
create table public.game_pc_requirements(
 game_key text primary key,
 minimum jsonb not null default '{}' check(public.pc_specs_valid(minimum,true)),
 recommended jsonb not null default '{}' check(public.pc_specs_valid(recommended,true)),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
alter table public.game_pc_requirements enable row level security;
revoke all on public.game_pc_requirements from public,anon,authenticated;
grant all on public.game_pc_requirements to service_role;

create function public.save_game_pc_requirements(p_kind text,p_id uuid,p_minimum jsonb,p_recommended jsonb) returns void
language plpgsql security definer set search_path='' as $$declare k text;begin
 if p_kind not in('submission','approved','imported') or not public._m26_controls_owner(case when p_kind='approved' then 'submission' else p_kind end,p_id) then raise exception 'Listing owner required.';end if;
 if p_kind='imported' and not exists(select 1 from public.profiles where id=auth.uid() and role='admin')
  and not public._listing_current_claim(p_kind,p_id,auth.uid()) then raise exception 'Approved ownership claim required.';end if;
 if not public.pc_specs_valid(p_minimum,true) or not public.pc_specs_valid(p_recommended,true) then raise exception 'Invalid PC requirements. Check optional text lengths and numeric ranges.';end if;
 k:=public._share_key(p_kind,p_id);if k is null then raise exception 'Listing unavailable.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||k,0));
 if p_minimum='{}' and p_recommended='{}' then delete from public.game_pc_requirements where game_key=k;
 else insert into public.game_pc_requirements(game_key,minimum,recommended,updated_by) values(k,p_minimum,p_recommended,auth.uid())
  on conflict(game_key) do update set minimum=excluded.minimum,recommended=excluded.recommended,updated_at=clock_timestamp(),updated_by=auth.uid();end if;
end;$$;
revoke all on function public.save_game_pc_requirements(text,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_game_pc_requirements(text,uuid,jsonb,jsonb) to authenticated;

create function public.get_game_pc_requirements(p_games jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare item jsonb;k text;kind text;source uuid;requested_kind text;requested_id uuid;c public.community_playtests;r public.game_pc_requirements;result jsonb:='[]';begin
 if jsonb_typeof(p_games)<>'array' or jsonb_array_length(p_games)>100 then raise exception 'Invalid game requirement request.';end if;
 for item in select value from jsonb_array_elements(p_games) loop
  kind:=item->>'kind';
  if kind not in('submission','approved','imported','campaign') or coalesce(item->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid game reference.';end if;
  source:=(item->>'id')::uuid;
  requested_kind:=kind;requested_id:=source;
  if kind='campaign' then
   select * into c from public.community_playtests where id=source;
   if not found then continue;end if;
   if not(public._m26_campaign_open(c.id) or c.developer_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin')) then continue;end if;
   source:=coalesce(c.submission_id,c.approved_game_id,c.imported_game_id);
   kind:=case when c.imported_game_id is not null then 'imported' else 'submission' end;
  end if;
  if public._m26_controls_owner(case when kind='approved' then 'submission' else kind end,source)
   or(not public.beta_fixture_hidden(source) and(
    (kind in('approved','submission') and exists(select 1 from public.approved_games g where g.id=source))
    or(kind='imported' and exists(select 1 from public.m26_public_imported_profiles(array[source]))))) then
   k:=public._share_key(kind,source);select * into r from public.game_pc_requirements where game_key=k;
   result:=result||jsonb_build_array(jsonb_build_object('kind',requested_kind,'id',requested_id,'minimum',coalesce(r.minimum,'{}'),'recommended',coalesce(r.recommended,'{}')));
  end if;
 end loop;return result;
end;$$;
revoke all on function public.get_game_pc_requirements(jsonb) from public;
grant execute on function public.get_game_pc_requirements(jsonb) to anon,authenticated;

create function public.create_game_with_pc_requirements(p_fields jsonb,p_minimum jsonb default '{}',p_recommended jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$declare payload jsonb;source uuid;existing public.game_submissions;columns text;result jsonb;k text;prior public.game_pc_requirements;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Developer sign-in required.';end if;
 if not public.pc_specs_valid(p_minimum,true) or not public.pc_specs_valid(p_recommended,true) then raise exception 'Invalid optional PC requirements.';end if;
 if p_fields is null or jsonb_typeof(p_fields)<>'object' or exists(select 1 from jsonb_object_keys(p_fields) f where f not in('id','developer_id','status','title','developer_name','genre','description','game_link','steam_url','steam_app_id','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link','price')) then raise exception 'Unsupported submission fields.';end if;
 if p_fields?'developer_id' and p_fields->>'developer_id' is distinct from auth.uid()::text then raise exception 'Submission owner mismatch.';end if;
 if p_fields?'status' and p_fields->>'status' is distinct from 'Pending Review' then raise exception 'Initial review required.';end if;
 source:=coalesce((p_fields->>'id')::uuid,gen_random_uuid());
 perform pg_advisory_xact_lock(hashtextextended('playtested:submission:'||source,0));
 select * into existing from public.game_submissions where id=source;
 if found then
  if existing.developer_id is distinct from auth.uid() or not(to_jsonb(existing) @> (p_fields-'status')) then raise exception 'An earlier save exists. Open Game submissions instead of submitting a duplicate.';end if;
  k:=public._share_key('submission',source);select * into prior from public.game_pc_requirements where game_key=k;
  if coalesce(prior.minimum,'{}')<>p_minimum or coalesce(prior.recommended,'{}')<>p_recommended then raise exception 'An earlier save exists with different requirements. Open Game submissions to edit it.';end if;
  return to_jsonb(existing);
 end if;
 payload:=p_fields||jsonb_build_object('id',source,'developer_id',auth.uid(),'status','Pending Review');
 select string_agg(quote_ident(key),',' order by key) into columns from jsonb_object_keys(payload) key;
 execute format('insert into public.game_submissions(%s) select %s from jsonb_populate_record(null::public.game_submissions,$1) r returning to_jsonb(game_submissions)',columns,columns) into result using payload;
 perform public.save_game_pc_requirements('submission',source,p_minimum,p_recommended);
 return result;
end;$$;
revoke all on function public.create_game_with_pc_requirements(jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.create_game_with_pc_requirements(jsonb,jsonb,jsonb) to authenticated;

create function public.save_game_edit_with_pc_requirements(p_kind text,p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean,p_minimum jsonb,p_recommended jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if not public.pc_specs_valid(p_minimum,true) or not public.pc_specs_valid(p_recommended,true) then raise exception 'Invalid optional PC requirements.';end if;
 if p_kind='correction' then result:=public.save_my_submission_correction(p_id,p_fields,p_revision,p_resubmit);
 else result:=public.save_my_listing_edit(p_kind,p_id,p_fields,p_revision,p_resubmit,false);end if;
 perform public.save_game_pc_requirements(case when p_kind='correction' then 'submission' else p_kind end,p_id,p_minimum,p_recommended);
 return result;
end;$$;
revoke all on function public.save_game_edit_with_pc_requirements(text,uuid,jsonb,integer,boolean,jsonb,jsonb) from public,anon;
grant execute on function public.save_game_edit_with_pc_requirements(text,uuid,jsonb,integer,boolean,jsonb,jsonb) to authenticated;

create function public._cleanup_deleted_game_pc_requirements() returns trigger
language plpgsql security definer set search_path='' as $$declare k text;begin
 k:=case when btrim(old.steam_app_id)~'^[0-9]+$' then 'steam:'||btrim(old.steam_app_id) else 'game:'||old.id end;
 if k like 'game:%' or(not exists(select 1 from public.imported_games where steam_app_id=btrim(old.steam_app_id))
  and not exists(select 1 from public.game_submissions where steam_app_id=btrim(old.steam_app_id))) then delete from public.game_pc_requirements where game_key=k;end if;
 return old;
end;$$;
revoke all on function public._cleanup_deleted_game_pc_requirements() from public,anon,authenticated;
create trigger cleanup_deleted_game_pc_requirements after delete on public.game_submissions for each row execute function public._cleanup_deleted_game_pc_requirements();
commit;

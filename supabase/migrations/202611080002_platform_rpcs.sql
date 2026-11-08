-- Multi-platform RPC alignment (v11 feature branch).
-- Forward-only. Re-defines the submission/edit validators so the platform
-- field is accepted and validated. Do NOT apply to production without review.
begin;

-- Authoritative completeness validator: add platform + per-platform link rules.
create or replace function public.submission_completeness(p jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare r jsonb; v text; required boolean; reason text; issues jsonb='[]'; ai boolean; platform text; link text;
begin
  platform := public.submission_trim(p->>'platform');
  ai := public.submission_trim(p->>'ai_type') in (
    'AI-assisted: Code only',
    'AI-assisted: Content only',
    'AI-assisted: Code and content',
    'AI-generated',
    'AI-assisted'
  );
  for r in select * from jsonb_array_elements('[{"field":"platform","label":"Platform"},{"field":"title","label":"Game title","required":true},{"field":"developer_name","label":"Developer or studio name","required":true},{"field":"genre","label":"Genre","required":true},{"field":"description","label":"Game description","required":true},{"field":"game_link","label":"Game or build link","url":true},{"field":"steam_url","label":"Steam store link","url":true},{"field":"evidence_link","label":"Supporting evidence link (optional)","url":true},{"field":"image_url","label":"Game thumbnail","required":true,"url":true},{"field":"release_status","label":"Release status","required":true},{"field":"release_date","label":"Release date"},{"field":"ai_type","label":"AI classification","required":true},{"field":"ai_explanation","label":"AI-use explanation","ai":true}]'::jsonb) loop
    v := public.submission_trim(p->>(r->>'field')); reason := '';
    required := coalesce((r->>'required')::boolean,false) or (coalesce((r->>'ai')::boolean,false) and ai) or (r->>'field'='release_date' and public.submission_trim(p->>'release_status')='Released');
    if required and v='' then reason := 'Required';
    elsif v<>'' and coalesce((r->>'url')::boolean,false) and (v!~* '^https?://[^[:space:]/?#@:]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' or v ~ U&'[\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' or coalesce(substring(v from '(?i)^https?://[^/?#@:]+:([0-9]{1,5})')::integer,0)>65535) then reason := 'Use a valid HTTP or HTTPS URL';
    elsif r->>'field'='steam_url' and v<>'' and v!~* '^https://store[.]steampowered[.]com/app/[0-9]+([/?#][^[:space:]]*)?$' then reason := 'Use the game''s Steam app store URL';
    elsif r->>'field'='ai_type' and v<>'' and v not in ('AI-assisted: Code only','AI-assisted: Content only','AI-assisted: Code and content','No AI used','AI-generated','AI-assisted','No AI disclosed') then reason := 'Select an available AI classification';
    elsif r->>'field'='release_status' and v<>'' and v not in ('Released','Upcoming','Not announced') then reason := 'Select an available release status';
    elsif r->>'field'='release_date' and v<>'' and public.submission_trim(p->>'release_status')='Released' and v>to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD') then reason := 'A released game''s release date cannot be in the future';
    elsif r->>'field'='release_date' and v<>'' and public.submission_trim(p->>'release_status')='Upcoming' and v<to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD') then reason := 'An upcoming game''s planned release date cannot be in the past'; end if;
    if reason<>'' then issues := issues || jsonb_build_array(jsonb_build_object('field',r->>'field','label',r->>'label','reason',reason)); end if;
  end loop;

  -- Platform-specific link validation (authoritative backstop for the client).
  if platform <> '' then
    if platform not in ('steam','pc','browser','roblox','android','ios') then
      issues := issues || jsonb_build_array(jsonb_build_object('field','platform','label','Platform','reason','Select a supported platform.'));
    else
      if platform = 'steam' then
        v := public.submission_trim(p->>'steam_url');
        if v = '' then
          issues := issues || jsonb_build_array(jsonb_build_object('field','steam_url','label','Steam store page','reason','Required for Steam games.'));
        elsif v !~* '^https://store[.]steampowered[.]com/app/[0-9]+([/?#][^[:space:]]*)?$' then
          issues := issues || jsonb_build_array(jsonb_build_object('field','steam_url','label','Steam store page','reason','Use the game''s Steam app store URL.'));
        end if;
        link := public.submission_trim(p->>'game_link');
        if link <> '' and link !~* '^https?://[^[:space:]/?#@:]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' then
          issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','Game or build link','reason','Use a valid HTTP or HTTPS URL.'));
        end if;
      else
        link := public.submission_trim(p->>'game_link');
        if link = '' then
          issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','Game link','reason','Required for this platform.'));
        elsif link !~* '^https?://[^[:space:]/?#@:]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' then
          issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','Game link','reason','Use a valid HTTP or HTTPS URL.'));
        else
          case
            when platform = 'browser' and link !~* '^https://' then
              issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','Playable URL','reason','Browser games require an HTTPS URL.'));
            when platform = 'roblox' and link !~* '^(https?://)?(www\.)?roblox\.com' then
              issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','Roblox experience URL','reason','Use a Roblox experience URL.'));
            when platform = 'android' and link !~* '(play\.google\.com|android\.com)' then
              issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','Google Play or Android URL','reason','Use a Google Play or supported Android game URL.'));
            when platform = 'ios' and link !~* 'apple\.com' then
              issues := issues || jsonb_build_array(jsonb_build_object('field','game_link','label','App Store or iOS URL','reason','Use an App Store or supported iOS URL.'));
          end case;
        end if;
        v := public.submission_trim(p->>'steam_url');
        if v <> '' and v !~* '^https://store[.]steampowered[.]com/app/[0-9]+([/?#][^[:space:]]*)?$' then
          issues := issues || jsonb_build_array(jsonb_build_object('field','steam_url','label','Steam store page','reason','Use the game''s Steam app store URL.'));
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object('issues',issues,'message',case when jsonb_array_length(issues)=0 then '' else
   'Please complete these details before we can review your game:'||E'\n'||(select string_agg('• '||(i->>'label')||': '||(i->>'reason'),E'\n') from jsonb_array_elements(issues) i)||E'\nUpdate your submission, then select Resubmit for review.' end);
end;
$$;

-- Submission creation: allow the platform field.
create or replace function public.create_game_with_pc_requirements(p_fields jsonb,p_minimum jsonb default '{}',p_recommended jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$declare payload jsonb;source uuid;existing public.game_submissions;columns text;result jsonb;k text;prior public.game_pc_requirements;begin
  if not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Developer sign-in required.';end if;
  if not public.pc_specs_valid(p_minimum,true) or not public.pc_specs_valid(p_recommended,true) then raise exception 'Invalid optional PC requirements.';end if;
  if p_fields is null or jsonb_typeof(p_fields)<>'object' or exists(select 1 from jsonb_object_keys(p_fields) f where f not in('id','developer_id','status','title','developer_name','genre','description','game_link','steam_url','steam_app_id','platform','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link','price')) then raise exception 'Unsupported submission fields.';end if;
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
end;
$$;

-- Approved listing edits: allow the platform field.
create or replace function public._listing_base(p_kind text,p_id uuid) returns jsonb language plpgsql stable set search_path='' as $$declare b jsonb;begin
  if p_kind='imported' then select to_jsonb(g)||jsonb_build_object('game_link',g.steam_url) into b from public.imported_games g where id=p_id;
  elsif p_kind='approved' then select coalesce(to_jsonb(s),'{}')||to_jsonb(g) into b from public.approved_games g left join public.game_submissions s on s.id=g.id where g.id=p_id;
  elsif p_kind='submission' then select to_jsonb(g) into b from public.game_submissions g where id=p_id and status='Approved';end if;
  if b is null then raise exception 'Approved listing unavailable.';end if;
  b:=(select jsonb_object_agg(key,value) from jsonb_each(b) where key=any(array['title','developer_name','genre','description','game_link','steam_url','platform','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link']));
  return jsonb_build_object('release_status','Not announced','ai_type','','ai_areas','[]'::jsonb,'ai_explanation','','evidence_link','', 'platform','steam')||b;
end;$$;

create or replace function public.save_my_listing_edit(p_kind text,p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean default false,p_disputed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$declare k text;b jsonb;old jsonb;next jsonb;s public.listing_states;changed text[];material boolean;issues jsonb;outcome text;begin
  k:=public._share_owned_key(p_kind,p_id);b:=public._listing_base(p_kind,p_id);
  perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||k,0));
  insert into public.listing_states(game_key)values(k) on conflict do nothing;select * into s from public.listing_states where game_key=k for update;
  if p_fields is null or jsonb_typeof(p_fields)<>'object' or (p_fields-array['title','developer_name','genre','description','game_link','steam_url','platform','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link'])<>'{}' then raise exception 'Only developer-managed listing fields are allowed.';end if;
  if exists(select 1 from jsonb_each(p_fields) where key<>'ai_areas' and jsonb_typeof(value) not in('string','null')) then raise exception 'Listing text fields must contain text.';end if;
  if p_fields?'ai_areas' then
   if jsonb_typeof(p_fields->'ai_areas')<>'array' then raise exception 'AI-use areas must be a list of text values.';end if;
   if exists(select 1 from jsonb_array_elements(p_fields->'ai_areas') v where jsonb_typeof(v)<>'string') then raise exception 'AI-use areas must be text values.';end if;
  end if;
  old:=b||s.published;next:=old||p_fields;
  if nullif(next->>'steam_url','') is not null and k like 'steam:%' and substring(next->>'steam_url' from '(?i)^https://store[.]steampowered[.]com/app/([0-9]+)') is distinct from substring(k from 7) then raise exception 'The Steam app identity cannot be changed here.';end if;
  issues:=public.submission_completeness(next);
  select coalesce(array_agg(key order by key),'{}') into changed from jsonb_each(next) where value is distinct from old->key;
  material:=changed&&array['title','developer_name','game_link','steam_url','platform','ai_type','ai_areas','ai_explanation','evidence_link','release_status','release_date'];
  outcome:=case when jsonb_array_length(issues->'issues')>0 then 'Needs More Information' when not material then 'Published' when p_resubmit then 'Pending Review' else 'Draft' end;
  if p_revision is distinct from s.version then
   if exists(select 1 from public.listing_revisions where game_key=k and state_version=s.version and editor=auth.uid() and proposed=next and status=outcome and disputed=p_disputed) then return public.get_my_listing_edit(p_kind,p_id);end if;
   raise exception 'This listing changed elsewhere. Reload before saving; your edits remain in the form.';
  end if;
  if cardinality(changed)=0 then return public.get_my_listing_edit(p_kind,p_id);end if;
  if p_disputed and not(changed&&array['ai_type','ai_areas','ai_explanation','evidence_link']) then raise exception 'Describe the disclosure correction before marking it disputed.';end if;
  update public.listing_revisions set status='Superseded' where game_key=k and status in('Draft','Needs More Information','Pending Review');
  update public.listing_states set version=version+1,published=case when outcome='Published' then next else published end,disputed=case when outcome<>'Published' then p_disputed else disputed end where game_key=k returning * into s;
  insert into public.listing_revisions(game_key,kind,source_id,editor,state_version,before_fields,proposed,changed_fields,base_hash,status,disputed)values(k,p_kind,p_id,auth.uid(),s.version,old,next,changed,md5(b::text),outcome,p_disputed);
  return public.get_my_listing_edit(p_kind,p_id);
end;
$$;

-- Reorder screenshot slots without re-uploading or queueing image cleanup.
create or replace function public.reorder_game_screenshots(p_id uuid, p_order jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
  select developer_id into owner_id from public.game_submissions where id=p_id for update;
  if not found then raise exception 'Submission unavailable.'; end if;
  if jsonb_typeof(p_order)<>'array' or p_order is null then raise exception 'Provide an ordered slot list.'; end if;
  update public.game_screenshots set slot=-slot where submission_id=p_id;
  update public.game_screenshots g set slot=o.idx
  from jsonb_array_elements(p_order) with ordinality as t(val,idx)
  where g.submission_id=p_id and g.slot=-(t.val)::int;
end;
$$;

revoke all on function public.submission_completeness(jsonb),public.create_game_with_pc_requirements(jsonb,jsonb,jsonb),public._listing_base(text,uuid),public.save_my_listing_edit(text,uuid,jsonb,integer,boolean,boolean),public.reorder_game_screenshots(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submission_completeness(jsonb) to authenticated;
grant execute on function public.create_game_with_pc_requirements(jsonb,jsonb,jsonb) to authenticated;
grant execute on function public._listing_base(text,uuid) to authenticated;
grant execute on function public.save_my_listing_edit(text,uuid,jsonb,integer,boolean,boolean) to authenticated;
grant execute on function public.reorder_game_screenshots(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;

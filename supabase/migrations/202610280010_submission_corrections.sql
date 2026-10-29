begin;
alter table public.game_submissions add column completeness_issues jsonb not null default '[]',
 add column completeness_message text not null default '', add column submission_revision integer not null default 0;
-- Existing permissive insert policy only accepts Pending Review; BEFORE routing
-- must also be allowed to save an owned incomplete submission.
create policy submission_owner_insert_completeness on public.game_submissions for insert to authenticated
with check(developer_id=auth.uid() and status in ('Pending Review','Needs More Information')
 and exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)));

create function public.submission_trim(p text) returns text language sql immutable set search_path='' as $$
 select btrim(coalesce(p,''),E' \t\n\r\f\013'||U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
revoke all on function public.submission_trim(text) from public,anon;
grant execute on function public.submission_trim(text) to authenticated;

create function public.submission_completeness(p jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare r jsonb; v text; required boolean; reason text; issues jsonb='[]'; ai boolean;
begin
 ai:=public.submission_trim(p->>'ai_type') in ('AI-generated','AI-assisted');
 for r in select * from jsonb_array_elements('[{"field":"title","label":"Game title","required":true},{"field":"developer_name","label":"Developer or studio name","required":true},{"field":"genre","label":"Genre","required":true},{"field":"description","label":"Game description","required":true},{"field":"game_link","label":"Game or build link","url":true},{"field":"steam_url","label":"Steam store link","url":true},{"field":"image_url","label":"Thumbnail URL","url":true},{"field":"release_status","label":"Release status","required":true},{"field":"release_date","label":"Release date"},{"field":"ai_type","label":"AI classification","required":true},{"field":"ai_explanation","label":"AI-use explanation","ai":true},{"field":"evidence_link","label":"Supporting evidence link","ai":true,"url":true}]'::jsonb) loop
  v:=public.submission_trim(p->>(r->>'field')); reason:='';
  required:=coalesce((r->>'required')::boolean,false) or (coalesce((r->>'ai')::boolean,false) and ai) or (r->>'field'='release_date' and public.submission_trim(p->>'release_status')='Released');
  if required and v='' then reason:='Required';
  elsif v<>'' and coalesce((r->>'url')::boolean,false) and (v!~* '^https?://[^[:space:]/?#@:]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' or v ~ U&'[\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' or coalesce(substring(v from '(?i)^https?://[^/?#@:]+:([0-9]{1,5})')::integer,0)>65535) then reason:='Use a valid HTTP or HTTPS URL';
  elsif r->>'field'='steam_url' and v<>'' and v!~* '^https://store[.]steampowered[.]com/app/[0-9]+([/?#][^[:space:]]*)?$' then reason:='Use the game''s Steam app store URL';
  elsif r->>'field'='ai_type' and v<>'' and v not in ('AI-generated','AI-assisted','No AI disclosed') then reason:='Select an available AI classification';
  elsif r->>'field'='release_status' and v<>'' and v not in ('Released','Upcoming','Not announced') then reason:='Select an available release status';
  elsif r->>'field'='release_date' and v<>'' and public.submission_trim(p->>'release_status')='Released' and v>to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD') then reason:='A released game''s release date cannot be in the future';
  elsif r->>'field'='release_date' and v<>'' and public.submission_trim(p->>'release_status')='Upcoming' and v<to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD') then reason:='An upcoming game''s planned release date cannot be in the past'; end if;
  if reason<>'' then issues:=issues||jsonb_build_array(jsonb_build_object('field',r->>'field','label',r->>'label','reason',reason)); end if;
 end loop;
 return jsonb_build_object('issues',issues,'message',case when jsonb_array_length(issues)=0 then '' else
  'Please complete these details before we can review your game:'||E'\n'||(select string_agg('• '||(i->>'label')||': '||(i->>'reason'),E'\n') from jsonb_array_elements(issues) i)||E'\nUpdate your submission, then select Resubmit for review.' end);
end;
$$;
revoke all on function public.submission_completeness(jsonb) from public,anon;
grant execute on function public.submission_completeness(jsonb) to authenticated;

create table public.submission_review_events(
 id bigint generated always as identity primary key, submission_id uuid not null references public.game_submissions(id),
 actor_id uuid, kind text not null, previous_status text, new_status text not null,
 previous_review_reason text, review_reason text, issues jsonb not null, revision integer not null,created_at timestamptz not null default clock_timestamp());
alter table public.submission_review_events enable row level security;
revoke all on public.submission_review_events from public,anon,authenticated;
grant select on public.submission_review_events to authenticated;
create policy submission_events_read on public.submission_review_events for select to authenticated using(
 exists(select 1 from public.game_submissions s where s.id=submission_id and s.developer_id=auth.uid())
 or exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

create function public.guard_submission_corrections() returns trigger
language plpgsql set search_path='' as $$
declare result jsonb;
begin
 if TG_NARGS>0 and TG_ARGV[0]='approval' then
  if NEW.status='Approved' then
   result:=public.submission_completeness(to_jsonb(NEW));
   if jsonb_array_length(result->'issues')>0 then raise exception '%',result->>'message'; end if;
  end if;
  return NEW;
 end if;
 if current_user in ('authenticated','anon') then
  if TG_OP='UPDATE' then
   if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Use the authorised submission correction action.'; end if;
  else
   if NEW.developer_id is distinct from auth.uid() or not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Developer ownership required.'; end if;
   if NEW.status not in ('Pending Review','Needs More Information') or nullif(btrim(NEW.review_reason),'') is not null then raise exception 'Reviewer fields cannot be set by developers.'; end if;
  end if;
 end if;
 result:=public.submission_completeness(to_jsonb(NEW));
 if TG_OP='INSERT' then
  NEW.steam_app_id:=case when NEW.steam_url ~* '^https://store[.]steampowered[.]com/app/[0-9]+([/?#][^[:space:]]*)?$' then substring(NEW.steam_url from '(?i)^https://store[.]steampowered[.]com/app/([0-9]+)') else null end;
  NEW.status:=case when jsonb_array_length(result->'issues')>0 then 'Needs More Information' else 'Pending Review' end;
  NEW.submission_revision:=0;
 else
  if NEW.status='Approved' and OLD.status<>'Approved' and jsonb_array_length(result->'issues')>0 then raise exception '%',result->>'message'; end if;
  NEW.submission_revision:=OLD.submission_revision;
 end if;
 NEW.completeness_issues:=result->'issues'; NEW.completeness_message:=result->>'message';
 if TG_OP='UPDATE' and NEW is distinct from OLD then NEW.submission_revision:=OLD.submission_revision+1; end if;
 return NEW;
end;
$$;
create trigger submission_completeness_guard before insert or update on public.game_submissions for each row execute function public.guard_submission_corrections();
create trigger submission_approval_recheck before update of status on public.game_submissions for each row execute function public.guard_submission_corrections('approval');

create function public.audit_submission_corrections() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and NEW is not distinct from OLD then return NEW; end if;
 insert into public.submission_review_events(submission_id,actor_id,kind,previous_status,new_status,previous_review_reason,review_reason,issues,revision)
 values(NEW.id,auth.uid(),coalesce(nullif(current_setting('playtested.submission_action',true),''),case when TG_OP='INSERT' then 'submitted' else 'review_or_update' end),case when TG_OP='UPDATE' then OLD.status end,NEW.status,case when TG_OP='UPDATE' then OLD.review_reason end,NEW.review_reason,NEW.completeness_issues,NEW.submission_revision);
 return NEW;
end;
$$;
revoke all on function public.audit_submission_corrections() from public,anon,authenticated;
create trigger submission_correction_audit after insert or update on public.game_submissions for each row execute function public.audit_submission_corrections();

create function public.get_my_submission_correction(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.game_submissions;
begin
 select * into s from public.game_submissions where id=p_id and developer_id=auth.uid();
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Your submission was not found or access is unavailable.'; end if;
 return jsonb_build_object('submission',to_jsonb(s),'validation',public.submission_completeness(to_jsonb(s)),
  'history',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id desc),'[]') from public.submission_review_events e where submission_id=p_id));
end;
$$;

create function public.save_my_submission_correction(p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.game_submissions; next public.game_submissions; result jsonb; expected_status text;
begin
 select * into old from public.game_submissions where id=p_id and developer_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Your submission was not found or access is unavailable.'; end if;
 if old.status='Approved' then raise exception 'Approved listings need a separate reviewed change. They cannot be edited here.'; end if;
 if jsonb_typeof(p_fields)<>'object' or p_fields is null or (p_fields-array['title','developer_name','genre','description','game_link','steam_url','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link','price'])<>'{}'::jsonb then raise exception 'Only developer submission fields may be changed.'; end if;
 next:=jsonb_populate_record(old,p_fields);
 if next.steam_url is distinct from old.steam_url then
  next.steam_app_id:=substring(next.steam_url from '(?i)^https://store[.]steampowered[.]com/app/([0-9]+)');
 end if;
 result:=public.submission_completeness(to_jsonb(next));
 expected_status:=case when p_resubmit then case when jsonb_array_length(result->'issues')=0 then 'Pending Review' else 'Needs More Information' end else old.status end;
 if p_revision is null or p_revision<>old.submission_revision then
  if next is not distinct from old and old.status=expected_status then return public.get_my_submission_correction(p_id); end if;
  raise exception 'This submission changed elsewhere. Reload before saving; your edits have not been applied.';
 end if;
 perform set_config('playtested.submission_action',case when p_resubmit then 'resubmitted' else 'developer_saved' end,true);
 update public.game_submissions set title=next.title,developer_name=next.developer_name,genre=next.genre,description=next.description,
  game_link=next.game_link,steam_url=next.steam_url,steam_app_id=next.steam_app_id,image_url=next.image_url,release_status=next.release_status,release_date=next.release_date,
  ai_type=next.ai_type,ai_areas=next.ai_areas,ai_explanation=next.ai_explanation,evidence_link=next.evidence_link,price=next.price,status=expected_status where id=p_id;
 return public.get_my_submission_correction(p_id);
end;
$$;

create function public.preview_submission_completeness() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.'; end if;
 return (select coalesce(jsonb_agg(item),'[]') from (select jsonb_build_object('id',s.id,'title',s.title,'revision',s.submission_revision,'validation',v.result) item
  from public.game_submissions s cross join lateral (select public.submission_completeness(to_jsonb(s)) result) v
  where s.status='Pending Review' and jsonb_array_length(v.result->'issues')>0 order by s.submitted_at limit 100) preview);
end;
$$;
create function public.route_incomplete_submissions(p_records jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare r jsonb; s public.game_submissions; changed integer=0;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.'; end if;
 if jsonb_typeof(p_records)<>'array' or p_records is null or jsonb_array_length(p_records)>100 then raise exception 'Select up to 100 preview records.'; end if;
 perform set_config('playtested.submission_action','admin_completeness_batch',true);
 for r in select * from jsonb_array_elements(p_records) loop
  select * into s from public.game_submissions where id=(r->>'id')::uuid for update;
  if not found or s.status<>'Pending Review' then continue; end if;
  if (r->>'revision') is null or s.submission_revision<>(r->>'revision')::integer then raise exception 'A preview record changed. Refresh the preview before applying.'; end if;
  if jsonb_array_length(public.submission_completeness(to_jsonb(s))->'issues')>0 then
   update public.game_submissions set status='Needs More Information' where id=s.id;changed:=changed+1;
  end if;
 end loop;
 return changed;
end;
$$;
revoke all on function public.get_my_submission_correction(uuid),public.save_my_submission_correction(uuid,jsonb,integer,boolean),public.preview_submission_completeness(),public.route_incomplete_submissions(jsonb) from public,anon;
grant execute on function public.get_my_submission_correction(uuid),public.save_my_submission_correction(uuid,jsonb,integer,boolean),public.preview_submission_completeness(),public.route_incomplete_submissions(jsonb) to authenticated;
revoke delete on public.game_submissions from authenticated;
notify pgrst,'reload schema';
commit;

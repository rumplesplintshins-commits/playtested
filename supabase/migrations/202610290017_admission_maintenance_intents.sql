begin;
-- Supersedes the reviewed-maintenance policy in 016; no live data repair/backfill.
do $$begin if to_regprocedure('public.save_my_listing_edit(text,uuid,jsonb,integer,boolean,boolean)') is null then raise exception 'Apply migration 016 and its dependencies before 017.';end if;end;$$;
create table public.listing_admissions(game_key text primary key,kind text not null,source_id uuid not null,proof text not null,recorded_at timestamptz not null default clock_timestamp());
alter table public.listing_admissions enable row level security;
revoke all on public.listing_admissions from public,anon,authenticated;
create or replace function public.submission_completeness(p jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare r jsonb; v text; required boolean; reason text; issues jsonb='[]'; ai boolean;
begin
 ai:=public.submission_trim(p->>'ai_type') in ('AI-generated','AI-assisted');
 for r in select * from jsonb_array_elements('[{"field":"title","label":"Game title","required":true},{"field":"developer_name","label":"Developer or studio name","required":true},{"field":"genre","label":"Genre","required":true},{"field":"description","label":"Game description","required":true},{"field":"game_link","label":"Game or build link","url":true},{"field":"steam_url","label":"Steam store link","url":true},{"field":"image_url","label":"Thumbnail URL","url":true},{"field":"release_status","label":"Release status","required":true},{"field":"release_date","label":"Release date"},{"field":"ai_type","label":"AI classification","required":true},{"field":"ai_explanation","label":"AI-use explanation","ai":true},{"field":"evidence_link","label":"Supporting evidence link (optional)","url":true}]'::jsonb) loop
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
create function public._listing_has_admission(p_kind text,p_id uuid) returns boolean language plpgsql stable security definer set search_path='' as $$declare k text;begin
 k:=public._share_key(p_kind,p_id);if k is null then return false;end if;
 if exists(select 1 from public.listing_admissions where game_key=k) then return true;end if;
 if p_kind in('submission','approved') then
  return exists(select 1 from public.game_submissions where id=p_id and status='Approved') or exists(select 1 from public.submission_review_events where submission_id=p_id and new_status='Approved');
 end if;
 return exists(select 1 from public.game_developer_links l join public.game_claims c on c.id=l.source_claim_id where l.imported_game_id=p_id and c.imported_game_id=p_id and c.status='Approved' and c.claimant_id=l.developer_id);
end;$$;
create function public._listing_current_claim(p_kind text,p_id uuid,p_user uuid)returns boolean language sql stable security definer set search_path='' as $$select p_kind<>'imported' or exists(select 1 from public.game_developer_links l join public.game_claims c on c.id=l.source_claim_id where l.imported_game_id=p_id and l.developer_id=p_user and c.claimant_id=p_user and c.imported_game_id=p_id and c.status='Approved');$$;
revoke all on function public._listing_current_claim(text,uuid,uuid)from public,anon,authenticated;
create function public._listing_edit_validation(p_before jsonb,p_after jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare changed text[];issues jsonb;begin
 select coalesce(array_agg(key),'{}') into changed from jsonb_each(p_after) where value is distinct from p_before->key;
 select coalesce(jsonb_agg(i),'[]') into issues from jsonb_array_elements(public.submission_completeness(p_after)->'issues')i where i->>'field'='title' or i->>'field'=any(changed) or('ai_type'=any(changed) and i->>'field'='ai_explanation')or(changed&&array['release_status','release_date'] and i->>'field'='release_date');
 if 'release_date'=any(changed) and nullif(p_after->>'release_date','') is not null then begin perform (p_after->>'release_date')::date;exception when others then issues:=issues||jsonb_build_array(jsonb_build_object('field','release_date','label','Release date','reason','Use a valid date'));end;end if;
 return jsonb_build_object('issues',issues,'message',case when jsonb_array_length(issues)>0 then 'Please correct: '||(select string_agg(i->>'label',', ') from jsonb_array_elements(issues)i) else '' end);
end;$$;
create or replace function public.save_my_listing_edit(p_kind text,p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean default false,p_disputed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$declare k text;b jsonb;old jsonb;next jsonb;s public.listing_states;changed text[];material boolean;issues jsonb;outcome text;revision_id bigint;assessment jsonb;begin
 k:=public._share_owned_key(p_kind,p_id);b:=public._listing_base(p_kind,p_id);
 if p_kind='imported' and not exists(select 1 from public.game_developer_links l join public.game_claims c on c.id=l.source_claim_id where l.imported_game_id=p_id and l.developer_id=auth.uid() and c.claimant_id=auth.uid() and c.imported_game_id=p_id and c.status='Approved')then raise exception 'Approved ownership-claim admission required.';end if;
 if not public._listing_has_admission(p_kind,p_id) then raise exception 'This listing has not passed initial admission. Complete and submit it for admin approval first.';end if;
 if p_kind in('approved','submission') and exists(select 1 from public.game_submissions where id=p_id and status<>'Approved') then raise exception 'Resolve the current moderation status or reviewed admission repair before editing.';end if;
 if p_kind='imported' and exists(select 1 from public.imported_games where id=p_id and catalogue_review_status in('held_for_review','excluded'))then raise exception 'Resolve the current catalogue moderation decision before editing.';end if;
 insert into public.listing_admissions(game_key,kind,source_id,proof)values(k,p_kind,p_id,'Approved submission/history or approved imported-game ownership claim')on conflict do nothing;
 perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||k,0));
 insert into public.listing_states(game_key)values(k) on conflict do nothing;select * into s from public.listing_states where game_key=k for update;
 if p_fields is null or jsonb_typeof(p_fields)<>'object' or (p_fields-array['title','developer_name','genre','description','game_link','steam_url','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link'])<>'{}' then raise exception 'Only developer-managed listing fields are allowed.';end if;
 if exists(select 1 from jsonb_each(p_fields) where key<>'ai_areas' and jsonb_typeof(value) not in('string','null')) then raise exception 'Listing text fields must contain text.';end if;
 if p_fields?'ai_areas' then
  if jsonb_typeof(p_fields->'ai_areas')<>'array' then raise exception 'AI-use areas must be a list of text values.';end if;
  if exists(select 1 from jsonb_array_elements(p_fields->'ai_areas') v where jsonb_typeof(v)<>'string') then raise exception 'AI-use areas must be text values.';end if;
 end if;
 old:=b||s.published;next:=old||p_fields;
 -- Steam identity cannot be reassigned through a public-link correction.
 if nullif(next->>'steam_url','') is not null and k like 'steam:%' and substring(next->>'steam_url' from '(?i)^https://store[.]steampowered[.]com/app/([0-9]+)') is distinct from substring(k from 7) then raise exception 'The Steam app identity cannot be changed here.';end if;
 issues:=public._listing_edit_validation(old,next);
 if jsonb_array_length(issues->'issues')>0 then raise exception '%',issues->>'message';end if;
 select coalesce(array_agg(key order by key),'{}') into changed from jsonb_each(next) where value is distinct from old->key;
 material:=changed&&array['title','developer_name','game_link','steam_url','ai_type','ai_areas','ai_explanation','evidence_link','release_status','release_date'];
 outcome:='Published';
 if p_revision is distinct from s.version then
  if exists(select 1 from public.listing_revisions where game_key=k and state_version=s.version and editor=auth.uid() and proposed=next and status=outcome and not disputed) then return public.get_my_listing_edit(p_kind,p_id);end if;
  raise exception 'This listing changed elsewhere. Reload before saving; your edits remain in the form.';
 end if;
 if cardinality(changed)=0 then return public.get_my_listing_edit(p_kind,p_id);end if;

 update public.listing_revisions set status='Superseded' where game_key=k and status in('Draft','Needs More Information','Pending Review');
 update public.listing_states set version=version+1,published=case when outcome='Published' then next else published end,disputed=case when outcome<>'Published' then p_disputed else disputed end where game_key=k returning * into s;
 insert into public.listing_revisions(game_key,kind,source_id,editor,state_version,before_fields,proposed,changed_fields,base_hash,status,disputed)values(k,p_kind,p_id,auth.uid(),s.version,old,next,changed,md5(b::text),outcome,false) returning id into revision_id;
 if material then
  if to_regclass('public.published_game_verifications') is not null then execute 'select to_jsonb(v) from public.published_game_verifications v where game_id=$1' into assessment using p_id;end if;
  update public.listing_revisions set assessment_before=assessment where id=revision_id;
  update public.listing_states set reassessment=true,assessment_revision=revision_id,disputed=false where game_key=k;
 end if;
 return public.get_my_listing_edit(p_kind,p_id);
end;$$;

create function public.guard_listing_admission() returns trigger language plpgsql security definer set search_path='' as $$declare kind text;source_id uuid;begin
 if new.status<>'open' or new.audience not in('both','playtested_testers') then return new;end if;
 if TG_OP='UPDATE' then if old.tester_hub_started_at is not null or(old.published_at is not null and old.status in('open','paused') and old.audience in('both','playtested_testers'))then return new;end if;end if;
 kind:=case when new.imported_game_id is not null then 'imported' when new.approved_game_id is not null then 'approved' else 'submission' end;source_id:=coalesce(new.imported_game_id,new.approved_game_id,new.submission_id);
 if kind='imported' and not exists(select 1 from public.game_developer_links l join public.game_claims c on c.id=l.source_claim_id where l.imported_game_id=source_id and l.developer_id=new.developer_id and c.claimant_id=new.developer_id and c.imported_game_id=source_id and c.status='Approved') then raise exception 'Approved imported-game ownership admission required.';end if;
 if kind='imported' and exists(select 1 from public.imported_games where id=source_id and catalogue_review_status in('held_for_review','excluded'))then raise exception 'Resolve the current catalogue moderation decision before publishing.';end if;
 if not public._listing_has_admission(kind,source_id) then raise exception 'Listing admission required. Complete the initial submission and obtain admin approval before publishing to Tester Hub.';end if;
 if kind in('approved','submission') and exists(select 1 from public.game_submissions where id=source_id and status<>'Approved') then raise exception 'The submission is not currently Approved. Resolve its moderation decision before publishing.';end if;
 return new;
end;$$;
create trigger aa_listing_admission before insert or update on public.community_playtests for each row execute function public.guard_listing_admission();
create function public.preview_listing_admission_repairs() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin')then raise exception 'Admin access required.';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'revision',s.submission_revision)),'[]')from public.game_submissions s where s.status='Needs More Information' and exists(select 1 from public.submission_review_events e where e.submission_id=s.id and e.previous_status='Approved' and e.new_status='Needs More Information'));
end;$$;
create function public.repair_listing_admissions(p_records jsonb,p_reason text) returns integer language plpgsql security definer set search_path='' as $$declare r jsonb;s public.game_submissions;n integer=0;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin')then raise exception 'Admin access required.';end if;
 if nullif(btrim(p_reason),'') is null or jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)>100 then raise exception 'Provide a reviewed repair selection and audit reason.';end if;
 for r in select * from jsonb_array_elements(p_records)loop
  select * into s from public.game_submissions where id=(r->>'id')::uuid for update;
  if s.status is distinct from 'Needs More Information' or s.submission_revision is distinct from (r->>'revision')::integer or not exists(select 1 from public.submission_review_events where submission_id=s.id and previous_status='Approved' and new_status='Needs More Information')then raise exception 'Repair preview changed or lacks prior approval history.';end if;
  perform set_config('playtested.admission_repair','yes',true);perform set_config('playtested.submission_action','reviewed_admission_repair: '||p_reason,true);
  update public.game_submissions set status='Approved' where id=s.id;n:=n+1;
 end loop;perform set_config('playtested.admission_repair','',true);return n;
end;$$;
do $$declare source text;begin
 source:=pg_get_functiondef('public.guard_submission_corrections()'::regprocedure);
 source:=replace(source,'IF NEW.status = ''Approved'' THEN','IF NEW.status = ''Approved'' AND current_setting(''playtested.admission_repair'',true) IS DISTINCT FROM ''yes'' THEN');
 source:=replace(source,'if NEW.status=''Approved'' then','if NEW.status=''Approved'' and current_setting(''playtested.admission_repair'',true) is distinct from ''yes'' then');
 source:=replace(source,'if NEW.status=''Approved'' and OLD.status<>''Approved'' and','if NEW.status=''Approved'' and OLD.status<>''Approved'' and current_setting(''playtested.admission_repair'',true) is distinct from ''yes'' and');execute source;
 source:=pg_get_functiondef('public.confirm_listing_reassessment(bigint,integer,text)'::regprocedure);source:=replace(source,'r.status<>''Approved''','r.status not in(''Approved'',''Published'')');source:=replace(source,'<=r.reviewed_at','<=coalesce(r.reviewed_at,r.created_at)');execute source;
 source:=pg_get_functiondef('public.get_listing_revision_queue()'::regprocedure);source:=replace(source,'r.status=''Approved''','r.status in(''Approved'',''Published'')');execute source;
end;$$;
revoke all on function public._listing_has_admission(text,uuid),public._listing_edit_validation(jsonb,jsonb),public.guard_listing_admission(),public.preview_listing_admission_repairs(),public.repair_listing_admissions(jsonb,text)from public,anon,authenticated;
grant execute on function public.preview_listing_admission_repairs(),public.repair_listing_admissions(jsonb,text)to authenticated;

alter function public.get_playtest_eligibility(uuid,uuid,uuid) rename to _pre_admission_eligibility;
create function public.get_playtest_eligibility(p_imported_game_id uuid,p_approved_game_id uuid,p_submission_id uuid)
returns table(has_active_playtest boolean,active_playtest_id uuid,active_playtest_status text,tester_hub_eligible boolean,tester_hub_reason text,next_tester_hub_at timestamptz,tester_hub_rounds_last_30_days integer)
language plpgsql volatile security definer set search_path='' as $$declare r record;kind text;source_id uuid;w record;allowed boolean;begin
 select * into r from public._pre_admission_eligibility(p_imported_game_id,p_approved_game_id,p_submission_id);
 kind:=case when p_imported_game_id is not null then 'imported' when p_approved_game_id is not null then 'approved' else 'submission' end;source_id:=coalesce(p_imported_game_id,p_approved_game_id,p_submission_id);
 allowed:=public._listing_has_admission(kind,source_id) and public._listing_current_claim(kind,source_id,auth.uid()) and not exists(select 1 from public.game_submissions where kind<>'imported' and id=source_id and status<>'Approved') and not exists(select 1 from public.imported_games where kind='imported' and id=source_id and catalogue_review_status in('held_for_review','excluded'));
 if not allowed then r.tester_hub_eligible:=false;r.tester_hub_reason:='Complete initial listing admission and obtain admin approval before publishing to Tester Hub.';end if;
 if r.active_playtest_status='draft' and allowed then select * into w from public._playtested_developer_launch_window_at(auth.uid(),clock_timestamp());if w.next_at is null then r.tester_hub_eligible:=true;r.tester_hub_reason:='Approved listing: draft may be published when campaign requirements are met.';end if;end if;
 return query select r.has_active_playtest,r.active_playtest_id,r.active_playtest_status,r.tester_hub_eligible,r.tester_hub_reason,r.next_tester_hub_at,r.tester_hub_rounds_last_30_days;
end;$$;
revoke all on function public._pre_admission_eligibility(uuid,uuid,uuid),public.get_playtest_eligibility(uuid,uuid,uuid)from public,anon,authenticated;
grant execute on function public.get_playtest_eligibility(uuid,uuid,uuid)to authenticated;
do $$declare source text;begin source:=pg_get_functiondef('public.get_my_listing_edit(text,uuid)'::regprocedure);source:=replace(source,'coalesce(r.status,''Approved'')','''Approved''');source:=replace(source,'k:=public._share_owned_key(p_kind,p_id);b:=','k:=public._share_owned_key(p_kind,p_id);if not public._listing_current_claim(p_kind,p_id,auth.uid()) or not public._listing_has_admission(p_kind,p_id) or(p_kind in(''approved'',''submission'') and exists(select 1 from public.game_submissions where id=p_id and status<>''Approved'')) or(p_kind=''imported'' and exists(select 1 from public.imported_games where id=p_id and catalogue_review_status in(''held_for_review'',''excluded''))) then raise exception ''Approved listing admission required.'';end if;b:=');source:=replace(source,'case when r.status=''Pending Review'' then to_jsonb(r) end','null');execute source;end;$$;
create function public._intent_counts(p_values text[])returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('definitely',count(*)filter(where v='definitely'),'probably',count(*)filter(where v='probably'),'answered',count(*)filter(where v in('definitely','probably','maybe','probably_not','definitely_not')))from unnest(p_values)v;$$;
create function public.get_public_intent_counts(p_games jsonb)returns jsonb language plpgsql stable security definer set search_path='' as $$declare g jsonb;result jsonb='[]';visible boolean;item jsonb;begin
 if jsonb_typeof(p_games) is distinct from 'array' or jsonb_array_length(p_games)>12 then raise exception 'Select at most 12 games.';end if;
 for g in select * from jsonb_array_elements(p_games)loop
  if g->>'kind'='imported' then select exists(select 1 from public.imported_games where id=(g->>'id')::uuid and catalogue_eligible and coalesce(catalogue_review_status,'eligible')='eligible')into visible;
  elsif g->>'kind' in('approved','submission')then select exists(select 1 from public.approved_games where id=(g->>'id')::uuid)or exists(select 1 from public.game_submissions where id=(g->>'id')::uuid and status='Approved')into visible;
  else visible:=false;end if;if not visible then continue;end if;
  with campaigns as(select c.id from public.community_playtests c where c.published_at is not null and((g->>'kind'='imported' and c.imported_game_id=(g->>'id')::uuid)or(g->>'kind' in('approved','submission')and(c.submission_id=(g->>'id')::uuid or c.approved_game_id=(g->>'id')::uuid)))),
  tests as(select t.* from public.community_game_tests t where t.review_outcome='accepted' and t.replacement_at is null and(t.playtest_id in(select id from campaigns)or(g->>'kind'<>'imported' and t.playtest_id is null and t.submission_id=(g->>'id')::uuid)))
  select jsonb_build_object('kind',g->>'kind','id',g->>'id','lifetime',(select jsonb_build_object('recommend',public._intent_counts(array_agg(recommend_game)),'continue',public._intent_counts(array_agg(continue_playing)))from tests),'builds',(select coalesce(jsonb_agg(b),'[]')from(select c.id playtest_id,public._intent_counts(array_agg(t.recommend_game))recommend,public._intent_counts(array_agg(t.continue_playing))"continue" from campaigns c left join tests t on t.playtest_id=c.id group by c.id)b))into item;
  result:=result||jsonb_build_array(item);
 end loop;return result;
end;$$;
revoke all on function public._intent_counts(text[]),public.get_public_intent_counts(jsonb)from public,anon,authenticated;
grant execute on function public.get_public_intent_counts(jsonb)to anon,authenticated;
notify pgrst,'reload schema';
commit;

begin;
-- Requires 010 (completeness) and 011 (approved ownership/canonical identity).
do $$begin
 if to_regprocedure('public.submission_completeness(jsonb)') is null or to_regprocedure('public._share_owned_key(text,uuid)') is null then raise exception 'Apply existing migrations 010 and 011, after their baseline, before listing revisions.';end if;
end;$$;
create table public.listing_states(game_key text primary key,published jsonb not null default '{}',version integer not null default 0,disputed boolean not null default false,reassessment boolean not null default false,assessment_revision bigint);
create table public.listing_revisions(id bigint generated always as identity primary key,game_key text not null references public.listing_states,kind text not null,source_id uuid not null,editor uuid not null,created_at timestamptz not null default clock_timestamp(),state_version integer not null,before_fields jsonb not null,proposed jsonb not null,changed_fields text[] not null,base_hash text not null,status text not null check(status in('Draft','Needs More Information','Pending Review','Approved','Rejected','Superseded','Published')),disputed boolean not null default false,reviewer uuid,reviewed_at timestamptz,review_reason text,assessment_before jsonb,reassessed_by uuid,reassessed_at timestamptz,reassessment_reason text,assessment_after jsonb);
alter table public.listing_states enable row level security;
alter table public.listing_revisions enable row level security;
revoke all on public.listing_states,public.listing_revisions from public,anon,authenticated;

create function public._listing_base(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare b jsonb;begin
 if p_kind='imported' then select to_jsonb(g)||jsonb_build_object('game_link',g.steam_url) into b from public.imported_games g where id=p_id;
 elsif p_kind='approved' then select coalesce(to_jsonb(s),'{}')||to_jsonb(g) into b from public.approved_games g left join public.game_submissions s on s.id=g.id where g.id=p_id;
 elsif p_kind='submission' then select to_jsonb(g) into b from public.game_submissions g where id=p_id and status='Approved';end if;
 if b is null then raise exception 'Approved listing unavailable.';end if;
 b:=(select jsonb_object_agg(key,value) from jsonb_each(b) where key=any(array['title','developer_name','genre','description','game_link','steam_url','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link']));
 return jsonb_build_object('release_status','Not announced','ai_type','','ai_areas','[]'::jsonb,'ai_explanation','','evidence_link','')||b;
end;$$;
create function public.get_my_listing_edit(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare k text;b jsonb;s public.listing_states;r public.listing_revisions;begin
 k:=public._share_owned_key(p_kind,p_id);b:=public._listing_base(p_kind,p_id);select * into s from public.listing_states where game_key=k;
 select * into r from public.listing_revisions where game_key=k and state_version=s.version order by id desc limit 1;
 return jsonb_build_object('submission',coalesce(case when r.status in('Draft','Needs More Information','Pending Review','Rejected') then r.proposed end,b||coalesce(s.published,'{}'))||jsonb_build_object('id',p_id,'status',coalesce(r.status,'Approved'),'submission_revision',coalesce(s.version,0),'review_reason',r.review_reason,'disputed',coalesce(s.disputed,false)),'published',b||coalesce(s.published,'{}'),'pending',case when r.status='Pending Review' then to_jsonb(r) end,'history','[]'::jsonb);
end;$$;
create function public.save_my_listing_edit(p_kind text,p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean default false,p_disputed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$declare k text;b jsonb;old jsonb;next jsonb;s public.listing_states;changed text[];material boolean;issues jsonb;outcome text;begin
 k:=public._share_owned_key(p_kind,p_id);b:=public._listing_base(p_kind,p_id);
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
 issues:=public.submission_completeness(next);
 select coalesce(array_agg(key order by key),'{}') into changed from jsonb_each(next) where value is distinct from old->key;
 material:=changed&&array['title','developer_name','game_link','steam_url','ai_type','ai_areas','ai_explanation','evidence_link','release_status','release_date'];
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
end;$$;
create function public.get_listing_revision_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 return(select coalesce(jsonb_agg(data),'[]') from(select to_jsonb(r)||jsonb_build_object('state_version',s.version,'proposed',case when r.status='Approved' then s.published else r.proposed end) data from public.listing_revisions r join public.listing_states s using(game_key) where r.status='Pending Review' or(r.id=s.assessment_revision and s.reassessment) order by r.created_at limit 100)q);
end;$$;
create function public.review_listing_revision(p_id bigint,p_version integer,p_approve boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare r public.listing_revisions;s public.listing_states;b jsonb;assessment jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 if p_approve is null then raise exception 'Select an approval or rejection decision.';end if;
 select * into r from public.listing_revisions where id=p_id;if not found then raise exception 'Revision unavailable.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||r.game_key,0));
 select * into r from public.listing_revisions where id=p_id for update;select * into s from public.listing_states where game_key=r.game_key for update;
 if r.status<>'Pending Review' or p_version is distinct from r.state_version or s.version<>r.state_version then raise exception 'Stale review. Reload the proposed changes.';end if;
 b:=public._listing_base(r.kind,r.source_id);
 if public._share_key(r.kind,r.source_id) is distinct from r.game_key or md5(b::text)<>r.base_hash or b||s.published<>r.before_fields then raise exception 'Public listing changed. Request a fresh revision before reviewing.';end if;
 if p_approve and jsonb_array_length(public.submission_completeness(r.proposed)->'issues')>0 then raise exception 'Required developer details are incomplete.';end if;
 if not p_approve and nullif(btrim(p_reason),'') is null then raise exception 'Provide a developer-visible rejection reason.';end if;
 if to_regclass('public.published_game_verifications') is not null then execute 'select to_jsonb(v) from public.published_game_verifications v where game_id=$1' into assessment using r.source_id;end if;
 update public.listing_revisions set status=case when p_approve then 'Approved' else 'Rejected' end,reviewer=auth.uid(),reviewed_at=clock_timestamp(),review_reason=btrim(p_reason),assessment_before=assessment where id=p_id;
 update public.listing_states set published=case when p_approve then r.proposed else published end,disputed=case when p_approve then false else r.disputed end,reassessment=case when p_approve then true else reassessment end,assessment_revision=case when p_approve then r.id else assessment_revision end where game_key=r.game_key;
end;$$;
create function public.confirm_listing_reassessment(p_id bigint,p_version integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare r public.listing_revisions;s public.listing_states;v jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 select * into r from public.listing_revisions where id=p_id;if not found then raise exception 'Revision unavailable.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||r.game_key,0));select * into s from public.listing_states where game_key=r.game_key for update;
 if r.status<>'Approved' or r.id is distinct from s.assessment_revision or p_version is distinct from s.version or s.disputed or not s.reassessment then raise exception 'Listing changed. Reload before confirming reassessment.';end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'Record what was reassessed.';end if;
 if to_regclass('public.published_game_verifications') is not null then execute 'select to_jsonb(v) from public.published_game_verifications v where game_id=$1' into v using r.source_id;end if;
 if v is null or not coalesce((v->>'ai_claims_checked')::boolean,false) or (v->>'updated_at')::timestamptz<=r.reviewed_at or nullif(v->>'updated_at','') is null then raise exception 'Complete and publish a fresh assessment of this listing first.';end if;
 update public.listing_revisions set reassessed_by=auth.uid(),reassessed_at=clock_timestamp(),reassessment_reason=btrim(p_reason),assessment_after=v where id=p_id;
 update public.listing_states set reassessment=false where game_key=r.game_key;
end;$$;
create function public.get_public_listing_updates(p_games jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare r jsonb;k text;result jsonb='[]';s public.listing_states;visible boolean;begin
 if jsonb_typeof(p_games) is distinct from 'array' or jsonb_array_length(p_games)>12 then raise exception 'Select at most 12 public games.';end if;
 for r in select * from jsonb_array_elements(p_games) loop
  if r->>'kind'='imported' then select exists(select 1 from public.imported_games where id=(r->>'id')::uuid and catalogue_eligible and coalesce(catalogue_review_status,'eligible')='eligible') into visible;
  else select exists(select 1 from public.approved_games where id=(r->>'id')::uuid) or exists(select 1 from public.game_submissions where id=(r->>'id')::uuid and status='Approved') into visible;end if;
  if not visible then continue;end if;
  k:=public._share_key(r->>'kind',(r->>'id')::uuid);select * into s from public.listing_states where game_key=k;
  if found then result:=result||jsonb_build_array(jsonb_build_object('kind',r->>'kind','id',r->>'id','fields',s.published-'evidence_link','disputed',s.disputed,'pending',exists(select 1 from public.listing_revisions where game_key=k and status='Pending Review'),'reassessment',s.reassessment));end if;
 end loop;return result;
end;$$;
revoke all on function public._listing_base(text,uuid),public.get_my_listing_edit(text,uuid),public.save_my_listing_edit(text,uuid,jsonb,integer,boolean,boolean),public.get_listing_revision_queue(),public.review_listing_revision(bigint,integer,boolean,text),public.confirm_listing_reassessment(bigint,integer,text),public.get_public_listing_updates(jsonb) from public,anon,authenticated;
grant execute on function public.get_my_listing_edit(text,uuid),public.save_my_listing_edit(text,uuid,jsonb,integer,boolean,boolean),public.get_listing_revision_queue(),public.review_listing_revision(bigint,integer,boolean,text) to authenticated;
grant execute on function public.confirm_listing_reassessment(bigint,integer,text) to authenticated;
grant execute on function public.get_public_listing_updates(jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;

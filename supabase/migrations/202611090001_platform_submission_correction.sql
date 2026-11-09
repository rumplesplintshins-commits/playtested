-- Permit developer-controlled platform changes during correction and resubmission.
-- The November platform form sends platform, but the older correction RPC rejected it.
-- Preserve revision, ownership, completeness and status checks.
begin;
create or replace function public.save_my_submission_correction(p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.game_submissions; next public.game_submissions; result jsonb; expected_status text;
begin
 select * into old from public.game_submissions where id=p_id and developer_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Your submission was not found or access is unavailable.'; end if;
 if old.status='Approved' then raise exception 'Approved listings need a separate reviewed change. They cannot be edited here.'; end if;
 if jsonb_typeof(p_fields)<>'object' or p_fields is null or (p_fields-array['title','developer_name','genre','description','game_link','steam_url','platform','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link','price'])<>'{}'::jsonb then raise exception 'Only developer submission fields may be changed.'; end if;
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
  game_link=next.game_link,steam_url=next.steam_url,platform=next.platform,steam_app_id=next.steam_app_id,image_url=next.image_url,release_status=next.release_status,release_date=next.release_date,
  ai_type=next.ai_type,ai_areas=next.ai_areas,ai_explanation=next.ai_explanation,evidence_link=next.evidence_link,price=next.price,status=expected_status where id=p_id;
 return public.get_my_submission_correction(p_id);
end;
$$;
commit;

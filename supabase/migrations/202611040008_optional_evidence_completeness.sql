-- Keep optional evidence URL guidance aligned with the authoritative completeness validator.
begin;
create or replace function public.submission_completeness(p jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare r jsonb; v text; required boolean; reason text; issues jsonb='[]'; ai boolean;
begin
 ai:=public.submission_trim(p->>'ai_type') in (
   'AI-assisted: Code only',
   'AI-assisted: Content only',
   'AI-assisted: Code and content',
   'AI-generated',
   'AI-assisted'
 );
 for r in select * from jsonb_array_elements('[{"field":"title","label":"Game title","required":true},{"field":"developer_name","label":"Developer or studio name","required":true},{"field":"genre","label":"Genre","required":true},{"field":"description","label":"Game description","required":true},{"field":"game_link","label":"Game or build link","url":true},{"field":"steam_url","label":"Steam store link","url":true},{"field":"evidence_link","label":"Supporting evidence link (optional)","url":true},{"field":"image_url","label":"Game thumbnail","required":true,"url":true},{"field":"release_status","label":"Release status","required":true},{"field":"release_date","label":"Release date"},{"field":"ai_type","label":"AI classification","required":true},{"field":"ai_explanation","label":"AI-use explanation","ai":true}]'::jsonb) loop
  v:=public.submission_trim(p->>(r->>'field')); reason:='';
  required:=coalesce((r->>'required')::boolean,false) or (coalesce((r->>'ai')::boolean,false) and ai) or (r->>'field'='release_date' and public.submission_trim(p->>'release_status')='Released');
  if required and v='' then reason:='Required';
  elsif v<>'' and coalesce((r->>'url')::boolean,false) and (v!~* '^https?://[^[:space:]/?#@:]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' or v ~ U&'[\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' or coalesce(substring(v from '(?i)^https?://[^/?#@:]+:([0-9]{1,5})')::integer,0)>65535) then reason:='Use a valid HTTP or HTTPS URL';
  elsif r->>'field'='steam_url' and v<>'' and v!~* '^https://store[.]steampowered[.]com/app/[0-9]+([/?#][^[:space:]]*)?$' then reason:='Use the game''s Steam app store URL';
  elsif r->>'field'='ai_type' and v<>'' and v not in ('AI-assisted: Code only','AI-assisted: Content only','AI-assisted: Code and content','No AI used','AI-generated','AI-assisted','No AI disclosed') then reason:='Select an available AI classification';
  elsif r->>'field'='release_status' and v<>'' and v not in ('Released','Upcoming','Not announced') then reason:='Select an available release status';
  elsif r->>'field'='release_date' and v<>'' and public.submission_trim(p->>'release_status')='Released' and v>to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD') then reason:='A released game''s release date cannot be in the future';
  elsif r->>'field'='release_date' and v<>'' and public.submission_trim(p->>'release_status')='Upcoming' and v<to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD') then reason:='An upcoming game''s planned release date cannot be in the past'; end if;
  if reason<>'' then issues:=issues||jsonb_build_array(jsonb_build_object('field',r->>'field','label',r->>'label','reason',reason)); end if;
 end loop;
 return jsonb_build_object('issues',issues,'message',case when jsonb_array_length(issues)=0 then '' else
  'Please complete these details before we can review your game:'||E'\n'||(select string_agg('• '||(i->>'label')||': '||(i->>'reason'),E'\n') from jsonb_array_elements(issues) i)||E'\nUpdate your submission, then select Resubmit for review.' end);
end;
$$;

notify pgrst,'reload schema';
commit;

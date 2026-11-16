begin;
-- Add an independently planned endpoint carrying reception computed for ranking.
-- Keep the legacy endpoint, grants, filters, ranking and policies unchanged.
do $install$
declare body text; definition text; args text[] := array['p_page','p_page_size','p_search','p_genre','p_verification','p_ai_type','p_include_nsfw','p_sort','p_platform']; i integer;
begin
 select replace(prosrc,chr(13),''),pg_get_functiondef(oid) into body,definition
 from pg_proc where oid='public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text,text)'::regprocedure;
 if md5(body)<>'e1d08ef8ea062ad576efe28855dfebb6' then
  raise exception 'Catalogue differs from reviewed platform definition; review before applying';
 end if;
 for i in 1..9 loop body:=regexp_replace(body,'\m'||args[i]||'\M','$'||i,'g');end loop;
 -- Build the visible linked-identity set once, rather than probing its RLS
 -- policies separately for every eligible import. IN preserves EXISTS semantics
 -- because imported IDs are non-null and null link targets are excluded.
 body:=regexp_replace(body,'exists \(\s*select 1\s*from public.game_developer_links gdl\s*where gdl.imported_game_id = ig.id\s*\)',
  'ig.id in (select gdl.imported_game_id from public.game_developer_links gdl where gdl.imported_game_id is not null)');
 definition:=replace(definition,'LANGUAGE sql','LANGUAGE plpgsql');
 definition:=left(definition,strpos(definition,'AS $function$')-1);
 definition:=replace(definition,'public.get_public_catalogue(','public.get_public_catalogue_page(');
 definition:=replace(definition,'platform text)','platform text, community_reception jsonb)');
 body:=replace(body,'    c.platform'||chr(10),'    c.platform,'||chr(10)||
  '    case when c.accepted_test_count is null then null else jsonb_build_object('||
  '''accepted_test_count'',c.accepted_test_count,''rated_test_count'',c.rated_test_count,'||
  '''average_overall_score'',c.average_overall_score,''recommend_positive_percent'',c.recommend_positive_percent,'||
  '''continue_positive_percent'',c.continue_positive_percent,''reception_status'',c.reception_status) end'||chr(10));
 execute definition||'AS $wrapper$ begin return query execute $query$'||body||'$query$ using '||array_to_string(args,',')||'; end $wrapper$';
end $install$;
revoke all on function public.get_public_catalogue_page(integer,integer,text,text,text,text,boolean,text,text) from public;
grant execute on function public.get_public_catalogue_page(integer,integer,text,text,text,text,boolean,text,text) to anon,authenticated,service_role;
commit;

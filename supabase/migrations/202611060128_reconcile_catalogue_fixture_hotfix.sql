begin;
-- Also reconcile the earlier direct PL/pgSQL listing fastpath without overwriting newer definitions.
do $listing_guard$
declare body text;lang text;
begin
 select p.prosrc,l.lanname into body,lang from pg_proc p join pg_language l on l.oid=p.prolang where p.oid='public.m26_listing_hidden(uuid,boolean)'::regprocedure;
 if lang='plpgsql' and md5(btrim(replace(body,chr(13),''),chr(32)||chr(10)||chr(9)))='311f8162b0ecc6fa6d9a380db456b8c3' then return;end if;
 if lang<>'sql' or md5(btrim(replace(body,chr(13),''),chr(32)||chr(10)||chr(9)))<>'ada0d881294864f18ed2b3724f3ff6d5' then raise exception 'Unrecognised m26_listing_hidden definition; review newer hotfix';end if;
 execute $definition$create or replace function public.m26_listing_hidden(p_id uuid,p_include_tests boolean default true) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_hidden boolean;
begin
 if not exists(select 1 from public.listing_controls where archived or (p_include_tests and is_admin_test)) then return false; end if;
 with targets as (
  select p_id id union select unnest(array[c.submission_id,c.approved_game_id,c.imported_game_id]) from public.community_playtests c where c.id=p_id
 )
 select exists(select 1 from public.listing_controls l where (l.archived or(p_include_tests and l.is_admin_test)) and
 (l.source_id in(select id from targets)
  or(l.game_kind='submission' and exists(select 1 from public.game_submissions s join public.imported_games i
    on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where s.id=l.source_id and i.id in(select id from targets)))
  or(l.game_kind='imported' and exists(select 1 from public.imported_games i join public.game_submissions s
    on i.steam_app_id=nullif(btrim(s.steam_app_id),'') where i.id=l.source_id and s.id in(select id from targets)))))
 into v_hidden;
 return v_hidden;
end; $$;
$definition$;
end;
$listing_guard$;
-- Reconcile direct production migration merge26_catalogue_fixture_guard_plpgsql_hotfix.
-- Already-correct production body is a NO-OP. Refuse unrecognised/newer definitions.
do $reconcile$
declare current_body text; current_language text;
begin
 select p.prosrc,l.lanname into current_body,current_language from pg_proc p join pg_language l on l.oid=p.prolang where p.oid='public.beta_fixture_hidden(uuid)'::regprocedure;
 if current_language='plpgsql' and regexp_replace(current_body,'[[:space:]]','','g')=regexp_replace($expected$begin
  if p_id is null then return false; end if;
  if public._m26_legacy_fixture_hidden(p_id) then return true; end if;
  if not exists (select 1 from public.listing_controls where archived or is_admin_test) then return false; end if;
  return public.m26_listing_hidden(p_id);
end;$expected$,'[[:space:]]','','g') then return;end if;
 if current_language<>'sql' or regexp_replace(current_body,'[[:space:]]','','g')<>regexp_replace($old$select public._m26_legacy_fixture_hidden(p_id) or public.m26_listing_hidden(p_id);$old$,'[[:space:]]','','g') then raise exception 'Unrecognised beta_fixture_hidden definition; compare newer production hotfix before continuing';end if;
 execute $definition$CREATE OR REPLACE FUNCTION public.beta_fixture_hidden(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_id is null then return false; end if;
  if public._m26_legacy_fixture_hidden(p_id) then return true; end if;
  if not exists (select 1 from public.listing_controls where archived or is_admin_test) then return false; end if;
  return public.m26_listing_hidden(p_id);
end;
$function$;$definition$;
end;
$reconcile$;
commit;

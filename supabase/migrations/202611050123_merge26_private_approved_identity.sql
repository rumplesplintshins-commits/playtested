-- Version the reviewed development dependency: private approved identity must
-- survive public archive/test filtering. Public visibility is checked by callers.
-- Metadata-only function replacement, no data or grants rewrite.
begin;
CREATE OR REPLACE FUNCTION public._share_key(p_kind text, p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare steam text; other_steam text; present boolean;
begin
 if p_kind='imported' then select steam_app_id,true into steam,present from public.imported_games where id=p_id;
 elsif p_kind='submission' then select steam_app_id,true into steam,present from public.game_submissions where id=p_id;select steam_app_id into other_steam from public.approved_games where id=p_id;
 elsif p_kind='approved' then select steam_app_id,true into steam,present from public.game_submissions where id=p_id and status='Approved';select steam_app_id into other_steam from public.game_submissions where id=p_id;
 else raise exception 'Invalid game source';end if;
 if not coalesce(present,false) then return null;end if;
 if steam~'^[0-9]+$' and other_steam~'^[0-9]+$' and steam<>other_steam then raise exception 'Ambiguous game identity requires review';end if;
 steam:=coalesce(nullif(steam,''),other_steam);
 return case when steam~'^[0-9]+$' then 'steam:'||steam else case when p_kind='imported' then 'imported:' else 'game:' end||p_id::text end;
end;$function$;
commit;

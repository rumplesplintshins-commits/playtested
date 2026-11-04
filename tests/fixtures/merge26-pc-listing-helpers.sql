create table public.game_claims(id uuid,imported_game_id uuid,claimant_id uuid,status text);
CREATE OR REPLACE FUNCTION public._listing_current_claim(p_kind text, p_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select p_kind<>'imported' or exists(select 1 from public.game_developer_links l join public.game_claims c on c.id=l.source_claim_id where l.imported_game_id=p_id and l.developer_id=p_user and c.claimant_id=p_user and c.imported_game_id=p_id and c.status='Approved');$function$
;

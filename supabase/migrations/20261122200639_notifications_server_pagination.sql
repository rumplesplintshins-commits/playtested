-- Applied to production on 2026-11-22. Paginate all personal notifications without a 100-record limit.
CREATE OR REPLACE FUNCTION public.get_my_notifications_page(p_limit integer DEFAULT 15, p_offset integer DEFAULT 0, p_unread_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  RETURN (
    WITH inbox AS MATERIALIZED (
      SELECT n.id,n.kind,
        CASE WHEN expired.value THEN 'Studio invitation expired' ELSE n.title END AS title,
        CASE WHEN expired.value THEN 'Ask the studio owner for a new invitation.' ELSE n.message END AS message,
        CASE WHEN expired.value THEN NULL ELSE n.href END AS href,
        n.entity_type,n.entity_id,
        CASE WHEN expired.value THEN coalesce(n.read_at,i.expires_at,n.created_at) ELSE n.read_at END AS read_at,
        n.created_at
      FROM public.notifications n
      LEFT JOIN playtested_studios.invites i
        ON n.kind='studio_invitation' AND n.recipient_id=i.user_id
        AND n.dedupe_key='studio-invitation:'||i.id
      CROSS JOIN LATERAL (
        SELECT (n.kind='studio_invitation' AND coalesce(
          (n.href LIKE '/my-team?invite=%' AND (i.id IS NULL OR i.expires_at<=now()))
          OR (n.href LIKE '/my-submissions?studio=%' AND NOT EXISTS(
            SELECT 1 FROM playtested_studios.members m
            WHERE m.studio_id=i.studio_id AND m.user_id=n.recipient_id
          )), false
        )) AS value
      ) expired
      WHERE n.recipient_id=auth.uid()
    ),
    requested AS (
      SELECT * FROM inbox WHERE NOT coalesce(p_unread_only,false) OR read_at IS NULL
    ),
    selected AS (
      SELECT * FROM requested ORDER BY created_at DESC,id DESC
      LIMIT least(greatest(coalesce(p_limit,15),1),50)
      OFFSET least(greatest(coalesce(p_offset,0),0),1000000)
    )
    SELECT jsonb_build_object(
      'all_count',(SELECT count(*) FROM inbox),
      'unread_count',(SELECT count(*) FROM inbox WHERE read_at IS NULL),
      'total_count',(SELECT count(*) FROM requested),
      'notifications',coalesce(
        (SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC,q.id DESC) FROM selected q),
        '[]'::jsonb
      )
    )
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.get_my_notifications_page(integer,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_notifications_page(integer,integer,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';

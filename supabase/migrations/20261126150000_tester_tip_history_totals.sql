BEGIN;

-- Only currently paid tips belong in tester-facing received-tip history.
CREATE OR REPLACE FUNCTION public.get_my_tester_tip_history()
RETURNS TABLE(test_id uuid,playtest_id uuid,tip_amount_pence integer,paid_at timestamptz,game_title text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  RETURN QUERY
  SELECT x.test_id,x.playtest_id,x.tip_amount_pence,x.paid_at,
    coalesce(nullif(btrim(c.title),''),'Previously tested game')
  FROM playtested_studios.tester_tips x
  JOIN public.community_playtests c ON c.id=x.playtest_id
  WHERE x.tester_id=auth.uid() AND x.status='paid' AND x.paid_at IS NOT NULL
  ORDER BY x.paid_at DESC,x.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_tester_tip_totals()
RETURNS TABLE(total_tip_amount_pence bigint,tip_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(sum(x.tip_amount_pence),0)::bigint,count(*)::bigint
  FROM playtested_studios.tester_tips x
  WHERE x.tester_id=auth.uid() AND x.status='paid' AND x.paid_at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_my_tester_tip_totals() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_tester_tip_totals() TO authenticated;

COMMIT;

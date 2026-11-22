-- Deployed independently in production at 20261122195017, retained for future environments.
CREATE OR REPLACE FUNCTION public.get_developer_all_build_receptions()
 RETURNS TABLE(playtest_id uuid, imported_game_id uuid, approved_game_id uuid, submission_id uuid, release_label text, playtest_status text, target_testers integer, accepted_test_count bigint, rated_test_count bigint, average_overall_score numeric, average_gameplay_score numeric, average_performance_score numeric, recommend_positive_percent numeric, continue_positive_percent numeric, technical_feedback_count bigint, average_hours_played numeric, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    c.id,c.imported_game_id,c.approved_game_id,c.submission_id,
    coalesce(nullif(btrim(c.release_label),''),'Unlabelled build'),
    c.status::text,c.target_testers,
    count(t.id),count(t.overall_score),
    avg(t.overall_score::numeric),
    avg(t.gameplay_score::numeric),
    avg(t.performance_score::numeric),
    100.0*avg(case when t.recommend_game in ('definitely','probably') then 1
                   when t.recommend_game is not null then 0 end),
    100.0*avg(case when t.continue_playing in ('definitely','probably') then 1
                   when t.continue_playing is not null then 0 end),
    count(t.id) filter (where nullif(btrim(t.bugs_found),'') is not null),
    avg(t.hours_played::numeric),
    c.created_at
  FROM public.community_playtests c
  LEFT JOIN playtested_studios.independent_game_tests t
    ON t.playtest_id=c.id
   AND t.status='reviewed'
   AND t.review_outcome='accepted'
   AND t.replacement_at IS NULL
  WHERE c.developer_id=auth.uid()
  GROUP BY c.id,c.imported_game_id,c.approved_game_id,c.submission_id,
           c.release_label,c.status,c.target_testers,c.created_at
  ORDER BY c.created_at DESC,c.id DESC;
$function$;
REVOKE ALL ON FUNCTION public.get_developer_all_build_receptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_developer_all_build_receptions() TO authenticated;
NOTIFY pgrst,'reload schema';

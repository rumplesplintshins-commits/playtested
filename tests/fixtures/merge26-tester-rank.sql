CREATE OR REPLACE FUNCTION public.tester_rank(p_user uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with history as (
    select count(*) filter (where review_outcome = 'accepted' and xp_awarded) as accepted,
      count(*) filter (where quality_reviewed) as assessed,
      count(*) filter (where quality_reviewed and review_outcome = 'accepted') as passed
    from public.community_game_tests where tester_id = p_user
  ) select case
    when p.tester_xp >= 5000 and h.accepted >= 50 and (h.assessed < 5 or h.passed::numeric/h.assessed >= .8) then 3
    when p.tester_xp >= 2000 and h.accepted >= 20 and (h.assessed < 5 or h.passed::numeric/h.assessed >= .8) then 2
    when p.tester_xp >= 500 and h.accepted >= 5 and (h.assessed < 5 or h.passed::numeric/h.assessed >= .8) then 1
    else 0 end from public.profiles p cross join history h where p.id = p_user;
$function$
;
CREATE OR REPLACE FUNCTION public.get_developer_test_rank(p_test_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.tester_rank(t.tester_id)
  from public.community_game_tests t
  join public.community_playtests c on c.id = t.playtest_id
  where t.id = p_test_id
    and t.review_outcome = 'accepted'
    and c.developer_id = auth.uid();
$function$
;

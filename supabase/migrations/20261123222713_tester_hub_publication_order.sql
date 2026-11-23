CREATE OR REPLACE FUNCTION public.get_discoverable_community_test_games()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and 'tester'=any(roles)) then
  raise exception 'Tester access required.';
 end if;
 return (
  select coalesce(jsonb_agg(item order by published_at nulls last, submission_id),'[]'::jsonb)
  from (
   select
    to_jsonb(g)||jsonb_build_object(
      'published_at',coalesce(c.published_at,c.created_at,s.submitted_at),
      'can_claim',true,
      'restriction_reason',null
    ) item,
    coalesce(c.published_at,c.created_at,s.submitted_at) published_at,
    g.submission_id
   from public.get_available_community_test_games() g
   left join public.community_playtests c on c.id=g.submission_id
   left join public.game_submissions s on s.id=g.submission_id

   union all

   select jsonb_build_object(
    'submission_id',c.id,
    'title',c.title,
    'developer_name',coalesce(ig.developer_name,ag.developer_name,s.developer_name,'Independent developer'),
    'genre',coalesce(c.testing_genre,ig.genre,ag.genre,s.genre,'Other'),
    'description',coalesce(ig.description,ag.description,s.description,''),
    'game_link',null,
    'access_type',c.access_type,
    'image_url',coalesce(ig.image_url,ag.image_url,s.image_url),
    'ai_type',coalesce(s.ai_type,'AI use unknown'),
    'focus_areas',c.focus_areas,
    'published_at',coalesce(c.published_at,c.created_at),
    'can_claim',false,
    'restriction_reason',case when public.tester_rank(auth.uid())<c.minimum_rank
      then 'Requires '||(array['Bronze','Silver','Gold','Platinum'])[c.minimum_rank+1]||' tester rank'
      else 'Requires '||coalesce(c.testing_genre,'the selected genre')||' interest' end
   ) item,
   coalesce(c.published_at,c.created_at) published_at,
   c.id submission_id
   from public.community_playtests c
   left join public.imported_games ig on ig.id=c.imported_game_id
   left join public.approved_games ag on ag.id=c.approved_game_id
   left join public.game_submissions s on s.id=c.submission_id
   where not public.m26_testing_hidden(c.id,auth.uid())
     and not public.m26_testing_hidden(c.submission_id,auth.uid())
     and not public.m26_testing_hidden(c.approved_game_id,auth.uid())
     and c.status='open'
     and c.audience in ('both','playtested_testers')
     and (select available from public.campaign_places(c.id))>0
     and coalesce(public._feedback_game_cooldown_until(auth.uid(),public._feedback_campaign_game_key(c.id))<=clock_timestamp(),true)
     and not exists(select 1 from public.community_game_tests done where done.playtest_id=c.id and done.tester_id=auth.uid() and done.status in('submitted','reviewed') and done.review_outcome<>'rejected')
     and not public.campaign_eligible(c.id,auth.uid())
     and not exists(select 1 from public.community_game_tests own
       where own.playtest_id=c.id and own.tester_id=auth.uid() and own.status in ('claimed','in_progress') and (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp()))
  ) discovery
 );
end;
$function$;

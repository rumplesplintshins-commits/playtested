begin;
-- Broaden discovery, never claim permissions. Restricted builds stay private.
create function public.get_discoverable_community_test_games() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and 'tester'=any(roles)) then
  raise exception 'Tester access required.';
 end if;
 return (
  select coalesce(jsonb_agg(item order by item->>'title'),'[]'::jsonb) from (
   select to_jsonb(g)||jsonb_build_object('can_claim',true,'restriction_reason',null) item
   from public.get_available_community_test_games() g
   union all
   select jsonb_build_object(
    'submission_id',c.id,'title',c.title,
    'developer_name',coalesce(ig.developer_name,ag.developer_name,s.developer_name,'Independent developer'),
    'genre',coalesce(c.testing_genre,ig.genre,ag.genre,s.genre,'Other'),
    'description',coalesce(ig.description,ag.description,s.description,''),
    'game_link',null,'access_type',c.access_type,
    'image_url',coalesce(ig.image_url,ag.image_url,s.image_url),
    'ai_type',coalesce(s.ai_type,'AI use unknown'),'focus_areas',c.focus_areas,
    'can_claim',false,
    'restriction_reason',case when public.tester_rank(auth.uid())<c.minimum_rank
      then 'Requires '||(array['Bronze','Silver','Gold','Platinum'])[c.minimum_rank+1]||' tester rank'
      else 'Requires '||coalesce(c.testing_genre,'the selected genre')||' interest' end
   )
   from public.community_playtests c
   left join public.imported_games ig on ig.id=c.imported_game_id
   left join public.approved_games ag on ag.id=c.approved_game_id
   left join public.game_submissions s on s.id=c.submission_id
   where c.status='open' and c.audience in ('both','playtested_testers')
     and not public.campaign_eligible(c.id,auth.uid())
     and not exists(select 1 from public.community_game_tests own
       where own.playtest_id=c.id and own.tester_id=auth.uid() and own.status in ('claimed','in_progress'))
  ) discovery
 );
end;
$$;
revoke all on function public.get_discoverable_community_test_games() from public,anon;
grant execute on function public.get_discoverable_community_test_games() to authenticated;
notify pgrst,'reload schema';
commit;

begin;
create function public.get_my_testing_progress() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('rank',public.tester_rank(p.id),'xp',p.tester_xp,
   'accepted',(select count(*) from public.community_game_tests t where t.tester_id=p.id and t.xp_awarded and t.review_outcome='accepted'),
   'reviewed',(select count(*) from public.community_game_tests t where t.tester_id=p.id and t.quality_reviewed),
   'passed',(select count(*) from public.community_game_tests t where t.tester_id=p.id and t.quality_reviewed and t.review_outcome='accepted'),
   'genres',p.preferred_genres)
 from public.profiles p where p.id=auth.uid();
$$;

create function public.get_testing_genres() returns setof text
language sql stable security definer set search_path='' as $$
 select distinct btrim(genre) from (
   select genre from public.game_submissions union all select genre from public.imported_games
   union all select genre from public.approved_games
   union all select unnest(array['Action','Action RPG','Adventure','Casual','Horror','Platformer','Simulation','Strategy','Survival','Other','RPG','Racing','Sports'])
 ) g where public.genre_key(genre) is not null order by 1;
$$;

create function public.get_campaign_testing_details(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('minimum_rank',c.minimum_rank,'testing_genre',c.testing_genre,
  'genre_restricted',c.genre_restricted,'build_locked',exists(select 1 from public.campaign_build_locks l where l.playtest_id=c.id),'submitted',places.submitted,'testing',places.testing,'available',places.available)
 from public.community_playtests c cross join lateral public.campaign_places(c.id) places
 where c.id=p_id and (c.developer_id=auth.uid()
   or (c.status='open' and c.audience in ('both','playtested_testers') and public.campaign_eligible(c.id,auth.uid()))
   or exists(select 1 from public.community_game_tests t where t.playtest_id=c.id and t.tester_id=auth.uid()));
$$;

create table public.developer_feedback_signals (
 test_id uuid not null references public.community_game_tests(id),
 developer_id uuid not null,
 signal text not null check(signal in ('helpful','concern')),
 reason text not null,
 created_at timestamptz not null default now(),
 primary key(test_id,developer_id)
);
alter table public.developer_feedback_signals enable row level security;
revoke all on public.developer_feedback_signals from public,anon,authenticated;
create function public.signal_test_feedback(p_test_id uuid,p_signal text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_signal is null or p_signal not in ('helpful','concern') or nullif(btrim(p_reason),'') is null then
 raise exception 'Choose Helpful or a quality concern and provide a reason.'; end if;
 if not exists(select 1 from public.community_game_tests t
   join public.community_playtests c on c.id=t.playtest_id
   where t.id=p_test_id and c.developer_id=auth.uid() and t.status in ('submitted','reviewed')) then
 raise exception 'Submitted report not found for your campaign.'; end if;
 insert into public.developer_feedback_signals values(p_test_id,auth.uid(),p_signal,btrim(p_reason),now())
 on conflict(test_id,developer_id) do update set signal=excluded.signal,reason=excluded.reason,created_at=excluded.created_at;
 -- Signals are never XP awards or quality decisions.
end;
$$;

create function public.get_quality_review_queue() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('report',to_jsonb(t),'context',
   coalesce((select jsonb_build_object('title',c.title,'build',c.release_label,'instructions',c.instructions,'focus_areas',c.focus_areas)
     from public.community_playtests c where c.id=t.playtest_id),
     (select jsonb_build_object('title',s.title,'build','Legacy submission','instructions',s.description,'focus_areas','[]'::jsonb)
     from public.game_submissions s where s.id=t.submission_id)),
   'events',
   (select jsonb_agg(to_jsonb(e) order by e.id) from public.test_review_events e where e.test_id=t.id),
   'developer_signals',(select jsonb_agg(to_jsonb(s)) from public.developer_feedback_signals s where s.test_id=t.id)) order by t.submitted_at),'[]')
   from public.community_game_tests t where t.status in ('submitted','reviewed'));
end;
$$;

revoke all on function public.get_my_testing_progress(),public.get_testing_genres(),public.get_campaign_testing_details(uuid),
 public.signal_test_feedback(uuid,text,text),public.get_quality_review_queue() from public,anon;
grant execute on function public.get_my_testing_progress(),public.get_testing_genres(),public.get_campaign_testing_details(uuid),
 public.signal_test_feedback(uuid,text,text),public.get_quality_review_queue() to authenticated;
commit;

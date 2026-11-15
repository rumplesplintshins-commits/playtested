begin;
-- New rubric only. Historical awards/scores are deliberately not backfilled.
create table public.feedback_quality_rubrics(version integer primary key,active boolean not null default false,maximum_xp integer not null check(maximum_xp=100),criteria jsonb not null,eligibility jsonb not null);
create unique index feedback_quality_one_active on public.feedback_quality_rubrics(active) where active;
alter table public.feedback_quality_rubrics enable row level security;
revoke all on public.feedback_quality_rubrics from public,anon,authenticated;
insert into public.feedback_quality_rubrics values(2,true,100,
'{"specific":{"label":"Specific observations about the build","guidance":"Names a concrete feature, interaction or behaviour in this build."},"examples":{"label":"Concrete examples supporting observations","guidance":"Gives a situation, example or reproduction detail; finding a bug is not required."},"impact":{"label":"Explains why something worked or caused difficulty","guidance":"Explains the effect on the testing experience, beyond a rating or preference."},"focus":{"label":"Addresses the requested testing task or focus areas","guidance":"Engages with the developer task; balanced feedback is valid when no focus is set."},"takeaway":{"label":"Provides a useful takeaway","guidance":"Identifies a priority, improvement or something worth preserving; criticism is not required."}}',
'{"original":"Credible original feedback, not spam or copied filler","relevant":"Relates to the relevant game/build and testing experience"}');
alter table public.community_game_tests add column quality_rubric_version integer references public.feedback_quality_rubrics(version),add column feedback_quality_score integer check(feedback_quality_score between 0 and 100),add column quality_criteria jsonb,add column quality_eligibility jsonb,add column quality_reviewer uuid;
alter table public.test_review_events add column rubric_version integer references public.feedback_quality_rubrics(version),add column quality_score integer check(quality_score between 0 and 100),add column actual_xp_award integer check(actual_xp_award>=0);
create function public.get_feedback_quality_rubric() returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(r) from public.feedback_quality_rubrics r where active and auth.uid() is not null;$$;
create or replace function public.review_test_quality(p_test_id uuid,p_outcome text,p_reason text,p_criteria jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t public.community_game_tests;rubric public.feedback_quality_rubrics;scores jsonb;eligibility jsonb;eligible boolean;score integer;award integer;delta integer;outcome text;pending_request boolean;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Only an admin can review tests.';end if;
 if p_outcome is null or p_outcome not in('accepted','rejected') or nullif(btrim(p_reason),'') is null then raise exception 'Choose an outcome and give a tester-visible reason.';end if;
 select * into rubric from public.feedback_quality_rubrics where active;
 if jsonb_typeof(p_criteria) is distinct from 'object' or p_criteria->>'rubric_version' is distinct from rubric.version::text then raise exception 'The feedback quality rubric changed. Refresh before saving.';end if;
 scores:=p_criteria->'scores';eligibility:=p_criteria->'eligibility';
 if jsonb_typeof(scores) is distinct from 'object' or jsonb_typeof(eligibility) is distinct from 'object' then raise exception 'Assess eligibility separately from scored criteria.';end if;
 if exists(select 1 from jsonb_object_keys(rubric.criteria) k where not(scores ? k)) or exists(select 1 from jsonb_object_keys(scores) k where not(rubric.criteria ? k)) or exists(select 1 from jsonb_each(scores)e where e.value not in('true'::jsonb,'false'::jsonb)) then raise exception 'Record each scored criterion as true or false.';end if;
 if exists(select 1 from jsonb_object_keys(rubric.eligibility) k where not(eligibility ? k)) or exists(select 1 from jsonb_object_keys(eligibility) k where not(rubric.eligibility ? k)) or exists(select 1 from jsonb_each(eligibility)e where e.value not in('true'::jsonb,'false'::jsonb)) then raise exception 'Explicitly assess both originality and relevance.';end if;
 eligible:=not exists(select 1 from jsonb_each(eligibility)e where e.value='false'::jsonb);
 outcome:=case when eligible then p_outcome else 'rejected' end;
 select case when eligible then count(*) filter(where value='true'::jsonb)*100/(select count(*) from jsonb_object_keys(rubric.criteria)) else 0 end into score from jsonb_each(scores);
 award:=case when outcome='accepted' then rubric.maximum_xp*score/100 else 0 end;
 -- Preserve the campaign -> participation -> profile lock order used by review/build edits.
 perform 1 from public.community_playtests where id=(select playtest_id from public.community_game_tests where id=p_test_id) for update;
 select * into t from public.community_game_tests where id=p_test_id for update;
 if not found or t.status not in('submitted','reviewed') then raise exception 'Only submitted reports can be reviewed.';end if;
 select exists(select 1 from public.test_review_events e where e.test_id=t.id and e.kind='reconsideration' and e.id>coalesce((select max(id) from public.test_review_events where test_id=t.id and kind in('accepted','rejected')),0)) into pending_request;
 if t.quality_reviewed and t.review_outcome=outcome and t.quality_rubric_version=rubric.version and t.quality_criteria=scores and t.quality_eligibility=eligibility and t.review_reason=btrim(p_reason) and t.base_xp_amount=award and not pending_request then return;end if;
 delta:=award-t.base_xp_amount;
 update public.profiles set tester_xp=tester_xp+delta,completed_tests=completed_tests+(case when award>0 then 1 else 0 end)-(case when t.base_xp_amount>0 then 1 else 0 end) where id=t.tester_id;
 if not found then raise exception 'Tester profile missing.';end if;
 update public.community_game_tests set review_outcome=outcome,status='reviewed',xp_awarded=(award>0),base_xp_amount=award,quality_reviewed=true,review_reason=btrim(p_reason),reviewed_at=clock_timestamp(),quality_rubric_version=rubric.version,feedback_quality_score=score,quality_criteria=scores,quality_eligibility=eligibility,quality_reviewer=auth.uid() where id=t.id;
 insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta,rubric_version,quality_score,actual_xp_award) values(t.id,auth.uid(),outcome,btrim(p_reason),jsonb_build_object('rubric_version',rubric.version,'eligibility',eligibility,'scores',scores),delta,rubric.version,score,award);
 if outcome='accepted' and t.playtest_id is not null then insert into public.campaign_build_locks(playtest_id) values(t.playtest_id) on conflict do nothing;end if;
end;$$;
-- Preserve the existing appeal flow and include graded partial/zero accepted awards.
create or replace function public.request_test_reconsideration(p_test_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if nullif(btrim(p_reason),'') is null then raise exception 'Explain your request.';end if;
 perform 1 from public.community_game_tests t where t.id=p_test_id and t.tester_id=auth.uid() and(t.review_outcome='rejected' or(t.review_outcome='accepted' and t.quality_rubric_version is not null and t.base_xp_amount<(select maximum_xp from public.feedback_quality_rubrics where version=t.quality_rubric_version))) for update;
 if not found then raise exception 'A rejected or partially awarded report you own is required.';end if;
 if exists(select 1 from public.test_review_events e where e.test_id=p_test_id and e.kind='reconsideration' and e.id>coalesce((select max(r.id) from public.test_review_events r where r.test_id=p_test_id and r.kind in('accepted','rejected')),0)) then raise exception 'A reconsideration request is already pending.';end if;
 insert into public.test_review_events(test_id,actor_id,kind,reason)values(p_test_id,auth.uid(),'reconsideration',btrim(p_reason));
end;$$;
create or replace function public.get_developer_quality_reports(p_playtest_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.community_playtests where id=p_playtest_id and developer_id=auth.uid()) then raise exception 'Developer access required.';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'outcome',t.review_outcome,'review_outcome',t.review_outcome,'quality_reviewed',t.quality_reviewed,'quality_rubric_version',t.quality_rubric_version,'feedback_quality_score',t.feedback_quality_score,'base_xp_amount',t.base_xp_amount,'overall',t.overall_score,'enjoyed',t.enjoyed_most,'frustrations',t.frustrations,'improvement',t.biggest_improvement,'bugs',t.bugs_found,'feedback',t.feedback,'submitted_at',t.submitted_at) order by t.submitted_at),'[]') from public.community_game_tests t where t.playtest_id=p_playtest_id and t.status in('submitted','reviewed'));
end;$$;
revoke all on function public.get_feedback_quality_rubric() from public,anon;
grant execute on function public.get_feedback_quality_rubric() to authenticated;
notify pgrst,'reload schema';
commit;

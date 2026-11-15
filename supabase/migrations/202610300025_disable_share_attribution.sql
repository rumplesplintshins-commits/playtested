begin;

-- Privacy hold: keep ordinary sharing/playtesting working, but stop new journey attribution.
-- Older clients may still send pt_visit values, so the database wrappers must ignore them.

create or replace function public.claim_with_share_attribution(p_submission_id uuid,p_visit text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  return public.claim_community_game_test(p_submission_id);
end;$$;

create or replace function public.submit_community_feedback_with_attribution(
  p_participant_id uuid,
  p_overall_score integer,
  p_gameplay_score integer,
  p_controls_score integer,
  p_performance_score integer,
  p_enjoyed text,
  p_struggled text,
  p_improvements text,
  p_bugs text,
  p_recommendation text,
  p_additional_comments text,
  p_visit text default null
) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public.submit_community_playtest_feedback(
    p_participant_id,
    p_overall_score,
    p_gameplay_score,
    p_controls_score,
    p_performance_score,
    p_enjoyed,
    p_struggled,
    p_improvements,
    p_bugs,
    p_recommendation,
    p_additional_comments
  );
end;$$;

-- The web engagement endpoint is disabled. Remove direct event-write capability as defence in depth.
revoke execute on function public.record_share_visit(uuid,text,uuid) from service_role;
revoke execute on function public.share_journey_context(text,text) from service_role;
revoke execute on function public.record_share_access(text,text,uuid,text,uuid) from service_role;

-- Preserve authenticated access to the compatibility wrappers so stale clients still complete
-- the underlying claim/feedback action without recording attribution.
revoke all on function public.claim_with_share_attribution(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_with_share_attribution(uuid,text) to authenticated;
revoke all on function public.submit_community_feedback_with_attribution(uuid,integer,integer,integer,integer,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_community_feedback_with_attribution(uuid,integer,integer,integer,integer,text,text,text,text,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;

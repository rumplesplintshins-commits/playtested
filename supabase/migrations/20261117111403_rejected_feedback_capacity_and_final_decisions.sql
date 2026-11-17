begin;
-- Function-only capacity change: never delete or rewrite historical reports/decisions.
create or replace function public.campaign_places(p_id uuid) returns table(submitted integer,testing integer,available integer)
language sql volatile security definer set search_path='' as $$
 with measured as materialized(select clock_timestamp() checked), occupied as (
 select t.*, (t.status in('submitted','reviewed') and t.review_outcome is distinct from 'rejected') as report_place,
 (t.status in('claimed','in_progress') and (t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))) as reservation_place
 from public.community_game_tests t where t.playtest_id=p_id and t.replacement_at is null)
 select count(*) filter(where report_place)::integer,count(*) filter(where reservation_place)::integer,
 greatest(0,coalesce((select target_testers from public.community_playtests where id=p_id),0)-count(*) filter(where report_place or reservation_place))::integer from occupied;
$$;
create or replace function public._lock_feedback_review(p_test_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare campaign uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry using read committed.';end if;
 select playtest_id into campaign from public.community_game_tests where id=p_test_id;
 if campaign is not null then
  perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||campaign::text,0));
  perform 1 from public.community_playtests where id=campaign for update;
 end if;
 perform 1 from public.community_game_tests where id=p_test_id for update;
end;$$;
CREATE OR REPLACE FUNCTION public._assess_final_test_quality(p_test_id uuid, p_outcome text, p_reason text, p_criteria jsonb, p_exception boolean, p_audit_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.community_game_tests;rubric public.feedback_quality_rubrics;scores jsonb;eligibility jsonb;eligible boolean;score integer;award integer;delta integer;outcome text;begin
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
 -- All claim, correction and moderation writers serialize on the capacity lock
 -- before campaign/participation rows, including legacy evidence relocation.
 perform public._lock_feedback_review(p_test_id);
 select * into t from public.community_game_tests where id=p_test_id for update;
 if not found or t.status not in('submitted','reviewed') then raise exception 'Only submitted reports can be reviewed.';end if;
 if t.quality_reviewed and t.review_outcome=outcome and t.quality_rubric_version=rubric.version and t.quality_criteria=scores and t.quality_eligibility=eligibility and t.review_reason=btrim(p_reason) and t.base_xp_amount=award then return;end if;
 if t.status='reviewed' and t.review_outcome in('accepted','rejected') then
  if not p_exception then raise exception 'This admin decision is final. Use an explicit audited administrative correction.';end if;
 elsif p_exception then raise exception 'Only a final decision can receive an exceptional correction.';
 end if;
 if outcome='accepted' and t.replacement_at is not null then raise exception 'A replaced report cannot be accepted.';end if;
 if p_exception then
  if char_length(btrim(coalesce(p_audit_reason,'')))<12 then raise exception 'Provide an exceptional correction audit reason of at least 12 characters.';end if;
  if outcome='accepted' and t.review_outcome<>'accepted' and t.playtest_id is not null then
   if not exists(select 1 from public.community_playtests where id=t.playtest_id and status in('open','paused') and completed_at is null) then raise exception 'Cannot restore a released place in a closed or completed campaign.';end if;
   if (select available from public.campaign_places(t.playtest_id))<=0 then raise exception 'Cannot accept this rejected report: its place has been allocated. No capacity remains.';end if;
  end if;
  insert into public.test_review_events(test_id,actor_id,kind,reason,criteria)
  values(t.id,auth.uid(),'moderation_correction',btrim(p_audit_reason),jsonb_build_object(
   'transaction_id',txid_current()::text,
   'from',jsonb_build_object('outcome',t.review_outcome,'xp',t.base_xp_amount,'rubric',t.quality_rubric_version,'reviewed_at',t.reviewed_at),
   'to',jsonb_build_object('outcome',outcome,'xp',award,'rubric',rubric.version),
   'tester_reason',btrim(p_reason)));
 end if;
 delta:=award-t.base_xp_amount;
 update public.profiles set tester_xp=tester_xp+delta,completed_tests=completed_tests+(case when award>0 then 1 else 0 end)-(case when t.base_xp_amount>0 then 1 else 0 end) where id=t.tester_id;
 if not found then raise exception 'Tester profile missing.';end if;
 update public.community_game_tests set review_outcome=outcome,status='reviewed',xp_awarded=(award>0),base_xp_amount=award,quality_reviewed=true,review_reason=btrim(p_reason),reviewed_at=clock_timestamp(),quality_rubric_version=rubric.version,feedback_quality_score=score,quality_criteria=scores,quality_eligibility=eligibility,quality_reviewer=auth.uid() where id=t.id;
 insert into public.test_review_events(test_id,actor_id,kind,reason,criteria,xp_delta,rubric_version,quality_score,actual_xp_award) values(t.id,auth.uid(),outcome,btrim(p_reason),jsonb_build_object('rubric_version',rubric.version,'eligibility',eligibility,'scores',scores),delta,rubric.version,score,award);
 if outcome='accepted' and t.playtest_id is not null then insert into public.campaign_build_locks(playtest_id) values(t.playtest_id) on conflict do nothing;end if;
end;$function$;
create or replace function public.review_test_quality(p_test_id uuid,p_outcome text,p_reason text,p_criteria jsonb) returns void
language plpgsql security definer set search_path='' as $$begin
 perform public._assess_final_test_quality(p_test_id,p_outcome,p_reason,p_criteria,false,null);
end;$$;
create or replace function public.admin_correct_test_quality(p_test_id uuid,p_outcome text,p_reason text,p_criteria jsonb,p_audit_reason text) returns void
language plpgsql security definer set search_path='' as $$begin
 perform public._assess_final_test_quality(p_test_id,p_outcome,p_reason,p_criteria,true,p_audit_reason);
end;$$;
CREATE OR REPLACE FUNCTION public.guard_submitted_test()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if old.status in ('submitted','reviewed') then
   if tg_op='DELETE' then raise exception 'Submitted reports cannot be released or deleted.'; end if;
   if new.status not in ('submitted','reviewed') or new.tester_id<>old.tester_id
     or new.playtest_id is distinct from old.playtest_id
     or new.submission_id is distinct from old.submission_id
     or new.submitted_at is distinct from old.submitted_at then
     raise exception 'Submitted participation cannot be recycled.';
   end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 if old.status='reviewed' and old.review_outcome in('accepted','rejected')
  and row(new.status,new.review_outcome,new.base_xp_amount,new.xp_awarded,new.quality_reviewed,new.quality_rubric_version,new.quality_criteria,new.quality_eligibility,new.review_reason,new.reviewed_at,new.quality_reviewer,new.replacement_at,new.replacement_by,new.replacement_reason)
   is distinct from row(old.status,old.review_outcome,old.base_xp_amount,old.xp_awarded,old.quality_reviewed,old.quality_rubric_version,old.quality_criteria,old.quality_eligibility,old.review_reason,old.reviewed_at,old.quality_reviewer,old.replacement_at,old.replacement_by,old.replacement_reason)
  and not exists(select 1 from public.test_review_events e where e.test_id=old.id and e.actor_id=auth.uid() and e.kind='moderation_correction'
   and e.criteria->>'transaction_id'=txid_current()::text
   and new.status='reviewed' and e.criteria->'from'->>'outcome'=old.review_outcome
   and (e.criteria->'from'->>'xp')::integer=old.base_xp_amount
   and e.criteria->'from'->'reviewed_at'=coalesce(to_jsonb(old.reviewed_at),'null'::jsonb)
   and e.criteria->'to'->>'outcome'=new.review_outcome and (e.criteria->'to'->>'xp')::integer=new.base_xp_amount)
 then raise exception 'Final moderation decisions require an explicit audited administrative correction.';end if;
 return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_relocate_playtest_private_evidence(p_test_id uuid, p_document_url text, p_recording_url text, p_public_feedback text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_test public.community_game_tests%rowtype;
  v_doc text;
  v_recording text;
  v_old_document text;
  v_old_recording text;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then
    raise exception 'Admin access required.';
  end if;
  if length(btrim(coalesce(p_reason,'')))<12 then raise exception 'Document the reason for evidence correction.'; end if;
  if length(coalesce(p_public_feedback,''))>10000 or
     not public._playtest_public_comment_is_safe(p_public_feedback) then
    raise exception 'The public feedback must not include a link or contact detail.';
  end if;
  perform public._lock_feedback_review(p_test_id);
  select * into v_test from public.community_game_tests t where t.id=p_test_id for update;
  if not found or v_test.status<>'submitted' or v_test.review_outcome<>'pending' then
    raise exception 'Only pending submitted reports may be corrected by this action.';
  end if;
  v_doc:=public._playtest_safe_evidence_url(p_document_url,'document');
  v_recording:=public._playtest_safe_evidence_url(p_recording_url,'recording');
  if v_doc is null and v_recording is null then
    raise exception 'At least one supporting link is required.';
  end if;
  select e.document_url,e.recording_url into v_old_document,v_old_recording
  from public.playtest_private_evidence e where e.test_id=p_test_id;
  insert into public.playtest_private_evidence_audit
   (test_id,actor_id,action,previous_public_feedback,previous_document_url,previous_recording_url,reason)
  values (p_test_id,auth.uid(),'relocate',v_test.feedback,v_old_document,v_old_recording,btrim(p_reason));
  insert into public.playtest_private_evidence (test_id,document_url,recording_url)
  values(p_test_id,v_doc,v_recording)
  on conflict(test_id) do update set document_url=excluded.document_url,
    recording_url=excluded.recording_url,updated_at=now();
  update public.community_game_tests set feedback=nullif(btrim(p_public_feedback),'') where id=p_test_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.replace_unusable_test(p_test_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.community_game_tests%rowtype;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Moderator access required.'; end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'Document fraud or unusable evidence.'; end if;
 perform public._lock_feedback_review(p_test_id);
 select * into t from public.community_game_tests where id=p_test_id for update;
 if not found or t.status not in ('submitted','reviewed') then raise exception 'Submitted report required.'; end if;
 if t.replacement_at is not null then return; end if;
 if t.status='reviewed' and t.review_outcome in('accepted','rejected') then raise exception 'Final decisions require an explicit audited administrative correction; rejection already releases a place.';end if;
 -- This does not reverse XP: the quality decision must be reviewed separately.
 update public.community_game_tests set replacement_at=now(),replacement_by=auth.uid(),replacement_reason=btrim(p_reason) where id=p_test_id;
 insert into public.test_review_events(test_id,actor_id,kind,reason) values(p_test_id,auth.uid(),'replacement',btrim(p_reason));
end;
$function$;
create or replace function public.mark_test_feedback_usefulness(p_test_id uuid,p_usefulness text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_test public.community_game_tests%rowtype;
  v_developer_id uuid;
  v_developer_award uuid;
  v_tester_award bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_usefulness is null or p_usefulness not in ('useful','not_useful') then
    raise exception 'Choose useful or not useful.';
  end if;
  perform public._lock_feedback_review(p_test_id);
  -- Capacity -> campaign -> feedback -> profile, shared with moderation.
  perform 1 from public.community_playtests
  where id = (select playtest_id from public.community_game_tests where id = p_test_id)
  for update;
  select t.* into v_test from public.community_game_tests t where t.id = p_test_id for update;
  if not found or v_test.review_outcome is distinct from 'accepted'
     or v_test.status is distinct from 'reviewed' or v_test.replacement_at is not null then
    raise exception 'Accepted tester feedback not found.';
  end if;
  select developer_id into v_developer_id from public.community_playtests where id = v_test.playtest_id;
  if v_developer_id is distinct from auth.uid() then
    raise exception 'Only the developer who owns this playtest can rate its feedback.';
  end if;
  -- Lock both balances in deterministic order for accounts with overlapping roles.
  perform 1 from public.profiles where id in (v_developer_id,v_test.tester_id) order by id for update;

  update public.community_game_tests set feedback_usefulness = p_usefulness,
    feedback_usefulness_marked_at = clock_timestamp(),feedback_usefulness_marked_by = auth.uid()
  where id = p_test_id;

  insert into public.developer_xp_awards(developer_id,xp_amount,award_type,source_type,source_id,description)
  values(v_developer_id,10,'feedback_review','community_game_test',p_test_id,
    'Reviewed accepted tester feedback: +10 Developer XP.')
  on conflict do nothing returning id into v_developer_award;
  if v_developer_award is not null then
    update public.profiles set developer_xp = developer_xp + 10 where id = v_developer_id;
    if not found then raise exception 'Developer profile missing.'; end if;
    perform public._create_notification(v_developer_id,'developer_feedback_received',
      'You earned +10 Developer XP','You reviewed accepted tester feedback. This feedback can earn review XP only once.',
      '/account#developer-xp-history','playtest',v_test.playtest_id,'feedback:developer-review-xp:' || p_test_id::text);
  end if;

  if p_usefulness = 'useful' then
    insert into public.test_review_events(test_id,actor_id,kind,reason,xp_delta)
    values(p_test_id,auth.uid(),'tester_feedback_useful',
      'Your feedback was marked Useful. One-time bonus: +5 Tester XP.',5)
    on conflict (test_id) where kind = 'tester_feedback_useful'
    do nothing returning id into v_tester_award;
    if v_tester_award is not null then
      update public.profiles set tester_xp = tester_xp + 5 where id = v_test.tester_id;
      if not found then raise exception 'Tester profile missing.'; end if;
      perform public._create_notification(v_test.tester_id,'tester_feedback_useful',
        'Your feedback was marked Useful!','The developer found your feedback helpful. You''ve earned an additional 5 XP.',
        '/tester#testing-activity-' || p_test_id::text,'playtest',v_test.playtest_id,'feedback:useful-xp:' || p_test_id::text);
    end if;
  end if;
  return p_usefulness;
end;
$$;
-- Retain the old RPC name and all existing requests, but stop normal reconsideration.
create or replace function public.request_test_reconsideration(p_test_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not exists(select 1 from public.community_game_tests where id=p_test_id and tester_id=auth.uid()) then raise exception 'Test not found or not owned.';end if;
 raise exception 'Admin decisions are final. Contact support for an exceptional administrative correction; no place is reserved.';
end;$$;
-- Historical rejection counts remain visible; participation/progress counts represent
-- current valid reservations, pending reviews and accepted reports only.
create or replace function public.get_developer_playtested_test_progress(p_playtest_id uuid)
returns table(total_testers bigint,claimed_count bigint,in_progress_count bigint,submitted_count bigint,accepted_count bigint,rejected_count bigint)
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not exists(select 1 from public.community_playtests where id=p_playtest_id and developer_id=auth.uid()) then raise exception 'Developer access required.';end if;
 return query with measured as materialized(select clock_timestamp() checked)
 select count(*) filter(where t.replacement_at is null and ((t.status in('submitted','reviewed') and t.review_outcome is distinct from 'rejected') or(t.status in('claimed','in_progress') and(t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))))),
 count(*) filter(where t.replacement_at is null and t.status='claimed' and(t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))),
 count(*) filter(where t.replacement_at is null and t.status='in_progress' and(t.reservation_expires_at is null or t.reservation_expires_at>(select checked from measured))),
 count(*) filter(where t.replacement_at is null and t.status='submitted' and t.review_outcome='pending'),
 count(*) filter(where t.replacement_at is null and t.status='reviewed' and t.review_outcome='accepted'),
 count(*) filter(where t.status='reviewed' and t.review_outcome='rejected')
 from public.community_game_tests t where t.playtest_id=p_playtest_id;
end;$$;
revoke all on function public._lock_feedback_review(uuid),public._assess_final_test_quality(uuid,text,text,jsonb,boolean,text),public.guard_submitted_test() from public,anon,authenticated;
revoke all on function public.admin_correct_test_quality(uuid,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.admin_correct_test_quality(uuid,text,text,jsonb,text) to authenticated;
revoke insert,update,delete on public.test_review_events from anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_available_community_test_games()
 RETURNS TABLE(submission_id uuid, title text, developer_name text, genre text, description text, game_link text, access_type text, image_url text, price text, ai_type text, focus_areas text[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$;
-- Legacy submissions: direct game access first, then Steam.
  SELECT s.id, s.title, s.developer_name, s.genre, s.description,
         access.link,
         CASE WHEN access.link ~* '^https?://store[.]steampowered[.]com(/|$)'
              THEN 'steam_game' ELSE 'other' END::text,
         s.image_url, s.price, s.ai_type, ARRAY[]::text[]
  FROM public.game_submissions s
  CROSS JOIN LATERAL (
    SELECT coalesce(
      CASE WHEN btrim(s.game_link) ~* '^https?://[^[:space:]]+$'
           THEN btrim(s.game_link) END,
      CASE WHEN btrim(s.steam_url) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(s.steam_url) END,
      CASE WHEN btrim(s.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(s.steam_app_id) || '/' END
    ) AS link
  ) access
  WHERE EXISTS (
    SELECT 1 FROM public.community_game_tests own
    WHERE own.submission_id=s.id AND own.tester_id=auth.uid()
      AND own.status IN ('claimed','in_progress') AND (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp())
  )

  UNION ALL

  -- Campaigns: keep the campaign's build link ahead of Store fallbacks.
  -- A Store link doesn't guarantee ownership or a free demo.
  SELECT p.id, p.title,
         coalesce(ig.developer_name, ag.developer_name, s.developer_name,
                  'Independent developer'),
         coalesce(p.testing_genre, ig.genre, ag.genre, s.genre, 'Other'),
         p.instructions,
         access.link,
         CASE WHEN access.link ~* '^https?://store[.]steampowered[.]com(/|$)'
              THEN CASE WHEN p.access_type = 'steam_demo'
                        THEN 'steam_demo' ELSE 'steam_game' END
              ELSE coalesce(p.access_type, 'other') END::text,
         coalesce(ig.image_url, ag.image_url, s.image_url),
         coalesce(ig.price, ag.price, s.price, 'Unknown'),
         coalesce(s.ai_type, 'AI use unknown'),
         coalesce(p.focus_areas, ARRAY[]::text[])
  FROM public.community_playtests p
  LEFT JOIN public.imported_games ig ON ig.id = p.imported_game_id
  LEFT JOIN public.approved_games ag ON ag.id = p.approved_game_id
  LEFT JOIN public.game_submissions s ON s.id = p.submission_id
  CROSS JOIN LATERAL (
    SELECT coalesce(
      CASE WHEN btrim(p.access_link) ~* '^https?://[^[:space:]]+$'
           THEN btrim(p.access_link) END,
      CASE WHEN btrim(ig.steam_url) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(ig.steam_url) END,
      CASE WHEN btrim(s.steam_url) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(s.steam_url) END,
      CASE WHEN btrim(ag.game_link) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(ag.game_link) END,
      CASE WHEN btrim(s.game_link) ~* '^https?://store[.]steampowered[.]com(/|$)'
           THEN btrim(s.game_link) END,
      CASE WHEN btrim(ig.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(ig.steam_app_id) || '/' END,
      CASE WHEN btrim(ag.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(ag.steam_app_id) || '/' END,
      CASE WHEN btrim(s.steam_app_id) ~ '^[0-9]+$'
           THEN 'https://store.steampowered.com/app/' || btrim(s.steam_app_id) || '/' END
    ) AS link
  ) access
  WHERE (p.status = 'open' AND p.audience IN ('playtested_testers', 'both') AND public.campaign_eligible(p.id,auth.uid()) AND (select available from public.campaign_places(p.id))>0 AND NOT EXISTS(select 1 from public.community_game_tests own where own.playtest_id=p.id and own.tester_id=auth.uid() and own.status in('submitted','reviewed')))
    OR EXISTS (SELECT 1 FROM public.community_game_tests own WHERE own.playtest_id=p.id AND own.tester_id=auth.uid() AND own.status IN ('claimed','in_progress') AND (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp()))
  ORDER BY title;
$function$;
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
   where not public.m26_testing_hidden(c.id,auth.uid()) and not public.m26_testing_hidden(c.submission_id,auth.uid()) and not public.m26_testing_hidden(c.approved_game_id,auth.uid()) and c.status='open' and c.audience in ('both','playtested_testers')
     and (select available from public.campaign_places(c.id))>0
     and not exists(select 1 from public.community_game_tests done where done.playtest_id=c.id and done.tester_id=auth.uid() and done.status in('submitted','reviewed'))
     and not public.campaign_eligible(c.id,auth.uid())
     and not exists(select 1 from public.community_game_tests own
       where own.playtest_id=c.id and own.tester_id=auth.uid() and own.status in ('claimed','in_progress') and (own.reservation_expires_at is null or own.reservation_expires_at>clock_timestamp()))
  ) discovery
 );
end;
$function$;
CREATE OR REPLACE FUNCTION public.get_campaign_testing_details(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
select jsonb_build_object('minimum_rank',c.minimum_rank,'testing_genre',c.testing_genre,'genre_restricted',c.genre_restricted,'build_locked',exists(select 1 from public.campaign_build_locks where playtest_id=c.id),'capacity',c.target_testers,'accepted',(select count(*)::int from public.community_game_tests tt where tt.playtest_id=c.id and tt.replacement_at is null and tt.status='reviewed' and tt.review_outcome='accepted'),'completed_at',c.completed_at,'pending',greatest(0,p.submitted-(select count(*)::integer from public.community_game_tests t where t.playtest_id=c.id and t.replacement_at is null and t.status='reviewed' and t.review_outcome='accepted')),'rejected',(select count(*)::integer from public.community_game_tests t where t.playtest_id=c.id and t.status='reviewed' and t.review_outcome='rejected'),'submitted',p.submitted,'testing',p.testing,'available',p.available,'server_now',clock_timestamp(),'reservation_hours',extract(epoch from (select reservation_window from public.testing_policy))/3600)
from public.community_playtests c cross join lateral public.campaign_places(c.id)p
where c.id=p_id and (c.developer_id=auth.uid() or(c.status='open' and c.audience in('both','playtested_testers') and public.campaign_eligible(c.id,auth.uid())) or exists(select 1 from public.community_game_tests where playtest_id=c.id and tester_id=auth.uid()));$function$;
-- Reports created before campaign IDs retain their original submission identity.
-- This narrow owner-only projection never exposes tester identity or public links.
create or replace function public.get_developer_legacy_private_playtest_evidence(p_submission_id uuid)
returns table(test_id uuid,document_url text,recording_url text,submitted_at timestamptz)
language sql stable security definer set search_path='' as $$
 select t.id,e.document_url,e.recording_url,t.submitted_at
 from public.community_game_tests t
 join public.game_submissions g on g.id=t.submission_id
 join public.playtest_private_evidence e on e.test_id=t.id
 where t.playtest_id is null and t.submission_id=p_submission_id
 and g.developer_id=auth.uid() and auth.uid() is not null
 and t.status='reviewed' and t.review_outcome='accepted' and t.replacement_at is null;
$$;
revoke all on function public.get_developer_legacy_private_playtest_evidence(uuid) from public,anon,authenticated;
grant execute on function public.get_developer_legacy_private_playtest_evidence(uuid) to authenticated;

-- Recompute availability for existing OPEN campaigns with rejection history only.
-- Never reopen paused/closed campaigns or modify reports, XP or launch history.
do $$declare campaign uuid;begin for campaign in select c.id from public.community_playtests c where c.status='open' and exists(select 1 from public.community_game_tests t where t.playtest_id=c.id and t.status='reviewed' and t.review_outcome='rejected' and t.replacement_at is null) loop perform public._m26_refresh_availability(campaign);end loop;end;$$;
notify pgrst,'reload schema';
commit;

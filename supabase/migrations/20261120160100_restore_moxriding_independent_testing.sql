begin;
set local lock_timeout = '5s';

create table playtested_studios.independence_corrections (
  test_id uuid primary key references public.community_game_tests(id),
  campaign_id uuid not null references public.community_playtests(id),
  previous_completion timestamptz not null,
  reason text not null,
  xp_reversed integer not null,
  completed_tests_reversed integer not null,
  corrected_at timestamptz not null default clock_timestamp()
);
alter table playtested_studios.independence_corrections enable row level security;
revoke all on playtested_studios.independence_corrections from public, anon, authenticated, service_role;

create view playtested_studios.independent_game_tests as
select t.* from public.community_game_tests t
where not exists (
  select 1 from playtested_studios.independence_corrections c where c.test_id = t.id
);
revoke all on playtested_studios.independent_game_tests from public, anon, authenticated, service_role;

-- Preserve private tester history and moderation evidence. Route scoring, recruitment,
-- completion and rank readers through the filtered source without changing their ACLs.
do $$
declare
  signature text;
  routine regprocedure;
  definition text;
  filtered text;
begin
  foreach signature in array array[
    'campaign_places(uuid)', 'get_campaign_testing_details(uuid)',
    'get_accepted_game_test_counts()', 'get_accepted_game_test_feedback(uuid)',
    'get_accepted_game_test_ratings()', 'get_game_community_reception()',
    'get_public_imported_playtest_feedback(uuid)', 'get_public_intent_counts(jsonb)',
    'get_public_submission_playtest_feedback(uuid)', 'get_public_submission_playtest_history(uuid)',
    'get_developer_accepted_playtest_feedback(uuid)', 'get_developer_current_reception()',
    'get_developer_playtested_test_progress(uuid)', 'get_developer_test_rank(uuid)', 'get_studio_workspace(uuid)',
    'process_campaign_completion()', 'tester_rank(uuid)', 'get_my_testing_progress()',
    'm26_tester_analytics()'
  ] loop
    routine := to_regprocedure('public.' || signature);
    if routine is null or not (select prosecdef from pg_proc where oid = routine) then
      raise exception 'Independent-feedback reader contract changed: %', signature;
    end if;
    definition := pg_get_functiondef(routine);
    filtered := regexp_replace(definition, '(from|join)([[:space:]]+)public[.]community_game_tests\M',
      '\1\2playtested_studios.independent_game_tests', 'gi');
    if filtered = definition then
      raise exception 'Independent-feedback source changed: %', signature;
    end if;
    execute filtered;
  end loop;
end;
$$;

create function playtested_studios.preserve_corrected_test() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from playtested_studios.independence_corrections where test_id = old.id) then
    raise exception 'This non-independent report is preserved as historical evidence.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function playtested_studios.preserve_corrected_test() from public, anon, authenticated, service_role;
create trigger aa0_preserve_corrected_test
before update or delete on public.community_game_tests
for each row execute function playtested_studios.preserve_corrected_test();

-- The closed-campaign guard normally forbids every edit. Hold the campaign table lock
-- through the one audited reopen and restore the three named triggers before commit.
lock table public.community_playtests in access exclusive mode;
do $$
declare
  report_id constant uuid := 'f89bdb83-af73-4938-98e9-8ba114992dc4';
  campaign_id constant uuid := '0268cdcc-8603-404c-ad5e-c37914248b37';
  report public.community_game_tests;
  campaign public.community_playtests;
  profile public.profiles;
  ledger playtested_studios.launches;
  reopened public.community_playtests;
begin
  if exists (select 1 from playtested_studios.independence_corrections where test_id = report_id) then
    return;
  end if;
  select * into strict report from public.community_game_tests where id = report_id for update;
  select * into strict campaign from public.community_playtests where id = campaign_id for update;
  select * into strict profile from public.profiles where id = report.tester_id for update;
  select * into strict ledger from playtested_studios.launches l where l.campaign_id = campaign.id;

  if report.playtest_id is distinct from campaign.id
    or report.tester_id is distinct from campaign.developer_id
    or report.status is distinct from 'reviewed'
    or report.review_outcome is distinct from 'accepted'
    or report.overall_score is distinct from 10
    or report.base_xp_amount is distinct from 40
    or report.xp_awarded is distinct from true
    or profile.tester_xp is distinct from 140 or profile.completed_tests is distinct from 3
    or campaign.submission_id is distinct from '6ce56e5e-e2fb-4562-a859-3f751d3b1eba'::uuid
    or campaign.status is distinct from 'closed' or campaign.target_testers is distinct from 1
    or campaign.audience is distinct from 'both'
    or campaign.published_at is distinct from '2026-11-20 02:07:35.154736+00'::timestamptz
    or campaign.completed_at is distinct from '2026-11-20 07:36:56.995163+00'::timestamptz
    or campaign.tester_hub_started_at is distinct from ledger.launched_at
    or (select count(*) from public.community_game_tests t where t.playtest_id = campaign.id) <> 1
    or (select count(*) from public.test_review_events e where e.test_id = report.id) <> 1
    or not exists (select 1 from public.test_review_events e where e.test_id = report.id
      and e.kind = 'accepted' and e.xp_delta = 40 and e.actual_xp_award = 40)
    or (select count(*) from pg_trigger t where t.tgrelid = 'public.community_playtests'::regclass
      and t.tgname in ('playtested_guard_launch', 'm26_capacity_availability', 'notify_playtest_available')
      and t.tgenabled = 'O') <> 3 then
    raise exception 'MoxRiding correction baseline changed. Stop and reconcile before retrying.';
  end if;

  insert into playtested_studios.independence_corrections
    (test_id, campaign_id, previous_completion, reason, xp_reversed, completed_tests_reversed)
  values (report.id, campaign.id, campaign.completed_at, 'Self-testing / non-independent feedback', 40, 1);
  update public.profiles p set tester_xp = p.tester_xp - 40, completed_tests = p.completed_tests - 1
  where p.id = report.tester_id;

  alter table public.community_playtests disable trigger playtested_guard_launch;
  alter table public.community_playtests disable trigger m26_capacity_availability;
  alter table public.community_playtests disable trigger notify_playtest_available;
  update public.community_playtests set status = 'open', completed_at = null
  where id = campaign.id returning * into strict reopened;
  alter table public.community_playtests enable trigger notify_playtest_available;
  alter table public.community_playtests enable trigger m26_capacity_availability;
  alter table public.community_playtests enable trigger playtested_guard_launch;

  if reopened.status is distinct from 'open' or reopened.completed_at is not null
    or (to_jsonb(reopened) - 'status' - 'completed_at') is distinct from
       (to_jsonb(campaign) - 'status' - 'completed_at')
    or (select to_jsonb(l) from playtested_studios.launches l where l.campaign_id = campaign.id)
       is distinct from to_jsonb(ledger)
    or (select available from public.campaign_places(campaign.id)) is distinct from 1 then
    raise exception 'MoxRiding reopen changed campaign settings, launch history or capacity.';
  end if;
end;
$$;

commit;

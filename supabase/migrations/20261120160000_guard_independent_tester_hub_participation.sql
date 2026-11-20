begin;

create function playtested_studios.has_test_conflict(
  p_campaign public.community_playtests,
  p_submission uuid,
  p_tester uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  with game as (
    select playtested_studios.identity(
      p_campaign.imported_game_id,
      p_campaign.approved_game_id,
      coalesce(p_campaign.submission_id, p_submission)
    ) as key
  )
  select coalesce(p_campaign.developer_id = p_tester, false)
    or exists (
      select 1 from public.game_submissions s cross join game
      where s.developer_id = p_tester
        and (s.id = p_submission or s.id = p_campaign.submission_id
          or playtested_studios.identity(null, null, s.id) = game.key)
    )
    or exists (
      select 1 from public.game_developer_links l cross join game
      where l.developer_id = p_tester
        and playtested_studios.identity(l.imported_game_id, l.approved_game_id, l.submission_id) = game.key
    )
    or exists (
      select 1 from playtested_studios.games g
      join playtested_studios.studios s on s.id = g.studio_id
      cross join game
      where g.allowance_key = game.key
        and (s.owner_id = p_tester or exists (
          select 1 from playtested_studios.members m
          where m.studio_id = s.id and m.user_id = p_tester
        ))
    );
$$;

create function playtested_studios.guard_independent_test() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  campaign public.community_playtests;
begin
  if new.status not in ('claimed', 'in_progress', 'submitted')
    and new.review_outcome is distinct from 'accepted' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status
      and new.review_outcome is not distinct from old.review_outcome
      and new.tester_id is not distinct from old.tester_id
      and new.playtest_id is not distinct from old.playtest_id
      and new.submission_id is not distinct from old.submission_id
      and new.legacy_submission_id is not distinct from old.legacy_submission_id
      and new.reservation_round is not distinct from old.reservation_round
      and new.reviewed_at is not distinct from old.reviewed_at then
      return new;
    end if;
  end if;

  select * into campaign from public.community_playtests where id = new.playtest_id;
  if playtested_studios.has_test_conflict(
    campaign, coalesce(new.submission_id, new.legacy_submission_id), new.tester_id
  ) then
    raise exception 'Independent testing is unavailable for this account and game.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function playtested_studios.has_test_conflict(public.community_playtests, uuid, uuid),
  playtested_studios.guard_independent_test() from public, anon, authenticated, service_role;

-- Runs after reservation validation so same-status reclaims have an updated round.
create trigger zz_independent_tester_hub_participation
before insert or update on public.community_game_tests
for each row execute function playtested_studios.guard_independent_test();

-- Read models and notifications already share this eligibility predicate.
do $$
declare
  definition text := pg_get_functiondef('public.campaign_eligible(uuid,uuid)'::regprocedure);
  guarded text;
begin
  guarded := replace(definition, 'and c.id=p_id and', 'and c.id=p_id
     and not playtested_studios.has_test_conflict(c, c.submission_id, p_user) and');
  if guarded = definition then
    raise exception 'Tester Hub eligibility contract changed.';
  end if;
  execute guarded;

  definition := pg_get_functiondef('public.claim_community_game_test(uuid)'::regprocedure);
  guarded := replace(definition, 'perform public._assert_feedback_game_retry(p_submission_id,auth.uid());',
    $check$if exists (
      select 1 from public.community_playtests c where c.id = p_submission_id
        and playtested_studios.has_test_conflict(c, c.submission_id, auth.uid())
    ) then
      raise exception 'Independent testing is unavailable for this account and game.' using errcode = '42501';
    end if;
    perform public._assert_feedback_game_retry(p_submission_id,auth.uid());$check$);
  if guarded = definition then
    raise exception 'Tester Hub claim contract changed.';
  end if;
  execute guarded;
end;
$$;

commit;

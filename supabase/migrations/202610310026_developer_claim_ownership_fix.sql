begin;

-- game_developer_links is the canonical CURRENT developer relationship.
-- Historical claim decisions remain in game_claims.
create unique index if not exists game_developer_links_one_imported_owner
  on public.game_developer_links (imported_game_id)
  where imported_game_id is not null;

create unique index if not exists game_developer_links_one_approved_owner
  on public.game_developer_links (approved_game_id)
  where approved_game_id is not null;

create unique index if not exists game_developer_links_one_submission_owner
  on public.game_developer_links (submission_id)
  where submission_id is not null;

create or replace function public.review_game_claim(
  p_claim_id uuid,
  p_status text,
  p_admin_notes text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_admin_id uuid;
  v_claim public.game_claims%rowtype;
  v_award_id uuid;
  v_removed_xp integer;
  v_scope text;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if p_status not in (
    'Pending',
    'Approved',
    'Rejected',
    'Needs More Information'
  ) then
    raise exception 'Invalid claim status';
  end if;

  if p_status in ('Rejected', 'Needs More Information')
     and nullif(trim(coalesce(p_admin_notes, '')), '') is null then
    raise exception 'Admin notes are required for this decision';
  end if;

  select *
  into v_claim
  from public.game_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if num_nonnulls(
    v_claim.imported_game_id,
    v_claim.approved_game_id,
    v_claim.submission_id
  ) <> 1 then
    raise exception 'Developer claim does not identify exactly one game';
  end if;

  v_scope := case
    when v_claim.imported_game_id is not null
      then 'imported:' || v_claim.imported_game_id::text
    when v_claim.approved_game_id is not null
      then 'approved:' || v_claim.approved_game_id::text
    else 'submission:' || v_claim.submission_id::text
  end;

  -- Serialize decisions for the same game. A competing Pending claim does not
  -- disturb the current owner; only an Approved admin decision transfers it.
  perform pg_advisory_xact_lock(
    hashtextextended('playtested:ownership:' || v_scope, 0)
  );

  if p_status = 'Approved' then
    -- Remove the one current relationship for this game, regardless of which
    -- developer owns it, then create the relationship for this approved claim.
    delete from public.game_developer_links l
    where (v_claim.imported_game_id is not null
           and l.imported_game_id = v_claim.imported_game_id)
       or (v_claim.approved_game_id is not null
           and l.approved_game_id = v_claim.approved_game_id)
       or (v_claim.submission_id is not null
           and l.submission_id = v_claim.submission_id);

    insert into public.game_developer_links (
      developer_id,
      imported_game_id,
      approved_game_id,
      submission_id,
      relationship,
      source_claim_id
    )
    values (
      v_claim.claimant_id,
      v_claim.imported_game_id,
      v_claim.approved_game_id,
      v_claim.submission_id,
      v_claim.relationship,
      v_claim.id
    );

    -- Preserve the existing +100 Developer XP behaviour. The unique award key
    -- makes re-approving the same claim idempotent.
    if v_claim.status <> 'Approved' then
      insert into public.developer_xp_awards (
        developer_id,
        xp_amount,
        award_type,
        source_type,
        source_id,
        description
      )
      values (
        v_claim.claimant_id,
        100,
        'approved_game_claim',
        'game_claim',
        v_claim.id,
        'Approved developer game claim'
      )
      on conflict (
        developer_id,
        award_type,
        source_type,
        source_id
      )
      do nothing
      returning id into v_award_id;

      if v_award_id is not null then
        update public.profiles
        set developer_xp = developer_xp + 100
        where id = v_claim.claimant_id;

        if not found then
          raise exception 'Developer profile not found';
        end if;
      end if;
    end if;
  end if;

  -- Reversing an approved claim removes the relationship only when that claim
  -- is still the source of the current relationship. A historical superseded
  -- claim therefore cannot remove a newer owner's relationship.
  if v_claim.status = 'Approved'
     and p_status <> 'Approved' then

    delete from public.game_developer_links
    where source_claim_id = v_claim.id;

    delete from public.developer_xp_awards
    where developer_id = v_claim.claimant_id
      and award_type = 'approved_game_claim'
      and source_type = 'game_claim'
      and source_id = v_claim.id
    returning xp_amount into v_removed_xp;

    if v_removed_xp is not null then
      update public.profiles
      set developer_xp = greatest(0, developer_xp - v_removed_xp)
      where id = v_claim.claimant_id;

      if not found then
        raise exception 'Developer profile not found';
      end if;
    end if;
  end if;

  update public.game_claims
  set
    status = p_status,
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    reviewed_at = case
      when p_status in ('Approved', 'Rejected') then now()
      else null
    end,
    reviewed_by = case
      when p_status in ('Approved', 'Rejected') then v_admin_id
      else null
    end
  where id = p_claim_id;
end;
$$;

revoke all on function public.review_game_claim(uuid, text, text)
from public, anon;
grant execute on function public.review_game_claim(uuid, text, text)
to authenticated;

-- New claims must point at one real canonical game. Imported Steam targets must
-- already be catalogue eligible. This prevents an incomplete/discovered Steam
-- row from becoming newly claimable merely because it exists in imported_games.
-- Existing historical claims (including Pawntopia) are not changed.
alter policy "Developers can create their own claims"
on public.game_claims
with check (
  claimant_id = auth.uid()
  and status = 'Pending'
  and admin_notes is null
  and reviewed_at is null
  and reviewed_by is null
  and coalesce(verification_status, 'Not Submitted') = 'Not Submitted'
  and num_nonnulls(imported_game_id, approved_game_id, submission_id) = 1
  and (
    (
      imported_game_id is not null
      and exists (
        select 1
        from public.imported_games ig
        where ig.id = imported_game_id
          and ig.catalogue_eligible = true
      )
    )
    or (
      approved_game_id is not null
      and exists (
        select 1
        from public.approved_games ag
        where ag.id = approved_game_id
      )
    )
    or (
      submission_id is not null
      and exists (
        select 1
        from public.game_submissions s
        where s.id = submission_id
      )
    )
  )
);

-- Deliberately do NOT loosen get_public_catalogue here. The existing catalogue
-- already promotes complete imported games that have game_developer_links.
-- Developer ownership must not bypass metadata_backfill_status='complete' or
-- the required developer/genre/image metadata quality gate. Pawntopia remains
-- owned but hidden until its Steam metadata is processed successfully.

commit;

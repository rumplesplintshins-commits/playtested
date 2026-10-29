begin;
-- Preserve existing rows and admin UPDATE policies; constrain future owner inserts.
alter policy "Developers can create their own claims"
on public.game_claims
with check (
  claimant_id = auth.uid()
  and status = 'Pending'
  and admin_notes is null
  and reviewed_at is null
  and reviewed_by is null
  and coalesce(verification_status, 'Not Submitted') = 'Not Submitted'
);
commit;

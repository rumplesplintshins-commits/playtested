begin;
-- Prevent duplicate pending claims for the same claimant and game target.
--
-- PostgreSQL treats NULL values as distinct, so a single composite unique index
-- on (claimant_id, imported_game_id, approved_game_id, submission_id) would NOT
-- enforce uniqueness: two rows with the same non-null game target and NULL in
-- the other two target columns would be considered different.
--
-- Instead, one partial unique index per target type. Each WHERE clause excludes
-- NULL target values, so no two indexed rows share NULL in the same indexed
-- column. The existing claim gate (num_nonnulls(imported_game_id,
-- approved_game_id, submission_id) = 1) guarantees exactly one target column
-- is non-null per row, so every pending claim is covered by exactly one index.
--
-- These indexes operate at insert time and are complementary to migration
-- 026's pg_advisory_xact_lock, which serializes admin review decisions for the
-- same game. No interaction or deadlock risk: the lock covers review-time
-- ownership transfer, these indexes cover claim-creation uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS game_claims_one_pending_imported_per_claimant
ON public.game_claims (claimant_id, imported_game_id)
WHERE status = 'Pending' AND imported_game_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_claims_one_pending_approved_per_claimant
ON public.game_claims (claimant_id, approved_game_id)
WHERE status = 'Pending' AND approved_game_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_claims_one_pending_submission_per_claimant
ON public.game_claims (claimant_id, submission_id)
WHERE status = 'Pending' AND submission_id IS NOT NULL;
commit;
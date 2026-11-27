-- Retain failed-payment ledgers until their Checkout Session is known unpayable.
-- Immutable request details let retries replay the same Stripe idempotency key.
BEGIN;

ALTER TABLE playtested_studios.tester_tips
  DROP CONSTRAINT IF EXISTS tester_tips_status_check;
ALTER TABLE playtested_studios.tester_tips
  ADD CONSTRAINT tester_tips_status_check
  CHECK (status IN ('pending','checkout_created','payment_failed','paid','failed','expired','refunded','partially_refunded','disputed'));

ALTER TABLE playtested_studios.tester_tips
  ADD COLUMN IF NOT EXISTS stripe_checkout_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_checkout_success_url text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_cancel_url text,
  ADD COLUMN IF NOT EXISTS checkout_recovery_version boolean NOT NULL DEFAULT false;
ALTER TABLE playtested_studios.tester_tips
  ALTER COLUMN checkout_recovery_version SET DEFAULT true;

-- Rows failed by the old webhook may still have an open Session. Keep those
-- locked. Legacy no-ID failures are released only after Stripe's default
-- 24-hour Checkout lifetime plus a one-hour clock/request safety margin.
-- Preflight before changing status so the prior partial index cannot emit a
-- generic duplicate-key error before the actionable migration check runs.
DO $legacy_preflight$
DECLARE v_test_id uuid;
BEGIN
  SELECT test_id INTO v_test_id
  FROM playtested_studios.tester_tips
  WHERE status NOT IN ('failed','expired')
     OR (status='failed' AND (paid_at IS NOT NULL OR stripe_checkout_session_id IS NOT NULL
         OR created_at > clock_timestamp() - interval '25 hours'))
  GROUP BY test_id HAVING count(*) > 1 LIMIT 1;
  IF v_test_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot recover tester tip checkout for feedback %: multiple rows would remain payable. Reconcile these rows before retrying this migration.', v_test_id;
  END IF;

  SELECT test_id INTO v_test_id
  FROM playtested_studios.tester_tips
  WHERE paid_at IS NOT NULL
  GROUP BY test_id HAVING count(*) > 1 LIMIT 1;
  IF v_test_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot install tester tip paid uniqueness for feedback %: multiple paid rows exist. Reconcile these rows before retrying this migration.', v_test_id;
  END IF;
END;
$legacy_preflight$;

UPDATE playtested_studios.tester_tips
SET status = CASE
      WHEN paid_at IS NOT NULL AND refunded_amount_pence >= total_amount_pence THEN 'refunded'
      WHEN paid_at IS NOT NULL AND refunded_amount_pence > 0 THEN 'partially_refunded'
      WHEN paid_at IS NOT NULL THEN 'paid'
      WHEN stripe_checkout_session_id IS NOT NULL OR created_at > clock_timestamp() - interval '25 hours'
        THEN 'payment_failed'
      ELSE 'expired'
    END,
    updated_at = clock_timestamp()
WHERE status = 'failed';

DO $preflight$
DECLARE v_test_id uuid;
BEGIN
  SELECT test_id INTO v_test_id
  FROM playtested_studios.tester_tips
  WHERE status NOT IN ('failed','expired')
  GROUP BY test_id HAVING count(*) > 1 LIMIT 1;
  IF v_test_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot install tester tip checkout recovery: feedback % has multiple unresolved tip rows. Reconcile these rows before retrying.', v_test_id;
  END IF;

  SELECT test_id INTO v_test_id
  FROM playtested_studios.tester_tips
  WHERE paid_at IS NOT NULL
  GROUP BY test_id HAVING count(*) > 1 LIMIT 1;
  IF v_test_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot install tester tip paid uniqueness: feedback % has multiple paid tip rows. Reconcile these rows before retrying.', v_test_id;
  END IF;
END;
$preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS tester_tips_one_active_per_feedback_idx
  ON playtested_studios.tester_tips(test_id)
  WHERE status NOT IN ('failed','expired');
CREATE UNIQUE INDEX IF NOT EXISTS tester_tips_one_paid_per_feedback_idx
  ON playtested_studios.tester_tips(test_id)
  WHERE paid_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tester_tip_get_checkout_recovery(p_test_id uuid,p_developer_id uuid)
RETURNS TABLE(
  id uuid,tip_amount_pence integer,platform_fee_pence integer,total_amount_pence integer,
  status text,stripe_connected_account_id text,stripe_checkout_session_id text,
  stripe_checkout_expires_at timestamptz,stripe_checkout_success_url text,stripe_checkout_cancel_url text,
  created_at timestamptz,checkout_recovery_version boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT t.id,t.tip_amount_pence,t.platform_fee_pence,t.total_amount_pence,t.status,
    t.stripe_connected_account_id,t.stripe_checkout_session_id,t.stripe_checkout_expires_at,
    t.stripe_checkout_success_url,t.stripe_checkout_cancel_url,t.created_at,t.checkout_recovery_version
  FROM playtested_studios.tester_tips t
  WHERE t.test_id=p_test_id AND t.developer_id=p_developer_id
    AND t.status NOT IN ('failed','expired')
  ORDER BY t.created_at DESC LIMIT 1;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_prepare_checkout(
  p_tip_id uuid,p_stripe_account_id text,p_expires_at timestamptz,p_success_url text,p_cancel_url text
) RETURNS TABLE(
  stripe_checkout_expires_at timestamptz,stripe_checkout_success_url text,stripe_checkout_cancel_url text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$'
     OR p_expires_at IS NULL OR p_success_url IS NULL OR p_cancel_url IS NULL THEN
    RAISE EXCEPTION 'Invalid Checkout recovery parameters.';
  END IF;
  UPDATE playtested_studios.tester_tips t
  SET stripe_connected_account_id=coalesce(t.stripe_connected_account_id,p_stripe_account_id),
      stripe_checkout_expires_at=coalesce(t.stripe_checkout_expires_at,p_expires_at),
      stripe_checkout_success_url=coalesce(t.stripe_checkout_success_url,p_success_url),
      stripe_checkout_cancel_url=coalesce(t.stripe_checkout_cancel_url,p_cancel_url),
      checkout_recovery_version=true,
      updated_at=clock_timestamp()
  WHERE t.id=p_tip_id AND t.status IN ('pending','checkout_created','payment_failed')
    AND (t.stripe_connected_account_id IS NULL OR t.stripe_connected_account_id=p_stripe_account_id)
    AND (t.stripe_checkout_expires_at IS NOT NULL OR p_expires_at > clock_timestamp() + interval '30 minutes')
    AND (t.stripe_checkout_expires_at IS NULL OR t.stripe_checkout_expires_at > clock_timestamp());
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip cannot be recovered or its Checkout Session has expired.'; END IF;
  RETURN QUERY SELECT t.stripe_checkout_expires_at,t.stripe_checkout_success_url,t.stripe_checkout_cancel_url
    FROM playtested_studios.tester_tips t WHERE t.id=p_tip_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_no_session_expired(p_tip_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  UPDATE playtested_studios.tester_tips
  SET status='expired',updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created','payment_failed')
    AND stripe_checkout_session_id IS NULL
    AND coalesce(stripe_checkout_expires_at,created_at + interval '25 hours')
      < clock_timestamp() - interval '5 minutes';
  IF NOT FOUND THEN RAISE EXCEPTION 'No-session Checkout is not safely expired yet.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_update_checkout(p_tip_id uuid,p_session_id text,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_status <> 'checkout_created' OR p_session_id IS NULL OR p_session_id !~ '^cs_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid Checkout Session details.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET stripe_checkout_session_id=coalesce(stripe_checkout_session_id,p_session_id),
      status=CASE WHEN status='payment_failed' THEN status ELSE 'checkout_created' END,
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created','payment_failed')
    AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id=p_session_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip is no longer available for checkout.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_set_charge_details(p_tip_id uuid,p_stripe_account_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid connected account charge details.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET stripe_connected_account_id=coalesce(stripe_connected_account_id,p_stripe_account_id),
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created','payment_failed')
    AND (stripe_connected_account_id IS NULL OR stripe_connected_account_id=p_stripe_account_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip is unavailable or belongs to another connected account.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_expired(
  p_tip_id uuid,p_session_id text,p_connected_account_id text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^cs_[A-Za-z0-9_]+$'
     OR p_connected_account_id IS NULL OR p_connected_account_id !~ '^acct_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid expired Checkout Session details.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET status='expired',stripe_checkout_session_id=coalesce(stripe_checkout_session_id,p_session_id),
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created','payment_failed')
    AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id=p_session_id)
    AND stripe_connected_account_id=p_connected_account_id;
  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM playtested_studios.tester_tips
    WHERE id=p_tip_id AND status IN ('expired','paid','refunded','partially_refunded','disputed')
      AND stripe_checkout_session_id=p_session_id AND stripe_connected_account_id=p_connected_account_id
  ) THEN RAISE EXCEPTION 'Checkout Session does not match this tip.'; END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.tester_tip_mark_expired(uuid) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.tester_tip_mark_expired(uuid);

CREATE OR REPLACE FUNCTION public.tester_tip_mark_failed(p_tip_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $fn$
  UPDATE playtested_studios.tester_tips
  SET status='payment_failed',updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created','payment_failed');
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_unpayable(p_tip_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  UPDATE playtested_studios.tester_tips
  SET status='failed',updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','payment_failed') AND stripe_checkout_session_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip may have a payable Checkout Session and cannot be released.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_list_open_tester_tip_checkouts()
RETURNS TABLE(tip_id uuid,checkout_session_id text,connected_account_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT t.id,t.stripe_checkout_session_id,t.stripe_connected_account_id
  FROM playtested_studios.tester_tips t
  WHERE t.status IN ('checkout_created','payment_failed')
    AND t.stripe_checkout_session_id IS NOT NULL AND t.stripe_connected_account_id IS NOT NULL
  ORDER BY t.created_at,t.id;
$fn$;

-- Developers may poll the unresolved state; ownership remains checked here,
-- and paid/refunded history continues to be returned as before.
CREATE OR REPLACE FUNCTION public.get_developer_tester_tip(p_test_id uuid)
RETURNS TABLE(status text,tip_amount_pence integer,paid_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.community_game_tests t
    JOIN public.community_playtests c ON c.id=t.playtest_id
    WHERE t.id=p_test_id AND c.developer_id=auth.uid()
  ) THEN RAISE EXCEPTION 'Developer access required.'; END IF;

  RETURN QUERY
  SELECT t.status,t.tip_amount_pence,t.paid_at
  FROM playtested_studios.tester_tips t
  WHERE t.test_id=p_test_id AND t.developer_id=auth.uid()
    AND (t.status IN ('pending','checkout_created','payment_failed') OR t.paid_at IS NOT NULL)
  ORDER BY t.created_at DESC LIMIT 1;
END;
$fn$;

REVOKE ALL ON FUNCTION public.tester_tip_get_checkout_recovery(uuid,uuid),
  public.tester_tip_prepare_checkout(uuid,text,timestamptz,text,text),
  public.tester_tip_mark_no_session_expired(uuid),
  public.tester_tip_update_checkout(uuid,text,text),public.tester_tip_set_charge_details(uuid,text),
  public.tester_tip_mark_expired(uuid,text,text),public.tester_tip_mark_failed(uuid),
  public.tester_tip_mark_unpayable(uuid),public.admin_list_open_tester_tip_checkouts(),
  public.get_developer_tester_tip(uuid)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tester_tip_get_checkout_recovery(uuid,uuid),
  public.tester_tip_prepare_checkout(uuid,text,timestamptz,text,text),
  public.tester_tip_mark_no_session_expired(uuid),
  public.tester_tip_update_checkout(uuid,text,text),public.tester_tip_set_charge_details(uuid,text),
  public.tester_tip_mark_expired(uuid,text,text),public.tester_tip_mark_failed(uuid),
  public.tester_tip_mark_unpayable(uuid),public.admin_list_open_tester_tip_checkouts()
TO service_role;
GRANT EXECUTE ON FUNCTION public.get_developer_tester_tip(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;

-- Harden tester tip Stripe event reconciliation against conflicting IDs and out-of-order events.
BEGIN;

-- A Stripe charge can belong to only one tester-tip ledger entry.
CREATE UNIQUE INDEX IF NOT EXISTS tester_tips_stripe_charge_id_uidx
  ON playtested_studios.tester_tips(stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_paid(
  p_tip_id uuid,
  p_session_id text,
  p_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_tip_id IS NULL
     OR p_session_id IS NULL OR p_session_id !~ '^cs_[A-Za-z0-9_]+$'
     OR p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid Stripe checkout payment identifiers.';
  END IF;

  UPDATE playtested_studios.tester_tips
  SET status = CASE
        WHEN status IN ('refunded','partially_refunded','disputed') THEN status
        ELSE 'paid'
      END,
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_session_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      paid_at = coalesce(paid_at, clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND status IN ('pending','checkout_created','failed','expired','paid','refunded','partially_refunded','disputed')
    AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id = p_session_id)
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = p_payment_intent_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tip not found or Stripe checkout/payment identifiers conflict.';
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_refund(
  p_tip_id uuid,
  p_payment_intent_id text,
  p_charge_id text,
  p_refunded_amount_pence integer,
  p_charge_amount_pence integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_tip_id IS NULL
     OR p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
     OR p_charge_id IS NULL OR p_charge_id !~ '^ch_[A-Za-z0-9_]+$'
     OR p_refunded_amount_pence IS NULL OR p_refunded_amount_pence <= 0
     OR p_charge_amount_pence IS NULL OR p_charge_amount_pence <= 0
     OR p_refunded_amount_pence > p_charge_amount_pence THEN
    RAISE EXCEPTION 'Invalid Stripe refund details.';
  END IF;

  UPDATE playtested_studios.tester_tips
  SET status = CASE
        WHEN status = 'disputed' THEN 'disputed'
        WHEN p_refunded_amount_pence >= p_charge_amount_pence THEN 'refunded'
        ELSE 'partially_refunded'
      END,
      refunded_amount_pence = p_refunded_amount_pence,
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      stripe_charge_id = coalesce(stripe_charge_id, p_charge_id),
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND total_amount_pence = p_charge_amount_pence
    AND p_refunded_amount_pence >= refunded_amount_pence
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = p_payment_intent_id)
    AND (stripe_charge_id IS NULL OR stripe_charge_id = p_charge_id)
    AND status IN ('pending','checkout_created','failed','expired','paid','partially_refunded','refunded','disputed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tip not found or Stripe refund identifiers/amount conflict.';
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_disputed(
  p_tip_id uuid,
  p_payment_intent_id text,
  p_charge_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_tip_id IS NULL
     OR p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
     OR p_charge_id IS NULL OR p_charge_id !~ '^ch_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid Stripe dispute details.';
  END IF;

  UPDATE playtested_studios.tester_tips
  SET status = CASE WHEN status = 'refunded' THEN 'refunded' ELSE 'disputed' END,
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      stripe_charge_id = coalesce(stripe_charge_id, p_charge_id),
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = p_payment_intent_id)
    AND (stripe_charge_id IS NULL OR stripe_charge_id = p_charge_id)
    AND status IN ('pending','checkout_created','failed','expired','paid','partially_refunded','refunded','disputed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tip not found or Stripe dispute identifiers conflict.';
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.tester_tip_mark_paid(uuid,text,text),
  public.tester_tip_mark_refund(uuid,text,text,integer,integer),
  public.tester_tip_mark_disputed(uuid,text,text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.tester_tip_mark_paid(uuid,text,text),
  public.tester_tip_mark_refund(uuid,text,text,integer,integer),
  public.tester_tip_mark_disputed(uuid,text,text)
TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

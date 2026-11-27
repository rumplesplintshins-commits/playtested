BEGIN;

DROP FUNCTION IF EXISTS public.tester_tip_record_processing_fee_refund(uuid,integer,integer,text);

CREATE FUNCTION public.tester_tip_record_processing_fee_refund(
  p_tip_id uuid,
  p_charge_id text,
  p_actual_processing_fee_pence integer,
  p_refund_pence integer,
  p_refund_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_charge_id IS NULL OR p_charge_id !~ '^ch_[A-Za-z0-9]+$'
     OR p_actual_processing_fee_pence IS NULL OR p_actual_processing_fee_pence < 0
     OR p_refund_pence IS NULL OR p_refund_pence < 0
     OR p_refund_pence > p_actual_processing_fee_pence
     OR p_refund_pence > 0 AND (p_refund_id IS NULL OR p_refund_id !~ '^fr_[A-Za-z0-9]+$')
     OR p_refund_pence = 0 AND p_refund_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid processing fee reconciliation.';
  END IF;

  UPDATE playtested_studios.tester_tips
  SET stripe_charge_id = coalesce(stripe_charge_id, p_charge_id),
      actual_processing_fee_pence = p_actual_processing_fee_pence,
      stripe_processing_fee_refund_pence = p_refund_pence,
      stripe_application_fee_refund_id = p_refund_id,
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND (stripe_charge_id IS NULL OR stripe_charge_id = p_charge_id)
    AND p_refund_pence <= platform_fee_pence;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tip not found, charge ID conflicts, or processing fee exceeds the platform fee.';
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.tester_tip_record_processing_fee_refund(uuid,text,integer,integer,text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.tester_tip_record_processing_fee_refund(uuid,text,integer,integer,text)
TO service_role;

COMMIT;

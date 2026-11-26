-- Stripe-managed Accounts v2 Merchant accounts and fee reconciliation for tester tips.
-- Additive only: preserve legacy Recipient mappings and tip ledger history.
BEGIN;

ALTER TABLE playtested_studios.tester_stripe_accounts
  ALTER COLUMN stripe_account_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS merchant_stripe_account_id text,
  ADD COLUMN IF NOT EXISTS merchant_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS merchant_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS merchant_requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS merchant_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS merchant_updated_at timestamptz;

ALTER TABLE playtested_studios.tester_stripe_accounts
  DROP CONSTRAINT IF EXISTS tester_stripe_accounts_merchant_status_check;
ALTER TABLE playtested_studios.tester_stripe_accounts
  ADD CONSTRAINT tester_stripe_accounts_merchant_status_check
  CHECK (merchant_status IN ('not_started','pending','active','restricted','disabled'));

ALTER TABLE playtested_studios.tester_stripe_accounts
  DROP CONSTRAINT IF EXISTS tester_stripe_accounts_merchant_account_id_check;
ALTER TABLE playtested_studios.tester_stripe_accounts
  ADD CONSTRAINT tester_stripe_accounts_merchant_account_id_check
  CHECK (merchant_stripe_account_id IS NULL OR merchant_stripe_account_id ~ '^acct_[A-Za-z0-9]+$');

CREATE UNIQUE INDEX IF NOT EXISTS tester_stripe_accounts_merchant_account_id_uidx
  ON playtested_studios.tester_stripe_accounts(merchant_stripe_account_id)
  WHERE merchant_stripe_account_id IS NOT NULL;

ALTER TABLE playtested_studios.tester_tips
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id text,
  ADD COLUMN IF NOT EXISTS actual_processing_fee_pence integer,
  ADD COLUMN IF NOT EXISTS stripe_processing_fee_refund_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_refund_id text;

CREATE OR REPLACE FUNCTION public.tester_tip_get_merchant_account(p_tester_id uuid)
RETURNS TABLE(merchant_stripe_account_id text,merchant_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT a.merchant_stripe_account_id,a.merchant_status
  FROM playtested_studios.tester_stripe_accounts a
  WHERE a.tester_id=p_tester_id;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_save_merchant_account(p_tester_id uuid,p_stripe_account_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_tester_id IS NULL OR p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid Stripe Merchant account mapping.';
  END IF;
  INSERT INTO playtested_studios.tester_stripe_accounts(
    tester_id,merchant_stripe_account_id,merchant_status,merchant_created_at,merchant_updated_at
  ) VALUES(p_tester_id,p_stripe_account_id,'pending',clock_timestamp(),clock_timestamp())
  ON CONFLICT(tester_id) DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM playtested_studios.tester_stripe_accounts
    WHERE tester_id=p_tester_id AND merchant_stripe_account_id=p_stripe_account_id
  ) THEN
    RAISE EXCEPTION 'A different Stripe Merchant account is already linked.';
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_update_merchant_account_status(
  p_tester_id uuid,p_status text,p_details_submitted boolean,p_requirements_due jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_status NOT IN ('pending','active','restricted','disabled') THEN
    RAISE EXCEPTION 'Invalid Stripe Merchant status.';
  END IF;
  UPDATE playtested_studios.tester_stripe_accounts
  SET merchant_status=p_status,
      merchant_details_submitted=coalesce(p_details_submitted,false),
      merchant_requirements_due=coalesce(p_requirements_due,'[]'::jsonb),
      merchant_updated_at=clock_timestamp()
  WHERE tester_id=p_tester_id AND merchant_stripe_account_id IS NOT NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_set_charge_details(
  p_tip_id uuid,p_stripe_account_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid connected account charge details.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET stripe_connected_account_id=p_stripe_account_id,
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created');
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip is no longer available for checkout.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_record_processing_fee_refund(
  p_tip_id uuid,p_actual_processing_fee_pence integer,p_refund_pence integer,p_refund_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_actual_processing_fee_pence IS NULL OR p_actual_processing_fee_pence < 0
     OR p_refund_pence IS NULL OR p_refund_pence < 0
     OR p_refund_pence > p_actual_processing_fee_pence
     OR (p_refund_pence > 0 AND (p_refund_id IS NULL OR p_refund_id !~ '^fr_[A-Za-z0-9]+
  public.tester_tip_save_merchant_account(uuid,text),
  public.tester_tip_update_merchant_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_set_charge_details(uuid,text),
  public.tester_tip_record_processing_fee_refund(uuid,integer,integer,text)
FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.tester_tip_get_merchant_account(uuid),
  public.tester_tip_save_merchant_account(uuid,text),
  public.tester_tip_update_merchant_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_set_charge_details(uuid,text),
  public.tester_tip_record_processing_fee_refund(uuid,integer,integer,text)
TO service_role;

COMMIT;
)) THEN
    RAISE EXCEPTION 'Invalid processing fee reconciliation.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET actual_processing_fee_pence=p_actual_processing_fee_pence,
      stripe_processing_fee_refund_pence=p_refund_pence,
      stripe_application_fee_refund_id=p_refund_id,
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND p_refund_pence <= platform_fee_pence;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip not found or processing fee exceeds the platform fee.'; END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.tester_tip_get_merchant_account(uuid),
  public.tester_tip_save_merchant_account(uuid,text),
  public.tester_tip_update_merchant_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_set_charge_details(uuid,text)
FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.tester_tip_get_merchant_account(uuid),
  public.tester_tip_save_merchant_account(uuid,text),
  public.tester_tip_update_merchant_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_set_charge_details(uuid,text)
TO service_role;

COMMIT;

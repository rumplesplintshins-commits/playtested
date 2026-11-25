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
  ADD COLUMN IF NOT EXISTS charge_amount_pence integer,
  ADD COLUMN IF NOT EXISTS processing_allowance_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_processing_fee_pence integer,
  ADD COLUMN IF NOT EXISTS processing_refund_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_refund_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS stripe_processing_refund_id text;

ALTER TABLE playtested_studios.tester_tips
  DROP CONSTRAINT IF EXISTS tester_tips_charge_amount_check;
ALTER TABLE playtested_studios.tester_tips
  ADD CONSTRAINT tester_tips_charge_amount_check
  CHECK (charge_amount_pence IS NULL OR charge_amount_pence >= total_amount_pence);

ALTER TABLE playtested_studios.tester_tips
  DROP CONSTRAINT IF EXISTS tester_tips_processing_refund_status_check;
ALTER TABLE playtested_studios.tester_tips
  ADD CONSTRAINT tester_tips_processing_refund_status_check
  CHECK (processing_refund_status IN ('not_started','processing','completed','failed'));

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
  p_tip_id uuid,p_stripe_account_id text,p_charge_amount_pence integer,p_processing_allowance_pence integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$'
     OR p_charge_amount_pence < 1 OR p_processing_allowance_pence < 0
     OR p_charge_amount_pence < p_processing_allowance_pence THEN
    RAISE EXCEPTION 'Invalid connected account charge details.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET stripe_connected_account_id=p_stripe_account_id,
      charge_amount_pence=p_charge_amount_pence,
      processing_allowance_pence=p_processing_allowance_pence,
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created');
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip is no longer available for checkout.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_prepare_processing_refund(
  p_tip_id uuid,p_actual_fee_pence integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_allowance integer;
  v_status text;
  v_refund integer;
BEGIN
  IF p_actual_fee_pence IS NULL OR p_actual_fee_pence < 0 THEN
    RAISE EXCEPTION 'Invalid actual processing fee.';
  END IF;
  SELECT processing_allowance_pence,processing_refund_status
    INTO v_allowance,v_status
  FROM playtested_studios.tester_tips WHERE id=p_tip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip not found.'; END IF;
  IF v_status='completed' THEN RETURN 0; END IF;
  v_refund := greatest(0,v_allowance-p_actual_fee_pence);
  UPDATE playtested_studios.tester_tips
  SET actual_processing_fee_pence=p_actual_fee_pence,
      processing_refund_pence=v_refund,
      processing_refund_status=CASE WHEN v_refund=0 THEN 'completed' ELSE 'processing' END,
      updated_at=clock_timestamp()
  WHERE id=p_tip_id;
  RETURN v_refund;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_complete_processing_refund(
  p_tip_id uuid,p_refund_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_refund_id IS NULL OR p_refund_id !~ '^re_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid Stripe refund ID.';
  END IF;
  UPDATE playtested_studios.tester_tips
  SET stripe_processing_refund_id=p_refund_id,
      processing_refund_status='completed',
      updated_at=clock_timestamp()
  WHERE id=p_tip_id AND processing_refund_status IN ('processing','completed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Processing refund is not pending.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_fail_processing_refund(p_tip_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $fn$
  UPDATE playtested_studios.tester_tips
  SET processing_refund_status='failed',updated_at=clock_timestamp()
  WHERE id=p_tip_id AND processing_refund_status='processing';
$fn$;

REVOKE ALL ON FUNCTION public.tester_tip_get_merchant_account(uuid),
  public.tester_tip_save_merchant_account(uuid,text),
  public.tester_tip_update_merchant_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_set_charge_details(uuid,text,integer,integer),
  public.tester_tip_prepare_processing_refund(uuid,integer),
  public.tester_tip_complete_processing_refund(uuid,text),
  public.tester_tip_fail_processing_refund(uuid)
FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.tester_tip_get_merchant_account(uuid),
  public.tester_tip_save_merchant_account(uuid,text),
  public.tester_tip_update_merchant_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_set_charge_details(uuid,text,integer,integer),
  public.tester_tip_prepare_processing_refund(uuid,integer),
  public.tester_tip_complete_processing_refund(uuid,text),
  public.tester_tip_fail_processing_refund(uuid)
TO service_role;

COMMIT;

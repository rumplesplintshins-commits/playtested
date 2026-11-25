-- Server-only RPC boundary for the private tester tip schema.
-- The playtested_studios schema remains unexposed through PostgREST.
BEGIN;

CREATE OR REPLACE FUNCTION public.tester_tip_get_stripe_account(p_tester_id uuid)
RETURNS TABLE(stripe_account_id text,transfers_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT a.stripe_account_id,a.transfers_status
  FROM playtested_studios.tester_stripe_accounts a
  WHERE a.tester_id=p_tester_id;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_save_stripe_account(p_tester_id uuid,p_stripe_account_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF p_tester_id IS NULL OR p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid Stripe account mapping.';
  END IF;
  INSERT INTO playtested_studios.tester_stripe_accounts(tester_id,stripe_account_id)
  VALUES(p_tester_id,p_stripe_account_id)
  ON CONFLICT(tester_id) DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM playtested_studios.tester_stripe_accounts
    WHERE tester_id=p_tester_id AND stripe_account_id=p_stripe_account_id
  ) THEN
    RAISE EXCEPTION 'A different Stripe account is already linked.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_update_stripe_account_status(
  p_tester_id uuid,p_status text,p_details_submitted boolean,p_requirements_due jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF p_status NOT IN ('pending','active','restricted','disabled') THEN
    RAISE EXCEPTION 'Invalid Stripe transfer status.';
  END IF;
  UPDATE playtested_studios.tester_stripe_accounts
  SET transfers_status=p_status,details_submitted=coalesce(p_details_submitted,false),
      requirements_due=coalesce(p_requirements_due,'[]'::jsonb),updated_at=clock_timestamp()
  WHERE tester_id=p_tester_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_get_fee_rules()
RETURNS TABLE(rule_order smallint,from_pence integer,to_pence integer,fee_type text,fee_value integer,description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT r.rule_order,r.from_pence,r.to_pence,r.fee_type,r.fee_value,r.description
  FROM playtested_studios.tester_tip_fee_rules r
  WHERE r.active ORDER BY r.rule_order;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_create_ledger(
  p_test_id uuid,p_developer_id uuid,p_tip_amount_pence integer,
  p_platform_fee_pence integer,p_total_amount_pence integer,p_fee_rules_snapshot jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_test public.community_game_tests%rowtype;
  v_campaign public.community_playtests%rowtype;
  v_id uuid;
  v_fee integer;
BEGIN
  IF p_tip_amount_pence NOT BETWEEN 500 AND 3000
     OR p_platform_fee_pence < 0
     OR p_total_amount_pence <> p_tip_amount_pence + p_platform_fee_pence THEN
    RAISE EXCEPTION 'Invalid tester tip amounts.';
  END IF;
  SELECT * INTO v_test FROM public.community_game_tests
  WHERE id=p_test_id FOR UPDATE;
  IF NOT FOUND OR v_test.status IS DISTINCT FROM 'reviewed'
     OR v_test.review_outcome IS DISTINCT FROM 'accepted'
     OR v_test.replacement_at IS NOT NULL
     OR v_test.feedback_usefulness IS DISTINCT FROM 'useful' THEN
    RAISE EXCEPTION 'Tips are available only for accepted feedback marked Useful.';
  END IF;
  SELECT * INTO v_campaign FROM public.community_playtests WHERE id=v_test.playtest_id;
  IF NOT FOUND OR v_campaign.developer_id IS DISTINCT FROM p_developer_id
     OR v_test.tester_id=p_developer_id THEN
    RAISE EXCEPTION 'Only the playtest owner can tip this tester.';
  END IF;
  SELECT playtested_studios.calculate_tester_tip_fee_pence(p_tip_amount_pence) INTO v_fee;
  IF v_fee IS DISTINCT FROM p_platform_fee_pence THEN
    RAISE EXCEPTION 'The fee quote changed. Please calculate the total again.';
  END IF;
  INSERT INTO playtested_studios.tester_tips(
    test_id,playtest_id,developer_id,tester_id,tip_amount_pence,
    platform_fee_pence,total_amount_pence,fee_rules_snapshot,status
  ) VALUES(
    v_test.id,v_test.playtest_id,p_developer_id,v_test.tester_id,p_tip_amount_pence,
    p_platform_fee_pence,p_total_amount_pence,coalesce(p_fee_rules_snapshot,'[]'::jsonb),'pending'
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_update_checkout(
  p_tip_id uuid,p_session_id text,p_status text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF p_status NOT IN ('checkout_created','failed') THEN RAISE EXCEPTION 'Invalid tip status.'; END IF;
  UPDATE playtested_studios.tester_tips
  SET stripe_checkout_session_id=coalesce(p_session_id,stripe_checkout_session_id),
      status=p_status,updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created');
END;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_paid(
  p_tip_id uuid,p_session_id text,p_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  UPDATE playtested_studios.tester_tips
  SET status='paid',stripe_checkout_session_id=coalesce(p_session_id,stripe_checkout_session_id),
      stripe_payment_intent_id=coalesce(p_payment_intent_id,stripe_payment_intent_id),
      paid_at=coalesce(paid_at,clock_timestamp()),updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created','failed','expired','paid');
END;
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_expired(p_tip_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE playtested_studios.tester_tips SET status='expired',updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created');
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_failed(p_tip_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE playtested_studios.tester_tips SET status='failed',updated_at=clock_timestamp()
  WHERE id=p_tip_id AND status IN ('pending','checkout_created');
$$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_refund(
  p_tip_id uuid,p_payment_intent_id text,p_charge_id text,p_refunded_amount_pence integer,p_charge_amount_pence integer
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $
  UPDATE playtested_studios.tester_tips
  SET status=CASE WHEN p_refunded_amount_pence>=p_charge_amount_pence THEN 'refunded' ELSE 'partially_refunded' END,
      refunded_amount_pence=greatest(0,p_refunded_amount_pence),
      stripe_payment_intent_id=coalesce(stripe_payment_intent_id,p_payment_intent_id),
      stripe_charge_id=p_charge_id,updated_at=clock_timestamp()
  WHERE id=p_tip_id
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=p_payment_intent_id);
$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_disputed(
  p_tip_id uuid,p_payment_intent_id text,p_charge_id text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $
  UPDATE playtested_studios.tester_tips
  SET status='disputed',stripe_payment_intent_id=coalesce(stripe_payment_intent_id,p_payment_intent_id),
      stripe_charge_id=p_charge_id,updated_at=clock_timestamp()
  WHERE id=p_tip_id
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=p_payment_intent_id);
$;

REVOKE ALL ON FUNCTION public.tester_tip_get_stripe_account(uuid),
  public.tester_tip_save_stripe_account(uuid,text),
  public.tester_tip_update_stripe_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_get_fee_rules(),
  public.tester_tip_create_ledger(uuid,uuid,integer,integer,integer,jsonb),
  public.tester_tip_update_checkout(uuid,text,text),
  public.tester_tip_mark_paid(uuid,text,text),
  public.tester_tip_mark_expired(uuid),
  public.tester_tip_mark_failed(uuid),
  public.tester_tip_mark_refund(uuid,text,text,integer,integer),
  public.tester_tip_mark_disputed(uuid,text,text)
FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.tester_tip_get_stripe_account(uuid),
  public.tester_tip_save_stripe_account(uuid,text),
  public.tester_tip_update_stripe_account_status(uuid,text,boolean,jsonb),
  public.tester_tip_get_fee_rules(),
  public.tester_tip_create_ledger(uuid,uuid,integer,integer,integer,jsonb),
  public.tester_tip_update_checkout(uuid,text,text),
  public.tester_tip_mark_paid(uuid,text,text),
  public.tester_tip_mark_expired(uuid),
  public.tester_tip_mark_failed(uuid),
  public.tester_tip_mark_refund(uuid,text,text,integer,integer),
  public.tester_tip_mark_disputed(uuid,text,text)
TO service_role;

COMMIT;

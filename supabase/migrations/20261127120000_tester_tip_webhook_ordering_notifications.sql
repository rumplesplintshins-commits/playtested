BEGIN;

-- A refund or dispute proves the charge succeeded, even if Stripe delivers
-- that event before checkout.session.completed. Record payment confirmation
-- without replacing the more specific terminal ledger status.
CREATE OR REPLACE FUNCTION public.tester_tip_mark_paid(
  p_tip_id uuid,p_session_id text,p_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^cs_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid Checkout Session ID.';
  END IF;

  UPDATE playtested_studios.tester_tips
  SET status = CASE
        WHEN status IN ('refunded','partially_refunded','disputed') THEN status
        ELSE 'paid'
      END,
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id,p_session_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id,p_payment_intent_id),
      paid_at = coalesce(paid_at,clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND status IN ('pending','checkout_created','payment_failed','paid','refunded','partially_refunded','disputed')
    AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id = p_session_id)
    AND (p_payment_intent_id IS NULL OR stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = p_payment_intent_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip conflicts with another payment or was not found.'; END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_refund(
  p_tip_id uuid,p_payment_intent_id text,p_charge_id text,
  p_refunded_amount_pence integer,p_charge_amount_pence integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  UPDATE playtested_studios.tester_tips
  SET status = CASE WHEN p_refunded_amount_pence >= p_charge_amount_pence
                    THEN 'refunded' ELSE 'partially_refunded' END,
      refunded_amount_pence = greatest(0,p_refunded_amount_pence),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id,p_payment_intent_id),
      stripe_charge_id = p_charge_id,
      paid_at = coalesce(paid_at,clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = p_payment_intent_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.tester_tip_mark_disputed(
  p_tip_id uuid,p_payment_intent_id text,p_charge_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  UPDATE playtested_studios.tester_tips
  SET status = 'disputed',
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id,p_payment_intent_id),
      stripe_charge_id = p_charge_id,
      paid_at = coalesce(paid_at,clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE id = p_tip_id
    AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = p_payment_intent_id);
END;
$fn$;

-- Notify when the ledger first learns that money was captured, regardless of
-- whether an earlier refund/dispute webhook already changed status. The stable
-- notification dedupe key keeps duplicate events and retries idempotent.
CREATE OR REPLACE FUNCTION public._notify_paid_tester_tip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_title text;
  v_amount text;
BEGIN
  IF OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL THEN
    SELECT coalesce(nullif(btrim(c.title),''),'a game')
      INTO v_title FROM public.community_playtests c WHERE c.id = NEW.playtest_id;
    v_amount := '£' || to_char(NEW.tip_amount_pence / 100.0,'FM999990.00');
    PERFORM public._create_notification(
      NEW.tester_id,'tester_tip_received',
      v_amount || ' tip received!',
      'A developer has sent you a thank-you tip for your accepted feedback on ' || coalesce(v_title,'a game') || '.',
      '/tester#testing-activity-' || NEW.test_id::text,
      'playtest',NEW.playtest_id,'tester-tip:paid:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tester_tip_paid_notification ON playtested_studios.tester_tips;
CREATE TRIGGER tester_tip_paid_notification
AFTER UPDATE OF status,paid_at ON playtested_studios.tester_tips
FOR EACH ROW EXECUTE FUNCTION public._notify_paid_tester_tip();

NOTIFY pgrst, 'reload schema';
COMMIT;

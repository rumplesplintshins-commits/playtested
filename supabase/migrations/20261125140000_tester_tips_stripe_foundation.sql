-- Tester tips: private Stripe Connect account mapping, fee rules and immutable payment ledger.
-- All monetary values are GBP pence. No wallet or stored balance is created.
BEGIN;

CREATE TABLE IF NOT EXISTS playtested_studios.tester_stripe_accounts (
  tester_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_version text NOT NULL DEFAULT 'v2',
  transfers_status text NOT NULL DEFAULT 'pending'
    CHECK (transfers_status IN ('pending','active','restricted','disabled')),
  details_submitted boolean NOT NULL DEFAULT false,
  requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS playtested_studios.tester_tip_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_order smallint NOT NULL UNIQUE,
  from_pence integer NOT NULL CHECK (from_pence >= 0),
  to_pence integer CHECK (to_pence IS NULL OR to_pence > from_pence),
  fee_type text NOT NULL CHECK (fee_type IN ('fixed','percentage')),
  fee_value integer NOT NULL CHECK (fee_value >= 0),
  active boolean NOT NULL DEFAULT true,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((fee_type='fixed' AND to_pence IS NOT NULL) OR fee_type='percentage')
);

-- Seed only when no rules exist. Values are editable in Supabase without a code deploy.
INSERT INTO playtested_studios.tester_tip_fee_rules
  (rule_order,from_pence,to_pence,fee_type,fee_value,description)
SELECT v.rule_order,v.from_pence,v.to_pence,v.fee_type,v.fee_value,v.description
FROM (VALUES
  (1::smallint,0,1000,'fixed'::text,150,'£1.50 fixed fee on tips up to £10'),
  (2::smallint,1000,1500,'percentage'::text,2000,'20% of the portion between £10 and £15'),
  (3::smallint,1500,2500,'percentage'::text,500,'5% of the portion between £15 and £25'),
  (4::smallint,2500,NULL,'percentage'::text,1000,'10% of the portion above £25')
) AS v(rule_order,from_pence,to_pence,fee_type,fee_value,description)
WHERE NOT EXISTS (SELECT 1 FROM playtested_studios.tester_tip_fee_rules);

CREATE TABLE IF NOT EXISTS playtested_studios.tester_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.community_game_tests(id) ON DELETE RESTRICT,
  playtest_id uuid NOT NULL REFERENCES public.community_playtests(id) ON DELETE RESTRICT,
  developer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tip_amount_pence integer NOT NULL CHECK (tip_amount_pence BETWEEN 500 AND 10000),
  platform_fee_pence integer NOT NULL CHECK (platform_fee_pence >= 0),
  total_amount_pence integer NOT NULL CHECK (total_amount_pence = tip_amount_pence + platform_fee_pence),
  currency text NOT NULL DEFAULT 'gbp' CHECK (currency='gbp'),
  fee_rules_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','checkout_created','paid','failed','expired','refunded','partially_refunded','disputed')),
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  stripe_charge_id text,
  paid_at timestamptz,
  refunded_amount_pence integer NOT NULL DEFAULT 0 CHECK (refunded_amount_pence >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS tester_tips_developer_created_idx
  ON playtested_studios.tester_tips(developer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS tester_tips_tester_created_idx
  ON playtested_studios.tester_tips(tester_id,created_at DESC);
CREATE INDEX IF NOT EXISTS tester_tips_test_idx
  ON playtested_studios.tester_tips(test_id);
-- One successful or in-flight tip per accepted feedback item; expired/failed attempts can be retried.
CREATE UNIQUE INDEX IF NOT EXISTS tester_tips_one_per_feedback_idx
  ON playtested_studios.tester_tips(test_id,developer_id)
  WHERE status NOT IN ('failed','expired');

ALTER TABLE playtested_studios.tester_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE playtested_studios.tester_tip_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE playtested_studios.tester_tips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON playtested_studios.tester_stripe_accounts FROM PUBLIC,anon,authenticated;
REVOKE ALL ON playtested_studios.tester_tip_fee_rules FROM PUBLIC,anon,authenticated;
REVOKE ALL ON playtested_studios.tester_tips FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION playtested_studios.calculate_tester_tip_fee_pence(p_tip_amount_pence integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_rule record;
  v_fee integer := 0;
  v_portion integer;
BEGIN
  IF p_tip_amount_pence IS NULL OR p_tip_amount_pence NOT BETWEEN 500 AND 10000 THEN
    RAISE EXCEPTION 'Tip must be between £5 and £100.';
  END IF;

  FOR v_rule IN
    SELECT rule_order,from_pence,to_pence,fee_type,fee_value
    FROM playtested_studios.tester_tip_fee_rules
    WHERE active
    ORDER BY rule_order
  LOOP
    IF v_rule.fee_type = 'fixed' THEN
      IF p_tip_amount_pence > v_rule.from_pence THEN
        v_fee := v_fee + v_rule.fee_value;
      END IF;
    ELSE
      v_portion := greatest(0,
        least(p_tip_amount_pence,coalesce(v_rule.to_pence,p_tip_amount_pence))
        - v_rule.from_pence
      );
      IF v_portion > 0 THEN
        -- Round each tier to the nearest penny, half up.
        v_fee := v_fee + ((v_portion * v_rule.fee_value + 5000) / 10000);
      END IF;
    END IF;
  END LOOP;

  RETURN v_fee;
END;
$function$;

REVOKE ALL ON FUNCTION playtested_studios.calculate_tester_tip_fee_pence(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION playtested_studios.calculate_tester_tip_fee_pence(integer) TO service_role;

COMMIT;

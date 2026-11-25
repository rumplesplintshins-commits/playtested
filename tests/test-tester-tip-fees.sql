-- Run after migration 20261125140000_tester_tips_stripe_foundation.sql.
DO $$
DECLARE
  cases integer[][] := ARRAY[
    ARRAY[500,150],
    ARRAY[1000,150],
    ARRAY[1500,250],
    ARRAY[2000,275],
    ARRAY[2500,300],
    ARRAY[3000,350],
    ARRAY[5000,550]
  ];
  item integer[];
  actual integer;
BEGIN
  FOREACH item SLICE 1 IN ARRAY cases LOOP
    SELECT playtested_studios.calculate_tester_tip_fee_pence(item[1]) INTO actual;
    IF actual <> item[2] THEN
      RAISE EXCEPTION 'Tip fee test failed: tip % expected % but got %',
        item[1], item[2], actual;
    END IF;
  END LOOP;
END;
$$;

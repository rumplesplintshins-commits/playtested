-- A paid tester tip permanently locks the developer's usefulness rating.
BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_feedback_rating_change_after_paid_tip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.feedback_usefulness IS DISTINCT FROM OLD.feedback_usefulness
     AND EXISTS (
       SELECT 1
       FROM playtested_studios.tester_tips tip
       WHERE tip.test_id = OLD.id
         AND tip.developer_id = auth.uid()
         AND tip.paid_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Feedback rating is locked because a tip has already been sent.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS feedback_rating_locked_after_paid_tip ON public.community_game_tests;
CREATE TRIGGER feedback_rating_locked_after_paid_tip
BEFORE UPDATE OF feedback_usefulness ON public.community_game_tests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_feedback_rating_change_after_paid_tip();

REVOKE ALL ON FUNCTION public.prevent_feedback_rating_change_after_paid_tip() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;

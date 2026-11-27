BEGIN;

CREATE TABLE IF NOT EXISTS playtested_studios.tester_tipping_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton IS TRUE),
  is_paused boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO playtested_studios.tester_tipping_control(singleton, is_paused)
VALUES (true, false)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS playtested_studios.tester_tipping_pause_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  is_paused boolean NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE playtested_studios.tester_tipping_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE playtested_studios.tester_tipping_pause_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON playtested_studios.tester_tipping_control FROM PUBLIC, anon, authenticated;
REVOKE ALL ON playtested_studios.tester_tipping_pause_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION playtested_studios.guard_tester_tip_insert_when_paused()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_paused boolean;
BEGIN
  SELECT c.is_paused INTO v_paused
  FROM playtested_studios.tester_tipping_control AS c
  WHERE c.singleton = true;

  IF coalesce(v_paused, true) THEN
    RAISE EXCEPTION 'Tester tipping is temporarily paused by an administrator.'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION playtested_studios.guard_tester_tip_insert_when_paused() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tester_tipping_emergency_pause_guard ON playtested_studios.tester_tips;
CREATE TRIGGER tester_tipping_emergency_pause_guard
BEFORE INSERT ON playtested_studios.tester_tips
FOR EACH ROW
EXECUTE FUNCTION playtested_studios.guard_tester_tip_insert_when_paused();

CREATE OR REPLACE FUNCTION public.admin_get_tester_tipping_pause_state()
RETURNS TABLE (
  is_paused boolean,
  changed_at timestamptz,
  changed_by uuid,
  recent_events jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    c.is_paused,
    c.changed_at,
    c.changed_by,
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'is_paused', e.is_paused,
          'changed_at', e.changed_at,
          'changed_by', e.changed_by
        ) ORDER BY e.changed_at DESC, e.id DESC
      )
      FROM (
        SELECT id, is_paused, changed_at, changed_by
        FROM playtested_studios.tester_tipping_pause_events
        ORDER BY changed_at DESC, id DESC
        LIMIT 10
      ) AS e
    ), '[]'::jsonb)
  FROM playtested_studios.tester_tipping_control AS c
  WHERE c.singleton = true;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_tester_tipping_paused(
  p_is_paused boolean,
  p_actor_id uuid
)
RETURNS TABLE (
  is_paused boolean,
  changed_at timestamptz,
  changed_by uuid,
  recent_events jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_current boolean;
BEGIN
  IF p_is_paused IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'A pause state and administrator identity are required.';
  END IF;

  SELECT c.is_paused INTO v_current
  FROM playtested_studios.tester_tipping_control AS c
  WHERE c.singleton = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tester tipping control has not been initialised.';
  END IF;

  IF v_current IS DISTINCT FROM p_is_paused THEN
    UPDATE playtested_studios.tester_tipping_control AS c
    SET is_paused = p_is_paused,
        changed_at = clock_timestamp(),
        changed_by = p_actor_id
    WHERE c.singleton = true;

    INSERT INTO playtested_studios.tester_tipping_pause_events(is_paused, changed_by)
    VALUES (p_is_paused, p_actor_id);
  END IF;

  RETURN QUERY
  SELECT * FROM public.admin_get_tester_tipping_pause_state();
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_open_tester_tip_checkouts()
RETURNS TABLE (
  tip_id uuid,
  checkout_session_id text,
  connected_account_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    t.id,
    t.stripe_checkout_session_id,
    t.stripe_connected_account_id
  FROM playtested_studios.tester_tips AS t
  WHERE t.status = 'checkout_created'
    AND t.stripe_checkout_session_id IS NOT NULL
    AND t.stripe_connected_account_id IS NOT NULL
  ORDER BY t.created_at ASC, t.id ASC;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_tester_tipping_pause_state(),
  public.admin_set_tester_tipping_paused(boolean, uuid),
  public.admin_list_open_tester_tip_checkouts()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_get_tester_tipping_pause_state(),
  public.admin_set_tester_tipping_paused(boolean, uuid),
  public.admin_list_open_tester_tip_checkouts()
TO service_role;

COMMIT;

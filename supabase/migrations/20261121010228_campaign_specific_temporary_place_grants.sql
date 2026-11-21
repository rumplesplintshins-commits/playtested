-- Private one-off Tester Hub campaign capacity grants.
-- Records are not exposed to the Data API; applications cannot award places.
-- Operational grants and their expiry jobs are managed in production separately.
CREATE TABLE IF NOT EXISTS playtested_studios.campaign_place_grants (
  campaign_id uuid PRIMARY KEY REFERENCES public.community_playtests(id) ON DELETE CASCADE,
  place_cap integer NOT NULL CHECK (place_cap BETWEEN 2 AND 3),
  expires_at timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE playtested_studios.campaign_place_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON playtested_studios.campaign_place_grants FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fix_free_target()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_policy_places integer;
  v_free_cap integer;
  v_bonus_cap integer;
  v_plan text;
BEGIN
  SELECT places INTO v_policy_places FROM public.testing_policy;
  SELECT plan INTO v_plan
  FROM playtested_studios.campaign_policy(
    new.imported_game_id,new.approved_game_id,new.submission_id,new.developer_id
  );
  IF v_plan = 'free' THEN
    SELECT place_cap INTO v_free_cap
    FROM public._playtested_free_allowance_at(
      new.developer_id,coalesce(new.published_at,clock_timestamp())
    );
    SELECT grant_row.place_cap INTO v_bonus_cap
    FROM playtested_studios.campaign_place_grants grant_row
    WHERE grant_row.campaign_id=new.id
      AND grant_row.expires_at>clock_timestamp()
      AND (new.published_at IS NULL OR new.published_at<=grant_row.expires_at);
    new.target_testers:=least(
      v_policy_places,
      greatest(coalesce(v_free_cap,v_policy_places),coalesce(v_bonus_cap,0))
    );
  ELSE
    new.target_testers:=v_policy_places;
  END IF;
  new.testing_genre:=coalesce(
    nullif(btrim(new.testing_genre),''),
    (select genre from public.imported_games where id=new.imported_game_id),
    (select genre from public.approved_games where id=new.approved_game_id),
    (select genre from public.game_submissions where id=new.submission_id),
    'Other'
  );
  RETURN NEW;
END;
$function$;

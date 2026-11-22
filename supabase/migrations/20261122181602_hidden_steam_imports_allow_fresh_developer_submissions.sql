-- Live production migration, applied through Supabase on 22 Nov 2026.
-- Hidden/incomplete Steam imports cannot block fresh submissions. Approved games,
-- public Steam listings, previous submissions and shared/launched identities remain protected.
CREATE OR REPLACE FUNCTION playtested_studios.check_submission_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  k text;
  old_key text;
BEGIN
  k := playtested_studios.canonical(coalesce(
    playtested_studios.raw_identity(new.steam_app_id,new.steam_url),
    playtested_studios.raw_identity(new.steam_app_id,new.game_link)
  ));
  IF tg_op='UPDATE' THEN
    old_key := playtested_studios.identity(null,null,old.id);
    IF coalesce(k,'game:'||new.id)=old_key THEN
      RETURN new;
    END IF;
    IF EXISTS (
      SELECT 1 FROM playtested_studios.launches l
      WHERE playtested_studios.launch_identity(l.campaign_id,l.game_key)=old_key
    ) OR playtested_studios.workspace_for(old_key) IS NOT NULL THEN
      RAISE EXCEPTION 'Changes to a shared or previously launched game identity require admin review.' USING errcode='42501';
    END IF;
  END IF;

  IF k IS NULL AND (
    btrim(new.steam_url) ~* '^https?://store[.]steampowered[.]com/?([?#].*)?$'
    OR btrim(new.game_link) ~* '^https?://store[.]steampowered[.]com/?([?#].*)?$'
  ) THEN
    RAISE EXCEPTION 'Use the individual Steam app page, not the Steam storefront homepage.';
  END IF;
  IF k IS NULL THEN RETURN new; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('playtested:canonical:'||k,0));

  IF EXISTS (
    SELECT 1 FROM public.game_submissions s
    WHERE s.id<>new.id
      AND playtested_studios.identity(null,null,s.id)=k
  )
  OR (
    k LIKE 'steam:%'
    AND EXISTS (
      SELECT 1 FROM public.approved_games approved
      WHERE playtested_studios.raw_identity(approved.steam_app_id,NULL)=ANY(
        ARRAY(
          SELECT k UNION ALL
          SELECT alias.alias_key FROM playtested_studios.game_aliases alias
          WHERE alias.canonical_key=k
        )
      )
    )
  )
  OR (
    k LIKE 'steam:%'
    AND EXISTS (
      SELECT 1 FROM public.imported_games imported
      WHERE coalesce(
          playtested_studios.raw_identity(imported.steam_app_id,imported.steam_url),
          'imported:'||imported.id
        )=ANY(
          ARRAY(
            SELECT k UNION ALL
            SELECT alias.alias_key FROM playtested_studios.game_aliases alias
            WHERE alias.canonical_key=k
          )
        )
        AND imported.catalogue_eligible IS TRUE
        AND imported.metadata_backfill_status='complete'
        AND imported.title IS NOT NULL
        AND imported.developer_name IS NOT NULL
        AND imported.genre IS NOT NULL
        AND imported.image_url IS NOT NULL
        AND NOT public.beta_fixture_hidden(imported.id)
    )
  ) THEN
    RAISE EXCEPTION 'This game already has a listing. Use the existing listing or request an ownership review.' USING errcode='23505';
  END IF;
  RETURN new;
END
$function$;

-- A platform change can hide the optional PC fields while editing. NULL means
-- leave the existing requirement row untouched; non-NULL values retain the
-- existing validation and save behavior.
CREATE OR REPLACE FUNCTION public.save_game_edit_with_pc_requirements(
 p_kind text,p_id uuid,p_fields jsonb,p_revision integer,p_resubmit boolean,
 p_minimum jsonb,p_recommended jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE result jsonb;
BEGIN
 IF (p_minimum IS NULL) <> (p_recommended IS NULL) THEN
  RAISE EXCEPTION 'Both optional PC requirement values must be provided together.';
 END IF;
 IF p_minimum IS NOT NULL AND (
  NOT public.pc_specs_valid(p_minimum,true) OR
  NOT public.pc_specs_valid(p_recommended,true)
 ) THEN
  RAISE EXCEPTION 'Invalid optional PC requirements.';
 END IF;
 IF p_kind='correction' THEN
  result:=public.save_my_submission_correction(p_id,p_fields,p_revision,p_resubmit);
 ELSE
  result:=public.save_my_listing_edit(p_kind,p_id,p_fields,p_revision,p_resubmit,false);
 END IF;
 IF p_minimum IS NOT NULL THEN
  PERFORM public.save_game_pc_requirements(
   CASE WHEN p_kind='correction' THEN 'submission' ELSE p_kind END,
   p_id,p_minimum,p_recommended
  );
 END IF;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.save_game_edit_with_pc_requirements(text,uuid,jsonb,integer,boolean,jsonb,jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.save_game_edit_with_pc_requirements(text,uuid,jsonb,integer,boolean,jsonb,jsonb) TO authenticated;

-- Definition-only baseline captured 28 October; no user records or credentials.
CREATE TABLE IF NOT EXISTS "public"."game_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "ai_status" "text" DEFAULT 'Not Reviewed'::"text" NOT NULL,
    "quality_status" "text" DEFAULT 'Not Tested'::"text" NOT NULL,
    "quality_score" numeric(3,1),
    "public_summary" "text" DEFAULT ''::"text" NOT NULL,
    "evidence_summary" "text" DEFAULT ''::"text" NOT NULL,
    "reviewer_notes" "text" DEFAULT ''::"text" NOT NULL,
    "published" boolean DEFAULT false NOT NULL,
    "reviewed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_claims_checked" boolean DEFAULT false NOT NULL,
    "evidence_checked" boolean DEFAULT false NOT NULL,
    "game_launched" boolean DEFAULT false NOT NULL,
    "core_gameplay_tested" boolean DEFAULT false NOT NULL,
    "bugs_recorded" boolean DEFAULT false NOT NULL,
    "performance_checked" boolean DEFAULT false NOT NULL,
    "testing_notes" "text" DEFAULT ''::"text" NOT NULL,
    "limitations" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "game_verifications_ai_status_check" CHECK (("ai_status" = ANY (ARRAY['Not Reviewed'::"text", 'In Review'::"text", 'Supported by Evidence'::"text", 'Partially Supported'::"text", 'Unable to Verify'::"text", 'Disclosure Concerns'::"text"]))),
    CONSTRAINT "game_verifications_ai_status_valid" CHECK (("ai_status" = ANY (ARRAY['Not Reviewed'::"text", 'In Review'::"text", 'Supported by Evidence'::"text", 'Partially Supported'::"text", 'Unable to Verify'::"text", 'Disclosure Concerns'::"text"]))),
    CONSTRAINT "game_verifications_published_complete" CHECK (((NOT "published") OR (("ai_status" <> 'Not Reviewed'::"text") AND ("length"(TRIM(BOTH FROM "public_summary")) > 0)))),
    CONSTRAINT "game_verifications_quality_score_check" CHECK ((("quality_score" >= (1)::numeric) AND ("quality_score" <= (10)::numeric))),
    CONSTRAINT "game_verifications_quality_score_range" CHECK ((("quality_score" IS NULL) OR (("quality_score" >= (1)::numeric) AND ("quality_score" <= (10)::numeric)))),
    CONSTRAINT "game_verifications_quality_score_requires_verification" CHECK ((("quality_score" IS NULL) OR (("quality_status" = 'Tested'::"text") AND ("ai_status" = 'Supported by Evidence'::"text") AND ("ai_claims_checked" IS TRUE) AND ("evidence_checked" IS TRUE) AND ("game_launched" IS TRUE) AND ("core_gameplay_tested" IS TRUE) AND ("bugs_recorded" IS TRUE) AND ("performance_checked" IS TRUE) AND (NULLIF(TRIM(BOTH FROM "testing_notes"), ''::"text") IS NOT NULL)))),
    CONSTRAINT "game_verifications_quality_status_check" CHECK (("quality_status" = ANY (ARRAY['Not Tested'::"text", 'In Testing'::"text", 'Tested'::"text"]))),
    CONSTRAINT "game_verifications_quality_status_valid" CHECK (("quality_status" = ANY (ARRAY['Not Tested'::"text", 'In Testing'::"text", 'Tested'::"text"]))),
    CONSTRAINT "game_verifications_supported_ai_requires_checks" CHECK ((("ai_status" <> 'Supported by Evidence'::"text") OR ("ai_claims_checked" AND "evidence_checked"))),
    CONSTRAINT "game_verifications_tested_requirements" CHECK ((("quality_status" <> 'Tested'::"text") OR ("game_launched" AND "core_gameplay_tested" AND ("length"(TRIM(BOTH FROM "testing_notes")) > 0))))
);

alter table public.game_verifications add unique(submission_id);
CREATE VIEW "public"."published_game_verifications" AS
 SELECT "g"."id" AS "game_id",
    "g"."title",
    "g"."developer_name",
    "v"."ai_status",
    "v"."quality_status",
    "v"."quality_score",
    "v"."public_summary",
    "v"."evidence_summary",
    "v"."ai_claims_checked",
    "v"."evidence_checked",
    "v"."game_launched",
    "v"."core_gameplay_tested",
    "v"."bugs_recorded",
    "v"."performance_checked",
    "v"."limitations",
    "v"."updated_at",
        CASE
            WHEN (("v"."ai_claims_checked" IS TRUE) AND ("v"."evidence_checked" IS TRUE) AND ("v"."game_launched" IS TRUE) AND ("v"."core_gameplay_tested" IS TRUE) AND ("v"."bugs_recorded" IS TRUE) AND ("v"."performance_checked" IS TRUE) AND ("v"."ai_status" = 'Supported by Evidence'::"text") AND ("v"."quality_status" = 'Tested'::"text") AND ("v"."quality_score" IS NOT NULL) AND (NULLIF(TRIM(BOTH FROM "v"."public_summary"), ''::"text") IS NOT NULL) AND (NULLIF(TRIM(BOTH FROM "v"."limitations"), ''::"text") IS NOT NULL)) THEN 'Verified'::"text"
            WHEN (("v"."ai_status" <> 'Not Reviewed'::"text") OR ("v"."quality_status" <> 'Not Tested'::"text") OR ("v"."ai_claims_checked" IS TRUE) OR ("v"."evidence_checked" IS TRUE) OR ("v"."game_launched" IS TRUE) OR ("v"."core_gameplay_tested" IS TRUE) OR ("v"."bugs_recorded" IS TRUE) OR ("v"."performance_checked" IS TRUE)) THEN 'Assessed'::"text"
            ELSE 'Not yet verified'::"text"
        END AS "verification_status"
   FROM ("public"."game_verifications" "v"
     JOIN "public"."approved_games" "g" ON (("g"."id" = "v"."submission_id")))
  WHERE ("v"."published" IS TRUE);
CREATE FUNCTION "public"."review_game_submission"("p_submission_id" "uuid", "p_status" "text", "p_review_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_admin_id uuid;
  v_submission public.game_submissions%rowtype;
  v_award_id uuid;
  v_removed_xp integer;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if p_status not in (
    'Pending Review',
    'Approved',
    'Rejected',
    'Needs More Information'
  ) then
    raise exception 'Invalid submission status';
  end if;

  if p_status in ('Rejected', 'Needs More Information')
     and nullif(trim(coalesce(p_review_reason, '')), '') is null then
    raise exception 'A review reason is required for this decision';
  end if;

  select *
  into v_submission
  from public.game_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  /*
    APPROVAL

    An approved original submission should:
    1. Award +100 Developer XP once.
    2. Create the permanent developer-game relationship.
  */
  if p_status = 'Approved' then

    if v_submission.developer_id is null then
      raise exception 'Submission has no developer account attached';
    end if;

    /*
      Create the permanent developer relationship.

      Original submissions belong to the developer who submitted them,
      so no separate ownership claim is required.
    */
    insert into public.game_developer_links (
      developer_id,
      submission_id,
      relationship,
      source_claim_id
    )
    values (
      v_submission.developer_id,
      v_submission.id,
      'Original submitter',
      null
    )
    on conflict do nothing;

    /*
      Award XP only when moving into Approved.

      The award ledger also prevents duplicate XP if the submission
      has previously been approved.
    */
    if v_submission.status <> 'Approved' then

      insert into public.developer_xp_awards (
        developer_id,
        xp_amount,
        award_type,
        source_type,
        source_id,
        description
      )
      values (
        v_submission.developer_id,
        100,
        'approved_game_submission',
        'game_submission',
        v_submission.id,
        'Approved original game submission'
      )
      on conflict (
        developer_id,
        award_type,
        source_type,
        source_id
      )
      do nothing
      returning id into v_award_id;

      if v_award_id is not null then
        update public.profiles
        set developer_xp = developer_xp + 100
        where id = v_submission.developer_id;

        if not found then
          raise exception 'Developer profile not found';
        end if;
      end if;

    end if;
  end if;

  /*
    APPROVAL REVERSAL

    If an Approved submission moves to a non-Approved state:
    1. Remove its permanent developer-game relationship.
    2. Remove the XP award belonging to this submission.
    3. Subtract the awarded XP.
  */
  if v_submission.status = 'Approved'
     and p_status <> 'Approved'
     and v_submission.developer_id is not null then

    delete from public.game_developer_links
    where developer_id = v_submission.developer_id
      and submission_id = v_submission.id
      and source_claim_id is null;

    delete from public.developer_xp_awards
    where developer_id = v_submission.developer_id
      and award_type = 'approved_game_submission'
      and source_type = 'game_submission'
      and source_id = v_submission.id
    returning xp_amount into v_removed_xp;

    if v_removed_xp is not null then
      update public.profiles
      set developer_xp = greatest(
        0,
        developer_xp - v_removed_xp
      )
      where id = v_submission.developer_id;

      if not found then
        raise exception 'Developer profile not found';
      end if;
    end if;
  end if;

  update public.game_submissions
  set
    status = p_status,
    review_reason = case
      when p_status in ('Rejected', 'Needs More Information')
        then nullif(trim(coalesce(p_review_reason, '')), '')
      else null
    end
  where id = p_submission_id;
end;
$$;
CREATE POLICY "Admins can create verifications" ON "public"."game_verifications" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can read verifications" ON "public"."game_verifications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can update verifications" ON "public"."game_verifications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))));
alter table public.game_verifications enable row level security;
grant select,insert,update on public.game_verifications to authenticated;
grant select on public.published_game_verifications to anon,authenticated;

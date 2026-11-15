-- Minimal metadata-faithful development schema used only by the isolated Merge 26 tests.
create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
create table public.profiles(
 id uuid primary key,
 display_name text,
 created_at timestamp with time zone,
 role text,
 tester_xp integer,
 completed_tests integer,
 roles text[],
 developer_xp integer,
 preferred_genres text[]
);
create table public.game_submissions(
 id uuid primary key,
 developer_id uuid,
 title text,
 developer_name text,
 genre text,
 description text,
 game_link text,
 image_url text,
 price text,
 ai_type text,
 ai_areas text[],
 ai_explanation text,
 evidence_link text,
 status text,
 submitted_at timestamp with time zone,
 steam_url text,
 review_reason text,
 steam_app_id text,
 release_status text,
 release_date date,
 completeness_issues jsonb,
 completeness_message text,
 submission_revision integer
);
create table public.imported_games(
 id uuid primary key,
 steam_app_id text,
 title text,
 developer_name text,
 genre text,
 description text,
 steam_url text,
 image_url text,
 price text,
 release_date date,
 imported_at timestamp with time zone,
 last_synced_at timestamp with time zone,
 catalogue_eligible boolean,
 publisher_name text,
 metadata_backfill_status text,
 metadata_backfill_attempts integer,
 metadata_backfill_error text,
 catalogue_review_status text,
 catalogue_review_reason text,
 required_age integer,
 content_descriptor_ids integer[],
 is_nsfw boolean,
 content_descriptor_notes text
);
create table public.community_playtests(
 id uuid primary key,
 developer_id uuid,
 imported_game_id uuid,
 approved_game_id uuid,
 submission_id uuid,
 title text,
 access_link text,
 instructions text,
 focus_areas text[],
 audience text,
 target_testers integer,
 estimated_minutes integer,
 release_label text,
 status text,
 created_at timestamp with time zone,
 published_at timestamp with time zone,
 share_token uuid,
 access_type text,
 tester_hub_started_at timestamp with time zone,
 minimum_rank integer,
 testing_genre text,
 genre_restricted boolean
);
create table public.community_game_tests(
 id uuid primary key,
 submission_id uuid,
 tester_id uuid,
 status text,
 gameplay_score integer,
 performance_score integer,
 bugs_found text,
 feedback text,
 hours_played numeric(5,2),
 claimed_at timestamp with time zone,
 submitted_at timestamp with time zone,
 reviewed_at timestamp with time zone,
 review_outcome text,
 xp_awarded boolean,
 playtest_id uuid,
 overall_score integer,
 continue_playing text,
 recommend_game text,
 enjoyed_most text,
 frustrations text,
 biggest_improvement text,
 focus_responses jsonb,
 quality_reviewed boolean,
 review_reason text,
 replacement_reason text,
 replacement_by uuid,
 replacement_at timestamp with time zone,
 base_xp_amount integer,
 legacy_submission_id uuid,
 reservation_started_at timestamp with time zone,
 reservation_expires_at timestamp with time zone,
 reservation_round integer,
 quality_rubric_version integer,
 feedback_quality_score integer,
 quality_criteria jsonb,
 quality_eligibility jsonb,
 quality_reviewer uuid,
 feedback_usefulness text,
 feedback_usefulness_marked_at timestamp with time zone,
 feedback_usefulness_marked_by uuid
);
create table public.game_developer_links(
 id uuid primary key,
 developer_id uuid,
 imported_game_id uuid,
 approved_game_id uuid,
 submission_id uuid,
 relationship text,
 source_claim_id uuid,
 created_at timestamp with time zone
);
create table public.submission_review_events(
 id bigint primary key,
 submission_id uuid,
 actor_id uuid,
 kind text,
 previous_status text,
 new_status text,
 previous_review_reason text,
 review_reason text,
 issues jsonb,
 revision integer,
 created_at timestamp with time zone
);
create table public.listing_revisions(
 id bigint primary key,
 game_key text,
 kind text,
 source_id uuid,
 editor uuid,
 created_at timestamp with time zone,
 state_version integer,
 before_fields jsonb,
 proposed jsonb,
 changed_fields text[],
 base_hash text,
 status text,
 disputed boolean,
 reviewer uuid,
 reviewed_at timestamp with time zone,
 review_reason text,
 assessment_before jsonb,
 reassessed_by uuid,
 reassessed_at timestamp with time zone,
 reassessment_reason text,
 assessment_after jsonb
);
create table public.listing_states(
 game_key text,
 published jsonb,
 version integer,
 disputed boolean,
 reassessment boolean,
 assessment_revision bigint
);
create table public.game_verifications(
 id uuid primary key,
 submission_id uuid,
 ai_status text,
 quality_status text,
 quality_score numeric(3,1),
 public_summary text,
 evidence_summary text,
 reviewer_notes text,
 published boolean,
 reviewed_by uuid,
 created_at timestamp with time zone,
 updated_at timestamp with time zone,
 ai_claims_checked boolean,
 evidence_checked boolean,
 game_launched boolean,
 core_gameplay_tested boolean,
 bugs_recorded boolean,
 performance_checked boolean,
 testing_notes text,
 limitations text
);
create table public.m24_page_views(
 event_id uuid,
 visitor_id uuid,
 occurred_at timestamp with time zone,
 page text,
 source text,
 medium text,
 campaign text,
 referral text
);
create table public.m24_submission_acquisition(
 submission_id uuid primary key,
 recorded_at timestamp with time zone,
 source text,
 medium text,
 campaign text,
 referral text,
 self_reported text
);
create table public.game_screenshots(
 submission_id uuid,
 slot smallint,
 revision uuid,
 object_path text
);
create table public.gameplay_footage(
 submission_id uuid,
 video_url text,
 updated_at timestamp with time zone
);
create table public.game_submission_contacts(
 submission_id uuid,
 developer_id uuid,
 contact_email text,
 contact_discord text,
 contact_reddit text,
 contact_allowed boolean,
 updated_at timestamp with time zone
);
create table public.pulse_jobs(
 id uuid primary key,
 submission_id uuid,
 developer_id uuid,
 technical_run_id uuid,
 status text,
 engine_version text,
 worker_version text,
 test_suite_version text,
 build_url text,
 build_sha256 text,
 error_message text,
 created_at timestamp with time zone,
 started_at timestamp with time zone,
 completed_at timestamp with time zone,
 updated_at timestamp with time zone,
 report_json jsonb,
 input_key text,
 retry_of uuid
);
alter table community_playtests add foreign key(submission_id) references game_submissions(id);
alter table pulse_jobs add foreign key(submission_id) references game_submissions(id);
CREATE OR REPLACE FUNCTION public.beta_fixture_hidden(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(p_id=any(array[
'd3100000-0000-4000-8000-000000000001',
'd3100000-0000-4000-8000-000000000002',
'd3100000-0000-4000-8000-000000000003',
'd3100000-0000-4000-8000-000000000101',
'd3100000-0000-4000-8000-000000000102',
'd3100000-0000-4000-8000-000000000103',
'3dc1adfe-8e19-4c37-aef7-b9c16ad5433f',
'b307eac5-4b9e-46fc-b673-178014c3fd9a',
'052165b0-15b4-4b2e-a1cb-c3be363df97f',
'f7f9808b-2d97-45ea-9bd5-428c42e4f018',
'7e69d169-c79c-40e8-83e5-545f85736f31',
'04771f87-5f59-4cf8-9f35-07c80c77537f',
'b8754c76-2f38-42b8-9348-240ef5aaed7f',
'3d09699f-f0b0-4d4e-bb06-1da7f1180778',
'41e47b6d-8f1c-4c06-b929-72169c7f0e6b',
'5218a866-f597-4fc1-bfae-84e1dc172dfe',
'a2fe9b0b-f556-4517-86c5-9687c33c8f40',
'2092dc5a-6404-42d1-a5db-544858565808',
'abc3ae2e-aea3-4293-af66-3130fbd6292a',
'5b5a9d16-adf6-4cab-b67f-db393d00483f'
 ,
 '0a954463-811a-42b7-98d6-8793e3c9b756', -- Pulse Workflow Test 2
 '226cf8e7-4606-44f5-b7be-e0f46ce38dc3', -- Test Dungeon
 '38f54814-859c-461f-8602-8b6ba84f1e99', -- Pulse Workflow Test 3
 '94483bd5-99e5-4126-bd01-c1a770a7f7b3'  -- Pulse Workflow Test 1
 ]::uuid[]),false);
$function$
;
create view public.approved_games as  SELECT id,
    title,
    developer_name,
    genre,
    description,
    game_link,
    image_url,
    price,
    ai_type,
    ai_areas,
    ai_explanation,
    evidence_link,
    submitted_at,
    steam_app_id
   FROM game_submissions
  WHERE status = 'Approved'::text AND NOT beta_fixture_hidden(id);;
create view public.published_game_verifications as  SELECT g.id AS game_id,
    g.title,
    g.developer_name,
    v.ai_status,
    v.quality_status,
    v.quality_score,
    v.public_summary,
    v.evidence_summary,
    v.ai_claims_checked,
    v.evidence_checked,
    v.game_launched,
    v.core_gameplay_tested,
    v.bugs_recorded,
    v.performance_checked,
    v.limitations,
    v.updated_at,
        CASE
            WHEN v.ai_claims_checked IS TRUE AND v.evidence_checked IS TRUE AND v.game_launched IS TRUE AND v.core_gameplay_tested IS TRUE AND v.bugs_recorded IS TRUE AND v.performance_checked IS TRUE AND v.ai_status = 'Supported by Evidence'::text AND v.quality_status = 'Tested'::text AND v.quality_score IS NOT NULL AND NULLIF(TRIM(BOTH FROM v.public_summary), ''::text) IS NOT NULL AND NULLIF(TRIM(BOTH FROM v.limitations), ''::text) IS NOT NULL THEN 'Verified'::text
            WHEN v.ai_status <> 'Not Reviewed'::text OR v.quality_status <> 'Not Tested'::text OR v.ai_claims_checked IS TRUE OR v.evidence_checked IS TRUE OR v.game_launched IS TRUE OR v.core_gameplay_tested IS TRUE OR v.bugs_recorded IS TRUE OR v.performance_checked IS TRUE THEN 'Assessed'::text
            ELSE 'Not yet verified'::text
        END AS verification_status
   FROM game_verifications v
     JOIN approved_games g ON g.id = v.submission_id
  WHERE v.published IS TRUE;;
CREATE OR REPLACE FUNCTION public.get_game_community_reception()
 RETURNS TABLE(imported_game_id uuid, approved_game_id uuid, submission_id uuid, game_title text, accepted_test_count bigint, rated_test_count bigint, average_overall_score numeric, average_gameplay_score numeric, average_performance_score numeric, recommend_positive_count bigint, recommend_answered_count bigint, recommend_positive_percent numeric, continue_positive_count bigint, continue_answered_count bigint, continue_positive_percent numeric, bug_report_count bigint, average_hours_played numeric, reception_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

    /*
     * Find the newest playtest round for each game.
     *
     * Public reception is based ONLY on this round.
     * Older rounds remain stored and can still be shown
     * in Playtest History.
     */
    with ranked_playtests as (
        select
            cp.id as playtest_id,
            cp.imported_game_id,
            cp.approved_game_id,
            cp.submission_id,
            cp.title as game_title,
            cp.created_at,

            row_number() over (
                partition by
                    cp.imported_game_id,
                    cp.approved_game_id,
                    cp.submission_id
                order by
                    cp.created_at desc,
                    cp.id desc
            ) as playtest_rank

        from public.community_playtests cp where not public.beta_fixture_hidden(cp.id) and not public.beta_fixture_hidden(cp.submission_id) and not public.beta_fixture_hidden(cp.approved_game_id)
    ),

    latest_playtests as (
        select
            playtest_id,
            imported_game_id,
            approved_game_id,
            submission_id,
            game_title
        from ranked_playtests
        where playtest_rank = 1
    ),

    accepted_tests as (
        select
            lp.imported_game_id,
            lp.approved_game_id,
            lp.submission_id,
            lp.game_title,

            cgt.overall_score,
            cgt.gameplay_score,
            cgt.performance_score,
            cgt.recommend_game,
            cgt.continue_playing,
            cgt.bugs_found,
            cgt.hours_played

        from latest_playtests lp

        join public.community_game_tests cgt
            on cgt.playtest_id = lp.playtest_id

        where cgt.status = 'reviewed'
          and cgt.review_outcome = 'accepted'
    ),

    aggregated as (
        select
            imported_game_id,
            approved_game_id,
            submission_id,

            max(game_title) as game_title,

            count(*) as accepted_test_count,

            count(overall_score) as rated_test_count,

            round(
                avg(overall_score)::numeric,
                1
            ) as average_overall_score,

            round(
                avg(gameplay_score)::numeric,
                1
            ) as average_gameplay_score,

            round(
                avg(performance_score)::numeric,
                1
            ) as average_performance_score,

            count(*) filter (
                where recommend_game in (
                    'definitely',
                    'probably'
                )
            ) as recommend_positive_count,

            count(*) filter (
                where recommend_game is not null
            ) as recommend_answered_count,

            round(
                (
                    100.0
                    * count(*) filter (
                        where recommend_game in (
                            'definitely',
                            'probably'
                        )
                    )
                    / nullif(
                        count(*) filter (
                            where recommend_game is not null
                        ),
                        0
                    )
                )::numeric,
                0
            ) as recommend_positive_percent,

            count(*) filter (
                where continue_playing in (
                    'definitely',
                    'probably'
                )
            ) as continue_positive_count,

            count(*) filter (
                where continue_playing is not null
            ) as continue_answered_count,

            round(
                (
                    100.0
                    * count(*) filter (
                        where continue_playing in (
                            'definitely',
                            'probably'
                        )
                    )
                    / nullif(
                        count(*) filter (
                            where continue_playing is not null
                        ),
                        0
                    )
                )::numeric,
                0
            ) as continue_positive_percent,

            count(*) filter (
                where nullif(trim(bugs_found), '') is not null
            ) as bug_report_count,

            round(
                avg(hours_played)::numeric,
                1
            ) as average_hours_played

        from accepted_tests

        group by
            imported_game_id,
            approved_game_id,
            submission_id
    )

    select
        imported_game_id,
        approved_game_id,
        submission_id,
        game_title,
        accepted_test_count,
        rated_test_count,
        average_overall_score,
        average_gameplay_score,
        average_performance_score,
        recommend_positive_count,
        recommend_answered_count,
        recommend_positive_percent,
        continue_positive_count,
        continue_answered_count,
        continue_positive_percent,
        bug_report_count,
        average_hours_played,

        case
            when rated_test_count < 5 then
                'Early results'

            when average_overall_score >= 8
                 and coalesce(recommend_positive_percent, 0) >= 75
            then
                'Excellent reception'

            when average_overall_score >= 6.5
                 and coalesce(recommend_positive_percent, 0) >= 60
            then
                'Positive reception'

            when average_overall_score >= 4.5
            then
                'Mixed reception'

            else
                'Poor reception'
        end as reception_status

    from aggregated

    order by
        average_overall_score desc nulls last;

$function$
;
create function tester_rank(uuid) returns integer language sql as $$select 0$$;
create function game_genres(text) returns text[] language sql as $$select array[$1]$$;
create function normalize_testing_genres(text[]) returns text[] language sql as $$select $1$$;
grant select on all tables in schema public to anon,authenticated;
alter table imported_games enable row level security;create policy imported_public on imported_games for select using(true);

CREATE OR REPLACE FUNCTION public._share_key(p_kind text, p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare steam text; other_steam text; present boolean;
begin
 if p_kind='imported' then select steam_app_id,true into steam,present from public.imported_games where id=p_id;
 elsif p_kind='submission' then select steam_app_id,true into steam,present from public.game_submissions where id=p_id;select steam_app_id into other_steam from public.approved_games where id=p_id;
 elsif p_kind='approved' then select steam_app_id,true into steam,present from public.approved_games where id=p_id;select steam_app_id into other_steam from public.game_submissions where id=p_id;
 else raise exception 'Invalid game source';end if;
 if not coalesce(present,false) then return null;end if;
 if steam~'^[0-9]+$' and other_steam~'^[0-9]+$' and steam<>other_steam then raise exception 'Ambiguous game identity requires review';end if;
 steam:=coalesce(nullif(steam,''),other_steam);
 return case when steam~'^[0-9]+$' then 'steam:'||steam else case when p_kind='imported' then 'imported:' else 'game:' end||p_id::text end;
end;$function$
;

CREATE OR REPLACE FUNCTION public.confirm_listing_reassessment(p_id bigint, p_version integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare r public.listing_revisions;s public.listing_states;v jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 select * into r from public.listing_revisions where id=p_id;if not found then raise exception 'Revision unavailable.';end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:listing:'||r.game_key,0));select * into s from public.listing_states where game_key=r.game_key for update;
 if r.status not in('Approved','Published') or r.id is distinct from s.assessment_revision or p_version is distinct from s.version or s.disputed or not s.reassessment then raise exception 'Listing changed. Reload before confirming reassessment.';end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'Record what was reassessed.';end if;
 if to_regclass('public.published_game_verifications') is not null then execute 'select to_jsonb(v) from public.published_game_verifications v where game_id=$1' into v using r.source_id;end if;
 if v is null or not coalesce((v->>'ai_claims_checked')::boolean,false) or (v->>'updated_at')::timestamptz<=coalesce(r.reviewed_at,r.created_at) or nullif(v->>'updated_at','') is null then raise exception 'Complete and publish a fresh assessment of this listing first.';end if;
 update public.listing_revisions set reassessed_by=auth.uid(),reassessed_at=clock_timestamp(),reassessment_reason=btrim(p_reason),assessment_after=v where id=p_id;
 update public.listing_states set reassessment=false where game_key=r.game_key;
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_listing_revision_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.';end if;
 return(select coalesce(jsonb_agg(data),'[]') from(select to_jsonb(r)||jsonb_build_object('state_version',s.version,'proposed',case when r.status in('Approved','Published') then s.published else r.proposed end) data from public.listing_revisions r join public.listing_states s using(game_key) where r.status='Pending Review' or(r.id=s.assessment_revision and s.reassessment) order by r.created_at limit 100)q);
end;$function$
;

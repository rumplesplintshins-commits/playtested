-- Expose platform on the public catalogue so catalogue / Tester Hub badges can render.
-- Forward-only. Re-defines get_public_catalogue to include platform. Do NOT apply to production without review.
begin;

create or replace function public.get_public_catalogue(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12, p_search text DEFAULT ''::text, p_genre text DEFAULT 'All genres'::text, p_verification text DEFAULT 'All verification statuses'::text, p_ai_type text DEFAULT 'All AI types'::text, p_include_nsfw boolean DEFAULT false, p_sort text DEFAULT 'Featured'::text)
 RETURNS TABLE(source_type text, game_id uuid, steam_app_id text, title text, developer_name text, genre text, description text, image_url text, game_link text, ai_type text, verification_status text, quality_score numeric, submitted_at timestamp with time zone, is_nsfw boolean, has_playtested_profile boolean, total_count bigint, platform text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$

  with community_reception as (
    select *
    from public.get_game_community_reception()
  ),

  catalogue as (

    select
      'approved'::text as source_type,
      ag.id as game_id,
      nullif(trim(ag.steam_app_id::text), '') as steam_app_id,
      coalesce(ag.title, 'Untitled game')::text as title,
      coalesce(ag.developer_name, 'Unknown developer')::text
        as developer_name,
      coalesce(ag.genre, 'Uncategorised')::text as genre,
      coalesce(ag.description, '')::text as description,
      coalesce(ag.image_url, '')::text as image_url,
      coalesce(ag.game_link, '')::text as game_link,
      coalesce(ag.ai_type, 'AI use unknown')::text as ai_type,

      coalesce(
        pgv.verification_status::text,
        'Not yet verified'
      ) as verification_status,

      coalesce(pgv.quality_score, 0)::numeric as quality_score,

      ag.submitted_at as submitted_at,

      false as is_nsfw,

      true as has_playtested_profile,

      public.normalize_platform(ag.platform) as platform,

      cr.accepted_test_count,
      cr.rated_test_count,
      cr.average_overall_score,
      cr.recommend_positive_percent,
      cr.continue_positive_percent,
      cr.reception_status

    from public.approved_games ag

    left join public.published_game_verifications pgv
      on pgv.game_id = ag.id

    left join community_reception cr
      on (
        cr.submission_id = ag.id
        or cr.approved_game_id = ag.id
      )


    union all



    select
      'steam'::text as source_type,
      ig.id as game_id,
      trim(ig.steam_app_id::text) as steam_app_id,
      coalesce(ig.title, 'Untitled Steam game')::text as title,

      coalesce(
        ig.developer_name,
        'Unknown developer'
      )::text as developer_name,

      coalesce(ig.genre, 'Uncategorised')::text as genre,
      coalesce(ig.description, '')::text as description,
      coalesce(ig.image_url, '')::text as image_url,

      coalesce(
        ig.steam_url,
        'https://store.steampowered.com/app/' ||
          trim(ig.steam_app_id::text) ||
          '/'
      )::text as game_link,

      'AI use unknown'::text as ai_type,
      'Not yet verified'::text as verification_status,
      0::numeric as quality_score,

      ig.imported_at as submitted_at,

      coalesce(ig.is_nsfw, false) as is_nsfw,

      exists (
        select 1
        from public.game_developer_links gdl
        where gdl.imported_game_id = ig.id
      ) as has_playtested_profile,

      public.normalize_platform(ig.platform) as platform,

      cr.accepted_test_count,
      cr.rated_test_count,
      cr.average_overall_score,
      cr.recommend_positive_percent,
      cr.continue_positive_percent,
      cr.reception_status

    from public.imported_games ig

    left join community_reception cr
      on cr.imported_game_id = ig.id

    where not public.beta_fixture_hidden(ig.id) and ig.catalogue_eligible = true
      and ig.metadata_backfill_status = 'complete'
      and ig.title is not null
      and ig.developer_name is not null
      and ig.genre is not null
      and ig.image_url is not null

      and not exists (
        select 1
        from public.approved_games duplicate_ag
        where nullif(
          trim(duplicate_ag.steam_app_id::text),
          ''
        ) = trim(ig.steam_app_id::text)
      )
  ),

  ranked as (
    select
      c.*,

      
      false as is_demo_data,

      
      case c.reception_status
        when 'Excellent reception' then 0
        when 'Positive reception' then 1
        when 'Early results' then 2
        when 'Mixed reception' then 3
        when 'Poor reception' then 4
        else 5
      end as reception_tier,



      case
        when coalesce(c.rated_test_count, 0) > 0
          and c.average_overall_score is not null
        then (
          (
            c.average_overall_score
            * c.rated_test_count
          )
          +
          (6.0 * 5)
        )
        /
        (
          c.rated_test_count + 5
        )

        else null
      end::numeric as confidence_rating,



      case
        when lower(c.title) =
             lower(trim(p_search))
        then 100

        when lower(c.title) like
             lower(trim(p_search)) || '%'
        then 90

        when lower(c.title) like
             '%' || lower(trim(p_search)) || '%'
        then 80

        when lower(c.developer_name) =
             lower(trim(p_search))
        then 70

        when lower(c.developer_name) like
             lower(trim(p_search)) || '%'
        then 60

        when lower(c.developer_name) like
             '%' || lower(trim(p_search)) || '%'
        then 50

        when lower(c.genre) like
             '%' || lower(trim(p_search)) || '%'
        then 30

        when lower(c.description) like
             '%' || lower(trim(p_search)) || '%'
        then 10

        else 0
      end as search_relevance

    from catalogue c
  ),

  filtered as (
    select
      r.*,

      
      case
        when not r.has_playtested_profile then 3
        when coalesce(r.rated_test_count,0)>0 and r.average_overall_score>=6 then 0
        when coalesce(r.rated_test_count,0)=0 or r.average_overall_score is null then 1
        else 2 end as featured_tier

    from ranked r

    where



      (
        coalesce(trim(p_search), '') = ''

        or r.title ilike
           '%' || trim(p_search) || '%'

        or r.developer_name ilike
           '%' || trim(p_search) || '%'

        or r.genre ilike
           '%' || trim(p_search) || '%'

        or r.description ilike
           '%' || trim(p_search) || '%'
      )



      and (
        coalesce(
          p_genre,
          'All genres'
        ) = 'All genres'

        or exists (
          select 1

          from unnest(
            string_to_array(r.genre, ',')
          ) as genre_part

          where lower(trim(genre_part)) =
                lower(trim(p_genre))
        )
      )



      and (
        coalesce(
          p_verification,
          'All verification statuses'
        ) = 'All verification statuses'

        or (
          p_verification = 'Steam listings'
          and r.source_type = 'steam'
        )

        or (
          p_verification = 'Verified'
          and r.verification_status = 'Verified'
        )

        or (
          p_verification = 'Assessed'
          and r.verification_status = 'Assessed'
        )

        or (
          p_verification = 'Not yet verified'
          and r.verification_status =
              'Not yet verified'
        )
      )



      and (
        coalesce(
          p_ai_type,
          'All AI types'
        ) = 'All AI types'

        or r.ai_type = p_ai_type
      )



      and (
        p_include_nsfw = true
        or r.is_nsfw = false
      )
  ),

  counted as (
    select
      f.*,
      count(*) over () as total_count

    from filtered f
  )

  select
    c.source_type,
    c.game_id,
    c.steam_app_id,
    c.title,
    c.developer_name,
    c.genre,
    c.description,
    c.image_url,
    c.game_link,
    c.ai_type,
    c.verification_status,
    c.quality_score,
    c.submitted_at,
    c.is_nsfw,
    c.has_playtested_profile,
    c.total_count,
    c.platform

  from counted c

  order by



    case
      when coalesce(trim(p_search), '') <> ''
      then c.search_relevance
    end desc nulls last,



    case
      when p_sort = 'Featured'
      then c.featured_tier
    end asc nulls last,



    case when p_sort='Featured' and c.featured_tier in(0,2) then c.average_overall_score end desc nulls last,
    case when p_sort='Featured' and c.featured_tier=1 then c.submitted_at end desc nulls last,
    
    case
      when p_sort = 'Recently added'
      then c.submitted_at
    end desc nulls last,



    case
      when p_sort = 'Highest rated'
       and coalesce(c.rated_test_count, 0) > 0
      then 0

      when p_sort = 'Highest rated'
      then 1
    end asc nulls last,


    
    case
      when p_sort = 'Highest rated'
      then c.confidence_rating
    end desc nulls last,


    
    case
      when p_sort = 'Highest rated'
      then c.rated_test_count
    end desc nulls last,


    
    case
      when p_sort = 'Highest rated'
      then c.average_overall_score
    end desc nulls last,


    
    case
      when p_sort = 'Title A-Z'
      then lower(c.title)
    end asc nulls last,


    
    c.featured_tier asc,
    c.submitted_at desc nulls last,
    lower(c.title) asc,
    c.game_id asc

  limit greatest(
    1,
    least(
      coalesce(p_page_size, 12),
      100
    )
  )

  offset (
    (
      greatest(
        coalesce(p_page, 1),
        1
      ) - 1
    )
    *
    greatest(
      1,
      least(
        coalesce(p_page_size, 12),
        100
      )
    )
  );

$function$
;

commit;

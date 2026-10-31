begin;

-- A game has one current developer relationship. Historical claim decisions stay
-- in game_claims; game_developer_links represents only the current relationship.
create unique index if not exists game_developer_links_one_imported_owner
  on public.game_developer_links (imported_game_id)
  where imported_game_id is not null;
create unique index if not exists game_developer_links_one_approved_owner
  on public.game_developer_links (approved_game_id)
  where approved_game_id is not null;
create unique index if not exists game_developer_links_one_submission_owner
  on public.game_developer_links (submission_id)
  where submission_id is not null;

create or replace function public.review_game_claim(
  p_claim_id uuid,
  p_status text,
  p_admin_notes text default null
) returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_claim public.game_claims%rowtype;
  v_scope text;
begin
  if v_admin_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_admin_id and p.role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('Pending', 'Approved', 'Rejected', 'Needs More Information') then
    raise exception 'Invalid claim status';
  end if;

  if p_status in ('Rejected', 'Needs More Information')
     and nullif(trim(coalesce(p_admin_notes, '')), '') is null then
    raise exception 'Admin notes are required for this decision';
  end if;

  select * into v_claim
  from public.game_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'Developer claim not found';
  end if;

  if num_nonnulls(v_claim.imported_game_id, v_claim.approved_game_id, v_claim.submission_id) <> 1 then
    raise exception 'Developer claim does not identify exactly one game';
  end if;

  v_scope := case
    when v_claim.imported_game_id is not null then 'imported:' || v_claim.imported_game_id::text
    when v_claim.approved_game_id is not null then 'approved:' || v_claim.approved_game_id::text
    else 'submission:' || v_claim.submission_id::text
  end;
  perform pg_advisory_xact_lock(hashtextextended('playtested:ownership:' || v_scope, 0));

  if p_status = 'Approved' then
    -- Transfer the canonical relationship atomically. A pending competing claim
    -- never changes the existing owner; only admin approval does.
    delete from public.game_developer_links l
    where (v_claim.imported_game_id is not null and l.imported_game_id = v_claim.imported_game_id)
       or (v_claim.approved_game_id is not null and l.approved_game_id = v_claim.approved_game_id)
       or (v_claim.submission_id is not null and l.submission_id = v_claim.submission_id);

    insert into public.game_developer_links (
      developer_id,
      imported_game_id,
      approved_game_id,
      submission_id,
      relationship,
      source_claim_id
    ) values (
      v_claim.claimant_id,
      v_claim.imported_game_id,
      v_claim.approved_game_id,
      v_claim.submission_id,
      v_claim.relationship,
      v_claim.id
    );
  elsif v_claim.status = 'Approved' and p_status <> 'Approved' then
    -- Reversing the currently approved claim removes only the relationship that
    -- came from this claim. Historical claim rows are retained.
    delete from public.game_developer_links l
    where l.source_claim_id = v_claim.id;
  end if;

  update public.game_claims
  set status = p_status,
      admin_notes = case
        when p_status in ('Rejected', 'Needs More Information')
          then nullif(trim(coalesce(p_admin_notes, '')), '')
        else nullif(trim(coalesce(p_admin_notes, '')), '')
      end,
      reviewed_at = case when p_status = 'Pending' then null else clock_timestamp() end,
      reviewed_by = case when p_status = 'Pending' then null else v_admin_id end
  where id = v_claim.id;
end;
$$;

revoke all on function public.review_game_claim(uuid,text,text) from public, anon;
grant execute on function public.review_game_claim(uuid,text,text) to authenticated;

-- Developers may only create claims for a canonical existing game. Imported
-- Steam games must be catalogue eligible; approved/submission targets must
-- still exist. Existing historical rows are untouched.
alter policy "Developers can create their own claims"
on public.game_claims
with check (
  claimant_id = auth.uid()
  and status = 'Pending'
  and admin_notes is null
  and reviewed_at is null
  and reviewed_by is null
  and coalesce(verification_status, 'Not Submitted') = 'Not Submitted'
  and num_nonnulls(imported_game_id, approved_game_id, submission_id) = 1
  and (
    (imported_game_id is not null and exists (
      select 1 from public.imported_games ig
      where ig.id = imported_game_id and ig.catalogue_eligible = true
    ))
    or (approved_game_id is not null and exists (
      select 1 from public.approved_games ag where ag.id = approved_game_id
    ))
    or (submission_id is not null and exists (
      select 1 from public.game_submissions s where s.id = submission_id
    ))
  )
);

-- Public catalogue: an approved developer relationship makes an imported game
-- a Playtested-backed listing. It still needs a usable title, but incomplete
-- Steam enrichment must not hide a developer-owned game. Developer-backed
-- games are promoted in Featured alongside direct developer submissions.
create or replace function public.get_public_catalogue(
  p_page integer default 1,
  p_page_size integer default 12,
  p_search text default '',
  p_genre text default 'All genres',
  p_verification text default 'All verification statuses',
  p_ai_type text default 'All AI types',
  p_include_nsfw boolean default false,
  p_sort text default 'Featured'
) returns table(
  source_type text, game_id uuid, steam_app_id text, title text,
  developer_name text, genre text, description text, image_url text,
  game_link text, ai_type text, verification_status text,
  quality_score numeric, submitted_at timestamptz, is_nsfw boolean,
  has_playtested_profile boolean, total_count bigint
)
language sql stable set search_path to 'public'
as $$
with community_reception as (
  select * from public.get_game_community_reception()
), catalogue as (
  select 'approved'::text source_type, ag.id game_id,
    nullif(trim(ag.steam_app_id::text),'') steam_app_id,
    coalesce(ag.title,'Untitled game')::text title,
    coalesce(ag.developer_name,'Unknown developer')::text developer_name,
    coalesce(ag.genre,'Uncategorised')::text genre,
    coalesce(ag.description,'')::text description,
    coalesce(ag.image_url,'')::text image_url,
    coalesce(ag.game_link,'')::text game_link,
    coalesce(ag.ai_type,'AI use unknown')::text ai_type,
    coalesce(pgv.verification_status::text,'Not yet verified') verification_status,
    coalesce(pgv.quality_score,0)::numeric quality_score,
    ag.submitted_at, false is_nsfw, true has_playtested_profile,
    cr.accepted_test_count, cr.rated_test_count, cr.average_overall_score,
    cr.recommend_positive_percent, cr.continue_positive_percent, cr.reception_status
  from public.approved_games ag
  left join public.published_game_verifications pgv on pgv.game_id=ag.id
  left join community_reception cr on cr.submission_id=ag.id or cr.approved_game_id=ag.id
  union all
  select 'steam'::text, ig.id, trim(ig.steam_app_id::text),
    coalesce(ig.title,'Untitled Steam game')::text,
    coalesce(ig.developer_name,'Unknown developer')::text,
    coalesce(ig.genre,'Uncategorised')::text,
    coalesce(ig.description,'')::text,
    coalesce(ig.image_url,'')::text,
    coalesce(ig.steam_url,'https://store.steampowered.com/app/'||trim(ig.steam_app_id::text)||'/')::text,
    'AI use unknown'::text, 'Not yet verified'::text, 0::numeric,
    ig.imported_at, coalesce(ig.is_nsfw,false),
    exists(select 1 from public.game_developer_links gdl where gdl.imported_game_id=ig.id),
    cr.accepted_test_count, cr.rated_test_count, cr.average_overall_score,
    cr.recommend_positive_percent, cr.continue_positive_percent, cr.reception_status
  from public.imported_games ig
  left join community_reception cr on cr.imported_game_id=ig.id
  where ig.catalogue_eligible=true
    and ig.title is not null
    and (
      exists(select 1 from public.game_developer_links gdl where gdl.imported_game_id=ig.id)
      or (ig.metadata_backfill_status='complete' and ig.developer_name is not null and ig.genre is not null and ig.image_url is not null)
    )
    and not exists (
      select 1 from public.approved_games duplicate_ag
      where nullif(trim(duplicate_ag.steam_app_id::text),'')=trim(ig.steam_app_id::text)
    )
), ranked as (
  select c.*,
    case when coalesce(c.accepted_test_count,0)>0 then false
      when lower(c.title) like 'test %' or lower(c.title) like '% test' or lower(c.title) like 'demo %'
        or lower(c.developer_name) in ('test studio','demo studio','playtested test studio') then true
      else false end is_demo_data,
    case c.reception_status when 'Excellent reception' then 0 when 'Positive reception' then 1
      when 'Early results' then 2 when 'Mixed reception' then 3 when 'Poor reception' then 4 else 5 end reception_tier,
    case when coalesce(c.rated_test_count,0)>0 and c.average_overall_score is not null
      then ((c.average_overall_score*c.rated_test_count)+(6.0*5))/(c.rated_test_count+5) else null end::numeric confidence_rating,
    case when lower(c.title)=lower(trim(p_search)) then 100
      when lower(c.title) like lower(trim(p_search))||'%' then 90
      when lower(c.title) like '%'||lower(trim(p_search))||'%' then 80
      when lower(c.developer_name)=lower(trim(p_search)) then 70
      when lower(c.developer_name) like lower(trim(p_search))||'%' then 60
      when lower(c.developer_name) like '%'||lower(trim(p_search))||'%' then 50
      when lower(c.genre) like '%'||lower(trim(p_search))||'%' then 30
      when lower(c.description) like '%'||lower(trim(p_search))||'%' then 10 else 0 end search_relevance
  from catalogue c
), filtered as (
  select r.*,
    case when r.is_demo_data then 5
      when r.verification_status='Verified' then 0
      when r.verification_status='Assessed' then 1
      when (r.source_type='approved' or r.has_playtested_profile) then 2
      else 4 end featured_tier
  from ranked r
  where (coalesce(trim(p_search),'')='' or r.title ilike '%'||trim(p_search)||'%'
      or r.developer_name ilike '%'||trim(p_search)||'%' or r.genre ilike '%'||trim(p_search)||'%'
      or r.description ilike '%'||trim(p_search)||'%')
    and (coalesce(p_genre,'All genres')='All genres' or exists(
      select 1 from unnest(string_to_array(r.genre,',')) genre_part
      where lower(trim(genre_part))=lower(trim(p_genre))))
    and (coalesce(p_verification,'All verification statuses')='All verification statuses'
      or (p_verification='Steam listings' and r.source_type='steam')
      or (p_verification='Verified' and r.verification_status='Verified')
      or (p_verification='Assessed' and r.verification_status='Assessed')
      or (p_verification='Not yet verified' and r.verification_status='Not yet verified'))
    and (coalesce(p_ai_type,'All AI types')='All AI types' or r.ai_type=p_ai_type)
    and (p_include_nsfw=true or r.is_nsfw=false)
), counted as (
  select f.*,count(*) over() total_count from filtered f
)
select c.source_type,c.game_id,c.steam_app_id,c.title,c.developer_name,c.genre,c.description,c.image_url,
  c.game_link,c.ai_type,c.verification_status,c.quality_score,c.submitted_at,c.is_nsfw,c.has_playtested_profile,c.total_count
from counted c
order by
  case when coalesce(trim(p_search),'')<>'' then c.search_relevance end desc nulls last,
  case when p_sort='Featured' then c.featured_tier end asc nulls last,
  case when p_sort='Featured' and c.featured_tier=2 then c.submitted_at end desc nulls last,
  case when p_sort='Recently added' then c.submitted_at end desc nulls last,
  case when p_sort='Highest rated' and coalesce(c.rated_test_count,0)>0 then 0 when p_sort='Highest rated' then 1 end asc nulls last,
  case when p_sort='Highest rated' then c.confidence_rating end desc nulls last,
  case when p_sort='Highest rated' then c.rated_test_count end desc nulls last,
  case when p_sort='Highest rated' then c.average_overall_score end desc nulls last,
  case when p_sort='Title A-Z' then lower(c.title) end asc nulls last,
  c.featured_tier asc,c.submitted_at desc nulls last,lower(c.title) asc,c.game_id asc
limit greatest(1,least(coalesce(p_page_size,12),100))
offset ((greatest(coalesce(p_page,1),1)-1)*greatest(1,least(coalesce(p_page_size,12),100)));
$$;

commit;

begin;
create table public.m24_page_views (
  event_id uuid primary key,
  visitor_id uuid not null,
  occurred_at timestamptz not null default now(),
  page text not null check (length(page) <= 40),
  source text check (source ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  medium text check (medium ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  campaign text check (campaign ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  referral text check (referral in ('reddit','search','external'))
);
create index m24_views_time on public.m24_page_views(occurred_at);
alter table public.m24_page_views enable row level security;
revoke all on public.m24_page_views from public, anon, authenticated;
grant select, insert, delete on public.m24_page_views to service_role;

create table public.m24_submission_acquisition (
  submission_id uuid primary key references public.game_submissions(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  source text check (source ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  medium text check (medium ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  campaign text check (campaign ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  referral text check (referral in ('reddit','search','external')),
  self_reported text check (self_reported in ('Reddit outreach','Reddit post','Organic search','External referral','Direct','Other'))
);
alter table public.m24_submission_acquisition enable row level security;
revoke all on public.m24_submission_acquisition from public, anon, authenticated;
grant select, insert, delete on public.m24_submission_acquisition to service_role;

create function public.record_submission_acquisition(p_id uuid, p_source text default null, p_medium text default null, p_campaign text default null, p_referral text default null, p_self_reported text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.game_submissions where id=p_id and developer_id=auth.uid()) then
    raise exception 'Submission owner required.';
  end if;
  insert into public.m24_submission_acquisition(submission_id,source,medium,campaign,referral,self_reported)
  values(p_id,p_source,p_medium,p_campaign,p_referral,p_self_reported) on conflict(submission_id) do nothing;
end $$;
revoke all on function public.record_submission_acquisition(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.record_submission_acquisition(uuid,text,text,text,text,text) to authenticated;

create function public.m24_analytics_summary() returns jsonb language sql security definer set search_path='' as $$
select jsonb_build_object(
  'windows',(select jsonb_agg(jsonb_build_object('days',d,'visitors',visitors,'views',views) order by d) from (
    select d,count(distinct v.visitor_id) visitors,count(v.event_id) views from unnest(array[1,7,30]) d
    left join public.m24_page_views v on v.occurred_at>=now()-make_interval(days=>d) group by d) w),
  'trend',(select coalesce(jsonb_agg(to_jsonb(t) order by t.day),'[]'::jsonb) from (
    select day_date::date as day,count(v.event_id) views,count(distinct v.visitor_id) visitors
    from generate_series((now() at time zone 'UTC')::date-29,(now() at time zone 'UTC')::date,'1 day') as calendar(day_date)
    left join public.m24_page_views v on (v.occurred_at at time zone 'UTC')::date=day_date::date group by day_date) t),
  'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by views desc),'[]'::jsonb) from (
    select coalesce(source,referral,'direct_or_unknown') source,medium,campaign,count(*) views,count(distinct visitor_id) visitors
    from public.m24_page_views where occurred_at>=now()-interval '30 days' group by 1,2,3 order by count(*) desc limit 50) s),
  'submissions',(select coalesce(jsonb_agg(to_jsonb(s) order by submissions desc),'[]'::jsonb) from (
    select coalesce(a.source,a.referral,'unknown') source,a.campaign,a.self_reported,count(*) submissions,
      count(*) filter(where g.status='Approved') approved
    from public.game_submissions g left join public.m24_submission_acquisition a on a.submission_id=g.id
    where g.submitted_at>=now()-interval '30 days' group by 1,2,3 order by count(*) desc limit 50) s)
);
$$;
revoke all on function public.m24_analytics_summary() from public,anon,authenticated;
grant execute on function public.m24_analytics_summary() to service_role;

-- Schedule through the project's existing pg_cron if available. No new service/cost.
create function public.m24_analytics_retention() returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.m24_page_views where occurred_at < now()-interval '90 days';
  delete from public.m24_submission_acquisition where recorded_at < now()-interval '90 days';
end $$;
revoke all on function public.m24_analytics_retention() from public,anon,authenticated;
grant execute on function public.m24_analytics_retention() to service_role;
do $$begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('m24-analytics-retention','17 3 * * *','select public.m24_analytics_retention()');
  end if;
end $$;
commit;

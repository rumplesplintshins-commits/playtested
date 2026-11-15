-- Pin event counts across All result pages; stable ID ties cannot move when titles change.
begin;
create or replace function public.m26_steam_referrals_window(p_limit integer,p_offset integer,p_as_of timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;cutoff timestamptz:=coalesce(p_as_of,clock_timestamp());
begin
 if cutoff>clock_timestamp()+interval '1 minute' or cutoff<now()-interval '90 days' then raise exception 'Invalid reporting snapshot';end if;
 if p_limit not in(10,25,50,100) or p_limit is null or p_offset<0 or p_offset is null then raise exception 'Invalid result window';end if;
 with counts as(select game_kind,game_id,count(*) clicks from public.m26_steam_clicks where source='tester_activity' and occurred_at>=cutoff-interval '90 days' and occurred_at<=cutoff group by game_kind,game_id),
 titled as(select x.*,coalesce(nullif((select published->>'title' from public.listing_states where game_key=case when (case when x.game_kind='imported' then i.steam_app_id else coalesce(s.steam_app_id,a.steam_app_id) end)~'^[0-9]+$' then 'steam:'||(case when x.game_kind='imported' then i.steam_app_id else coalesce(s.steam_app_id,a.steam_app_id) end) else case when x.game_kind='imported' then 'imported:' else 'game:' end||x.game_id::text end),''),case when x.game_kind='imported' then i.title else coalesce(s.title,a.title) end,'Game no longer available') title from counts x left join public.game_submissions s on x.game_kind='submission' and s.id=x.game_id left join public.approved_games a on x.game_kind='submission' and a.id=x.game_id left join public.imported_games i on x.game_kind='imported' and i.id=x.game_id),
 page as(select * from titled order by clicks desc,game_kind,game_id limit p_limit offset p_offset)
 select jsonb_build_object('as_of',cutoff,'total_clicks',coalesce((select sum(clicks) from counts),0),'total_games',(select count(*) from counts),'games',coalesce((select jsonb_agg(to_jsonb(page) order by clicks desc,game_kind,game_id) from page),'[]'::jsonb)) into result;
 return result;
end;$$;

revoke all on function public.m26_steam_referrals_window(integer,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.m26_steam_referrals_window(integer,integer,timestamptz) to service_role;
create or replace function public.m26_steam_referrals(p_limit integer default 10,p_offset integer default 0) returns jsonb language sql stable security definer set search_path='' as $$select public.m26_steam_referrals_window(p_limit,p_offset,null);$$;
commit;

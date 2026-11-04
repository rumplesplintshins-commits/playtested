-- Private own-report metadata and consented, identity-free outbound Steam click aggregates.
begin;
create or replace function public._m26_activity_game(p_test uuid,p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.community_game_tests;c public.community_playtests;gid uuid;kind text;g jsonb;k text;
begin
 select * into t from public.community_game_tests where id=p_test and tester_id=p_actor;
 if not found or p_actor is null then return null;end if;
 select * into c from public.community_playtests where id=t.playtest_id;
 if c.imported_game_id is not null then gid:=c.imported_game_id;kind:='imported';select to_jsonb(i) into g from public.imported_games i where id=gid;
 else gid:=coalesce(c.submission_id,c.approved_game_id,t.legacy_submission_id,t.submission_id);kind:='submission';
 select coalesce((select to_jsonb(s) from public.game_submissions s where s.id=gid),(select to_jsonb(a) from public.approved_games a where a.id=gid)) into g;end if;
 if g is null then return jsonb_build_object('test_id',t.id,'title',c.title);end if;
 k:=public._share_key(case when kind='submission' and not exists(select 1 from public.game_submissions where id=gid) then 'approved' else kind end,gid);
 return jsonb_build_object('test_id',t.id,'game_id',gid,'game_kind',kind,'title',coalesce((select published->>'title' from public.listing_states where game_key=k),g->>'title',c.title),'developer_name',g->>'developer_name','image_url',g->>'image_url','store_url',coalesce(nullif(g->>'steam_url',''),nullif(g->>'game_link','')));
end;$$;
revoke all on function public._m26_activity_game(uuid,uuid) from public,anon,authenticated;
create or replace function public.get_my_testing_activity_media()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(public._m26_activity_game(t.id,auth.uid())),'[]'::jsonb) from public.community_game_tests t where t.tester_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.get_my_testing_activity_media() from public,anon;
grant execute on function public.get_my_testing_activity_media() to authenticated;

-- No account, report, session, IP, user-agent, title, destination URL or device identifier stored.
-- No FK: deletion of a listing does not silently erase aggregate historical attribution.
create table public.m26_steam_clicks(
 event_id uuid primary key,
 game_id uuid not null,
 game_kind text not null check(game_kind in('submission','imported')),
 source text not null default 'tester_activity' check(source='tester_activity'),
 occurred_at timestamptz not null default clock_timestamp()
);
create index m26_steam_clicks_game on public.m26_steam_clicks(game_kind,game_id);
create index m26_steam_clicks_retention on public.m26_steam_clicks(occurred_at);
alter table public.m26_steam_clicks enable row level security;
revoke all on public.m26_steam_clicks from public,anon,authenticated;
grant all on public.m26_steam_clicks to service_role;
create or replace function public.record_testing_activity_steam_click(p_actor uuid,p_test uuid,p_event uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare g jsonb;url text;
begin
 if p_event is null or not exists(select 1 from public.profiles where id=p_actor and role is distinct from 'admin' and 'tester'=any(roles)) then return false;end if;
 -- Submitted/history only, never an available-game or admin link.
 if not exists(select 1 from public.community_game_tests where id=p_test and tester_id=p_actor and (submitted_at is not null or status in('reviewed','expired'))) then return false;end if;
 g:=public._m26_activity_game(p_test,p_actor);url:=g->>'store_url';
 if g->>'game_id' is null or url is null or url !~ '^https://store\.steampowered\.com/app/[0-9]+(/[^?#[:space:]]*)?([?#][^[:space:]]*)?$' then return false;end if;
 insert into public.m26_steam_clicks(event_id,game_id,game_kind) values(p_event,(g->>'game_id')::uuid,g->>'game_kind') on conflict(event_id) do nothing;
 return true;
end;$$;
revoke all on function public.record_testing_activity_steam_click(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_testing_activity_steam_click(uuid,uuid,uuid) to service_role;

create or replace function public.m26_steam_referrals(p_limit integer default 10,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_limit not in(10,25,50,100) or p_limit is null or p_offset<0 or p_offset is null then raise exception 'Invalid result window';end if;
 with counts as(select game_kind,game_id,count(*) clicks from public.m26_steam_clicks where source='tester_activity' and occurred_at>=now()-interval '90 days' group by game_kind,game_id),
 titled as(select x.*,coalesce(nullif((select published->>'title' from public.listing_states where game_key=case when (case when x.game_kind='imported' then i.steam_app_id else coalesce(s.steam_app_id,a.steam_app_id) end)~'^[0-9]+$' then 'steam:'||(case when x.game_kind='imported' then i.steam_app_id else coalesce(s.steam_app_id,a.steam_app_id) end) else case when x.game_kind='imported' then 'imported:' else 'game:' end||x.game_id::text end),''),case when x.game_kind='imported' then i.title else coalesce(s.title,a.title) end,'Game no longer available') title from counts x left join public.game_submissions s on x.game_kind='submission' and s.id=x.game_id left join public.approved_games a on x.game_kind='submission' and a.id=x.game_id left join public.imported_games i on x.game_kind='imported' and i.id=x.game_id),
 page as(select * from titled order by clicks desc,lower(title),game_kind,game_id limit p_limit offset p_offset)
 select jsonb_build_object('total_clicks',coalesce((select sum(clicks) from counts),0),'total_games',(select count(*) from counts),'games',coalesce((select jsonb_agg(to_jsonb(page) order by clicks desc,lower(title),game_kind,game_id) from page),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.m26_steam_referrals(integer,integer) from public,anon,authenticated;
grant execute on function public.m26_steam_referrals(integer,integer) to service_role;
-- Reuse existing daily retention job. No new scheduler or tracking infrastructure.
create or replace function public.m24_analytics_retention() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.m24_page_views where occurred_at<now()-interval '90 days';
 delete from public.m24_submission_acquisition where recorded_at<now()-interval '90 days';
 delete from public.m26_steam_clicks where occurred_at<now()-interval '90 days';
end;$$;
commit;

begin;
-- Requires 012's authoritative, server-time reservation accounting; never activates it.
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='community_game_tests' and column_name='reservation_expires_at') then
  raise exception 'Apply migration 202610280012_tester_reservations.sql first.';
 end if;
end;$$;

-- Bounded public summary, not access to private campaign or participant records.
create function public.get_public_recruitment(p_games jsonb)
returns table(source_type text,game_id uuid,recruiting boolean)
language plpgsql volatile security definer set search_path='' as $$begin
 if jsonb_typeof(p_games) is distinct from 'array' then raise exception 'Expected a page of game IDs.';end if;
 if jsonb_array_length(p_games)>12 then raise exception 'At most 12 catalogue games per request.';end if;
 return query
 with requested as(select distinct r.source_type,r.game_id from jsonb_to_recordset(p_games) as r(source_type text,game_id uuid)),
 listings as(
  select r.*,i.steam_app_id from requested r join public.imported_games i on r.source_type='steam' and i.id=r.game_id
   where i.catalogue_eligible and coalesce(i.catalogue_review_status,'eligible')='eligible'
  union all
  select r.*,coalesce(a.steam_app_id,s.steam_app_id) from requested r
   left join public.approved_games a on a.id=r.game_id
   left join public.game_submissions s on s.id=r.game_id and s.status='Approved'
   where r.source_type='approved' and(a.id is not null or s.id is not null)
 )
 select l.source_type,l.game_id,exists(
  select 1 from public.community_playtests c
   left join public.imported_games i on i.id=c.imported_game_id
   left join public.approved_games a on a.id=c.approved_game_id
   left join public.game_submissions s on s.id=c.submission_id
  where c.status='open' and c.published_at is not null and c.audience in('playtested_testers','both')
   and (
    (l.source_type='steam' and c.imported_game_id=l.game_id)
    or(l.source_type='approved' and(c.approved_game_id=l.game_id or c.submission_id=l.game_id))
    -- Cross-source aliases use the canonical Steam app ID, never a title.
    or(l.steam_app_id~'^[0-9]+$' and l.steam_app_id=coalesce(i.steam_app_id,a.steam_app_id,s.steam_app_id))
   )
   and (select p.available from public.campaign_places(c.id)p)>0
 ) from listings l;
end;$$;
revoke all on function public.get_public_recruitment(jsonb) from public;
grant execute on function public.get_public_recruitment(jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;

begin;
create function public._testing_audience_exists(p_rank integer,p_genre text,p_restricted boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where 'tester'=any(p.roles)
  and public.tester_rank(p.id)>=p_rank
  and (not p_restricted or array_remove(public.game_genres(p_genre),'Other') && public.normalize_testing_genres(p.preferred_genres)));
$$;
revoke all on function public._testing_audience_exists(integer,text,boolean) from public,anon,authenticated;

create function public.get_testing_audience_availability(p_minimum_rank integer,p_testing_genre text,p_genre_restricted boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles)) then raise exception 'Developer access required.'; end if;
 if p_minimum_rank is null or p_minimum_rank not between 0 and 3 or p_genre_restricted is null then raise exception 'Select valid audience settings.'; end if;
 return public._testing_audience_exists(p_minimum_rank,p_testing_genre,p_genre_restricted);
end;
$$;
revoke all on function public.get_testing_audience_availability(integer,text,boolean) from public,anon;
grant execute on function public.get_testing_audience_availability(integer,text,boolean) to authenticated;

create function public.guard_testing_audience_availability() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if NEW.status<>'open' or NEW.audience not in ('both','playtested_testers') then return NEW; end if;
 if TG_OP='UPDATE' then
  -- Preserve ongoing campaigns when the pool changes. Pause/close always remain possible.
  if OLD.status='open' and OLD.audience in ('both','playtested_testers')
   and NEW.minimum_rank is not distinct from OLD.minimum_rank
   and NEW.testing_genre is not distinct from OLD.testing_genre
   and NEW.genre_restricted is not distinct from OLD.genre_restricted then return NEW; end if;
 end if;
 if not public._testing_audience_exists(NEW.minimum_rank,NEW.testing_genre,NEW.genre_restricted) then
  raise exception 'No registered testers match this minimum rank and genre requirement. Lower the rank or broaden the genre audience before publishing. You can still save a draft.';
 end if;
 return NEW;
end;
$$;
revoke all on function public.guard_testing_audience_availability() from public,anon,authenticated;
create trigger check_testing_audience_availability before insert or update on public.community_playtests
for each row execute function public.guard_testing_audience_availability();
notify pgrst,'reload schema';
commit;

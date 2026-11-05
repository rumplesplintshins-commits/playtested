begin;
-- No backfill, truncation or constraint validation against historical titles.
create function public.m261_validate_game_title() returns trigger
language plpgsql set search_path='' as $$
begin
 if char_length(btrim(new.title))<=60 or new.title is null then return new;end if;
 if tg_op='UPDATE' then
  if btrim(new.title) is not distinct from btrim(old.title) then return new;end if;
 elsif exists(select 1 from public.imported_games i where i.steam_app_id::text=btrim(new.steam_app_id::text) and btrim(i.title)=btrim(new.title)) then
  -- Claiming an existing imported game preserves its original historical title.
  return new;
 end if;
 raise exception 'Use a game title of 60 characters or fewer. Existing longer titles may remain unchanged.' using errcode='22001';
end;$$;
revoke all on function public.m261_validate_game_title() from public,anon,authenticated;
create trigger m261_game_title_limit before insert or update of title on public.game_submissions for each row execute function public.m261_validate_game_title();

create function public.m261_validate_revision_title() returns trigger
language plpgsql set search_path='' as $$
begin
 if char_length(btrim(new.proposed->>'title'))>60 and btrim(new.proposed->>'title') is distinct from btrim(new.before_fields->>'title') then
  if tg_op='UPDATE' then if new.proposed->>'title' is not distinct from old.proposed->>'title' then return new;end if;end if;
  raise exception 'Use a game title of 60 characters or fewer. Existing longer titles may remain unchanged.' using errcode='22001';
 end if;
 return new;
end;$$;
revoke all on function public.m261_validate_revision_title() from public,anon,authenticated;
create trigger m261_revision_title_limit before insert or update of proposed on public.listing_revisions for each row execute function public.m261_validate_revision_title();
commit;

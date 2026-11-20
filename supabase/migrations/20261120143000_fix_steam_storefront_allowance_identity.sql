begin;
set local lock_timeout = '5s';
lock table public.imported_games, public.community_playtests,
 playtested_studios.games, playtested_studios.launches, playtested_studios.game_aliases
 in share row exclusive mode;

do $$
declare
 definition text;
 revised text;
begin
 definition := pg_get_functiondef('playtested_studios.raw_identity(text,text)'::regprocedure);
 revised := replace(definition, $sql$ if path='' then path:='/';end if;$sql$, $sql$
 -- A storefront homepage identifies the store, even when it has query parameters.
 -- Numeric Steam IDs and app URLs have already been resolved above.
 if host='store.steampowered.com' and split_part(path,'?',1) in ('','/') then return null;end if;
 if path='' then path:='/';end if;$sql$);
 if definition = revised then raise exception 'Steam storefront identity contract changed.'; end if;
 execute revised;
end
$$;

-- The imported identity index stores the result of the immutable normalizer.
reindex index public.imported_games_allowance_identity;

-- Preserve the original ledger, including the key recorded at launch time.
-- This table records the source-backed correction for those historical entries.
create table playtested_studios.launch_identity_corrections (
 campaign_id uuid primary key references playtested_studios.launches(campaign_id),
 game_key text not null
);
alter table playtested_studios.launch_identity_corrections enable row level security;
revoke all on playtested_studios.launch_identity_corrections from public, anon, authenticated, service_role;

do $$
begin
 if exists (
  select 1 from playtested_studios.game_aliases
  where alias_key ~ '^url:store[.]steampowered[.]com/?([?].*)?$'
     or canonical_key ~ '^url:store[.]steampowered[.]com/?([?].*)?$'
 ) then
  raise exception 'A reviewed storefront alias requires reconciliation first.';
 end if;
 if exists (
  select 1 from playtested_studios.launches l
  left join public.community_playtests c on c.id=l.campaign_id
  where l.game_key ~ '^url:store[.]steampowered[.]com/?([?].*)?$'
   and (c.id is null or num_nonnulls(c.imported_game_id,c.approved_game_id,c.submission_id)<>1)
 ) then
  raise exception 'A storefront launch has no unambiguous campaign source.';
 end if;
end
$$;

insert into playtested_studios.launch_identity_corrections(campaign_id,game_key)
select l.campaign_id,playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id)
from playtested_studios.launches l join public.community_playtests c on c.id=l.campaign_id
where l.game_key ~ '^url:store[.]steampowered[.]com/?([?].*)?$';

create function playtested_studios.launch_identity(p_campaign uuid,p_recorded_key text) returns text
language sql stable set search_path='' as $$
 select playtested_studios.canonical(coalesce((
  select correction.game_key from playtested_studios.launch_identity_corrections correction
  where correction.campaign_id=p_campaign
 ),p_recorded_key))
$$;
revoke all on function playtested_studios.launch_identity(uuid,text) from public,anon,authenticated,service_role;

do $$
declare
 target regprocedure;
 definition text;
 revised text;
begin
 foreach target in array array[
  'playtested_studios.first_launch(public.community_playtests,timestamptz)'::regprocedure,
  'public.get_playtest_eligibility(uuid,uuid,uuid)'::regprocedure,
  'playtested_studios.check_submission_identity()'::regprocedure
 ] loop
  definition := pg_get_functiondef(target);
  revised := replace(definition,'playtested_studios.canonical(l.game_key)',
   'playtested_studios.launch_identity(l.campaign_id,l.game_key)');
  if definition = revised then raise exception 'Launch identity contract changed for %.', target; end if;
  if target='playtested_studios.check_submission_identity()'::regprocedure then
   definition := revised;
   revised := replace(definition,$sql$ if k is null then return new;end if;$sql$,$sql$
 if k is null and (
  btrim(new.steam_url) ~* '^https?://store[.]steampowered[.]com/?([?#].*)?$'
  or btrim(new.game_link) ~* '^https?://store[.]steampowered[.]com/?([?#].*)?$'
 ) then
  raise exception 'Use the individual Steam app page, not the Steam storefront homepage.';
 end if;
 if k is null then return new;end if;$sql$);
   if definition = revised then raise exception 'Submission identity contract changed.'; end if;
  end if;
  execute revised;
 end loop;
end
$$;

-- Let the existing assignment trigger derive the replacement key and acquire
-- the canonical lock. The unique index remains enabled throughout the change.
update playtested_studios.games
set allowance_key=allowance_key
where allowance_key ~ '^url:store[.]steampowered[.]com/?([?].*)?$';

commit;

begin;

create function public.testing_genre_options() returns text[]
language sql immutable set search_path='' as $$
 select array['Action','Action RPG','Adventure','Casual','Horror','Platformer',
              'RPG','Racing','Simulation','Sports','Strategy','Survival','Other'];
$$;

create function public.game_genres(p_value text) returns text[]
language sql immutable set search_path='' as $$
 with tokens as (
   select regexp_replace(lower(btrim(t)), '\s+', ' ', 'g') token
   from regexp_split_to_table(coalesce(p_value,''),'[,;|/&]+') t
 ), mapped as (
   select unnest(case token
     when 'action adventure' then array['Action','Adventure']
     when 'action-adventure' then array['Action','Adventure']
     when 'action-rpg' then array['Action RPG']
     when 'actionrpg' then array['Action RPG']
     when 'role playing' then array['RPG']
     when 'role-playing' then array['RPG']
     when 'roleplaying' then array['RPG']
     when 'platform' then array['Platformer']
     when 'platformers' then array['Platformer']
     else array(select g from unnest(public.testing_genre_options()) g where lower(g)=token)
   end) genre from tokens
 ), meaningful as (
   select g from unnest(public.testing_genre_options()) with ordinality opts(g,pos)
   where g<>'Other' and g in(select genre from mapped) order by pos
 )
 select case when nullif(btrim(p_value),'') is null then array[]::text[]
             when exists(select 1 from meaningful) then array(select g from meaningful)
             else array['Other'] end;
$$;

create function public.normalize_testing_genres(p_values text[]) returns text[]
language sql immutable set search_path='' as $$
 select array(select g from unnest(public.testing_genre_options()) with ordinality opts(g,pos)
   where g in (select unnest(public.game_genres(v)) from unnest(p_values) v)
   order by pos);
$$;

create or replace function public.get_testing_genres() returns setof text
language sql immutable security definer set search_path='' as $$
 select unnest(public.testing_genre_options());
$$;

create or replace function public.update_my_testing_genres(p_genres text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to update preferences.'; end if;
 if coalesce(cardinality(p_genres),0)>30 then raise exception 'Select at most 30 genres.'; end if;
 if exists(select 1 from unnest(p_genres) g where length(g)>100) then raise exception 'Genre is too long.'; end if;
 update public.profiles set preferred_genres=public.normalize_testing_genres(p_genres) where id=auth.uid();
end;
$$;

create or replace function public.campaign_eligible(p_id uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from public.community_playtests c join public.profiles p on p.id=p_user
   where c.id=p_id and 'tester'=any(p.roles)
     and public.tester_rank(p_user)>=c.minimum_rank
     and (not c.genre_restricted or
       array_remove(public.game_genres(c.testing_genre),'Other') && public.normalize_testing_genres(p.preferred_genres))
 );
$$;

-- Interpret legacy preferences without bulk-rewriting profiles or game metadata.
-- Role, rank, capacity and existing-claim guards remain in place.
revoke all on function public.testing_genre_options(),public.game_genres(text),public.normalize_testing_genres(text[]) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

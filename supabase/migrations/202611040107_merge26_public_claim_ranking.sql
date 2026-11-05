-- The public catalogue must recognise claimed imports without exposing private
-- relationship records or depending on the visitor's RLS identity.
begin;
do $$declare definition text;begin
 select pg_get_functiondef('public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'::regprocedure) into definition;
 if position('with community_reception as (' in definition)=0 or position('from public.game_developer_links gdl' in definition)=0 then
  raise exception 'Unexpected catalogue definition; inspect before changing claim recognition.';
 end if;
 definition:=replace(definition,'with community_reception as (',
  'with developer_profiles as materialized (select imported_game_id from public.m26_public_imported_profiles()), community_reception as (');
 execute replace(definition,'from public.game_developer_links gdl','from developer_profiles gdl');
end;$$;
commit;

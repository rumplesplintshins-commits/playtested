-- Own history follows the same published thumbnail override as the listing.
begin;
do $$declare definition text;needle text:='''image_url'',g->>''image_url''';begin
 definition:=pg_get_functiondef('public._m26_activity_game(uuid,uuid)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Unexpected own-history function; review before applying';end if;
 execute replace(definition,needle,'''image_url'',case when exists(select 1 from public.listing_states where game_key=k and published ? ''image_url'') then (select published->>''image_url'' from public.listing_states where game_key=k) else g->>''image_url'' end');
end;$$;
commit;

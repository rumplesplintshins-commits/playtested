-- Fail closed for anonymous callers to closed/private campaign requirement references.
-- Product requirements remain public only through the separately checked approved source.
begin;
do $$
declare definition text;old_guard text:='if not(public._m26_campaign_open(c.id) or c.developer_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role=''admin'')) then';
begin
 definition:=pg_get_functiondef('public.get_game_pc_requirements(jsonb)'::regprocedure);
 if position(old_guard in definition)=0 then raise exception 'Unexpected PC requirement function; review before applying';end if;
 execute replace(definition,old_guard,'if not coalesce(public._m26_campaign_open(c.id) or c.developer_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role=''admin''),false) then');
end;$$;
commit;

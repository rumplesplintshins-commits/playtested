-- Testing Activity derives expiry from server-issued deadlines without rewriting stored status.
begin;
do $$
declare definition text;old_scope text:='(submitted_at is not null or status in(''reviewed'',''expired''))';
begin
 definition:=pg_get_functiondef('public.record_testing_activity_steam_click(uuid,uuid,uuid)'::regprocedure);
 if position(old_scope in definition)=0 then raise exception 'Unexpected activity event writer; review before applying';end if;
 execute replace(definition,old_scope,'(submitted_at is not null or status in(''reviewed'',''expired'') or (status in(''claimed'',''in_progress'') and reservation_expires_at<=clock_timestamp()))');
end;$$;
commit;

-- A missing/null preference must never be interpreted as an opt-in.
begin;
-- Replace by a guarded body edit rather than changing the RPC signature/grants.
do $migration$declare definition text;needle text;begin
 select pg_get_functiondef('public.set_tester_availability_preference(uuid,boolean)'::regprocedure) into definition;
 needle:=' if auth.uid() is null then';
 if position(needle in definition)=0 then raise exception 'Unexpected preference guard.';end if;
 execute replace(definition,needle,' if p_enabled is null then raise exception ''An explicit availability choice is required.'';end if;'||chr(10)||needle);
end;$migration$;
commit;

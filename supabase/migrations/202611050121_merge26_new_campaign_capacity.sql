-- Default for NEW campaigns only. Existing target_testers and all occupied places remain intact.
begin;
do $$begin if not exists(select 1 from public.testing_policy where singleton and places in(3,4)) then raise exception 'Unexpected capacity policy: review configuration';end if;end;$$;
-- Historical installs used a fixed-four CHECK; development already has the reviewed 1..50 bound.
do $$declare definition text;begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.testing_policy'::regclass and conname='testing_policy_places_check';
 if regexp_replace(definition,'[()[:space:]]','','g')='CHECKplaces=4' then
  alter table public.testing_policy drop constraint testing_policy_places_check;
  alter table public.testing_policy add constraint testing_policy_places_check check(places between 1 and 50);
 end if;
end;$$;
alter table public.testing_policy alter column places set default 3;
update public.testing_policy set places=3 where singleton and places=4;
commit;

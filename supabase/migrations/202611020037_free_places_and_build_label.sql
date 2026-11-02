-- Production-readiness limits: keep the free round useful but intentionally small,
-- and keep build/release labels as labels rather than descriptions.
begin;

-- Earlier environments may have used a stricter auto-generated check on places.
alter table public.testing_policy
  drop constraint if exists testing_policy_places_check;

alter table public.testing_policy
  add constraint testing_policy_places_check check (places between 1 and 50);

update public.testing_policy
set places = 3
where singleton = true;

-- Preserve historical labels over 30 characters without allowing new or changed
-- labels over the limit. A normal CHECK constraint would also reject an unrelated
-- update to a legacy row, so use a trigger that only validates inserts or an actual
-- release-label change.
alter table public.community_playtests
  drop constraint if exists community_playtests_release_label_length_check;

create or replace function public.enforce_community_playtest_release_label_length()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if char_length(coalesce(new.release_label, '')) > 30
     and (tg_op = 'INSERT' or new.release_label is distinct from old.release_label) then
    raise exception 'Build / release label must be 30 characters or fewer.'
      using errcode = '22001';
  end if;

  return new;
end;
$function$;

drop trigger if exists community_playtests_release_label_length_trigger
  on public.community_playtests;

create trigger community_playtests_release_label_length_trigger
before insert or update on public.community_playtests
for each row
execute function public.enforce_community_playtest_release_label_length();

notify pgrst, 'reload schema';
commit;

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

-- Do not rewrite historical labels. NOT VALID preserves any legacy rows over the
-- new limit while enforcing the limit for all new/changed rows immediately.
alter table public.community_playtests
  add constraint community_playtests_release_label_length_check
  check (release_label is null or char_length(release_label) <= 30) not valid;

notify pgrst, 'reload schema';
commit;

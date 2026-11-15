-- Keep control audit history without blocking the existing account-deletion workflow.
begin;
alter table public.listing_controls drop constraint listing_controls_updated_by_fkey;
alter table public.listing_controls add constraint listing_controls_updated_by_fkey
 foreign key(updated_by) references auth.users(id) on delete set null;
alter table public.listing_control_events drop constraint listing_control_events_actor_id_fkey;
alter table public.listing_control_events add constraint listing_control_events_actor_id_fkey
 foreign key(actor_id) references auth.users(id) on delete set null;
commit;

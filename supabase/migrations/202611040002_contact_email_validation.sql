-- Correct the overescaped dot in the original constraint, without changing data.
begin;
alter table public.game_submission_contacts drop constraint if exists game_submission_contacts_email_format;
alter table public.game_submission_contacts add constraint game_submission_contacts_email_format
  check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') not valid;
-- NOT VALID preserves any historical values; all future writes are checked.
commit;

begin;
create function public.valid_contact_email(p_email text) returns boolean
language plpgsql immutable set search_path='' as $fn$
declare local_part text; domain_part text; label text;
begin
  if p_email is null then return true; end if;
  if length(p_email)>254 or p_email ~ E'[\r\n]' or length(p_email)-length(replace(p_email,'@',''))<>1 then return false; end if;
  local_part:=split_part(p_email,'@',1); domain_part:=split_part(p_email,'@',2);
  if length(local_part)>64 or local_part !~ $pattern$^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+([.][a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$$pattern$
    or position('.' in domain_part)=0 then return false; end if;
  foreach label in array string_to_array(domain_part,'.') loop
    if length(label)>63 or label !~ '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$' then return false; end if;
  end loop;
  return true;
end $fn$;
revoke all on function public.valid_contact_email(text) from public;
grant execute on function public.valid_contact_email(text) to authenticated,service_role;

create function public.normalize_contact_email() returns trigger
language plpgsql set search_path='' as $fn$
begin
  new.contact_email:=nullif(btrim(new.contact_email,E' \t\r\n'),'');
  return new;
end $fn$;
revoke all on function public.normalize_contact_email() from public;
create trigger normalize_contact_email before insert or update on public.game_submission_contacts
for each row execute function public.normalize_contact_email();
alter table public.game_submission_contacts drop constraint game_submission_contacts_email_format;
alter table public.game_submission_contacts add constraint game_submission_contacts_email_format
  check(public.valid_contact_email(contact_email)) not valid;
-- Historical rows are preserved. All future inserts/updates enforce the same syntax.
-- No TLD registry, provider blocklist or DNS/network dependency is used.
commit;


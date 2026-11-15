-- Validate the optional public supporting link without blocking unrelated legacy edits.
begin;
create function public.m24_validate_evidence_link() returns trigger language plpgsql set search_path='' as $$
declare v text;
begin
  if tg_op='UPDATE' and new.evidence_link is not distinct from old.evidence_link then return new; end if;
  v:=btrim(coalesce(new.evidence_link,''));
  if v<>'' and (length(v)>1000 or v !~* '^https?://[^[:space:]/?#@:]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
    or v ~ U&'[\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]'
    or coalesce(substring(v from '(?i)^https?://[^/?#@:]+:([0-9]{1,5})')::integer,0)>65535) then
    raise exception 'Supporting evidence must be an HTTP or HTTPS link of at most 1000 characters.';
  end if;
  return new;
end $$;
create trigger m24_evidence_link_validation before insert or update of evidence_link on public.game_submissions
for each row execute function public.m24_validate_evidence_link();
revoke all on function public.m24_validate_evidence_link() from public,anon,authenticated;
commit;

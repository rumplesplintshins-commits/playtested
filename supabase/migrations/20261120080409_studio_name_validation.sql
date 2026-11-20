begin;

-- Match browser trim and maxLength, including UTF-16 surrogate pairs.
create function playtested_studios.trim_name(value text) returns text
language sql immutable strict set search_path='' as $$
 select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;
create function playtested_studios.valid_name(value text) returns boolean
language sql immutable set search_path='' as $$
 select value is not null
   and value=playtested_studios.trim_name(value)
   and char_length(value)+regexp_count(value collate "C", U&'[\+010000-\+10FFFF]') between 3 and 50
   and value collate "C" !~ U&'[\0001-\001F\007F-\009F]'
$$;
create function playtested_studios.normalize_name(value text) returns text
language plpgsql immutable set search_path='' as $$
declare cleaned text:=playtested_studios.trim_name(value);
begin
 if not playtested_studios.valid_name(cleaned) then
  raise exception 'Enter a studio name of 3 to 50 characters without control characters.' using errcode='22023';
 end if;
 return cleaned;
end $$;

-- Preserve legacy names as stored. All new inserts and updates must pass.
alter table playtested_studios.studios add constraint studios_name_valid
 check (playtested_studios.valid_name(name)) not valid;

do $$
declare original text; revised text;
begin
 original:=pg_get_functiondef('public.change_studio(text,uuid,uuid,text,text,text)'::regprocedure);
 revised:=replace(original,'values(actor,btrim(p_name))','values(actor,playtested_studios.normalize_name(p_name))');
 if revised=original then raise exception 'Studio create name operation not found.'; end if;
 original:=revised;
 revised:=replace(original,'set name=btrim(p_name)','set name=playtested_studios.normalize_name(p_name)');
 if revised=original then raise exception 'Studio rename name operation not found.'; end if;
 execute revised;
end $$;
revoke all on function playtested_studios.trim_name(text),playtested_studios.valid_name(text),playtested_studios.normalize_name(text) from public,anon,authenticated;

commit;

begin;
-- Approved exact-ID QA cleanup. No deletion, XP change or replay of 019-021.
do $$begin
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.beta_fixture_hidden(uuid)') and not prosecdef and provolatile='i' and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='8979f3a02b6593251674cf716cf39c61') then raise exception 'Fixture helper differs from inspected 020. Stop and inspect.';end if;
 if (select count(*) from public.imported_games where (id,steam_app_id) in (
 ('b307eac5-4b9e-46fc-b673-178014c3fd9a'::uuid,'PLAYTESTED_TEST_STARFALL'),
 ('052165b0-15b4-4b2e-a1cb-c3be363df97f'::uuid,'PLAYTESTED_TEST_TINY'),
 ('f7f9808b-2d97-45ea-9bd5-428c42e4f018'::uuid,'PLAYTESTED_TEST_ASHEN')) and catalogue_review_reason='Playtested V10 controlled catalogue test game.')<>3 then raise exception 'Confirmed imported fixture provenance changed. Stop and inspect.';end if;
end;$$;
-- CREATE OR REPLACE preserves the existing helper owner/ACL and signature.
create or replace function public.beta_fixture_hidden(p_id uuid) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_id=any(array[
'd3100000-0000-4000-8000-000000000001',
'd3100000-0000-4000-8000-000000000002',
'd3100000-0000-4000-8000-000000000003',
'd3100000-0000-4000-8000-000000000101',
'd3100000-0000-4000-8000-000000000102',
'd3100000-0000-4000-8000-000000000103',
'3dc1adfe-8e19-4c37-aef7-b9c16ad5433f',
'b307eac5-4b9e-46fc-b673-178014c3fd9a',
'052165b0-15b4-4b2e-a1cb-c3be363df97f',
'f7f9808b-2d97-45ea-9bd5-428c42e4f018',
'7e69d169-c79c-40e8-83e5-545f85736f31',
'04771f87-5f59-4cf8-9f35-07c80c77537f',
'b8754c76-2f38-42b8-9348-240ef5aaed7f',
'3d09699f-f0b0-4d4e-bb06-1da7f1180778',
'41e47b6d-8f1c-4c06-b929-72169c7f0e6b',
'5218a866-f597-4fc1-bfae-84e1dc172dfe',
'a2fe9b0b-f556-4517-86c5-9687c33c8f40',
'2092dc5a-6404-42d1-a5db-544858565808',
'abc3ae2e-aea3-4293-af66-3130fbd6292a',
'5b5a9d16-adf6-4cab-b67f-db393d00483f'
 ]::uuid[]),false);
$$;
-- Existing imported-catalogue visibility mechanism; only three proven QA rows.
update public.imported_games set catalogue_eligible=false,catalogue_review_status='excluded'
where id in ('b307eac5-4b9e-46fc-b673-178014c3fd9a','052165b0-15b4-4b2e-a1cb-c3be363df97f','f7f9808b-2d97-45ea-9bd5-428c42e4f018');
-- Do not update campaign rows: legacy pause triggers would populate null genres.
-- Exact-ID eligibility/public filters stop recruitment while retaining statuses/history.
-- Filter campaign inputs BEFORE public aggregation/history, keeping Rail Estate.
do $patch$declare e record;s text;begin
 for e in select * from(values
 ('get_public_submission_playtest_history(uuid)','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id)','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id) and not public.beta_fixture_hidden(cp.id)'),
 ('get_public_submission_playtest_feedback(uuid)','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id)','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id) and not public.beta_fixture_hidden(cp.id)'),
 ('get_public_intent_counts(jsonb)','where c.published_at is not null','where not public.beta_fixture_hidden(c.id) and not public.beta_fixture_hidden(c.submission_id) and not public.beta_fixture_hidden(c.approved_game_id) and c.published_at is not null'),
 ('get_public_recruitment(jsonb)','where c.status=''open''','where not public.beta_fixture_hidden(c.id) and c.status=''open''')
 )p(signature,needle,replacement)loop
  if to_regprocedure('public.'||e.signature)is null then raise exception 'Missing required function: %',e.signature;end if;
  s:=pg_get_functiondef(to_regprocedure('public.'||e.signature));
  if (length(s)-length(replace(s,e.needle,'')))/length(e.needle)<>1 or position(e.replacement in s)>0 then raise exception 'Unexpected public function: %. Stop and inspect.',e.signature;end if;
  execute replace(s,e.needle,e.replacement);
 end loop;
end;$patch$;
notify pgrst,'reload schema';
commit;
-- Reversible: restore only captured imported visibility flags and replace
-- beta_fixture_hidden with the previous six-ID body. Do not delete records or
-- restore old aggregate definitions: campaign filtering is safe with either list.

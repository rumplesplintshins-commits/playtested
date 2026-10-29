begin;
-- Exact confirmed QA IDs only. No row changes, deletion, status rewrite or XP changes.
-- Depends on existing public visibility functions through 018 and approved_games VIEW.
create function public.beta_fixture_hidden(p_id uuid) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_id=any(array[
 'd3100000-0000-4000-8000-000000000001','d3100000-0000-4000-8000-000000000002','d3100000-0000-4000-8000-000000000003',
 'd3100000-0000-4000-8000-000000000101','d3100000-0000-4000-8000-000000000102','d3100000-0000-4000-8000-000000000103'
 ]::uuid[]),false);
$$;
revoke all on function public.beta_fixture_hidden(uuid) from public;
grant execute on function public.beta_fixture_hidden(uuid) to anon,authenticated,service_role;
-- Filtering the existing approved view happens BEFORE catalogue search/count/pagination.
-- Existing view columns, privileges and underlying private records are preserved.
do $$declare definition text;begin
 if (select c.relkind from pg_class c where c.oid=to_regclass('public.approved_games')) is distinct from 'v' then raise exception 'Expected existing approved_games view; inspect before proceeding.';end if;
 definition:=rtrim(btrim(pg_get_viewdef('public.approved_games'::regclass,true)),';');
 execute 'create or replace view public.approved_games as select * from ('||definition||') existing_listing where not public.beta_fixture_hidden(existing_listing.id)';
end;$$;
-- Amend only reviewed predicates. Abort atomically on unexpected deployed definitions.
do $patch$declare entry record;source text;begin
 for entry in select * from (values
 ('get_game_community_reception()','from public.community_playtests cp','from public.community_playtests cp where not public.beta_fixture_hidden(cp.id) and not public.beta_fixture_hidden(cp.submission_id) and not public.beta_fixture_hidden(cp.approved_game_id)'),
 ('get_public_submission_playtest_history(uuid)','where cp.submission_id = p_submission_id','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id)'),
 ('get_public_submission_playtest_feedback(uuid)','where cp.submission_id = p_submission_id','where cp.submission_id = p_submission_id and not public.beta_fixture_hidden(p_submission_id)'),
 ('get_public_community_playtest(uuid)','where cp.share_token = p_share_token','where cp.share_token = p_share_token and not public.beta_fixture_hidden(cp.id) and not public.beta_fixture_hidden(cp.submission_id) and not public.beta_fixture_hidden(cp.approved_game_id)'),
 ('_share_link_context(uuid)','if not found then return null;end if;','if not found or public.beta_fixture_hidden(l.source_id) or public.beta_fixture_hidden(l.campaign_id) then return null;end if;'),
 ('get_public_listing_updates(jsonb)','if not visible then continue;end if;','if not visible or public.beta_fixture_hidden((r->>''id'')::uuid) then continue;end if;'),
 ('get_public_intent_counts(jsonb)','if not visible then continue;end if;','if not visible or public.beta_fixture_hidden((g->>''id'')::uuid) then continue;end if;'),
 ('get_public_recruitment(jsonb)','where r.source_type=''approved''','where not public.beta_fixture_hidden(r.game_id) and r.source_type=''approved'''),
 ('get_discoverable_community_test_games()','where c.status=''open''','where not public.beta_fixture_hidden(c.id) and not public.beta_fixture_hidden(c.submission_id) and not public.beta_fixture_hidden(c.approved_game_id) and c.status=''open'''),
 ('campaign_eligible(uuid,uuid)','where c.id=p_id','where not public.beta_fixture_hidden(c.id) and not public.beta_fixture_hidden(c.submission_id) and not public.beta_fixture_hidden(c.approved_game_id) and c.id=p_id')
 ) p(signature,needle,replacement) loop
  if to_regprocedure('public.'||entry.signature) is null then raise exception 'Required public function absent: %',entry.signature;end if;
  source:=pg_get_functiondef(to_regprocedure('public.'||entry.signature));
  if (length(source)-length(replace(source,entry.needle,'')))/length(entry.needle)<>1 then raise exception 'Unexpected definition for %. No changes committed.',entry.signature;end if;
  execute replace(source,entry.needle,entry.replacement);
 end loop;
end;$patch$;
notify pgrst,'reload schema';
commit;
-- Reversible visibility only: a separately reviewed CREATE OR REPLACE of
-- beta_fixture_hidden(uuid) returning false restores visibility without changing rows.
-- Existing paused campaign statuses are a separate deliberately retained protection.

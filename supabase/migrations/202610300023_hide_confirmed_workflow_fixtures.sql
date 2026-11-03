begin;
-- Owner-confirmed public submission IDs only. Extend the existing 022 helper;
-- do not replay 019-022, alter views/policies, or update records/history/XP.
do $patch$
declare original record; definition text;
begin
 select oid,prosrc,proowner,proacl,proconfig,provolatile,prosecdef
 into original from pg_proc
 where oid=to_regprocedure('public.beta_fixture_hidden(uuid)');
 if not found or original.prosecdef or original.provolatile<>'i'
    or md5(regexp_replace(original.prosrc,'[[:space:]]','','g'))<>'1260ddae66fea3b407ee6fdbf894d040' then
  raise exception 'Expected reviewed 022 fixture helper. Stop and inspect; do not rerun earlier migrations.';
 end if;
 definition:=replace(pg_get_functiondef(original.oid),']::uuid[]',$ids$,
 '0a954463-811a-42b7-98d6-8793e3c9b756', -- Pulse Workflow Test 2
 '226cf8e7-4606-44f5-b7be-e0f46ce38dc3', -- Test Dungeon
 '38f54814-859c-461f-8602-8b6ba84f1e99', -- Pulse Workflow Test 3
 '94483bd5-99e5-4126-bd01-c1a770a7f7b3'  -- Pulse Workflow Test 1
 ]::uuid[]$ids$);
 execute definition;
 if exists(select 1 from pg_proc where oid=original.oid
   and (proowner is distinct from original.proowner or proacl is distinct from original.proacl
     or proconfig is distinct from original.proconfig or provolatile is distinct from original.provolatile
     or prosecdef is distinct from original.prosecdef)) then
  raise exception 'Helper ownership, permissions or attributes changed; rollback required.';
 end if;
end;$patch$;
notify pgrst,'reload schema';
commit;
-- Reversal is a separately reviewed helper-only replacement removing these four
-- appended IDs while retaining the previous twenty. No records need restoring.
-- App metadata/profile-link caches must be refreshed in a separately authorised
-- release (or allowed to expire) before claiming hosted removal is complete.

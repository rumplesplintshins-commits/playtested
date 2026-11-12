-- Finish the three audited mutable-path fixes. Resolve OIDs, not named-argument text.
-- Their audited bodies use only pg_catalog builtins/NEW; no unqualified app tables.
begin;
do $$
declare signature text; target regprocedure;
begin
  foreach signature in array array[
    'public.normalize_game_identity(text)',
    'public.set_technical_test_run_updated_at()',
    'public.set_game_build_updated_at()'
  ] loop
    target := pg_catalog.to_regprocedure(signature);
    if target is null then raise exception 'Missing audited dependency: %', signature; end if;
    execute pg_catalog.format('alter function %s set search_path = ''''', target);
  end loop;
end $$;
commit;

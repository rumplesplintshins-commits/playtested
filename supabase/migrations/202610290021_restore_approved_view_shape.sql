begin;
-- View-only forward correction for the exact wrapper captured after 020.
-- Historical reloptions were not captured: preserve current options, never guess.
do $$declare options text;before_owner oid;before_acl aclitem[];before_options text[];begin
 if (select relkind from pg_class where oid=to_regclass('public.approved_games')) is distinct from 'v'
    or md5(pg_get_viewdef('public.approved_games'::regclass,true)) <> 'c91107d52bca5a0def3921da3049f552' then
  raise exception 'approved_games differs from the inspected wrapper. Stop and inspect; do not rerun 020.';
 end if;
 select relowner,relacl,reloptions into before_owner,before_acl,before_options
 from pg_class where oid='public.approved_games'::regclass;
 select string_agg(format('%I=%L',split_part(option,'=',1),substr(option,strpos(option,'=')+1)),', ')
 into options from unnest(before_options) option;
 execute 'create or replace view public.approved_games'||case when options is null then '' else ' with ('||options||')' end||' as
 select id,title,developer_name,genre,description,game_link,image_url,price,
        ai_type,ai_areas,ai_explanation,evidence_link,submitted_at,steam_app_id
 from public.game_submissions
 where status = ''Approved''::text and not public.beta_fixture_hidden(id)';
 if exists(select 1 from pg_class where oid='public.approved_games'::regclass
    and (relowner is distinct from before_owner or relacl is distinct from before_acl
         or reloptions is distinct from before_options)) then
  raise exception 'View owner, grants or options changed unexpectedly; rollback required.';
 end if;
end;$$;
commit;

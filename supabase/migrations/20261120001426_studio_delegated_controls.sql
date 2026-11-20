begin;
create function playtested_studios.listing_key(p_kind text,p_id uuid,p_edit boolean)
returns text language plpgsql stable security definer set search_path='' as $$
declare k text;
begin
 if playtested_studios.shared_owner(p_kind,p_id,p_edit) is null then return public._share_owned_key(p_kind,p_id); end if;
 k:=public._share_key(p_kind,p_id);
 if k is null then raise exception 'Game unavailable.';end if;
 if exists(select 1 from public.engagement_aliases a join public.engagement_games g on g.id=a.game_id where a.kind=p_kind and a.source_id=p_id and g.identity_key<>k) then raise exception 'Game identity changed; tracking needs reconciliation';end if;
 return k;
end $$;

do $$
declare f record; definition text; revised text;
begin
 for f in select p.oid,p.proname from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in ('get_my_listing_edit','save_my_listing_edit','save_game_pc_requirements',
 'get_share_context','get_share_engagement','get_developer_quality_reports','_m26_unrestricted_feedback_identities',
 '_pre_admission_eligibility','get_playtest_eligibility','create_community_playtest')
 loop
  definition:=pg_get_functiondef(f.oid);
  revised:=definition;
  case f.proname
   when 'get_my_listing_edit','save_my_listing_edit' then
    revised:=replace(revised,'public._share_owned_key(p_kind,p_id)','playtested_studios.listing_key(p_kind,p_id,true)');
    revised:=replace(revised,'public._listing_current_claim(p_kind,p_id,auth.uid())','public._listing_current_claim(p_kind,p_id,coalesce(playtested_studios.shared_owner(p_kind,p_id,true),auth.uid()))');
   when 'save_game_pc_requirements' then
    revised:=replace(revised,'public._share_owned_key(p_kind,p_id)','playtested_studios.listing_key(p_kind,p_id,true)');
    revised:=replace(revised,'if not allowed then','if not allowed and playtested_studios.shared_owner(p_kind,p_id,true) is null then');
   when 'get_share_context','get_share_engagement' then
    revised:=replace(revised,'public._share_owned_key(p_kind,p_id)','playtested_studios.listing_key(p_kind,p_id,false)');
    revised:=replace(revised,'c.developer_id=auth.uid()','c.developer_id=coalesce(playtested_studios.shared_owner(p_kind,p_id,false),auth.uid())');
    revised:=replace(revised,'l.owner_id=auth.uid()','l.owner_id=coalesce(playtested_studios.shared_owner(p_kind,p_id,false),auth.uid())');
   when 'get_developer_quality_reports' then
    revised:=replace(revised,'id=p_playtest_id and developer_id=auth.uid()','id=p_playtest_id and playtested_studios.can_campaign(p_playtest_id,true)');
   when '_m26_unrestricted_feedback_identities' then
    revised:=replace(revised,'c.developer_id=auth.uid()','playtested_studios.can_campaign(c.id)');
   when '_pre_admission_eligibility' then
    revised:=replace(revised,'v_user_id := auth.uid();',$code$v_user_id := coalesce(playtested_studios.shared_owner(
    case when p_imported_game_id is not null then 'imported' when p_approved_game_id is not null then 'approved' else 'submission' end,
    coalesce(p_imported_game_id,p_approved_game_id,p_submission_id),true),auth.uid());$code$);
   when 'get_playtest_eligibility' then
    revised:=replace(revised,'auth.uid()','coalesce(playtested_studios.shared_owner(kind,source_id,true),auth.uid())');
   when 'create_community_playtest' then
    revised:=replace(revised,'v_user_id := auth.uid();',$code$v_user_id := coalesce(playtested_studios.shared_owner(
    case when p_imported_game_id is not null then 'imported' when p_approved_game_id is not null then 'approved' else 'submission' end,
    coalesce(p_imported_game_id,p_approved_game_id,p_submission_id),true),auth.uid());$code$);
   else null;
  end case;
  if revised=definition and f.proname not in('save_game_pc_requirements','get_developer_quality_reports') then
   raise exception 'Review authorization predicate for % before applying studio support.',f.proname;
  end if;
  if revised<>definition then execute revised; end if;
 end loop;
end $$;

-- Clone the plan read model with a studio-scoped principal. The requester
-- can only see an entitlement for a studio they may manage.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.get_my_developer_plan()'::regprocedure);
 definition:=replace(definition,'public.get_my_developer_plan()','public.get_studio_developer_plan(p_studio uuid)');
 definition:=replace(definition,'auth.uid()','plan_owner');
 definition:=replace(definition,'declare p public.developer_plan_policy;','declare plan_owner uuid; p public.developer_plan_policy;');
 definition:=replace(definition,'begin','begin
  select owner_id into plan_owner from playtested_studios.studios where id=p_studio and playtested_studios.my_role(id) in (''owner'',''editor'');
  if plan_owner is null then raise exception ''Studio management access required.'' using errcode=''42501'';end if;');
 definition:=replace(definition,'exists(select 1 from public.profiles where id=plan_owner and role=''admin'')','false');
 execute definition;
end $$;
revoke all on function public.get_studio_developer_plan(uuid) from public,anon,authenticated;
grant execute on function public.get_studio_developer_plan(uuid) to authenticated;
commit;

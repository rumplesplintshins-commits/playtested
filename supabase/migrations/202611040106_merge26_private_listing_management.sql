-- Public visibility must not remove legitimate owner/admin management access.
begin;
create or replace function public._m26_controls_owner(p_kind text,p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.profiles where id=auth.uid() and role='admin')
 or(p_kind='submission' and(exists(select 1 from public.game_submissions where id=p_id and developer_id=auth.uid())
  or exists(select 1 from public.game_developer_links where developer_id=auth.uid() and p_id in(submission_id,approved_game_id))))
 or(p_kind='imported' and exists(select 1 from public.game_developer_links where imported_game_id=p_id and developer_id=auth.uid())));
$$;
create function public.m26_my_approved_games(p_ids uuid[])
returns table(id uuid,title text,developer_name text,genre text,image_url text,steam_app_id text)
language sql stable security definer set search_path='' as $$
 select g.id,g.title,g.developer_name,g.genre,g.image_url,g.steam_app_id from public.game_submissions g
 where auth.uid() is not null and g.id=any(p_ids) and g.status='Approved' and public._m26_controls_owner('submission',g.id);
$$;
revoke all on function public.m26_my_approved_games(uuid[]) from public,anon;
grant execute on function public.m26_my_approved_games(uuid[]) to authenticated;

create or replace function public._listing_base(p_kind text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare b jsonb;begin
 if public.beta_fixture_hidden(p_id) and not public._m26_controls_owner(case when p_kind='imported' then 'imported' else 'submission' end,p_id)
 then raise exception 'Approved listing unavailable.';end if;
 if p_kind='imported' then select to_jsonb(g)||jsonb_build_object('game_link',g.steam_url) into b from public.imported_games g where id=p_id;
 elsif p_kind in('approved','submission') then select to_jsonb(g) into b from public.game_submissions g where id=p_id and status='Approved';end if;
 if b is null then raise exception 'Approved listing unavailable.';end if;
 b:=(select jsonb_object_agg(key,value) from jsonb_each(b) where key=any(array['title','developer_name','genre','description','game_link','steam_url','image_url','release_status','release_date','ai_type','ai_areas','ai_explanation','evidence_link']));
 return jsonb_build_object('release_status','Not announced','ai_type','','ai_areas','[]'::jsonb,'ai_explanation','','evidence_link','')||b;
end;$$;
-- Keep approved aliases canonical when the listing is privately archived or flagged.
do $$declare definition text;begin
 select pg_get_functiondef('public._share_key(text,uuid)'::regprocedure) into definition;
 if position('select steam_app_id,true into steam,present from public.approved_games where id=p_id' in definition)=0 then raise exception 'Unexpected approved identity helper.';end if;
 execute replace(definition,'select steam_app_id,true into steam,present from public.approved_games where id=p_id',
  'select steam_app_id,true into steam,present from public.game_submissions where id=p_id and status=''Approved''');
 select pg_get_functiondef('public.confirm_listing_reassessment(bigint,integer,text)'::regprocedure) into definition;
 if position(' if v is null or' in definition)=0 then raise exception 'Unexpected reassessment confirmation helper.';end if;
 execute replace(definition,' if v is null or',
  ' if v is null and public.m26_listing_hidden(r.source_id) then
   select (to_jsonb(a)-''reviewer_notes''-''testing_notes'')||jsonb_build_object(''game_id'',a.submission_id) into v
   from public.game_verifications a where a.submission_id=r.source_id and a.published is true;
  end if;
  if v is null or');
end;$$;
commit;

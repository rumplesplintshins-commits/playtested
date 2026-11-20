begin;
alter table playtested_studios.identity_reviews
 add column resolved_at timestamptz, add column resolved_by uuid, add column resolution text;

create function public.admin_resolve_game_identity_review(p_kind text,p_source uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required.' using errcode='42501';end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'Document the identity review.';end if;
 update playtested_studios.identity_reviews set resolved_at=clock_timestamp(),resolved_by=auth.uid(),resolution=btrim(p_reason)
 where source_kind=p_kind and source_id=p_source and resolved_at is null;
 if not found then raise exception 'Pending identity review not found.';end if;
end $$;
revoke all on function public.admin_resolve_game_identity_review(text,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_resolve_game_identity_review(text,uuid,text) to authenticated;

-- A verified alias brings the same owner's related builds into the existing
-- workspace. The caller must still be an active member of the assigned studio.
create or replace function playtested_studios.can_campaign(p_id uuid,p_edit boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_playtests c where c.id=p_id and
  (c.developer_id=auth.uid() or exists(
   select 1 from playtested_studios.games g join playtested_studios.studios s on s.id=g.studio_id and s.owner_id=c.developer_id
   join public.game_developer_links l on l.id=g.link_id and l.developer_id=s.owner_id
   where g.allowance_key=playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id)
   and playtested_studios.my_role(s.id)=any(case when p_edit then array['owner','editor'] else array['owner','editor','viewer'] end)
   and (l.submission_id is null or exists(select 1 from public.game_submissions a where a.id=l.submission_id and a.status='Approved' and a.developer_id=s.owner_id))
  )))
$$;

do $$
declare src text; revised text;
begin
 src:=pg_get_functiondef('public.get_studio_workspace(uuid)'::regprocedure);
 revised:=replace(src,'(c.imported_game_id=l.imported_game_id or c.approved_game_id=l.approved_game_id or c.submission_id=l.submission_id)',
  'playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id)=playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id)');
 revised:=replace(revised,$body$select jsonb_agg(g.link_id) from playtested_studios.games g join playtested_studios.studios s on s.id=g.studio_id where s.owner_id=auth.uid()$body$,
  $body$select jsonb_agg(l.id) from public.game_developer_links l where l.developer_id=auth.uid() and exists(select 1 from playtested_studios.games g where g.allowance_key=playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id))$body$);
 revised:=replace(revised,'jsonb_agg(to_jsonb(c) order by c.created_at desc)', $body$jsonb_agg(to_jsonb(c)||jsonb_build_object('studio_link_id',(
   select l.id from links l where playtested_studios.identity(l.imported_game_id,l.approved_game_id,l.submission_id)=playtested_studios.identity(c.imported_game_id,c.approved_game_id,c.submission_id) limit 1
  )) order by c.created_at desc)$body$);
 if revised=src then raise exception 'Review studio workspace projection.';end if;
 execute revised;

 src:=pg_get_functiondef('playtested_studios.first_launch(public.community_playtests,timestamp with time zone)'::regprocedure);
 src:=replace(src,$body$ select * into usage from playtested_studios.usage_at(workspace,policy,launched);$body$,$body$
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Retry the launch using read committed.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:launch-workspace:'||workspace,0));
 launched:=clock_timestamp();
 select * into usage from playtested_studios.usage_at(workspace,policy,launched);$body$);
 revised:=replace(src,$body$ if policy.plan='free' then$body$,$body$ if policy.plan='free' then
  if exists(select 1 from playtested_studios.identity_reviews r where r.source_kind='submission' and r.resolved_at is null
   and r.source_id in (c.submission_id,c.approved_game_id)) then
   raise exception 'Confirm this game identity with an administrator before a Free launch.';
  end if;$body$);
 if revised=src then raise exception 'Review Free identity audit guard.';end if;
 execute revised;

 src:=pg_get_functiondef('public.change_studio(text,uuid,uuid,text,text,text)'::regprocedure);
 revised:=replace(src,$body$  perform pg_advisory_xact_lock(hashtextextended('playtested:developer:'||actor,0));$body$,$body$  if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry studio creation using read committed.';end if;
  perform pg_advisory_xact_lock(hashtextextended('playtested:developer:'||actor,0));$body$);
 if revised=src then raise exception 'Review studio admission lock.';end if;
 execute revised;
end $$;
revoke all on all functions in schema playtested_studios from public,anon,authenticated;
grant execute on function playtested_studios.raw_identity(text,text) to authenticated,service_role;
commit;
